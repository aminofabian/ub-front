"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast, Toaster } from "sonner";

import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShopCartOptional } from "@/hooks/use-shop-cart";
import {
  completeShopperPhoneSession,
  fetchBusiness,
  fetchMe,
  fetchShopperAccountOverview,
  loginWithPassword,
  loginWithPin,
  registerAccount,
  sendShopperPhoneCode,
  verifyShopperPhoneCode,
} from "@/lib/api";
import { hasAccessSession, hasSessionPresenceCookie } from "@/lib/auth";
import { looksLikeStaffPin } from "@/lib/auth-secret";
import { APP_ROUTES } from "@/lib/config";
import {
  formatKenyanPhoneDisplay,
  toKenyanLocal07,
} from "@/lib/kenyan-phone";
import { setPageSealUnlock } from "@/lib/page-seal";
import {
  applyShopperTabHint,
  isShopNextPath,
  resolvePostAuthDestination,
  type PostAuthMe,
} from "@/lib/post-auth-destination";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";
import { isBuyerAccount, isCustomerTabPath } from "@/lib/buyer-role";
import { cn } from "@/lib/utils";

/** Where the shopper asked to sign in from. Apex is added in Phase 4. */
export type StorefrontSignInReason = "header" | "landing" | "cart" | "apex";

/** Which surface mounted the provider: storefront chrome vs landing branch. */
export type StorefrontSignInSurface = "storefront" | "landing";

export type StorefrontSignInDoor = "staff" | "shopper";

type StorefrontSignInEntry = {
  reason: StorefrontSignInReason;
  /** Allowlisted post-auth destination (current path or `/shop/account`). */
  next?: string | null;
  /** Prefill identity when known (e.g. receipt-verified phone). */
  initialPhone?: string | null;
  initialEmail?: string | null;
  /** Staff till/office vs shopper account — defaults to shopper. */
  door?: StorefrontSignInDoor | null;
};

type StorefrontSignInContextValue = {
  /** False until the client has hydrated, or when no provider is mounted. */
  ready: boolean;
  open: (entry: StorefrontSignInEntry) => void;
  close: () => void;
  /** D8: `ub.session` presence hint read in the RSC layer. Label-only, may be stale. */
  hasPresence: boolean;
};

const StorefrontSignInContext = createContext<StorefrontSignInContextValue | null>(
  null,
);

/** Never mounted / not yet hydrated — callers fall back to plain navigation. */
const NOOP_SIGN_IN: StorefrontSignInContextValue = {
  ready: false,
  open: () => {},
  close: () => {},
  hasPresence: false,
};

/**
 * Shop-host URL that opens the sign-in sheet (no `/login` page). Used by apex
 * forwards and progressive-enhancement fallbacks.
 */
export function buildStorefrontSignInHref(opts?: {
  path?: string;
  email?: string | null;
  phone?: string | null;
  door?: StorefrontSignInDoor | null;
  next?: string | null;
}): string {
  const path = (opts?.path?.trim() || APP_ROUTES.shop).split("?")[0] || APP_ROUTES.shop;
  const params = new URLSearchParams({ signin: "1" });
  const email = opts?.email?.trim();
  const phone = opts?.phone?.replace(/\D/g, "");
  if (email?.includes("@")) params.set("email", email.toLowerCase());
  if (phone && phone.length >= 9) params.set("phone", phone);
  if (opts?.door === "staff") params.set("door", "staff");
  const next = opts?.next?.trim();
  if (next && isShopNextPath(next)) params.set("next", next);
  return `${path}?${params.toString()}`;
}

/**
 * Progressive-enhancement hook for account affordances (D2). When the provider
 * is mounted and hydrated, `ready` is true and callers may intercept the click
 * and `open()` the sheet; otherwise the plain `<a href>` fallback wins.
 */
export function useStorefrontSignIn(): StorefrontSignInContextValue {
  return useContext(StorefrontSignInContext) ?? NOOP_SIGN_IN;
}

export function StorefrontSignInProvider({
  surface,
  storeName,
  hasPresence = false,
  children,
}: {
  surface: StorefrontSignInSurface;
  storeName?: string;
  /** D8: server-side presence hint, threaded from `StorefrontShell`. */
  hasPresence?: boolean;
  children: ReactNode;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<StorefrontSignInEntry | null>(null);
  const router = useRouter();

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Landing surfaces have no chrome to run the cookie-only restore, so a
  // returning shopper with an httpOnly session would otherwise stay on
  // "Sign in" forever. Storefront chrome already restores on mount.
  useEffect(() => {
    if (surface !== "landing") {
      return;
    }
    if (hasSessionPresenceCookie() && !hasAccessSession()) {
      void restoreClientSessionFromCookie().catch(() => {});
    }
  }, [surface]);

  const openSheet = useCallback((nextEntry: StorefrontSignInEntry) => {
    setEntry(nextEntry);
    setOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setOpen(false);
  }, []);

  // Apex / shared links: /shop?signin=1&email=… opens the sheet in place.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("signin") !== "1") return;
    const email = url.searchParams.get("email");
    const phone = url.searchParams.get("phone");
    const door =
      url.searchParams.get("door")?.trim().toLowerCase() === "staff"
        ? ("staff" as const)
        : ("shopper" as const);
    const nextParam = url.searchParams.get("next");
    openSheet({
      reason: "apex",
      initialEmail: email,
      initialPhone: phone,
      door,
      next:
        nextParam && isShopNextPath(nextParam)
          ? nextParam
          : door === "staff"
            ? APP_ROUTES.business
            : APP_ROUTES.shopAccount,
    });
    url.searchParams.delete("signin");
    url.searchParams.delete("email");
    url.searchParams.delete("phone");
    url.searchParams.delete("door");
    url.searchParams.delete("next");
    const cleaned = `${url.pathname}${url.search}${url.hash}`;
    router.replace(cleaned);
  }, [hydrated, openSheet, router]);

  const value = useMemo<StorefrontSignInContextValue>(
    () => ({ ready: hydrated, open: openSheet, close: closeSheet, hasPresence }),
    [hydrated, openSheet, closeSheet, hasPresence],
  );

  return (
    <StorefrontSignInContext.Provider value={value}>
      {children}
      <StorefrontSignInSheet
        surface={surface}
        storeName={storeName}
        open={open}
        entry={entry}
        onOpenChange={setOpen}
      />
      <Toaster position="bottom-center" />
    </StorefrontSignInContext.Provider>
  );
}

type IdentityKind = "unknown" | "email" | "phone";

function detectIdentityKind(raw: string): IdentityKind {
  const t = raw.trim();
  if (!t) return "unknown";
  if (t.includes("@")) return "email";
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 9 && /^[\d\s+\-()]+$/.test(t)) return "phone";
  if (digits.length >= 9 && digits.length / Math.max(t.replace(/\s/g, "").length, 1) >= 0.7) {
    return "phone";
  }
  return "unknown";
}

function StorefrontSignInSheet({
  surface,
  storeName,
  open,
  entry,
  onOpenChange,
}: {
  surface: StorefrontSignInSurface;
  storeName?: string;
  open: boolean;
  entry: StorefrontSignInEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useShopCartOptional();
  const tenant = useOptionalTenant();

  const displayName =
    storeName?.trim() ||
    tenant?.branding?.displayName?.trim() ||
    tenant?.tenantName?.trim() ||
    "";

  const rawNext = entry?.next?.trim() || "";
  const door = entry?.door === "staff" ? "staff" : "shopper";
  const safeNext =
    rawNext && (door === "staff" || isShopNextPath(rawNext))
      ? rawNext
      : door === "staff"
        ? APP_ROUTES.business
        : APP_ROUTES.shopAccount;

  /**
   * Landing / apex may navigate after auth. On the live storefront chrome,
   * shoppers stay put (D3); merchants route to their role home / business hub.
   */
  const finishSignedIn = useCallback(async () => {
    onOpenChange(false);
    toast.success("You're in");
    try {
      await cart?.refresh();
    } catch {
      // Best-effort: the cart merge can retry on the next cart fetch.
    }

    const keepShoppersOnPage =
      door !== "staff" &&
      surface !== "landing" &&
      entry?.reason !== "apex";

    let destination: string | null = null;
    try {
      const me = await fetchMe();
      let enriched: PostAuthMe = me;
      if (isBuyerAccount(me)) {
        enriched = applyShopperTabHint(
          me,
          await fetchShopperAccountOverview(0, 1),
        );
      }
      const business = await fetchBusiness().catch(() => null);

      let requestedNext: string | null = null;
      if (door === "staff") {
        requestedNext = safeNext || null;
      } else if (keepShoppersOnPage) {
        // D3: only buyers inherit the storefront path they were browsing.
        requestedNext =
          isBuyerAccount(enriched) && isShopNextPath(rawNext) ? rawNext : null;
      } else if (isShopNextPath(rawNext)) {
        requestedNext = rawNext;
      }

      destination = resolvePostAuthDestination(
        enriched,
        requestedNext,
        business,
      );
      if (
        destination === APP_ROUTES.shopAccount &&
        enriched.tabPath &&
        isCustomerTabPath(enriched.tabPath)
      ) {
        destination = enriched.tabPath;
      }

      if (
        keepShoppersOnPage &&
        isBuyerAccount(enriched) &&
        (!destination ||
          destination === pathname ||
          destination === APP_ROUTES.shop)
      ) {
        if (rawNext && isShopNextPath(rawNext) && rawNext !== pathname) {
          router.push(rawNext);
        }
        return;
      }
    } catch {
      destination =
        door === "staff" ? safeNext || APP_ROUTES.business : null;
      if (keepShoppersOnPage && !destination) {
        if (rawNext && isShopNextPath(rawNext) && rawNext !== pathname) {
          router.push(rawNext);
        }
        return;
      }
    }

    if (destination && destination !== pathname) {
      router.push(destination);
    }
  }, [
    surface,
    rawNext,
    safeNext,
    door,
    cart,
    pathname,
    router,
    onOpenChange,
    entry?.reason,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="bottom"
        className={cn(
          "z-[90] gap-0 overflow-hidden !rounded-none p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-none",
          "sm:w-full sm:max-w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-none sm:border-b sm:pb-0",
        )}
        overlayClassName="z-[89]"
      >
        <div className="border-b border-border/60 px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="space-y-1.5 text-left">
            {displayName ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {displayName.split("|")[0]?.trim() || displayName}
              </p>
            ) : null}
            <DialogTitle className="font-heading text-xl tracking-tight">
              Sign in
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed">
              Email or phone, then your PIN or password. That&apos;s it.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {open ? (
            <UnifiedSignInForm
              key={`${entry?.initialPhone ?? ""}:${entry?.initialEmail ?? ""}:${door}:${open}`}
              initialPhone={entry?.initialPhone ?? ""}
              initialEmail={entry?.initialEmail ?? ""}
              door={door}
              onSignedIn={() => void finishSignedIn()}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One form for both doors. Email signs in with PIN/password immediately.
 * Phone keeps the secret, texts a code only after Continue, then finishes.
 * Create-account stays in this sheet — no `/signup` redirect.
 */
export function UnifiedSignInForm({
  initialPhone,
  initialEmail,
  door = "shopper",
  onSignedIn,
}: {
  initialPhone?: string;
  initialEmail?: string;
  door?: StorefrontSignInDoor;
  onSignedIn: () => void;
}) {
  const tenant = useOptionalTenant();
  const passwordMinLength = tenant?.authConfig?.passwordPolicy?.minLength ?? 8;
  const [identity, setIdentity] = useState(() => {
    const email = (initialEmail ?? "").trim();
    if (email.includes("@")) return email;
    const phone =
      toKenyanLocal07(initialPhone ?? "") ||
      (initialPhone ?? "").replace(/\D/g, "");
    return phone ? formatKenyanPhoneDisplay(phone) || phone : "";
  });
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [code, setCode] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneToken, setPhoneToken] = useState("");
  const [helloName, setHelloName] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [phase, setPhase] = useState<
    "credentials" | "code" | "new-pin" | "signup"
  >("credentials");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const kind = detectIdentityKind(identity);
  const localPhone = toKenyanLocal07(identity) || identity.replace(/\D/g, "");

  const finishPhoneSession = async (opts: {
    token: string;
    pin: string;
    confirm?: string;
    needsConfirm: boolean;
    name?: string | null;
  }) => {
    if (!/^\d{4}$/.test(opts.pin)) {
      setErrorMessage("Enter a 4-digit PIN.");
      return;
    }
    if (opts.needsConfirm && opts.pin !== opts.confirm) {
      setErrorMessage("The two PINs do not match.");
      return;
    }
    const session = await completeShopperPhoneSession({
      phone: localPhone,
      phoneVerificationToken: opts.token,
      pin: opts.pin,
      confirmPin: opts.needsConfirm ? opts.confirm : undefined,
      name: opts.name?.trim() || undefined,
    });
    if (session.unlockToken && session.tabPhone) {
      setPageSealUnlock("customer-tab", session.tabPhone, session.unlockToken);
    }
    onSignedIn();
  };

  const onCredentialsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    const detected = detectIdentityKind(identity);

    if (detected === "email") {
      const email = identity.trim().toLowerCase();
      if (!secret) {
        setErrorMessage("Enter your PIN or password.");
        return;
      }
      setBusy(true);
      try {
        if (looksLikeStaffPin(secret)) {
          await loginWithPin(email, secret.trim());
        } else {
          await loginWithPassword(email, secret);
        }
        onSignedIn();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not sign in.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    if (detected === "phone") {
      if (door === "staff") {
        setErrorMessage("Staff sign-in uses email and PIN or password.");
        return;
      }
      if (!localPhone || localPhone.length < 9) {
        setErrorMessage("Enter a Kenyan mobile like 0714 282 874.");
        return;
      }
      if (!/^\d{4}$/.test(secret.trim())) {
        setErrorMessage("Phone accounts use a 4-digit PIN.");
        return;
      }
      setBusy(true);
      try {
        const sent = await sendShopperPhoneCode(localPhone);
        setMaskedPhone(sent.maskedHint || formatKenyanPhoneDisplay(localPhone));
        setCode("");
        setPhase("code");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not send a code.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    setErrorMessage("Enter an email or a Kenyan mobile number.");
  };

  const onSignupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    const email = identity.trim().toLowerCase();
    if (!email.includes("@")) {
      setErrorMessage("Create an account with an email address.");
      return;
    }
    if (!displayName.trim()) {
      setErrorMessage("Enter your name.");
      return;
    }
    if (secret.length < passwordMinLength) {
      setErrorMessage(`Password must be at least ${passwordMinLength} characters.`);
      return;
    }
    setBusy(true);
    try {
      await registerAccount(displayName.trim(), email, secret);
      await loginWithPassword(email, secret);
      onSignedIn();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not create account.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    if (!/^\d{4}$/.test(code.trim())) {
      setErrorMessage("Enter the 4-digit code we texted you.");
      return;
    }
    setBusy(true);
    try {
      const verified = await verifyShopperPhoneCode(localPhone, code.trim());
      setPhoneToken(verified.phoneVerificationToken);
      setHelloName(verified.customerName?.trim() || null);
      if (verified.hasPin) {
        await finishPhoneSession({
          token: verified.phoneVerificationToken,
          pin: secret.trim(),
          needsConfirm: false,
          name: verified.customerName,
        });
      } else {
        setConfirmPin("");
        setPhase("new-pin");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not verify that code.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onNewPinSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setBusy(true);
    try {
      await finishPhoneSession({
        token: phoneToken,
        pin: secret.trim(),
        confirm: confirmPin.trim(),
        needsConfirm: true,
        name: helloName,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not sign in.",
      );
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    "h-11 w-full rounded-none border border-border bg-background px-3 text-[16px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/25";
  const labelClass = "text-[13px] font-semibold text-foreground";
  const ctaClass =
    "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-50";

  if (phase === "code") {
    return (
      <form className="space-y-4" onSubmit={(e) => void onCodeSubmit(e)}>
        <p className="text-[14px] text-muted-foreground">
          We texted a code to {maskedPhone || formatKenyanPhoneDisplay(localPhone)}.
          Enter it to finish signing in.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Code from SMS</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className={cn(fieldClass, "text-center text-[1.35rem] font-semibold tracking-[0.35em]")}
            autoFocus
            required
          />
        </label>
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        <button type="submit" disabled={busy} className={ctaClass}>
          {busy ? "Checking…" : "Sign in"}
        </button>
        <button
          type="button"
          className="w-full text-center text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            setPhase("credentials");
            setCode("");
            setErrorMessage("");
          }}
        >
          ← Change number or email
        </button>
      </form>
    );
  }

  if (phase === "new-pin") {
    return (
      <form className="space-y-4" onSubmit={(e) => void onNewPinSubmit(e)}>
        <p className="text-[14px] text-muted-foreground">
          {helloName ? `Hi ${helloName} — ` : ""}
          Confirm the 4-digit PIN you chose so we can save it for next time.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Confirm PIN</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            className={cn(fieldClass, "text-center tracking-[0.35em]")}
            autoFocus
            required
          />
        </label>
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        <button type="submit" disabled={busy} className={ctaClass}>
          {busy ? "Saving…" : "Save PIN & sign in"}
        </button>
      </form>
    );
  }

  if (phase === "signup") {
    return (
      <form className="space-y-4" onSubmit={(e) => void onSignupSubmit(e)}>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={fieldClass}
            placeholder="Your name"
            autoFocus
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            className={fieldClass}
            placeholder="you@email.com"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Password</span>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              autoComplete="new-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className={cn(fieldClass, "pr-10")}
              placeholder={`At least ${passwordMinLength} characters`}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowSecret((v) => !v)}
              aria-label={showSecret ? "Hide password" : "Show password"}
            >
              {showSecret ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </label>
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        <button type="submit" disabled={busy} className={ctaClass}>
          {busy ? "Creating…" : "Create account"}
        </button>
        <button
          type="button"
          className="w-full text-center text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            setPhase("credentials");
            setErrorMessage("");
          }}
        >
          ← Back to sign in
        </button>
      </form>
    );
  }

  const identityLabel =
    kind === "email" ? "Email" : kind === "phone" ? "Phone" : "Email or phone";
  const secretLabel =
    kind === "phone" ? "PIN" : kind === "email" ? "PIN or password" : "PIN or password";

  return (
    <form className="space-y-4" onSubmit={(e) => void onCredentialsSubmit(e)}>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className={labelClass}>{identityLabel}</span>
        <input
          type={kind === "phone" ? "tel" : kind === "email" ? "email" : "text"}
          inputMode={kind === "phone" ? "tel" : "email"}
          autoComplete="username"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          className={fieldClass}
          placeholder="you@email.com or 0714 282 874"
          autoFocus
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className={labelClass}>{secretLabel}</span>
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            autoComplete="current-password"
            inputMode={kind === "phone" || looksLikeStaffPin(secret) ? "numeric" : "text"}
            value={secret}
            onChange={(e) =>
              setSecret(
                kind === "phone"
                  ? e.target.value.replace(/\D/g, "").slice(0, 4)
                  : e.target.value,
              )
            }
            maxLength={kind === "phone" ? 4 : undefined}
            className={cn(
              fieldClass,
              "pr-10",
              (kind === "phone" || looksLikeStaffPin(secret)) &&
                "text-center text-xl font-semibold tracking-[0.35em]",
            )}
            placeholder={kind === "phone" ? "••••" : "Your PIN or password"}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowSecret((v) => !v)}
            aria-label={showSecret ? "Hide secret" : "Show secret"}
          >
            {showSecret ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </label>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {kind === "phone"
          ? "We'll text a one-time code after you continue — only to confirm it's your phone."
          : kind === "email"
            ? "We'll open your account with this email and secret."
            : "Use the email or phone on your account."}
      </p>

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <button type="submit" disabled={busy} className={ctaClass}>
        {busy
          ? kind === "phone"
            ? "Sending code…"
            : "Signing in…"
          : "Sign in"}
      </button>

      {door === "shopper" ? (
        <div className="border-t border-border/60 pt-4">
          <button
            type="button"
            className="block w-full text-center text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setPhase("signup");
              setErrorMessage("");
              if (!identity.includes("@")) setIdentity("");
              setSecret("");
            }}
          >
            New here? Create an account
          </button>
        </div>
      ) : null}
    </form>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      className="rounded-none border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
      role="alert"
    >
      {message}
    </p>
  );
}

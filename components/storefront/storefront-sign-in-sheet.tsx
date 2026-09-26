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

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { comilmartFontVariables } from "@/components/storefront/templates/store/comilmart-fonts";
import { comilmartPaletteVars } from "@/components/storefront/templates/store/comilmart-palette";
import cmStyles from "@/components/storefront/templates/store/comilmart.module.css";
import { dailyGazetteFontVariables } from "@/components/storefront/templates/store/daily-gazette-fonts";
import dgStyles from "@/components/storefront/templates/store/daily-gazette.module.css";
import { mizuSpringsFontVariables } from "@/components/storefront/templates/store/mizu-springs-fonts";
import msStyles from "@/components/storefront/templates/store/mizu-springs.module.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShopCartOptional } from "@/hooks/use-shop-cart";
import {
  isComilmartStoreTheme,
  isDailyGazetteStoreTheme,
  isMizuSpringsStoreTheme,
} from "@/lib/storefront-theme-detect";
import {
  completeShopperPhoneSession,
  fetchBusiness,
  fetchMe,
  fetchShopperAccountOverview,
  loginWithPassword,
  loginWithPin,
  registerAccount,
  resendVerificationEmail,
  sendShopperPhoneCode,
  verifyEmailAddress,
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
  buyerStaysOnPage,
  isShopNextPath,
  resolvePostAuthDestination,
  type PostAuthMe,
} from "@/lib/post-auth-destination";
import { isEmailNotVerifiedError } from "@/lib/problem";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";
import {
  buildStorefrontSignInHref,
  signInPhaseForDoor,
  type StorefrontSignInDoor,
  type StorefrontSignInPhase,
} from "@/lib/storefront-sign-in-href";
import { isBuyerAccount, isCustomerTabPath } from "@/lib/buyer-role";
import { cn } from "@/lib/utils";

/** Where the shopper asked to sign in from. Apex is added in Phase 4. */
export type StorefrontSignInReason = "header" | "landing" | "cart" | "apex";

/** Which surface mounted the provider: storefront chrome vs landing branch. */
export type StorefrontSignInSurface = "storefront" | "landing";

// Re-exported so the many existing consumers can keep importing the href builder
// and the door/phase types from the sheet. The implementation lives in `lib` so
// it is unit-testable without loading the theme fonts.
export { buildStorefrontSignInHref };
export type { StorefrontSignInDoor, StorefrontSignInPhase };

type StorefrontSignInEntry = {
  reason: StorefrontSignInReason;
  /** Allowlisted post-auth destination (current path or `/shop/account`). */
  next?: string | null;
  /** Prefill identity when known (e.g. receipt-verified phone). */
  initialPhone?: string | null;
  initialEmail?: string | null;
  /** Staff till/office vs shopper account — defaults to shopper. */
  door?: StorefrontSignInDoor | null;
  /**
   * Open on the create-account form instead of the sign-in form. Only honoured
   * for the shopper door — staff signup is its own page, not this sheet.
   */
  initialPhase?: StorefrontSignInPhase | null;
  /** Prefill error (e.g. Google OAuth bounce back to `?signin=1&googleError=`). */
  initialError?: string | null;
};

type StorefrontSignInContextValue = {
  /** False until the client has hydrated, or when no provider is mounted. */
  ready: boolean;
  /**
   * True as soon as `StorefrontSignInProvider` is mounted. Use this to intercept
   * clicks and open the sheet — `ready` waits on hydration and was letting the
   * first click navigate away to `/login` or `?signin=1`.
   */
  available: boolean;
  open: (entry: StorefrontSignInEntry) => void;
  close: () => void;
  /** D8: `ub.session` presence hint read in the RSC layer. Label-only, may be stale. */
  hasPresence: boolean;
};

const StorefrontSignInContext = createContext<StorefrontSignInContextValue | null>(
  null,
);

/** Never mounted — callers fall back to plain navigation. */
const NOOP_SIGN_IN: StorefrontSignInContextValue = {
  ready: false,
  available: false,
  open: () => {},
  close: () => {},
  hasPresence: false,
};

/**
 * Shop-host URL that opens the sign-in sheet (no `/login` page). Used by apex
 * forwards and progressive-enhancement fallbacks.
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
    const googleError = url.searchParams.get("googleError")?.trim() || "";
    openSheet({
      reason: "apex",
      initialEmail: email,
      initialPhone: phone,
      door,
      initialPhase: signInPhaseForDoor(
        url.searchParams.get("signup") === "1" ? "signup" : "credentials",
        door,
      ),
      next:
        nextParam &&
        (door === "staff" || isShopNextPath(nextParam))
          ? nextParam
          : door === "staff"
            ? APP_ROUTES.business
            : APP_ROUTES.shopAccount,
      initialError: googleError
        ? storefrontGoogleErrorMessage(googleError)
        : null,
    });
    url.searchParams.delete("signin");
    url.searchParams.delete("email");
    url.searchParams.delete("phone");
    url.searchParams.delete("door");
    url.searchParams.delete("signup");
    url.searchParams.delete("next");
    url.searchParams.delete("googleError");
    const cleaned = `${url.pathname}${url.search}${url.hash}`;
    router.replace(cleaned);
  }, [hydrated, openSheet, router]);

  const value = useMemo<StorefrontSignInContextValue>(
    () => ({
      ready: hydrated,
      available: true,
      open: openSheet,
      close: closeSheet,
      hasPresence,
    }),
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
  const comilmart = isComilmartStoreTheme();
  const gazette = isDailyGazetteStoreTheme();
  const mizu = isMizuSpringsStoreTheme();

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
    toast.success(
      mizu
        ? "You're in — welcome to the spring"
        : gazette
          ? "Press pass stamped"
          : "You're in",
    );
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
        buyerStaysOnPage({
          destination,
          pathname,
          requestedNext: rawNext,
        })
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
    mizu,
    gazette,
  ]);

  const shopLabel = displayName.split("|")[0]?.trim() || displayName;
  const themed = comilmart || gazette || mizu;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side={themed ? "center" : "bottom"}
        className={
          gazette
            ? cn(
                dgStyles.signInSheet,
                dailyGazetteFontVariables,
                "z-[90] max-h-[min(88dvh,36rem)] gap-0 overflow-hidden p-0 sm:max-w-[400px]",
              )
            : mizu
              ? cn(
                  msStyles.signInSheet,
                  mizuSpringsFontVariables,
                  "z-[90] max-h-[min(88dvh,36rem)] gap-0 overflow-hidden p-0 sm:max-w-[400px]",
                )
              : comilmart
                ? cn(
                    cmStyles.signInSheet,
                    comilmartFontVariables,
                    "z-[90] max-h-[min(88dvh,36rem)] gap-0 overflow-hidden p-0 sm:max-w-[400px]",
                  )
                : cn(
                    "z-[90] gap-0 overflow-hidden !rounded-none p-0",
                    "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-none",
                    "sm:w-full sm:max-w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2",
                    "sm:rounded-none sm:border-b sm:pb-0",
                  )
        }
        style={comilmart ? comilmartPaletteVars() : undefined}
        overlayClassName="z-[89]"
      >
        <div
          className={
            gazette
              ? dgStyles.signInHead
              : mizu
                ? msStyles.signInHead
                : comilmart
                  ? cmStyles.signInHead
                  : "border-b border-border/60 px-5 pb-4 pt-5 sm:px-6"
          }
        >
          <DialogHeader className="space-y-1.5 text-left">
            {mizu ? (
              <p className={msStyles.signInKicker}>
                <span className={msStyles.signInKickerDot} aria-hidden />
                Spring pass
              </p>
            ) : null}
            {displayName && !themed ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {shopLabel}
              </p>
            ) : null}
            <DialogTitle
              className={
                gazette
                  ? dgStyles.signInTitle
                  : mizu
                    ? msStyles.signInTitle
                    : comilmart
                      ? cmStyles.signInTitle
                      : "font-heading text-xl tracking-tight"
              }
            >
              {gazette
                ? "Press pass"
                : mizu
                  ? "Sip in"
                  : comilmart
                    ? "Welcome back"
                    : "Sign in"}
            </DialogTitle>
            <DialogDescription
              className={
                gazette
                  ? dgStyles.signInLead
                  : mizu
                    ? msStyles.signInLead
                    : comilmart
                      ? cmStyles.signInLead
                      : "text-[14px] leading-relaxed"
              }
            >
              {gazette
                ? shopLabel
                  ? `Sign the register at ${shopLabel} to hold orders.`
                  : "Sign the register to hold orders and track them."
                : mizu
                  ? shopLabel
                    ? `Phone or email to track orders and refill with ${shopLabel}.`
                    : "Phone or email to track orders, refills, and custom bottles."
                  : comilmart
                    ? shopLabel
                      ? `Log in to your ${shopLabel} account.`
                      : "Log in to your account."
                    : "Email or phone, then your PIN or password. That's it."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div
          className={
            gazette
              ? dgStyles.signInBody
              : mizu
                ? msStyles.signInBody
                : comilmart
                  ? cmStyles.signInBody
                  : "overflow-y-auto px-5 py-5 sm:px-6"
          }
        >
          {open ? (
            <UnifiedSignInForm
              key={`${entry?.initialPhone ?? ""}:${entry?.initialEmail ?? ""}:${door}:${entry?.initialPhase ?? ""}:${open}`}
              initialPhone={entry?.initialPhone ?? ""}
              initialEmail={entry?.initialEmail ?? ""}
              door={door}
              initialPhase={entry?.initialPhase ?? "credentials"}
              initialError={entry?.initialError ?? ""}
              nextPath={safeNext}
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
  initialPhase = "credentials",
  initialError = "",
  nextPath,
  onSignedIn,
}: {
  initialPhone?: string;
  initialEmail?: string;
  door?: StorefrontSignInDoor;
  /** `"signup"` opens the create-account form. Ignored for the staff door. */
  initialPhase?: StorefrontSignInPhase;
  /** Prefill error banner (Google bounce, etc.). */
  initialError?: string;
  /** Post-auth destination hint for Google OAuth `next`. */
  nextPath?: string | null;
  onSignedIn: () => void;
}) {
  const tenant = useOptionalTenant();
  const pathname = usePathname();
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
  const [phase, setPhase] = useState<StorefrontSignInPhase>(() =>
    signInPhaseForDoor(initialPhase, door),
  );
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    () => (initialError ?? "").trim(),
  );
  /**
   * Email of a just-created account that cannot sign in until it is verified.
   * The password stays in `secret` so the verify step can fall back to
   * `loginWithPassword` when the API does not mint a session.
   */
  const [pendingEmail, setPendingEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyNotice, setVerifyNotice] = useState("");
  const [verifyLink, setVerifyLink] = useState<string | null>(null);

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
        if (isEmailNotVerifiedError(error)) {
          // The account exists but is still INVITED. The 403 tells them to "use
          // resend verification" — which exists nowhere on this surface — so
          // route them into the verify step instead of a dead-end error. The
          // password stays in `secret` for the post-verify fallback login.
          setPendingEmail(email);
          setVerifyCode("");
          setVerifyLink(null);
          setVerifyNotice(
            `Your account is not verified yet. Enter the 6-digit code we sent to ${email}, or resend a new one.`,
          );
          setPhase("verify");
          return;
        }
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
    setVerifyNotice("");
    setVerifyLink(null);
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
      // NOTE: do not call markOnboardingQuestionnairePending() here. That flags
      // merchant business onboarding; the shopper sheet must never open it.
      const result = await registerAccount(displayName.trim(), email, secret);
      if (result.status.toLowerCase() === "active") {
        await loginWithPassword(email, secret);
        onSignedIn();
        return;
      }
      // Email verification is required (the API default): the account exists
      // but cannot sign in yet. Stay in the sheet and collect the code instead
      // of bouncing the shopper into a login error they have no way to act on.
      setPendingEmail(email);
      setVerifyCode("");
      // When the API cannot deliver mail it returns the link instead. Show it:
      // the 6-digit code needs an inbox too, so without this the shopper would
      // have no way in at all.
      const link = result.verificationUrl?.trim();
      if (link) {
        setVerifyLink(link);
        setVerifyNotice(
          `Email delivery is unavailable, so open the link below to activate ${email}.`,
        );
      }
      setPhase("verify");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not create account.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onVerifySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setVerifyNotice("");
    const code = verifyCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage("Enter the 6-digit code from your email.");
      return;
    }
    if (!pendingEmail) {
      setPhase("credentials");
      return;
    }
    setBusy(true);
    try {
      const signedIn = await verifyEmailAddress(code, {
        toast: false,
        email: pendingEmail,
      });
      if (!signedIn) {
        // The API accepted the code but minted no session (older build) — the
        // password is still in state, so finish the sign-in ourselves.
        try {
          await loginWithPassword(pendingEmail, secret);
        } catch {
          // Verified, but no session and the fallback failed (e.g. a staff PIN
          // was typed rather than the password). Send them to the sign-in step
          // instead of claiming success.
          setErrorMessage(
            "Your email is verified. Sign in with your password to continue.",
          );
          setPendingEmail("");
          setPhase("credentials");
          return;
        }
      }
      onSignedIn();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "That code did not work. Check your email, or resend a new one.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onResendVerification = async () => {
    if (!pendingEmail) {
      return;
    }
    setBusy(true);
    setErrorMessage("");
    setVerifyNotice("");
    setVerifyLink(null);
    try {
      const out = await resendVerificationEmail(pendingEmail);
      const link = out.verificationUrl?.trim();
      if (link) {
        // Shown when the API is configured to return it (no mail provider).
        setVerifyNotice(`A new code is on its way to ${pendingEmail}.`);
        setVerifyLink(link);
      } else {
        setVerifyNotice(
          `If ${pendingEmail} has a pending signup, we sent a fresh code. Check your inbox and spam folder.`,
        );
      }
      setVerifyCode("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not resend the code.",
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

  const googleNext =
    (nextPath?.trim() &&
      (door === "staff" || isShopNextPath(nextPath.trim()))
      ? nextPath.trim()
      : null) ||
    (door === "staff"
      ? APP_ROUTES.business
      : pathname && isShopNextPath(pathname)
        ? pathname
        : APP_ROUTES.shopAccount);
  const googleBusinessId = tenant?.tenantId?.trim() || null;
  const googleBlock =
    googleBusinessId && phase !== "code" && phase !== "new-pin" && phase !== "verify" ? (
      <GoogleAuthButton
        intent={door === "staff" ? "sign_in" : "sign_up"}
        businessId={googleBusinessId}
        next={googleNext}
        requireTenantSso
        ssoProviders={tenant?.authConfig?.ssoProviders}
        label={door === "staff" ? "Sign in with Google" : "Continue with Google"}
        withDivider
        className="rounded-xl border-border shadow-none"
      />
    ) : null;

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
          {helloName ? `Hi ${helloName}. ` : ""}
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
        {googleBlock}
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

  if (phase === "verify") {
    return (
      <form className="space-y-4" onSubmit={(e) => void onVerifySubmit(e)}>
        <p className="text-[14px] text-muted-foreground">
          Almost there. We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">
            {pendingEmail || "your email"}
          </span>
          . Enter it here, or open the link in the email.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>Code from email</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={verifyCode}
            onChange={(e) =>
              setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className={cn(
              fieldClass,
              "text-center text-[1.35rem] font-semibold tracking-[0.35em]",
            )}
            autoFocus
            required
          />
        </label>
        {verifyNotice ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {verifyNotice}
          </p>
        ) : null}
        {verifyLink ? (
          <a
            href={verifyLink}
            className="block break-all text-[13px] font-medium text-primary underline underline-offset-2"
          >
            Open your verification link
          </a>
        ) : null}
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        <button type="submit" disabled={busy} className={ctaClass}>
          {busy ? "Checking…" : "Verify & continue"}
        </button>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <button
            type="button"
            className="font-medium text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => void onResendVerification()}
          >
            Resend code
          </button>
          <button
            type="button"
            className="font-medium text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setPhase("credentials");
              setErrorMessage("");
              setVerifyNotice("");
              setVerifyLink(null);
              setVerifyCode("");
            }}
          >
            ← Back to sign in
          </button>
        </div>
      </form>
    );
  }

  const identityLabel =
    kind === "email" ? "Email" : kind === "phone" ? "Phone" : "Email or phone";
  const secretLabel =
    kind === "phone" ? "PIN" : kind === "email" ? "PIN or password" : "PIN or password";

  return (
    <form className="space-y-4" onSubmit={(e) => void onCredentialsSubmit(e)}>
      {googleBlock}
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
            // Phone-only PIN: numeric keyboard. Email / mixed secret: keep text so a
            // password that starts with digits is not trapped on a number pad.
            inputMode={kind === "phone" ? "numeric" : "text"}
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
              kind === "phone" &&
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
          ? "We'll text a one-time code after you continue, only to confirm it's your phone."
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

function storefrontGoogleErrorMessage(code: string): string {
  switch (code) {
    case "no_account":
      return "No account for this Google email yet. Create one first, or use email / phone.";
    case "multi_shop":
      return "That Google account is on more than one shop. Open your shop’s link, or use email.";
    case "email_unverified":
      return "Google did not verify that email. Try another account.";
    case "disabled":
      return "Google Sign-In is temporarily unavailable.";
    case "expired_state":
    case "invalid_state":
    case "binding_mismatch":
      return "That Google sign-in expired. Try again.";
    case "cancelled":
      return "Google sign-in was cancelled.";
    default:
      return "Google sign-in did not complete. Try again.";
  }
}

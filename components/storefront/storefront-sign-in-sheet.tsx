"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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
  fetchMe,
  fetchShopperAccountOverview,
  loginWithPassword,
} from "@/lib/api";
import { hasAccessSession, hasSessionPresenceCookie } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  applyShopperTabHint,
  isShopNextPath,
  resolvePostAuthDestination,
  type PostAuthMe,
} from "@/lib/post-auth-destination";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";
import { isCustomerTabPath } from "@/lib/buyer-role";
import { cn } from "@/lib/utils";

/**
 * Lazily-loaded OTP body. The sheet shell stays in the main bundle (it is just
 * a dialog + context); the phone flow — the heavy part — loads on first open
 * (D2, principle 6).
 */
const ShopperPhoneLoginLazy = dynamic(
  () =>
    import("@/components/storefront/shop-phone-login").then(
      (m) => m.ShopperPhoneLogin,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-48 animate-pulse items-center justify-center text-sm text-muted-foreground"
        aria-hidden
      >
        Loading…
      </div>
    ),
  },
);

/** Where the shopper asked to sign in from. Apex is added in Phase 4. */
export type StorefrontSignInReason = "header" | "landing" | "cart" | "apex";

/** Which surface mounted the provider: storefront chrome vs landing branch. */
export type StorefrontSignInSurface = "storefront" | "landing";

type StorefrontSignInEntry = {
  reason: StorefrontSignInReason;
  /** Allowlisted post-auth destination (current path or `/shop/account`). */
  next?: string | null;
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
 * Progressive-enhancement hook for account affordances (D2). When the provider
 * is mounted and hydrated, `ready` is true and callers may intercept the click
 * and `open()` the sheet; otherwise the plain `<a href>` navigation stays.
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
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [entry, setEntry] = useState<StorefrontSignInEntry | null>(null);

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
    setMode("phone");
    setOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setOpen(false);
  }, []);

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
        mode={mode}
        onModeChange={setMode}
        entry={entry}
        onOpenChange={setOpen}
      />
      <Toaster position="bottom-center" />
    </StorefrontSignInContext.Provider>
  );
}

function StorefrontSignInSheet({
  surface,
  storeName,
  open,
  mode,
  onModeChange,
  entry,
  onOpenChange,
}: {
  surface: StorefrontSignInSurface;
  storeName?: string;
  open: boolean;
  mode: "phone" | "email";
  onModeChange: (mode: "phone" | "email") => void;
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
  const safeNext = isShopNextPath(rawNext) ? rawNext : APP_ROUTES.shopAccount;
  const signupHref = `${APP_ROUTES.signup}?next=${encodeURIComponent(safeNext)}`;

  /**
   * Landing surfaces have no catalog page to return to, so sign-in lands on the
   * account page — and credit-tab shoppers on their `/07XXXXXXXX` tab (the same
   * enrichment the password login page applies, §9).
   */
  const finishSignedIn = useCallback(async () => {
    onOpenChange(false);
    toast.success("You're in");
    try {
      await cart?.refresh();
    } catch {
      // Best-effort: the cart merge can retry on the next cart fetch.
    }

    // Surface A: the shopper never left the page — no navigation (D3).
    if (surface !== "landing") {
      return;
    }

    const fallback = isShopNextPath(rawNext) ? rawNext : APP_ROUTES.shopAccount;
    let destination = fallback;
    try {
      const me = await fetchMe();
      const enriched: PostAuthMe = applyShopperTabHint(
        me,
        await fetchShopperAccountOverview(0, 1),
      );
      const resolved = resolvePostAuthDestination(enriched, fallback);
      if (
        resolved === APP_ROUTES.shopAccount &&
        enriched.tabPath &&
        isCustomerTabPath(enriched.tabPath)
      ) {
        destination = enriched.tabPath;
      } else {
        destination = resolved;
      }
    } catch {
      // Keep the fallback — sign-in itself already succeeded.
    }
    if (destination && destination !== pathname) {
      router.push(destination);
    }
  }, [surface, rawNext, cart, pathname, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="bottom"
        className={cn(
          "z-[90] gap-0 overflow-hidden p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-none",
          "sm:w-full sm:max-w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-2xl sm:border-b sm:pb-0",
        )}
        overlayClassName="z-[89]"
      >
        <div className="border-b border-border/60 px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl tracking-tight">
              {displayName ? `Sign in to ${displayName}` : "Sign in"}
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed">
              Your Kenyan mobile is your account — verify it and enter your PIN.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {mode === "phone" ? (
            <ShopperPhoneLoginLazy
              variant="plain"
              onSignedIn={() => void finishSignedIn()}
              footer={
                <button
                  type="button"
                  className="mt-4 text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => onModeChange("email")}
                >
                  Use email instead
                </button>
              }
            />
          ) : (
            <EmailSignInForm
              signupHref={signupHref}
              onSignedIn={() => void finishSignedIn()}
              onBackToPhone={() => onModeChange("phone")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmailSignInForm({
  signupHref,
  onSignedIn,
  onBackToPhone,
}: {
  signupHref: string;
  onSignedIn: () => void;
  onBackToPhone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    if (!email.trim() || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await loginWithPassword(email.trim(), password);
      onSignedIn();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not sign in.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[13px] font-medium text-foreground">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[16px] outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[13px] font-medium text-foreground">Password</span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 pr-10 text-[16px] outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
            placeholder="Your account password"
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </label>

      {errorMessage ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <Link
        href={signupHref}
        className="block text-center text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
      >
        New here? Create an account
      </Link>

      <button
        type="button"
        onClick={onBackToPhone}
        className="w-full text-center text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
      >
        ← Use phone number instead
      </button>
    </form>
  );
}

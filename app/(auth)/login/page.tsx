"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import {
  authInputClassName,
  AuthSplitShell,
} from "@/components/auth/auth-split-shell";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  clearSessionTenantId,
  getSessionTenantId,
  getSessionTokens,
  persistTenantHostFromSlug,
  setSessionTenantId,
} from "@/lib/auth";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  useTenantIdPrefill,
} from "@/lib/auth-tenant-prefill";
import { encodeAuthHandoffPayload } from "@/lib/auth-handoff";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  fetchBusiness,
  fetchMe,
  loginWithPassword,
  loginWithPin,
  onboardBusiness,
  resolveBusinessByEmail,
} from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
import {
  APP_ROUTES,
  hostDerivedShopUrl,
  slugDerivedShopUrl,
} from "@/lib/config";
import { cn } from "@/lib/utils";

type LoginRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

async function syncSlugAndNavigate(
  router: LoginRouter,
  path: string,
  mode: "push" | "replace",
): Promise<void> {
  // Desktop SKU: single origin, no subdomain tenant routing.
  // Skip the cross-origin handoff and navigate in-app.
  if (IS_DESKTOP) {
    navigateInApp(router, path, mode);
    return;
  }

  let slug: string | null = null;
  let primaryHost: string | null = null;
  try {
    const biz = await fetchBusiness();
    slug = biz.slug?.trim() || null;
    primaryHost = biz.primaryDomain?.trim() || null;
  } catch {
    /* tenant id header may still work for same-origin navigation */
  }

  // If the user is already on the tenant's canonical domain, skip the handoff.
  // This handles subdomain tenants (e.g. barakia.palmart.co.ke) that match the
  // slug-derived hostname, and tenants with a custom primaryDomain.
  const currentHost = window.location.hostname.toLowerCase();
  if (primaryHost && currentHost === primaryHost.toLowerCase()) {
    persistTenantHostFromSlug(slug);
    navigateInApp(router, path, mode);
    return;
  }
  if (slug && currentHost.startsWith(slug.toLowerCase() + ".")) {
    persistTenantHostFromSlug(slug);
    navigateInApp(router, path, mode);
    return;
  }

  const shopBase =
    hostDerivedShopUrl(primaryHost) || (slug ? slugDerivedShopUrl(slug) : "");
  const targetOrigin = shopBase
    ? new URL(shopBase).origin
    : window.location.origin;

  if (!slug || targetOrigin === window.location.origin) {
    persistTenantHostFromSlug(slug);
    navigateInApp(router, path, mode);
    return;
  }

  const tokens = getSessionTokens();
  const tenantId = getSessionTenantId();
  if (!tokens) {
    persistTenantHostFromSlug(slug);
    navigateInApp(router, path, mode);
    return;
  }

  const fragment = encodeAuthHandoffPayload({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tenantId: tenantId ?? undefined,
    nextPath: path,
  });
  const nextEnc = encodeURIComponent(path);
  const slugEnc = encodeURIComponent(slug);
  window.location.assign(
    `${shopBase}${APP_ROUTES.authHandoff}?next=${nextEnc}&slug=${slugEnc}#${fragment}`,
  );
}

function navigateInApp(
  router: LoginRouter,
  path: string,
  mode: "push" | "replace",
): void {
  if (mode === "replace") {
    router.replace(path);
  } else {
    router.push(path);
  }
}

const AUTH_MODE = {
  password: "password",
  pin: "pin",
} as const;

type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] text-[15px] font-semibold shadow-md transition hover:bg-[var(--auth-primary-hover)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50";

function LoginPageContent() {
  const tenant = useOptionalTenant();
  const searchParams = useSearchParams();
  const passwordMinLength = tenant?.authConfig?.passwordPolicy?.minLength ?? 8;
  const tenantGreeting =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? null;
  const [mode, setMode] = useState<AuthMode>(AUTH_MODE.password);
  const [, ensureTenantResolved] = useTenantIdPrefill();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [branchId, setBranchId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const router = useRouter();

  const resolveAfterPasswordAuth = useCallback(async (): Promise<string> => {
    try {
      const me = await fetchMe();
      if (isBuyerAccount(me)) {
        return buyerHomePath();
      }
      const roleKey = me?.role?.key?.trim().toLowerCase();
      if (roleKey === "grocery_clerk") {
        return APP_ROUTES.grocery;
      }
      if (roleKey === "cashier") {
        return APP_ROUTES.salesQuick;
      }
      if (roleKey === "stock_manager") {
        return APP_ROUTES.inventoryStockTake;
      }
      const requested = searchParams.get("next")?.trim();
      if (requested?.startsWith("/") && !requested.startsWith("//")) {
        return requested;
      }
      return APP_ROUTES.business;
    } catch {
      return APP_ROUTES.business;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!getSessionTokens()) {
      return;
    }
    void (async () => {
      const dest = await resolveAfterPasswordAuth();
      await syncSlugAndNavigate(router, dest, "replace");
    })();
  }, [router, resolveAfterPasswordAuth]);

  const persistTenantId = (raw: string) => {
    const id = raw.trim();
    if (id.length > 0) {
      setSessionTenantId(id);
    } else {
      clearSessionTenantId();
    }
  };

  const onPasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        // Try to find the user's business by email and redirect
        const biz = await resolveBusinessByEmail(email);
        if (biz?.slug) {
          const shopUrl = slugDerivedShopUrl(biz.slug);
          if (shopUrl) {
            window.location.assign(
              `${shopUrl}/login?email=${encodeURIComponent(email)}`,
            );
            return;
          }
        }
        setShowOnboarding(true);
        return;
      }
      persistTenantId(id);
      await loginWithPassword(email, password);
      const dest = await resolveAfterPasswordAuth();
      await syncSlugAndNavigate(router, dest, "push");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPinLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        // Try to find the user's business by email and redirect
        const biz = await resolveBusinessByEmail(email);
        if (biz?.slug) {
          const shopUrl = slugDerivedShopUrl(biz.slug);
          if (shopUrl) {
            window.location.assign(
              `${shopUrl}/login?email=${encodeURIComponent(email)}`,
            );
            return;
          }
        }
        setShowOnboarding(true);
        return;
      }
      persistTenantId(id);
      await loginWithPin(email, pin, branchId);
      const pinDest = await resolveAfterPasswordAuth();
      await syncSlugAndNavigate(
        router,
        pinDest === APP_ROUTES.business ? APP_ROUTES.products : pinDest,
        "push",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "PIN login failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOnboardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsOnboarding(true);
    setErrorMessage("");

    try {
      // Determine the host to associate with the new business
      const urlQ = searchParams.get("url");
      const hostQ = searchParams.get("host");
      const queryCombined =
        [urlQ, hostQ].map((s) => s?.trim()).find((s) => s && s.length > 0) ??
        "";
      const fromQuery = queryCombined
        ? (() => {
            try {
              const withProtocol = queryCombined.includes("://")
                ? queryCombined
                : `https://${queryCombined}`;
              return new URL(withProtocol).hostname?.toLowerCase() ?? null;
            } catch {
              const first = queryCombined
                .split("/")[0]
                ?.split(":")[0]
                ?.trim()
                .toLowerCase();
              return first && first.length > 0 ? first : null;
            }
          })()
        : null;
      const host =
        fromQuery ??
        (typeof window !== "undefined"
          ? window.location.hostname.toLowerCase()
          : null);

      if (!host) {
        setErrorMessage(
          "Could not determine the domain. Please add ?url= with your shop URL.",
        );
        return;
      }

      const result = await onboardBusiness(host, businessName);
      if (!result?.tenantId) {
        setErrorMessage(
          "Could not create business. Please try a different name.",
        );
        return;
      }

      // Persist the new tenant ID
      setSessionTenantId(result.tenantId);

      // Redirect to signup on the new business subdomain.
      // The business was just created — no user account exists yet, so
      // auto-login would always fail. The signup page will pick up
      // the tenant from session and prefill the email.
      const shopUrl = slugDerivedShopUrl(result.slug);
      const signupParams = new URLSearchParams();
      if (email.trim()) signupParams.set("email", email.trim());
      const signupQs = signupParams.toString();
      if (shopUrl) {
        window.location.assign(
          `${shopUrl}/signup${signupQs ? `?${signupQs}` : ""}`,
        );
      } else {
        await router.push(
          `${APP_ROUTES.signup}${signupQs ? `?${signupQs}` : ""}`,
        );
      }
      return;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create business. Please try again.",
      );
    } finally {
      setIsOnboarding(false);
    }
  };

  const modeBtn = (active: boolean) =>
    cn(
      "rounded-xl border px-3 py-2.5 text-xs font-semibold transition",
      active
        ? "border-[var(--auth-accent)] bg-[color-mix(in_srgb,var(--auth-accent)_18%,white)] text-foreground shadow-sm dark:bg-[color-mix(in_srgb,var(--auth-accent)_22%,transparent)]"
        : "border-black/[0.08] bg-white/50 text-muted-foreground hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]",
    );

  return (
    <AuthSplitShell tenant={tenant}>
      <AuthPageHeader
        title={tenantGreeting ? `Sign in to ${tenantGreeting}` : "Sign in"}
        description={
          tenantGreeting
            ? "Welcome back — use email and password, or PIN on the register."
            : "Use email and password for owners and staff, or PIN for cashiers on a branch."
        }
      />

      {/* Sign-up link — only on business subdomains */}
      {tenant ? (
        <p className="mt-1 text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href={APP_ROUTES.signup}
            className="font-semibold underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
          >
            Sign up
          </Link>
        </p>
      ) : null}

      {/* Onboarding CTA — only on landing page. */}
      {/* Hidden on desktop because the SKU is single-tenant: the first business is */}
      {/* created by the /setup first-run wizard, not from the login screen. */}
      {!tenant && !showOnboarding && !IS_DESKTOP ? (
        <button
          type="button"
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border-2 border-[var(--auth-accent)] bg-[color-mix(in_srgb,var(--auth-accent)_8%,white)] p-4 text-left shadow-sm transition hover:bg-[color-mix(in_srgb,var(--auth-accent)_14%,white)] dark:bg-[color-mix(in_srgb,var(--auth-accent)_12%,#18181b)] dark:hover:bg-[color-mix(in_srgb,var(--auth-accent)_20%,#18181b)]"
          onClick={() => {
            setShowOnboarding(true);
            setErrorMessage("");
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{
              backgroundColor: "var(--auth-accent)",
              color: "var(--auth-accent-ink)",
            }}
          >
            🏪
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              Create your shop
            </p>
            <p className="text-xs text-muted-foreground">
              Get a free subdomain and start selling in seconds.
            </p>
          </div>
          <span className="shrink-0 text-lg font-bold text-[var(--auth-accent)]">
            →
          </span>
        </button>
      ) : null}

      {/* Login forms / onboarding */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={modeBtn(mode === AUTH_MODE.password)}
          onClick={() => setMode(AUTH_MODE.password)}
        >
          Email &amp; password
        </button>
        <button
          type="button"
          className={modeBtn(mode === AUTH_MODE.pin)}
          onClick={() => setMode(AUTH_MODE.pin)}
        >
          PIN login
        </button>
      </div>

      {showOnboarding && !IS_DESKTOP ? (
        <>
          <div className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--auth-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--auth-accent)_6%,white)] p-5 backdrop-blur-md dark:bg-[color-mix(in_srgb,var(--auth-accent)_10%,#18181b)]">
            <h3 className="mb-1 text-sm font-bold text-foreground">
              Name your business
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Pick a name for your shop. You&apos;ll get a free subdomain and
              become the{" "}
              <span className="font-semibold text-foreground">owner</span>.
            </p>
            <form className="space-y-3" onSubmit={onOnboardSubmit}>
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="onboard-business-name"
                >
                  Business name
                </label>
                <input
                  id="onboard-business-name"
                  className={authInputClassName}
                  placeholder="My Shop"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  autoComplete="organization"
                  required
                />
              </div>
              <button
                type="submit"
                className={primaryCtaClass}
                disabled={isOnboarding}
              >
                {isOnboarding
                  ? "Creating business…"
                  : "Create business & sign in"}
              </button>
            </form>
          </div>
          <button
            type="button"
            className="mt-3 w-full text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              setShowOnboarding(false);
              setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
            }}
          >
            Back to sign in
          </button>
        </>
      ) : mode === AUTH_MODE.password ? (
        <form className="mt-6 space-y-4" onSubmit={onPasswordLogin}>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              htmlFor="login-email"
            >
              Email
            </label>
            <input
              id="login-email"
              className={authInputClassName}
              type="email"
              placeholder="you@business.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                htmlFor="login-password"
              >
                Password
              </label>
              <Link
                href={APP_ROUTES.forgotPassword}
                className="text-xs font-semibold text-[var(--auth-accent)] hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                className={cn(authInputClassName, "pr-12")}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                minLength={passwordMinLength}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Minimum {passwordMinLength} characters.
            </p>
          </div>
          <button
            type="submit"
            className={primaryCtaClass}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onPinLogin}>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              htmlFor="pin-login-email"
            >
              Email
            </label>
            <input
              id="pin-login-email"
              className={authInputClassName}
              type="email"
              placeholder="Cashier email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              htmlFor="pin-branch-id"
            >
              Branch ID
            </label>
            <input
              id="pin-branch-id"
              className={authInputClassName}
              type="text"
              placeholder="Branch UUID"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              htmlFor="pin-value"
            >
              PIN
            </label>
            <input
              id="pin-value"
              className={authInputClassName}
              type="password"
              placeholder="4–6 digits"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </div>
          <button
            type="submit"
            className={primaryCtaClass}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign in with PIN"}
          </button>
        </form>
      )}

      {errorMessage ? (
        <div className="mt-5">
          <AuthAlert variant="error">{errorMessage}</AuthAlert>
        </div>
      ) : null}

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-black/[0.06] pt-6 text-xs text-muted-foreground dark:border-white/10">
        <Link
          href={APP_ROUTES.verifyEmail}
          className="font-medium hover:text-foreground"
        >
          Verify email
        </Link>
        <span className="hidden sm:inline">Secure sign-in</span>
      </div>
    </AuthSplitShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

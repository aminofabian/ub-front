"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { authInputClassName, AuthSplitShell } from "@/components/auth/auth-split-shell";
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
import { fetchBusiness, loginWithPassword, loginWithPin } from "@/lib/api";
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

async function syncSlugAndNavigate(router: LoginRouter, path: string, mode: "push" | "replace"): Promise<void> {
  let slug: string | null = null;
  let primaryHost: string | null = null;
  try {
    const biz = await fetchBusiness();
    slug = biz.slug?.trim() || null;
    primaryHost = biz.primaryDomain?.trim() || null;
  } catch {
    /* tenant id header may still work for same-origin navigation */
  }

  const shopBase =
    hostDerivedShopUrl(primaryHost) || (slug ? slugDerivedShopUrl(slug) : "");
  const targetOrigin = shopBase ? new URL(shopBase).origin : window.location.origin;

  if (!slug || targetOrigin === window.location.origin) {
    persistTenantHostFromSlug(slug);
    if (mode === "replace") {
      router.replace(path);
    } else {
      router.push(path);
    }
    return;
  }

  const tokens = getSessionTokens();
  const tenantId = getSessionTenantId();
  if (!tokens) {
    persistTenantHostFromSlug(slug);
    if (mode === "replace") {
      router.replace(path);
    } else {
      router.push(path);
    }
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

const AUTH_MODE = {
  password: "password",
  pin: "pin",
} as const;

type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-semibold shadow-md transition hover:brightness-[0.97] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50";

function LoginPageContent() {
  const tenant = useOptionalTenant();
  const passwordMinLength = tenant?.authConfig?.passwordPolicy?.minLength ?? 8;
  const tenantGreeting = tenant?.branding?.displayName ?? tenant?.tenantName ?? null;
  const [mode, setMode] = useState<AuthMode>(AUTH_MODE.password);
  const [, ensureTenantResolved] = useTenantIdPrefill();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [branchId, setBranchId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!getSessionTokens()) {
      return;
    }
    void syncSlugAndNavigate(router, APP_ROUTES.business, "replace");
  }, [router]);

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
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      await loginWithPassword(email, password);
      await syncSlugAndNavigate(router, APP_ROUTES.business, "push");
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
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      await loginWithPin(email, pin, branchId);
      await syncSlugAndNavigate(router, APP_ROUTES.products, "push");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "PIN login failed.");
    } finally {
      setIsSubmitting(false);
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

      <p className="mt-1 text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={APP_ROUTES.signup}
          className="font-semibold underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
        >
          Create an account
        </Link>
      </p>

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

      {mode === AUTH_MODE.password ? (
        <form className="mt-6 space-y-4" onSubmit={onPasswordLogin}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="login-email">
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
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="login-password">
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
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Minimum {passwordMinLength} characters.</p>
          </div>
          <button
            type="submit"
            className={primaryCtaClass}
            disabled={isSubmitting}
            style={{ backgroundColor: "var(--auth-accent)", color: "var(--auth-accent-ink)" }}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onPinLogin}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="pin-login-email">
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
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="pin-branch-id">
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
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="pin-value">
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
            style={{ backgroundColor: "var(--auth-accent)", color: "var(--auth-accent-ink)" }}
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
        <Link href={APP_ROUTES.verifyEmail} className="font-medium hover:text-foreground">
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

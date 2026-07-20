"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import {
  authInputClassName,
  AuthSplitShell,
} from "@/components/auth/auth-split-shell";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  clearSessionTenantId,
  finalizeClientSignOut,
  getSessionTenantId,
  setSessionTenantId,
} from "@/lib/auth";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  useTenantIdPrefill,
} from "@/lib/auth-tenant-prefill";
import {
  fetchMe,
  loginWithPassword,
  resolveBusinessByEmail,
} from "@/lib/api";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import { checkLoginAudience } from "@/lib/login-audience";
import { completeAuthAndNavigate } from "@/lib/post-auth-navigation";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { cn } from "@/lib/utils";

const LOGIN_BRIDGE = "/api/auth/login-bridge";

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] text-[15px] font-semibold shadow-md transition hover:bg-[var(--auth-primary-hover)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

const fieldLabelClass =
  "mb-1.5 block text-[13px] font-medium text-foreground";

function CustomerLoginPageContent() {
  const tenant = useOptionalTenant();
  const searchParams = useSearchParams();
  const passwordMinLength = tenant?.authConfig?.passwordPolicy?.minLength ?? 8;
  const tenantGreeting =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? null;
  const [, ensureTenantResolved] = useTenantIdPrefill(tenant?.tenantId);
  const [email, setEmail] = useState(
    () => searchParams.get("email")?.trim() ?? "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    () => searchParams.get("error")?.trim() ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const loginNextHint = searchParams.get("next")?.trim() ?? "";

  const resolveAfterCustomerAuth = useCallback(async (): Promise<string> => {
    const requestedNext = searchParams.get("next");
    let me: Awaited<ReturnType<typeof fetchMe>>;
    try {
      me = await fetchMe();
    } catch {
      return requestedNext?.trim() || APP_ROUTES.shopAccount;
    }
    const audience = checkLoginAudience(me, "customer");
    if (!audience.ok) {
      finalizeClientSignOut();
      throw new Error(audience.message);
    }
    return resolvePostAuthDestination(me, requestedNext);
  }, [searchParams]);

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

    let navigatedAway = false;
    try {
      if (password.length < passwordMinLength) {
        setErrorMessage(
          `Password must be at least ${passwordMinLength} characters.`,
        );
        return;
      }

      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        const biz = await resolveBusinessByEmail(email);
        if (biz?.slug) {
          const shopUrl = slugDerivedShopUrl(biz.slug);
          if (shopUrl) {
            navigatedAway = true;
            const params = new URLSearchParams();
            params.set("email", email);
            if (loginNextHint) params.set("next", loginNextHint);
            window.location.assign(`${shopUrl}${APP_ROUTES.login}?${params}`);
            return;
          }
        }
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      await loginWithPassword(email, password);
      const dest = await resolveAfterCustomerAuth();
      await completeAuthAndNavigate(dest, tenant?.slug);
      navigatedAway = true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      if (!navigatedAway) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AuthSplitShell tenant={tenant}>
      <AuthPageHeader
        title={
          tenantGreeting
            ? `Sign in to ${tenantGreeting}`
            : "Customer sign-in"
        }
        description="Track orders, wallet, and your shop account with email and password."
      />

      <form
        className="mt-6 space-y-4"
        action={LOGIN_BRIDGE}
        method="POST"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void onPasswordLogin(event);
        }}
      >
        <input
          type="hidden"
          name="tenantId"
          value={tenant?.tenantId ?? getSessionTenantId() ?? ""}
        />
        <input type="hidden" name="next" value={loginNextHint} />
        <input type="hidden" name="audience" value="customer" />
        <div>
          <label className={fieldLabelClass} htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className={authInputClassName}
            type="email"
            name="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              className="text-[13px] font-medium text-foreground"
              htmlFor="login-password"
            >
              Password
            </label>
            <Link
              href={APP_ROUTES.forgotPassword}
              className="text-xs font-medium text-[var(--auth-accent)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              className={cn(authInputClassName, "pr-12")}
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
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
        </div>
        {errorMessage ? (
          <AuthAlert variant="error">{errorMessage}</AuthAlert>
        ) : null}
        <button
          type="submit"
          className={primaryCtaClass}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={
            loginNextHint
              ? `${APP_ROUTES.signup}?next=${encodeURIComponent(loginNextHint)}`
              : APP_ROUTES.signup
          }
          className="font-medium text-foreground underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
        >
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Store staff?{" "}
        <Link
          href={APP_ROUTES.staffLogin}
          className="font-medium text-[var(--auth-accent)] hover:underline"
        >
          Staff sign-in
        </Link>
      </p>
      {!tenant ? (
        <button
          type="button"
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => void router.push(APP_ROUTES.staffLogin)}
        >
          Opening a new business? Continue on staff sign-in
        </button>
      ) : null}
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
      <CustomerLoginPageContent />
    </Suspense>
  );
}

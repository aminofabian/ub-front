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
import { ShopperPhoneLogin } from "@/components/storefront/shop-phone-login";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  clearSessionTenantId,
  getSessionTenantId,
  setSessionTenantId,
} from "@/lib/auth";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  useTenantIdPrefill,
} from "@/lib/auth-tenant-prefill";
import {
  fetchBusiness,
  fetchMe,
  fetchShopperAccountOverview,
  loginWithPassword,
  loginWithPin,
  resolveBusinessByEmail,
} from "@/lib/api";
import { looksLikeStaffPin } from "@/lib/auth-secret";
import { isBuyerAccount } from "@/lib/buyer-role";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import { completeAuthAndNavigate } from "@/lib/post-auth-navigation";
import {
  applyShopperTabHint,
  resolvePostAuthDestination,
} from "@/lib/post-auth-destination";
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
  const initialPhone = searchParams.get("phone")?.trim() ?? "";
  const [useEmail, setUseEmail] = useState(() => {
    if (searchParams.get("email")?.trim()) return true;
    if (searchParams.get("mode")?.trim() === "email") return true;
    if (initialPhone) return false;
    return false;
  });

  const resolveAfterAuth = useCallback(
    async (opts?: { honorNext?: boolean }): Promise<string> => {
      const honorNext = opts?.honorNext !== false;
      const requestedNext = honorNext ? searchParams.get("next") : null;
      let me: Awaited<ReturnType<typeof fetchMe>>;
      try {
        me = await fetchMe();
      } catch {
        return requestedNext?.trim() || APP_ROUTES.shop;
      }
      if (isBuyerAccount(me)) {
        try {
          me = applyShopperTabHint(me, await fetchShopperAccountOverview(0, 1));
        } catch {
          /* still send them to the catalog */
        }
      }
      // Include the business so merchants with unfinished onboarding land on
      // the business hub instead of the storefront.
      const business = await fetchBusiness().catch(() => null);
      return resolvePostAuthDestination(me, requestedNext, business);
    },
    [searchParams],
  );

  const persistTenantId = (raw: string) => {
    const id = raw.trim();
    if (id.length > 0) {
      setSessionTenantId(id);
    } else {
      clearSessionTenantId();
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    let navigatedAway = false;
    const usePin = looksLikeStaffPin(password);
    try {
      if (!usePin && password.length < passwordMinLength) {
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
      if (usePin) {
        await loginWithPin(email, password.trim());
        const pinDest = await resolveAfterAuth({ honorNext: false });
        const pinPath =
          pinDest === APP_ROUTES.business ? APP_ROUTES.products : pinDest;
        await completeAuthAndNavigate(pinPath, tenant?.slug);
      } else {
        await loginWithPassword(email, password);
        const dest = await resolveAfterAuth();
        await completeAuthAndNavigate(dest, tenant?.slug);
      }
      navigatedAway = true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      if (!navigatedAway) {
        setIsSubmitting(false);
      }
    }
  };

  const onPhoneSignedIn = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const id = tenant?.tenantId ?? getSessionTenantId();
      if (id) persistTenantId(id);
      const dest = await resolveAfterAuth();
      await completeAuthAndNavigate(dest, tenant?.slug);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Signed in, but we could not open your account.",
      );
      setIsSubmitting(false);
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
        description={
          useEmail
            ? "Email plus your password — or a staff PIN if you have one."
            : "Your Kenyan mobile is your account. The same 4-digit PIN opens this shop and your tab."
        }
      />

      {useEmail ? (
      <form
        className="mt-6 space-y-4"
        action={LOGIN_BRIDGE}
        method="POST"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(event);
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
              PIN or password
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
              className={cn(
                authInputClassName,
                "pr-12 transition-[letter-spacing,font-size]",
                looksLikeStaffPin(password) &&
                  "text-center text-2xl font-semibold tracking-[0.35em]",
              )}
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder={
                looksLikeStaffPin(password) ? "••••" : "PIN or password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              inputMode={looksLikeStaffPin(password) ? "numeric" : "text"}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide secret" : "Show secret"}
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
      ) : (
        <div className="mt-6">
          <ShopperPhoneLogin
            initialPhone={initialPhone}
            onSignedIn={() => {
              void onPhoneSignedIn();
            }}
            footer={
              <button
                type="button"
                className="mt-4 text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  setUseEmail(true);
                  setErrorMessage("");
                }}
              >
                Use email instead
              </button>
            }
          />
          {errorMessage ? (
            <div className="mt-4">
              <AuthAlert variant="error">{errorMessage}</AuthAlert>
            </div>
          ) : null}
        </div>
      )}

      {useEmail ? (
        <>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Prefer your phone?{" "}
        <button
          type="button"
          className="font-medium text-foreground underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
          onClick={() => {
            setUseEmail(false);
            setErrorMessage("");
          }}
        >
          Sign in with mobile
        </button>
      </p>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={
            loginNextHint
              ? `${APP_ROUTES.signup}?next=${encodeURIComponent(loginNextHint)}`
              : APP_ROUTES.signup
          }
          className="font-medium text-foreground underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
        >
          Create an email account
        </Link>
      </p>
        </>
      ) : null}
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

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
  getSessionTenantId,
  setSessionTenantId,
} from "@/lib/auth";
import { looksLikeStaffPin } from "@/lib/auth-secret";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  useTenantIdPrefill,
} from "@/lib/auth-tenant-prefill";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  fetchBusiness,
  fetchMe,
  loginWithPassword,
  loginWithPin,
  onboardBusiness,
  resolveBusinessByEmail,
  setOwnPin,
} from "@/lib/api";
import { SelfServeCountrySelect } from "@/components/onboarding/selfserve-country-select";
import { useSelfServeCountries } from "@/hooks/use-selfserve-countries";
import { DEFAULT_SELFSERVE_COUNTRY_CODE } from "@/lib/selfserve-countries";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import { completeAuthAndNavigate } from "@/lib/post-auth-navigation";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { cn } from "@/lib/utils";

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] text-[15px] font-semibold shadow-md transition hover:bg-[var(--auth-primary-hover)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

const fieldLabelClass =
  "mb-1.5 block text-[13px] font-semibold text-foreground";

const LOGIN_BRIDGE = "/api/auth/login-bridge";

function LoginPageContent() {
  const tenant = useOptionalTenant();
  const searchParams = useSearchParams();
  const passwordMinLength = tenant?.authConfig?.passwordPolicy?.minLength ?? 8;
  const tenantGreeting =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? null;
  const [, ensureTenantResolved] = useTenantIdPrefill(tenant?.tenantId);
  const [email, setEmail] = useState(
    () => searchParams.get("email")?.trim() ?? "",
  );
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    () => searchParams.get("error")?.trim() ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinSetup, setPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_SELFSERVE_COUNTRY_CODE);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const { countries } = useSelfServeCountries();
  const router = useRouter();
  const loginNextHint = searchParams.get("next")?.trim() ?? "";
  const secretIsPin = looksLikeStaffPin(secret);

  /**
   * Password: honor `?next=` (including shop account). PIN: role home only —
   * till sign-in should not bounce to the storefront.
   */
  const resolveAfterStaffAuth = useCallback(
    async (opts?: { honorNext?: boolean }): Promise<string> => {
      const honorNext = opts?.honorNext !== false;
      const requestedNext = honorNext ? searchParams.get("next") : null;
      let me: Awaited<ReturnType<typeof fetchMe>>;
      try {
        me = await fetchMe();
      } catch {
        // store-session resolves role server-side when client fetch fails (iPad).
        return requestedNext?.trim() ?? "";
      }
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

  const redirectToTenantStaffLogin = (shopUrl: string) => {
    window.location.assign(
      `${shopUrl}${APP_ROUTES.staffLogin}?email=${encodeURIComponent(email)}`,
    );
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    let navigatedAway = false;
    const usePin = looksLikeStaffPin(secret);
    try {
      if (!usePin && secret.length < passwordMinLength) {
        setErrorMessage(
          `Password must be at least ${passwordMinLength} characters.`,
        );
        return;
      }

      const id = await ensureTenantResolved();
      // The desktop SKU is single-tenant: its backend resolves the business
      // itself, so a bare 127.0.0.1 host must NOT fall through to the
      // cloud's email → subdomain redirect (which would bounce the webview
      // to test.kiosk.ke and appear as a logout loop).
      if (!id?.trim() && !IS_DESKTOP) {
        const biz = await resolveBusinessByEmail(email);
        if (!biz) {
          setShowOnboarding(true);
          return;
        }
        const shopUrl = biz.slug ? slugDerivedShopUrl(biz.slug) : null;
        if (shopUrl) {
          navigatedAway = true;
          redirectToTenantStaffLogin(shopUrl);
          return;
        }
        // Known account with no shop address to send them to — sign in from
        // here; the API resolves the shop from the email.
      }
      persistTenantId(id ?? "");

      if (usePin) {
        await loginWithPin(email, secret.trim());
        const pinDest = await resolveAfterStaffAuth({ honorNext: false });
        const pinPath =
          pinDest === APP_ROUTES.business ? APP_ROUTES.products : pinDest;
        await completeAuthAndNavigate(pinPath, tenant?.slug);
      } else {
        await loginWithPassword(email, secret);
        // A fresh desktop install (or a staff account with no PIN yet) has
        // no till PIN — prompt to set one before entering the counter. The
        // cloud web app does not force this: password-only sign-in is valid
        // there.
        if (IS_DESKTOP) {
          const me = await fetchMe().catch(() => null);
          if (me && me.hasPin === false) {
            setSecret("");
            setPinSetup(true);
            return;
          }
        }
        const dest = await resolveAfterStaffAuth();
        await completeAuthAndNavigate(dest, tenant?.slug);
      }
      navigatedAway = true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : usePin
            ? "PIN login failed."
            : "Login failed.",
      );
    } finally {
      if (!navigatedAway) {
        setIsSubmitting(false);
      }
    }
  };

  const onSubmitPinSetup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pin = newPin.trim();
    if (!/^\d{4,6}$/.test(pin)) {
      setErrorMessage("PIN must be 4 to 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setErrorMessage("PINs do not match.");
      return;
    }
    setErrorMessage("");
    setPinSaving(true);
    try {
      await setOwnPin(pin);
      const dest = await resolveAfterStaffAuth();
      await completeAuthAndNavigate(dest, tenant?.slug);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save your PIN.",
      );
    } finally {
      setPinSaving(false);
    }
  };

  const onOnboardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsOnboarding(true);
    setErrorMessage("");

    try {
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

      const result = await onboardBusiness(host, businessName, countryCode);
      if (!result?.tenantId) {
        setErrorMessage(
          "Could not create business. Please try a different name.",
        );
        return;
      }

      setSessionTenantId(result.tenantId);

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

  return (
    <AuthSplitShell tenant={tenant}>
      <AuthPageHeader
        title="Staff sign-in"
        description={
          tenantGreeting
            ? `Email plus your PIN or password — same form either way. Branch for ${tenantGreeting} applies automatically.`
            : "Email plus your PIN or password — same form either way. Your branch is applied automatically."
        }
      />

      {/* Onboarding CTA — only on landing page. */}
      {/* Hidden on desktop because the SKU is single-tenant: the first business is */}
      {/* created by the /setup first-run wizard, not from the login screen. */}
      {!tenant && !showOnboarding && !IS_DESKTOP ? (
        <button
          type="button"
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-[var(--auth-accent)]/40 bg-[color-mix(in_srgb,var(--auth-accent)_8%,white)] px-4 py-3.5 text-left transition hover:bg-[color-mix(in_srgb,var(--auth-accent)_14%,white)] dark:bg-[color-mix(in_srgb,var(--auth-accent)_12%,#18181b)] dark:hover:bg-[color-mix(in_srgb,var(--auth-accent)_20%,#18181b)]"
          onClick={() => {
            setShowOnboarding(true);
            setErrorMessage("");
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              New business?
            </p>
            <p className="text-xs text-muted-foreground">
              Create your shop and get a free subdomain.
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-[var(--auth-accent)]">
            Start
          </span>
        </button>
      ) : null}

      {showOnboarding && !IS_DESKTOP ? (
        <>
          <div className="mt-6 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Name your business
            </h3>
            <p className="text-xs text-muted-foreground">
              You&apos;ll get a free subdomain and become the owner.
            </p>
          </div>
          <form className="mt-4 space-y-4" onSubmit={onOnboardSubmit}>
            <div>
              <label
                className={fieldLabelClass}
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
                autoFocus
                required
              />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="onboard-country">
                Where do you operate?
              </label>
              <SelfServeCountrySelect
                id="onboard-country"
                className={authInputClassName}
                value={countryCode}
                onChange={setCountryCode}
                countries={countries}
                disabled={isOnboarding}
              />
            </div>
            {errorMessage ? (
              <AuthAlert variant="error">{errorMessage}</AuthAlert>
            ) : null}
            <button
              type="submit"
              className={primaryCtaClass}
              disabled={isOnboarding}
            >
              {isOnboarding ? "Creating…" : "Create business"}
            </button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setShowOnboarding(false);
              setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
            }}
          >
            Back to sign in
          </button>
        </>
      ) : pinSetup ? (
        <>
          <form className="mt-6 space-y-4" onSubmit={onSubmitPinSetup} noValidate>
            <div>
              <label className={fieldLabelClass} htmlFor="setup-pin">
                Create your till PIN
              </label>
              <input
                id="setup-pin"
                className={cn(
                  authInputClassName,
                  "text-center text-2xl font-semibold tracking-[0.35em]",
                )}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="••••"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="setup-pin-confirm">
                Confirm PIN
              </label>
              <input
                id="setup-pin-confirm"
                className={cn(
                  authInputClassName,
                  "text-center text-2xl font-semibold tracking-[0.35em]",
                )}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="••••"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This PIN unlocks the till. You can change it later from Settings →
              Users.
            </p>
            {errorMessage ? (
              <AuthAlert variant="error">{errorMessage}</AuthAlert>
            ) : null}
            <button
              type="submit"
              className={primaryCtaClass}
              disabled={pinSaving}
              aria-busy={pinSaving}
            >
              {pinSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save PIN and continue"
              )}
            </button>
          </form>
        </>
      ) : (
        <>
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
            <input type="hidden" name="audience" value="staff" />
            <div>
              <label className={fieldLabelClass} htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className={authInputClassName}
                type="email"
                name="email"
                placeholder="you@business.com"
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
                  htmlFor="login-secret"
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
                  id="login-secret"
                  className={cn(
                    authInputClassName,
                    "pr-12 transition-[letter-spacing,font-size]",
                    secretIsPin &&
                      "text-center text-2xl font-semibold tracking-[0.35em]",
                  )}
                  type={showSecret ? "text" : "password"}
                  name="password"
                  placeholder={secretIsPin ? "••••" : "PIN or password"}
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  autoComplete="current-password"
                  inputMode={secretIsPin ? "numeric" : "text"}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10"
                  onClick={() => setShowSecret((s) => !s)}
                  aria-label={showSecret ? "Hide secret" : "Show secret"}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {secretIsPin
                  ? "Recognized as a till PIN — your assigned branch is used automatically."
                  : "4–6 digit PIN for the till, or your office password."}
              </p>
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

          <div className="mt-8 space-y-2 border-t border-black/[0.08] pt-5 text-center dark:border-white/10">
            <p className="text-sm text-muted-foreground">
              Shopping online?{" "}
              <Link
                href={APP_ROUTES.login}
                className="font-medium text-foreground underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
              >
                Customer sign-in
              </Link>
            </p>
            {tenant ? (
              <p className="text-xs text-muted-foreground">
                Invited to join the team?{" "}
                <Link
                  href={APP_ROUTES.signupStaff}
                  className="font-medium text-[var(--auth-accent)] hover:underline"
                >
                  Staff signup
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                <Link
                  href={APP_ROUTES.verifyEmail}
                  className="hover:text-foreground"
                >
                  Verify email
                </Link>
              </p>
            )}
          </div>
        </>
      )}
    </AuthSplitShell>
  );
}

export default function StaffLoginPage() {
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

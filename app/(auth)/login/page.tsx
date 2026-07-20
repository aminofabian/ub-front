"use client";

import { Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
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
  setSessionTenantId,
} from "@/lib/auth";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  useTenantIdPrefill,
} from "@/lib/auth-tenant-prefill";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  fetchLoginBranches,
  fetchMe,
  loginWithPassword,
  loginWithPin,
  onboardBusiness,
  resolveBusinessByEmail,
  type LoginBranchOption,
} from "@/lib/api";
import {
  APP_ROUTES,
  slugDerivedShopUrl,
} from "@/lib/config";
import { completeAuthAndNavigate } from "@/lib/post-auth-navigation";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { cn } from "@/lib/utils";

/** Server prefetches dashboard data, then redirects (works when client fetch fails). */
const AUTH_MODE = {
  password: "password",
  pin: "pin",
} as const;

type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] text-[15px] font-semibold shadow-md transition hover:bg-[var(--auth-primary-hover)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

const fieldLabelClass =
  "mb-1.5 block text-[13px] font-medium text-foreground";

const LOGIN_BRIDGE = "/api/auth/login-bridge";

function LoginPageContent() {
  const tenant = useOptionalTenant();
  const searchParams = useSearchParams();
  const passwordMinLength = tenant?.authConfig?.passwordPolicy?.minLength ?? 8;
  const tenantGreeting =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? null;
  // Always start on Till (PIN). Same on server + client to avoid hydration mismatch.
  const [mode, setMode] = useState<AuthMode>(AUTH_MODE.pin);
  const [, ensureTenantResolved] = useTenantIdPrefill(tenant?.tenantId);
  const [email, setEmail] = useState(
    () => searchParams.get("email")?.trim() ?? "",
  );
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchOptions, setBranchOptions] = useState<LoginBranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [manualBranchEntry, setManualBranchEntry] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    () => searchParams.get("error")?.trim() ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const router = useRouter();
  const loginNextHint = searchParams.get("next")?.trim() ?? "";

  const resolveAfterPasswordAuth = useCallback(async (): Promise<string> => {
    const requestedNext = searchParams.get("next");
    try {
      const me = await fetchMe();
      return resolvePostAuthDestination(me, requestedNext);
    } catch {
      // store-session resolves role server-side when client fetch fails (iPad).
      return requestedNext?.trim() ?? "";
    }
  }, [searchParams]);

  const persistTenantId = (raw: string) => {
    const id = raw.trim();
    if (id.length > 0) {
      setSessionTenantId(id);
    } else {
      clearSessionTenantId();
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMessage("");
  };

  // PIN login: load the tenant's branches so the cashier can pick a branch by
  // name instead of pasting a UUID. Falls back to manual entry on failure.
  useEffect(() => {
    if (mode !== AUTH_MODE.pin) {
      return;
    }
    let cancelled = false;
    setBranchesLoading(true);
    void (async () => {
      try {
        const id = await ensureTenantResolved();
        if (id?.trim()) {
          setSessionTenantId(id);
        }
        const list = await fetchLoginBranches();
        if (!cancelled) {
          setBranchOptions(list);
          if (list.length === 1) {
            setBranchId(list[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          setBranchOptions([]);
        }
      } finally {
        if (!cancelled) {
          setBranchesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, ensureTenantResolved]);

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

  const onPinLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    let navigatedAway = false;
    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        const biz = await resolveBusinessByEmail(email);
        if (biz?.slug) {
          const shopUrl = slugDerivedShopUrl(biz.slug);
          if (shopUrl) {
            navigatedAway = true;
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
      const pinPath =
        pinDest === APP_ROUTES.business ? APP_ROUTES.products : pinDest;
      await completeAuthAndNavigate(pinPath, tenant?.slug);
      navigatedAway = true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "PIN login failed.",
      );
    } finally {
      if (!navigatedAway) {
        setIsSubmitting(false);
      }
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

  const modeTab = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-start gap-0.5 rounded-xl px-3.5 py-3 text-left transition",
      active
        ? "bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] shadow-sm"
        : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]",
    );

  const soleBranch =
    !manualBranchEntry && branchOptions.length === 1
      ? branchOptions[0]
      : null;

  return (
    <AuthSplitShell tenant={tenant}>
      <AuthPageHeader
        title={tenantGreeting ? `Sign in to ${tenantGreeting}` : "Sign in"}
        description={
          mode === AUTH_MODE.pin
            ? "Cashiers: pick your branch, enter your email and PIN."
            : "Owners and office staff: sign in with email and password."
        }
      />

      {/* Onboarding CTA — only on landing page. */}
      {/* Hidden on desktop because the SKU is single-tenant: the first business is */}
      {/* created by the /setup first-run wizard, not from the login screen. */}
      {!tenant && !showOnboarding && !IS_DESKTOP ? (
        <button
          type="button"
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--auth-accent)]/40 bg-[color-mix(in_srgb,var(--auth-accent)_8%,white)] px-4 py-3.5 text-left transition hover:bg-[color-mix(in_srgb,var(--auth-accent)_14%,white)] dark:bg-[color-mix(in_srgb,var(--auth-accent)_12%,#18181b)] dark:hover:bg-[color-mix(in_srgb,var(--auth-accent)_20%,#18181b)]"
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
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Sign-in method"
            className="mt-5 flex gap-1 rounded-2xl border border-black/[0.08] bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === AUTH_MODE.pin}
              className={modeTab(mode === AUTH_MODE.pin)}
              onClick={() => switchMode(AUTH_MODE.pin)}
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <KeyRound className="size-3.5 shrink-0" aria-hidden />
                Till
              </span>
              <span
                className={cn(
                  "text-[11px] leading-snug",
                  mode === AUTH_MODE.pin
                    ? "text-[var(--auth-accent-ink)]/75"
                    : "text-muted-foreground",
                )}
              >
                PIN for cashiers
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === AUTH_MODE.password}
              className={modeTab(mode === AUTH_MODE.password)}
              onClick={() => switchMode(AUTH_MODE.password)}
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Mail className="size-3.5 shrink-0" aria-hidden />
                Office
              </span>
              <span
                className={cn(
                  "text-[11px] leading-snug",
                  mode === AUTH_MODE.password
                    ? "text-[var(--auth-accent-ink)]/75"
                    : "text-muted-foreground",
                )}
              >
                Email &amp; password
              </span>
            </button>
          </div>

          {mode === AUTH_MODE.password ? (
            <form
              className="mt-5 space-y-4"
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
          ) : (
            <form
              className="mt-5 space-y-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void onPinLogin(event);
              }}
            >
              {soleBranch ? (
                <div className="rounded-xl bg-black/[0.03] px-3.5 py-2.5 text-sm dark:bg-white/[0.05]">
                  <span className="text-muted-foreground">Branch · </span>
                  <span className="font-medium text-foreground">
                    {soleBranch.name}
                  </span>
                </div>
              ) : branchesLoading ? (
                <div className="flex items-center gap-2 rounded-xl bg-black/[0.03] px-3.5 py-3 text-sm text-muted-foreground dark:bg-white/[0.05]">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Loading branches…
                </div>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label
                      className="text-[13px] font-medium text-foreground"
                      htmlFor={
                        manualBranchEntry || branchOptions.length === 0
                          ? "pin-branch-id"
                          : "pin-branch-select"
                      }
                    >
                      Branch
                    </label>
                    {branchOptions.length > 0 ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--auth-accent)] hover:underline"
                        onClick={() => {
                          setManualBranchEntry((prev) => {
                            const goingManual = !prev;
                            if (goingManual) {
                              setBranchId("");
                            } else if (branchOptions.length === 1) {
                              setBranchId(branchOptions[0].id);
                            } else {
                              setBranchId("");
                            }
                            return goingManual;
                          });
                        }}
                      >
                        {manualBranchEntry
                          ? "Choose from list"
                          : "Enter ID"}
                      </button>
                    ) : null}
                  </div>
                  {branchOptions.length > 0 && !manualBranchEntry ? (
                    <select
                      id="pin-branch-select"
                      className={authInputClassName}
                      value={branchId}
                      onChange={(event) => setBranchId(event.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Which branch are you at?
                      </option>
                      {branchOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        id="pin-branch-id"
                        className={authInputClassName}
                        type="text"
                        placeholder="Paste branch ID"
                        value={branchId}
                        onChange={(event) => setBranchId(event.target.value)}
                        autoComplete="off"
                        required
                      />
                      {branchOptions.length === 0 ? (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Branch list unavailable — ask a manager for the
                          branch ID, or use Office login.
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              )}

              <div>
                <label className={fieldLabelClass} htmlFor="pin-login-email">
                  Your email
                </label>
                <input
                  id="pin-login-email"
                  className={authInputClassName}
                  type="email"
                  placeholder="cashier@business.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  autoFocus={!soleBranch}
                  required
                />
              </div>

              <div>
                <label className={fieldLabelClass} htmlFor="pin-value">
                  PIN
                </label>
                <div className="relative">
                  <input
                    id="pin-value"
                    className={cn(
                      authInputClassName,
                      "pr-12 text-center text-2xl font-semibold tracking-[0.35em]",
                    )}
                    type={showPin ? "text" : "password"}
                    placeholder="••••"
                    value={pin}
                    onChange={(event) => {
                      const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                      setPin(next);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus={Boolean(soleBranch)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10"
                    onClick={() => setShowPin((s) => !s)}
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-center text-xs text-muted-foreground">
                  4–6 digit till code
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
                    Unlocking…
                  </>
                ) : (
                  "Unlock till"
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {tenant ? (
              <>
                New here?{" "}
                <Link
                  href={APP_ROUTES.signup}
                  className="font-medium text-foreground underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
                >
                  Create an account
                </Link>
              </>
            ) : (
              <Link
                href={APP_ROUTES.verifyEmail}
                className="hover:text-foreground"
              >
                Verify email
              </Link>
            )}
          </p>
        </>
      )}
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

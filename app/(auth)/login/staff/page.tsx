"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { EmailNotVerifiedRecovery } from "@/components/auth/email-not-verified-recovery";
import { StaffShopPickerDialog } from "@/components/auth/staff-shop-picker-dialog";
import {
  authInputClassName,
  authPrimaryCtaClass,
  AuthSplitShell,
  shortBrandName,
} from "@/components/auth/auth-split-shell";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  clearSessionTenantId,
  getSessionTenantId,
  hasAccessSession,
  hasSessionPresenceCookie,
  setSessionTenantId,
} from "@/lib/auth";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";
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
  setOwnPin,
  type PublicSignInDestination,
} from "@/lib/api";
import { SelfServeCountrySelect } from "@/components/onboarding/selfserve-country-select";
import { useSelfServeCountries } from "@/hooks/use-selfserve-countries";
import { DEFAULT_SELFSERVE_COUNTRY_CODE } from "@/lib/selfserve-countries";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import {
  buildStaffDestinationLoginUrl,
  buildStaffDestinationVerifyUrl,
  resolveApexStaffTenant,
  resolveTenantIdForStaffDestination,
} from "@/lib/staff-tenant-resolve";
import { completeAuthAndNavigate } from "@/lib/post-auth-navigation";
import {
  isOwnerOrAdminRole,
  resolvePostAuthDestination,
} from "@/lib/post-auth-destination";
import { isOfficeLoginMode } from "@/lib/login-audience";
import { getPosGuidanceKind, isEmailNotVerifiedError } from "@/lib/problem";
import { formatTillAccessDeniedMessage } from "@/lib/pos-till-unlock";
import { cn } from "@/lib/utils";

const primaryCtaClass = authPrimaryCtaClass;

const fieldLabelClass =
  "mb-1.5 block text-[13px] font-medium text-foreground";

const LOGIN_BRIDGE = "/api/auth/login-bridge";

function LoginPageContent() {
  const tenant = useOptionalTenant();
  const searchParams = useSearchParams();
  const passwordMinLength = tenant?.authConfig?.passwordPolicy?.minLength ?? 8;
  const tenantGreeting =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? null;
  const [, ensureTenantResolved] = useTenantIdPrefill(tenant?.tenantId);
  const [desktopShopName, setDesktopShopName] = useState<string | null>(null);
  const [desktopShopHost, setDesktopShopHost] = useState<string | null>(null);
  const [desktopCloudOrigin, setDesktopCloudOrigin] = useState<string | null>(
    null,
  );
  const [desktopStatusReady, setDesktopStatusReady] = useState(!IS_DESKTOP);
  const [desktopResetBusy, setDesktopResetBusy] = useState(false);
  const [desktopResetConfirm, setDesktopResetConfirm] = useState(false);
  const [email, setEmail] = useState(
    () => searchParams.get("email")?.trim() ?? "",
  );
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    () => searchParams.get("error")?.trim() ?? "",
  );
  const sessionEndedNotice = searchParams.get("notice")?.trim() === "session-ended";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinSetup, setPinSetup] = useState(false);
  const [verifyRecovery, setVerifyRecovery] = useState(false);
  /**
   * Email that could not be signed in from an unmapped (apex) host, and has no
   * active destination. Drives recovery copy — never the signup form.
   */
  const [apexNoShopEmail, setApexNoShopEmail] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_SELFSERVE_COUNTRY_CODE);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [shopPickerRows, setShopPickerRows] = useState<
    PublicSignInDestination[]
  >([]);
  const [shopPickerBusy, setShopPickerBusy] = useState(false);
  const { countries } = useSelfServeCountries();
  const router = useRouter();
  const loginNextHint = searchParams.get("next")?.trim() ?? "";
  const isOffice = isOfficeLoginMode(searchParams);
  useEffect(() => {
    if (searchParams.get("switch") === "1") {
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!hasAccessSession() && !hasSessionPresenceCookie()) {
        return;
      }
      const ok =
        hasAccessSession() ||
        (await restoreClientSessionFromCookie({ force: true }));
      if (!ok || cancelled) {
        return;
      }
      const next = searchParams.get("next")?.trim();
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      const office = isOfficeLoginMode(searchParams);
      const me = await fetchMe().catch(() => null);
      const business = await fetchBusiness().catch(() => null);
      if (!me) {
        window.location.replace(
          safeNext ?? (office ? APP_ROUTES.overview : APP_ROUTES.business),
        );
        return;
      }
      window.location.replace(
        resolvePostAuthDestination(me, safeNext, business, {
          office: office || isOwnerOrAdminRole(me),
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Desktop till: bind X-Tenant-Id to the local APP_DESKTOP_BUSINESS_ID and
  // surface which cloud shop this install mirrors. A stale cloud UUID in
  // session storage otherwise makes correct passwords look wrong.
  useEffect(() => {
    if (!IS_DESKTOP) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/desktop/setup/status", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          setupRequired?: boolean;
          businessId?: string | null;
          shopName?: string | null;
          shopHost?: string | null;
          cloudOrigin?: string | null;
        };
        if (cancelled) return;
        if (body.setupRequired) {
          window.location.replace("/setup");
          return;
        }
        const localId = body.businessId?.trim() ?? "";
        if (localId) {
          const stale = getSessionTenantId();
          if (stale && stale !== localId) {
            clearSessionTenantId();
          }
          setSessionTenantId(localId);
        }
        if (body.shopName?.trim()) {
          setDesktopShopName(body.shopName.trim());
        }
        if (body.shopHost?.trim()) {
          setDesktopShopHost(body.shopHost.trim().toLowerCase());
        }
        if (body.cloudOrigin?.trim()) {
          setDesktopCloudOrigin(body.cloudOrigin.trim());
        }
      } catch {
        // Login still works — AuthService forces the local business id.
      } finally {
        if (!cancelled) {
          setDesktopStatusReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetDesktopTillSetup = useCallback(async () => {
    if (!IS_DESKTOP || desktopResetBusy) return;
    setDesktopResetBusy(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/v1/desktop/setup/reset", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        const problem = (await res.json().catch(() => null)) as {
          detail?: string;
          title?: string;
        } | null;
        throw new Error(
          problem?.detail?.trim() ||
            problem?.title?.trim() ||
            "Could not reset this till.",
        );
      }
      clearSessionTenantId();
      window.location.assign("/setup");
    } catch (error) {
      setDesktopResetConfirm(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not reset this till. Try again.",
      );
      setDesktopResetBusy(false);
    }
  }, [desktopResetBusy]);

  /**
   * Password: honor `?next=` (including shop account). PIN: role home only —
   * till sign-in should not bounce to the storefront. Office login ignores
   * leftover storefront next and lands owners on the console.
   */
  const resolveAfterStaffAuth = useCallback(
    async (opts?: { honorNext?: boolean; office?: boolean }): Promise<string> => {
      const honorNext = opts?.honorNext !== false;
      const office = opts?.office === true;
      const requestedNext = honorNext ? searchParams.get("next") : null;
      let me: Awaited<ReturnType<typeof fetchMe>>;
      try {
        me = await fetchMe();
      } catch {
        // store-session resolves role server-side when client fetch fails (iPad).
        return requestedNext?.trim() ?? "";
      }
      const business = await fetchBusiness().catch(() => null);
      return resolvePostAuthDestination(me, requestedNext, business, {
        office: office || isOwnerOrAdminRole(me),
      });
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

  const redirectToStaffDestination = (destination: PublicSignInDestination) => {
    const url = buildStaffDestinationLoginUrl(
      destination,
      email,
      loginNextHint || null,
      { office: isOffice },
    );
    if (url) {
      window.location.assign(url);
      return true;
    }
    return false;
  };

  const completeStaffSignIn = async (tenantId: string) => {
    const usePin = looksLikeStaffPin(secret);
    persistTenantId(tenantId);

    const signInWithSecret = async () => {
      if (usePin && !isOffice) {
        try {
          await loginWithPin(email, secret.trim());
        } catch (pinError) {
          // Desktop: 4–6 digit office passwords are often misclassified as
          // PINs. Fall through to password so the same cloud secret works.
          if (!IS_DESKTOP) throw pinError;
          await loginWithPassword(email, secret, { toast: false });
        }
        return;
      }
      if (usePin) {
        try {
          await loginWithPin(email, secret.trim());
        } catch (pinError) {
          if (!IS_DESKTOP) throw pinError;
          await loginWithPassword(email, secret, { toast: false });
        }
      } else {
        await loginWithPassword(email, secret, { toast: false });
      }
    };

    await signInWithSecret();

    if (usePin && !isOffice) {
      const pinDest = await resolveAfterStaffAuth({ honorNext: false });
      const pinPath =
        pinDest === APP_ROUTES.business ? APP_ROUTES.products : pinDest;
      // If we fell back to password, still honor the PIN path for cashiers.
      await completeAuthAndNavigate(pinPath, tenant?.slug);
      return;
    }

    // A fresh desktop install (or a staff account with no PIN yet) has
    // no till PIN — prompt to set one before entering the counter. The
    // cloud web app does not force this: password-only sign-in is valid
    // there. Office web login skips this — owners go straight to the hub.
    if (IS_DESKTOP && !isOffice) {
      const me = await fetchMe().catch(() => null);
      if (me && me.hasPin === false) {
        setSecret("");
        setPinSetup(true);
        return;
      }
    }
    const dest = await resolveAfterStaffAuth({
      office: isOffice,
      honorNext: isOffice || !usePin,
    });
    await completeAuthAndNavigate(dest, tenant?.slug, { office: isOffice });
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setApexNoShopEmail(null);

    let navigatedAway = false;
    // Declared outside the try: the catch needs it to decide the recovery copy.
    let apexHostUnresolved = false;
    const usePin = looksLikeStaffPin(secret);
    try {
      if (!usePin && secret.length < passwordMinLength) {
        setErrorMessage(
          `Password must be at least ${passwordMinLength} characters.`,
        );
        return;
      }

      let tenantId = (await ensureTenantResolved())?.trim() ?? "";
      // Desktop: always use the till's local business id — never a cloud
      // UUID from session storage or an apex resolve.
      if (IS_DESKTOP) {
        const localId = getSessionTenantId()?.trim() ?? "";
        if (localId) {
          tenantId = localId;
        }
      }
      // The desktop SKU is single-tenant: its backend resolves the business
      // itself, so a bare 127.0.0.1 host must NOT fall through to the
      // cloud's email → subdomain redirect (which would bounce the webview
      // to test.kiosk.ke and appear as a logout loop).
      //
      // `{kind:"none"}` must NOT be read as "this person has no account". It
      // also covers "one destination, but we could not mint a tenant id".
      // `{kind:"unverified"}` is an INVITED self-signup — send them to
      // verify-email on their shop host instead of inventing a new business.
      if (!tenantId && !IS_DESKTOP) {
        const resolution = await resolveApexStaffTenant(email);
        if (resolution.kind === "multiple") {
          setShopPickerRows(resolution.destinations);
          setShopPickerOpen(true);
          return;
        }
        if (resolution.kind === "unverified") {
          const first = resolution.destinations[0];
          if (first) {
            const url = buildStaffDestinationVerifyUrl(first, email);
            if (url) {
              window.location.assign(url);
              navigatedAway = true;
              return;
            }
          }
          apexHostUnresolved = true;
        } else if (resolution.kind === "single") {
          tenantId = resolution.tenantId;
        } else {
          apexHostUnresolved = true;
        }
      }

      await completeStaffSignIn(tenantId);
      navigatedAway = true;
    } catch (error) {
      if (isEmailNotVerifiedError(error)) {
        setVerifyRecovery(true);
        setErrorMessage("");
        return;
      }
      if (apexHostUnresolved) {
        // Unmapped host AND the API could not sign this email in. Offer the real
        // next steps instead of a bare credentials error; the existing
        // "New business?" affordance stays available as the secondary door.
        setApexNoShopEmail(email.trim().toLowerCase());
      }
      setErrorMessage(
        formatTillAccessDeniedMessage(
          error instanceof Error
            ? error.message
            : usePin
              ? "PIN login failed."
              : "Login failed.",
        ) +
          (IS_DESKTOP
            ? " If this is a staff account, open Settings → Sync now after an owner signs in, then try again."
            : ""),
      );
    } finally {
      if (!navigatedAway) {
        setIsSubmitting(false);
      }
    }
  };

  const onPickStaffShop = async (destination: PublicSignInDestination) => {
    setShopPickerBusy(true);
    setErrorMessage("");
    try {
      const tenantId = await resolveTenantIdForStaffDestination(destination);
      if (tenantId) {
        setShopPickerOpen(false);
        setIsSubmitting(true);
        await completeStaffSignIn(tenantId);
        return;
      }
      if (redirectToStaffDestination(destination)) {
        return;
      }
      setErrorMessage("Could not open that shop. Try again or contact support.");
    } catch (error) {
      setErrorMessage(
        formatTillAccessDeniedMessage(
          error instanceof Error ? error.message : "Could not sign in to that shop.",
        ),
      );
    } finally {
      setShopPickerBusy(false);
      setIsSubmitting(false);
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
      const dest = await resolveAfterStaffAuth({ office: isOffice });
      await completeAuthAndNavigate(dest, tenant?.slug, { office: isOffice });
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
      <StaffShopPickerDialog
        open={shopPickerOpen}
        onOpenChange={(open) => {
          setShopPickerOpen(open);
          if (!open) {
            setShopPickerBusy(false);
            setIsSubmitting(false);
          }
        }}
        destinations={shopPickerRows}
        email={email.trim().toLowerCase()}
        busy={shopPickerBusy}
        onPick={(destination) => {
          void onPickStaffShop(destination);
        }}
      />
      <AuthPageHeader
        title={isOffice ? "Office sign-in" : "Staff sign-in"}
        description={
          IS_DESKTOP && desktopShopName
            ? isOffice
              ? `You are signing into ${desktopShopName}${desktopShopHost ? ` (${desktopShopHost})` : ""} on this till.`
              : `You are signing into ${desktopShopName}${desktopShopHost ? ` (${desktopShopHost})` : ""} — use your email and till PIN or office password.`
            : isOffice
              ? tenantGreeting
                ? `Use your email and office password to run ${shortBrandName(tenantGreeting)}.`
                : "Use your email and office password to run your shop."
              : tenantGreeting
                ? `Sign in with email and your till PIN or office password. Your branch at ${shortBrandName(tenantGreeting)} is applied automatically.`
                : "Sign in with email and your till PIN or office password. Your branch is applied automatically."
        }
      />

      {IS_DESKTOP && desktopStatusReady ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#1f7a3a]/20 bg-[linear-gradient(135deg,#e8f2ea_0%,#f7faf7_100%)] px-4 py-3.5 text-left shadow-[0_8px_24px_-16px_rgba(31,122,58,0.5)]">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#1f7a3a]/90">
            Signing in to
          </p>
          <p
            className="mt-0.5 text-base font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
          >
            {desktopShopName ?? "This till"}
          </p>
          {desktopShopHost ? (
            <p className="mt-1 truncate font-mono text-xs text-[#1f7a3a]">
              {desktopShopHost}
            </p>
          ) : null}
          {desktopCloudOrigin ? (
            <p className="mt-1 truncate text-xs text-[#3d4a40]">
              Staff accounts sync from your online shop
            </p>
          ) : (
            <p className="mt-1 text-xs text-[#3d4a40]">
              Use the same staff email and password (or PIN) as online.
            </p>
          )}
          {desktopResetConfirm ? (
            <div className="mt-3 space-y-2 rounded-xl border border-[#1f7a3a]/15 bg-white/70 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-[#3d4a40]">
                This clears the shop on this till so you can connect a different
                one. Sales already on this device stay offline until you set up
                again — nothing is deleted from your online shop.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg bg-[#1f7a3a] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  disabled={desktopResetBusy}
                  aria-busy={desktopResetBusy}
                  onClick={() => {
                    void resetDesktopTillSetup();
                  }}
                >
                  {desktopResetBusy ? (
                    <>
                      <Loader2
                        className="mr-1.5 h-3.5 w-3.5 animate-spin"
                        aria-hidden
                      />
                      Resetting…
                    </>
                  ) : (
                    "Yes, set up again"
                  )}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-[#3d4a40] transition-colors hover:bg-black/[0.04] disabled:opacity-60"
                  disabled={desktopResetBusy}
                  onClick={() => setDesktopResetConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="mt-2.5 text-left text-xs font-medium text-[#1f7a3a] underline-offset-2 hover:underline"
              onClick={() => {
                setDesktopResetConfirm(true);
                setErrorMessage("");
              }}
            >
              Wrong shop? Set up this till again
            </button>
          )}
        </div>
      ) : IS_DESKTOP ? (
        <div className="mt-5 rounded-2xl border border-black/[0.08] bg-black/[0.02] px-4 py-3.5 text-left dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            This till
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Loading which shop this device is connected to…
          </p>
        </div>
      ) : null}
      {sessionEndedNotice ? (
        <div className="mt-6">
          <AuthAlert variant="info">
            Please sign in to continue. Nothing you saved is lost.
          </AuthAlert>
        </div>
      ) : null}

      {/* Onboarding CTA — only on landing page. */}
      {/* Hidden on desktop because the SKU is single-tenant: the first business is */}
      {/* created by the /setup first-run wizard, not from the login screen. */}
      {!tenant && !showOnboarding && !isOffice && !IS_DESKTOP ? (
        <button
          type="button"
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[var(--auth-accent)]/35 bg-[color-mix(in_srgb,var(--auth-accent)_6%,white)] px-4 py-3.5 text-left transition-[background-color,border-color] duration-200 ease-out hover:bg-[color-mix(in_srgb,var(--auth-accent)_11%,white)] dark:bg-[color-mix(in_srgb,var(--auth-accent)_10%,#18181b)] dark:hover:bg-[color-mix(in_srgb,var(--auth-accent)_16%,#18181b)]"
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
      ) : verifyRecovery ? (
        <EmailNotVerifiedRecovery
          email={email.trim().toLowerCase()}
          password={secret}
          onBack={() => {
            setVerifyRecovery(false);
            setErrorMessage("");
          }}
          onVerified={async (signedIn) => {
            setIsSubmitting(true);
            setErrorMessage("");
            try {
              if (!signedIn) {
                await loginWithPassword(email.trim().toLowerCase(), secret, {
                  toast: false,
                });
              }
              if (IS_DESKTOP && !isOffice) {
                const me = await fetchMe().catch(() => null);
                if (me && me.hasPin === false) {
                  setVerifyRecovery(false);
                  setSecret("");
                  setPinSetup(true);
                  return;
                }
              }
              const dest = await resolveAfterStaffAuth({
                office: isOffice,
                honorNext: true,
              });
              await completeAuthAndNavigate(dest, tenant?.slug, {
                office: isOffice,
              });
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Email verified — sign in with your password to continue.",
              );
              setVerifyRecovery(false);
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      ) : (
        <>
          <form
            className="mt-6 space-y-5"
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
            {isOffice ? <input type="hidden" name="mode" value="office" /> : null}
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
                  {isOffice ? "Password" : "PIN or password"}
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
                  className={cn(authInputClassName, "pr-12")}
                  type={showSecret ? "text" : "password"}
                  name="password"
                  placeholder={isOffice ? "Office password" : "PIN or password"}
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  autoComplete="current-password"
                  // Do not flip to numeric mid-entry — passwords that start with
                  // digits must stay on a full keyboard. PIN vs password is decided on submit.
                  inputMode="text"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-[color,background-color] duration-200 ease-out hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10"
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
                {isOffice
                  ? "Cashiers at the counter can still enter a 4–6 digit till PIN here."
                  : "4–6 digit PIN for the till, or your office password."}
              </p>
            </div>
            {errorMessage ? (
              <AuthAlert
                variant={
                  getPosGuidanceKind(errorMessage) === "register-till"
                    ? "info"
                    : "error"
                }
              >
                {errorMessage}
              </AuthAlert>
            ) : null}
            {apexNoShopEmail ? (
              <div className="rounded-2xl border border-[var(--auth-accent)]/30 bg-[color-mix(in_srgb,var(--auth-accent)_6%,white)] p-4 text-left dark:bg-[color-mix(in_srgb,var(--auth-accent)_10%,#18181b)]">
                <p className="text-sm font-semibold text-foreground">
                  Couldn&apos;t sign {apexNoShopEmail} in from here
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  An unverified signup is routed straight to your shop&apos;s
                  verification page, so reaching this message means no shop could
                  be matched to that email. If you signed up recently, open the
                  verification link we emailed you — it takes you straight to your
                  shop. If you shop as a customer rather than work the till, use
                  the customer sign-in instead. New here? Use the button above.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <Link
                    href={`${APP_ROUTES.login}?email=${encodeURIComponent(apexNoShopEmail)}`}
                    className="font-medium text-[var(--auth-accent)] underline-offset-2 hover:underline"
                  >
                    Customer sign-in
                  </Link>
                </div>
              </div>
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

          <div className="mt-10 space-y-2.5 border-t border-black/[0.06] pt-6 text-center dark:border-white/10">
            {isOffice ? (
              <p className="text-[13px] text-muted-foreground">
                Working the till?{" "}
                <Link
                  href={`${APP_ROUTES.staffLogin}?switch=1`}
                  className="font-medium text-foreground underline decoration-[var(--auth-accent)] decoration-2 underline-offset-[3px] transition-opacity duration-200 ease-out hover:opacity-80"
                >
                  Staff PIN sign-in
                </Link>
              </p>
            ) : null}
            <p className="text-[13px] text-muted-foreground">
              Shopping online?{" "}
              <Link
                href={APP_ROUTES.login}
                className="font-medium text-foreground underline decoration-[var(--auth-accent)] decoration-2 underline-offset-[3px] transition-opacity duration-200 ease-out hover:opacity-80"
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

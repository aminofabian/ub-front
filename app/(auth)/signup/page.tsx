"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import {
  authInputClassName,
  AuthSplitShell,
} from "@/components/auth/auth-split-shell";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { Button } from "@/components/ui/button";
import {
  clearSessionTenantId,
  getSessionTokens,
  setSessionTenantId,
} from "@/lib/auth";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  useTenantIdPrefill,
} from "@/lib/auth-tenant-prefill";
import { registerAccount, fetchMe, onboardBusiness } from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-semibold shadow-md transition hover:brightness-[0.97] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50";

function extractVerificationToken(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get("token");
  } catch {
    return null;
  }
}

function SignupPageContent() {
  const tenant = useOptionalTenant();
  const searchParams = useSearchParams();
  const [, ensureTenantResolved] = useTenantIdPrefill();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!getSessionTokens()) {
      return;
    }
    void (async () => {
      try {
        const me = await fetchMe();
        router.replace(
          isBuyerAccount(me) ? buyerHomePath() : APP_ROUTES.business,
        );
      } catch {
        router.replace(APP_ROUTES.business);
      }
    })();
  }, [router]);

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
    setSuccessMessage("");
    setVerificationLink(null);

    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        setShowOnboarding(true);
        return;
      }
      persistTenantId(id);
      const result = await registerAccount(name.trim(), email.trim(), password);
      if (result.status.toLowerCase() === "active") {
        setVerificationLink(null);
        setSuccessMessage(
          `Account ready for ${result.email}. You can sign in.`,
        );
      } else {
        const link = result.verificationUrl?.trim();
        if (link) {
          setSuccessMessage(
            `Verify your email for ${result.email}. Use the link below (shown because the API is configured to return it when mail is unavailable).`,
          );
          setVerificationLink(link);
        } else {
          const base = `You're almost done. We sent a link to ${result.email}. Open it to verify, then sign in.`;
          const localHint =
            process.env.NODE_ENV === "development"
              ? " Locally, if the API has no SMTP, the link is only in the backend terminal (yellow WARN + INFO with the verify URL), not in your inbox."
              : "";
          setSuccessMessage(base + localHint);
          setVerificationLink(null);
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Sign up failed.",
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

      setSessionTenantId(result.tenantId);

      // Proceed with the signup flow
      const registerResult = await registerAccount(
        name.trim(),
        email.trim(),
        password,
      );
      // Redirect to the business subdomain
      const shopUrl = slugDerivedShopUrl(result.slug);
      if (shopUrl) {
        if (registerResult.status.toLowerCase() === "active") {
          window.location.assign(`${shopUrl}/login`);
        } else {
          const token = extractVerificationToken(
            registerResult.verificationUrl,
          );
          if (token) {
            window.location.assign(
              `${shopUrl}/verify-email?token=${encodeURIComponent(token)}`,
            );
          } else {
            window.location.assign(`${shopUrl}/login`);
          }
        }
        return;
      }

      // Fallback: stay on page (localhost without suffix configured)
      setShowOnboarding(false);
      if (registerResult.status.toLowerCase() === "active") {
        setSuccessMessage(
          `Account ready for ${registerResult.email}. You can sign in.`,
        );
      } else {
        const link = registerResult.verificationUrl?.trim();
        if (link) {
          setSuccessMessage(`Verify your email for ${registerResult.email}.`);
          setVerificationLink(link);
        } else {
          setSuccessMessage(
            `You're almost done. We sent a link to ${registerResult.email}. Open it to verify, then sign in.`,
          );
        }
      }
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
        title="Create your account"
        description="Browse the storefront, save carts, and check out pickups with your profile."
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Confirm your email when asked, then sign in — you&apos;ll land in your
        shop dashboard.
      </p>

      {/* Always-visible onboarding CTA — no need to fail first */}
      {!showOnboarding ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--auth-accent)_33%,transparent)] bg-[color-mix(in_srgb,var(--auth-accent)_4%,white)] p-4 backdrop-blur-sm dark:bg-[color-mix(in_srgb,var(--auth-accent)_7%,#18181b)]">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: "var(--auth-accent)",
                color: "var(--auth-accent-ink)",
              }}
            >
              🏪
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                Don&apos;t have a business yet?
              </p>
              <p className="text-[11px] text-muted-foreground">
                Create your shop now and get a free subdomain to start selling.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--auth-accent)_35%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--auth-accent)] transition hover:bg-[color-mix(in_srgb,var(--auth-accent)_10%,transparent)]"
              onClick={() => {
                setShowOnboarding(true);
                setErrorMessage("");
              }}
            >
              Create your shop →
            </button>
          </div>
        </div>
      ) : null}

      {showOnboarding ? (
        <>
          <div className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--auth-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--auth-accent)_6%,white)] p-5 backdrop-blur-md dark:bg-[color-mix(in_srgb,var(--auth-accent)_10%,#18181b)]">
            <h3 className="mb-1 text-sm font-bold text-foreground">
              Name your business
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Pick a name for your shop. You&apos;ll get a free subdomain and
              become the{" "}
              <span className="font-semibold text-foreground">owner</span> — no
              invite token needed.
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
                style={{
                  backgroundColor: "var(--auth-accent)",
                  color: "var(--auth-accent-ink)",
                }}
              >
                {isOnboarding
                  ? "Creating business…"
                  : "Create business & sign up"}
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
            Back to sign up
          </button>
        </>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              htmlFor="signup-name"
            >
              Full name
            </label>
            <input
              id="signup-name"
              className={authInputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              htmlFor="signup-email"
            >
              Email
            </label>
            <input
              id="signup-email"
              className={authInputClassName}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              htmlFor="signup-password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                className={cn(authInputClassName, "pr-12")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
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
              At least 8 characters.
            </p>
          </div>
          <button
            type="submit"
            className={primaryCtaClass}
            disabled={isSubmitting}
            style={{
              backgroundColor: "var(--auth-accent)",
              color: "var(--auth-accent-ink)",
            }}
          >
            {isSubmitting ? "Creating account…" : "Submit"}
          </button>
        </form>
      )}

      {successMessage ? (
        <div className="mt-6 space-y-3">
          <AuthAlert variant="success">{successMessage}</AuthAlert>
          {verificationLink ? (
            <div className="rounded-2xl border border-black/[0.06] bg-white/70 p-4 text-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <p className="font-semibold text-foreground">Verification link</p>
              <a
                href={verificationLink}
                className="mt-2 block break-all font-medium text-[var(--auth-accent)] underline underline-offset-2 hover:opacity-90"
              >
                Open in this browser
              </a>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {verificationLink}
              </p>
            </div>
          ) : null}
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl border-2"
            asChild
          >
            <Link href={APP_ROUTES.login}>Go to sign in</Link>
          </Button>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-5">
          <AuthAlert variant="error">{errorMessage}</AuthAlert>
        </div>
      ) : null}

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-black/[0.06] pt-6 text-sm dark:border-white/10">
        <span className="text-muted-foreground">Already have an account?</span>
        <Link
          href={APP_ROUTES.login}
          className="font-semibold underline decoration-[var(--auth-accent)] decoration-2 underline-offset-4 hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    </AuthSplitShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}

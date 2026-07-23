"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

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
  setSessionTenantId,
} from "@/lib/auth";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  useTenantIdPrefill,
} from "@/lib/auth-tenant-prefill";
import { resendVerificationEmail, verifyEmailAddress } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { markOnboardingTourPending } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";

const REDIRECT_SECONDS = 10;
/** Shop owners verify then sign in with email/password (Office), not till PIN. */
const POST_VERIFY_LOGIN_HREF = `${APP_ROUTES.staffLogin}?mode=office`;

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] text-[15px] font-semibold shadow-md transition hover:bg-[var(--auth-primary-hover)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50";

const fieldLabelClass =
  "mb-1.5 block text-[13px] font-medium text-foreground";

type VerifyPhase = "idle" | "verifying" | "success" | "failed";

function VerifyEmailContent() {
  const tenant = useOptionalTenant();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromQuery = searchParams.get("token") ?? "";
  const emailFromQuery = searchParams.get("email")?.trim() ?? "";

  const [, ensureTenantResolved] = useTenantIdPrefill(tenant?.tenantId);
  const [manualToken, setManualToken] = useState("");
  const [resendEmail, setResendEmail] = useState(emailFromQuery);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendLink, setResendLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoVerifyStarted = useRef(false);

  const hasAutoToken = tokenFromQuery.trim().length >= 16;
  const showManualForm = !hasAutoToken;

  const [verifyPhase, setVerifyPhase] = useState<VerifyPhase>(() =>
    hasAutoToken ? "verifying" : "idle",
  );
  const [redirectSeconds, setRedirectSeconds] = useState(REDIRECT_SECONDS);

  const shopName =
    tenant?.branding?.displayName?.trim() ||
    tenant?.tenantName?.trim() ||
    "your shop";

  const showResend =
    verifyPhase === "failed" ||
    (showManualForm && verifyPhase !== "success" && verifyPhase !== "verifying");

  const persistTenantId = (raw: string) => {
    const id = raw.trim();
    if (id.length > 0) {
      setSessionTenantId(id);
    } else {
      clearSessionTenantId();
    }
  };

  const onVerifySuccess = () => {
    markOnboardingTourPending();
    setMessage("");
    setErrorMessage("");
    setVerifyPhase("success");
    setRedirectSeconds(REDIRECT_SECONDS);
  };

  useEffect(() => {
    if (verifyPhase !== "success") {
      return;
    }
    if (redirectSeconds <= 0) {
      router.replace(POST_VERIFY_LOGIN_HREF);
      return;
    }
    const timer = window.setTimeout(() => {
      setRedirectSeconds((current) => current - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [verifyPhase, redirectSeconds, router]);

  useEffect(() => {
    const token = tokenFromQuery.trim();
    if (token.length < 16 || autoVerifyStarted.current) {
      return;
    }
    autoVerifyStarted.current = true;
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    setVerifyPhase("verifying");
    void (async () => {
      try {
        const id = await ensureTenantResolved();
        if (!id?.trim()) {
          autoVerifyStarted.current = false;
          setVerifyPhase("failed");
          setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
          return;
        }
        await verifyEmailAddress(token, { toast: false });
        onVerifySuccess();
      } catch (error: unknown) {
        autoVerifyStarted.current = false;
        setVerifyPhase("failed");
        setErrorMessage(
          error instanceof Error ? error.message : "Verification failed.",
        );
      } finally {
        setBusy(false);
      }
    })();
  }, [tokenFromQuery, ensureTenantResolved]);

  const onVerifyManual = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = manualToken.trim();
    if (token.length < 16) {
      setErrorMessage(
        "That code looks too short. Paste the full token from your email.",
      );
      return;
    }
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    setVerifyPhase("verifying");
    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        setVerifyPhase("failed");
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      await verifyEmailAddress(token, { toast: false });
      onVerifySuccess();
    } catch (error) {
      setVerifyPhase("failed");
      setErrorMessage(
        error instanceof Error ? error.message : "Verification failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    setResendLink(null);
    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      const out = await resendVerificationEmail(resendEmail.trim());
      if (out.verificationUrl?.trim()) {
        setMessage(
          "A new verification link is ready. Open it below (shown when mail delivery is unavailable).",
        );
        setResendLink(out.verificationUrl.trim());
      } else {
        setResendLink(null);
        setMessage(
          "If that email has a pending signup for this shop, we sent a fresh link. Check your inbox and spam folder.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not resend.",
      );
    } finally {
      setBusy(false);
    }
  };

  const headerTitle = (() => {
    if (verifyPhase === "success") return "Email verified";
    if (hasAutoToken && verifyPhase === "verifying") return "Verifying…";
    if (hasAutoToken && verifyPhase === "failed") return "Link expired";
    return "Check your email";
  })();

  const headerDescription = (() => {
    if (verifyPhase === "success") {
      return "You're in. Next up: sign in to your office dashboard.";
    }
    if (hasAutoToken && verifyPhase === "verifying") {
      return "Confirming your verification link…";
    }
    if (hasAutoToken && verifyPhase === "failed") {
      return "This link is invalid or has expired. Request a new one below.";
    }
    return `A verification link is on its way${emailFromQuery ? "" : " to your inbox"}. Open it to activate ${shopName}.`;
  })();

  return (
    <AuthSplitShell tenant={tenant}>
      <AuthPageHeader title={headerTitle} description={headerDescription} />

      {showManualForm && verifyPhase !== "success" ? (
        <>
          <div className="mt-5 rounded-2xl border border-[var(--auth-accent)]/25 bg-[color-mix(in_srgb,var(--auth-accent)_8%,white)] p-4 dark:bg-[color-mix(in_srgb,var(--auth-accent)_12%,#18181b)]">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] shadow-sm">
                <Mail className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  We sent you a link
                </p>
                {emailFromQuery ? (
                  <p className="mt-1 break-all text-sm font-medium text-foreground">
                    {emailFromQuery}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check the inbox you used to sign up.
                  </p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Open the message from{" "}
                  <span className="font-medium text-foreground">UB</span>, then
                  tap{" "}
                  <span className="font-medium text-foreground">
                    Confirm your email
                  </span>
                  . Prefer not to leave this page? Paste the code below instead.
                </p>
              </div>
            </div>
          </div>

          <form className="mt-6 space-y-3" onSubmit={onVerifyManual}>
            <div>
              <label className={fieldLabelClass} htmlFor="verify-token">
                Verification code
              </label>
              <input
                id="verify-token"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                spellCheck={false}
                className={cn(authInputClassName, "font-mono text-sm")}
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
                placeholder="Paste the code from your email"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                From the verification email — or open the link there to finish
                automatically.
              </p>
            </div>
            <button
              type="submit"
              className={primaryCtaClass}
              disabled={busy || verifyPhase === "verifying"}
            >
              {busy && verifyPhase === "verifying" ? "Verifying…" : "Verify email"}
            </button>
          </form>
        </>
      ) : null}

      {hasAutoToken && verifyPhase === "verifying" ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Verifying link…
        </p>
      ) : null}

      {verifyPhase === "success" ? (
        <div className="mt-5">
          <AuthAlert variant="success">
            Redirecting to staff sign-in in{" "}
            <span className="font-semibold tabular-nums">{redirectSeconds}</span>
            {redirectSeconds === 1 ? " second" : " seconds"}.
          </AuthAlert>
          <Link
            href={POST_VERIFY_LOGIN_HREF}
            className={cn(primaryCtaClass, "mt-4")}
          >
            Continue to sign in
          </Link>
        </div>
      ) : null}

      {message && verifyPhase !== "success" ? (
        <div className="mt-4 space-y-3">
          <AuthAlert variant="success">{message}</AuthAlert>
          {resendLink ? (
            <div className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">Verification link</p>
              <a
                href={resendLink}
                className="mt-2 block break-all text-primary underline underline-offset-2"
              >
                Open in this browser
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {errorMessage && verifyPhase !== "success" ? (
        <div className="mt-4">
          <AuthAlert variant="error">{errorMessage}</AuthAlert>
        </div>
      ) : null}

      {showResend ? (
        <form
          className="mt-8 space-y-3 border-t border-border/60 pt-6"
          onSubmit={onResend}
        >
          <p className="text-sm font-semibold text-foreground">
            Didn&apos;t get the email?
          </p>
          <p className="text-xs text-muted-foreground">
            Check spam, or resend to the address you used when signing up.
          </p>
          <div>
            <label className={fieldLabelClass} htmlFor="resend-email">
              Email
            </label>
            <input
              id="resend-email"
              type="email"
              className={authInputClassName}
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <Button
            className="h-11 w-full rounded-2xl"
            type="submit"
            variant="outline"
            disabled={busy}
          >
            {busy && verifyPhase !== "verifying"
              ? "Sending…"
              : "Resend verification link"}
          </Button>
        </form>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already verified?{" "}
        <Link
          href={POST_VERIFY_LOGIN_HREF}
          className="font-medium text-[var(--auth-accent)] underline-offset-2 hover:underline"
        >
          Staff sign in
        </Link>
      </p>
    </AuthSplitShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

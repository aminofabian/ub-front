"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthBranding } from "@/components/auth/auth-branding";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
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

const REDIRECT_SECONDS = 10;
/** Shop owners verify then sign in with email/password (Office), not till PIN. */
const POST_VERIFY_LOGIN_HREF = `${APP_ROUTES.staffLogin}?mode=office`;

type VerifyPhase = "idle" | "verifying" | "success" | "failed";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromQuery = searchParams.get("token") ?? "";

  const [, ensureTenantResolved] = useTenantIdPrefill();
  const [manualToken, setManualToken] = useState("");
  const [resendEmail, setResendEmail] = useState("");
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

  const onVerifyManual = async () => {
    const token = manualToken.trim();
    if (token.length < 16) {
      setErrorMessage("Token is too short or missing.");
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
      setErrorMessage(error instanceof Error ? error.message : "Verification failed.");
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
          "A new verification link was issued. Open it below (shown because the API is configured to return it when mail is unavailable).",
        );
        setResendLink(out.verificationUrl.trim());
      } else {
        setResendLink(null);
        setMessage(
          "If that email has a pending registration for this tenant, we sent a new link.",
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not resend.");
    } finally {
      setBusy(false);
    }
  };

  const headerDescription = (() => {
    if (verifyPhase === "success") {
      return "Your email is verified.";
    }
    if (hasAutoToken && verifyPhase === "verifying") {
      return "Verifying your email link…";
    }
    if (hasAutoToken && verifyPhase === "failed") {
      return "This verification link is invalid or has expired. Request a new message below, or sign in if you already verified.";
    }
    return "Open the link from your email, paste the token, or resend the message for this shop.";
  })();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <AuthBranding />
      <AuthCard>
        <AuthPageHeader title="Verify email" description={headerDescription} />

        {showManualForm ? (
          <>
            <label className="mt-5 block text-sm font-medium" htmlFor="verify-token">
              Token from email
            </label>
            <textarea
              id="verify-token"
              className="mt-1 min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={manualToken}
              onChange={(event) => setManualToken(event.target.value)}
              placeholder="Paste the long token from the verification link"
            />
            <Button
              className="mt-3 w-full"
              type="button"
              disabled={busy || verifyPhase === "success"}
              onClick={() => void onVerifyManual()}
            >
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </>
        ) : verifyPhase === "verifying" ? (
          <p className="mt-5 text-sm text-muted-foreground">Verifying link…</p>
        ) : null}

        {verifyPhase === "success" ? (
          <div className="mt-5">
            <AuthAlert variant="success">
              You&apos;ll be redirected to the sign-in page in{" "}
              <span className="font-semibold tabular-nums">{redirectSeconds}</span>
              {redirectSeconds === 1 ? " second" : " seconds"}.
            </AuthAlert>
          </div>
        ) : null}

        {message && verifyPhase !== "success" ? (
          <div className="mt-4 space-y-3">
            <AuthAlert variant="success">{message}</AuthAlert>
            {resendLink ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">Verification link</p>
                <a
                  href={resendLink}
                  className="mt-2 block break-all text-primary underline underline-offset-2"
                >
                  Open in this browser
                </a>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  {resendLink}
                </p>
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
          <form className="mt-8 space-y-2 border-t border-border/60 pt-6" onSubmit={onResend}>
            <p className="text-sm font-medium text-foreground">Resend verification</p>
            <label className="text-sm font-medium" htmlFor="resend-email">
              Email
            </label>
            <input
              id="resend-email"
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              required
            />
            <Button className="w-full" type="submit" variant="outline" disabled={busy}>
              Send again
            </Button>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm">
          <Link
            href={POST_VERIFY_LOGIN_HREF}
            className="font-medium text-primary underline underline-offset-2"
          >
            Back to staff sign in
          </Link>
        </p>
      </AuthCard>
    </div>
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
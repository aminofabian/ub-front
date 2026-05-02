"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthBranding } from "@/components/auth/auth-branding";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { TenantIdField } from "@/components/auth/tenant-id-field";
import { Button } from "@/components/ui/button";
import {
  clearSessionTenantId,
  getSessionTenantId,
  setSessionTenantId,
} from "@/lib/auth";
import { resendVerificationEmail, verifyEmailAddress } from "@/lib/api";
import { APP_ROUTES, PUBLIC_TENANT_ID } from "@/lib/config";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromQuery = searchParams.get("token") ?? "";

  const [tenantId, setTenantId] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const autoVerifyStarted = useRef(false);

  useEffect(() => {
    if (PUBLIC_TENANT_ID.length > 0) {
      setTenantId(PUBLIC_TENANT_ID);
      return;
    }
    const stored = getSessionTenantId();
    if (stored) {
      setTenantId(stored);
    }
  }, []);

  const persistTenantId = (raw: string) => {
    const id = raw.trim();
    if (id.length > 0) {
      setSessionTenantId(id);
    } else {
      clearSessionTenantId();
    }
  };

  useEffect(() => {
    const token = tokenFromQuery.trim();
    if (token.length < 16 || autoVerifyStarted.current) {
      return;
    }
    autoVerifyStarted.current = true;
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    verifyEmailAddress(token)
      .then(() => {
        setMessage("Your email is verified. You can sign in.");
        router.replace(APP_ROUTES.login);
      })
      .catch((error: unknown) => {
        autoVerifyStarted.current = false;
        setErrorMessage(error instanceof Error ? error.message : "Verification failed.");
      })
      .finally(() => setBusy(false));
  }, [tokenFromQuery, router]);

  const onVerifyManual = async () => {
    const token = manualToken.trim();
    if (token.length < 16) {
      setErrorMessage("Token is too short or missing.");
      return;
    }
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    try {
      await verifyEmailAddress(token);
      setMessage("Your email is verified. You can sign in.");
      router.replace(APP_ROUTES.login);
    } catch (error) {
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
    try {
      persistTenantId(tenantId);
      await resendVerificationEmail(resendEmail.trim());
      setMessage(
        "If that email has a pending registration for this tenant, we sent a new link.",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not resend.");
    } finally {
      setBusy(false);
    }
  };

  const showManualForm = tokenFromQuery.trim().length < 16;

  return (
    <>
      <AuthBranding />
      <AuthCard>
        <AuthPageHeader
          title="Verify email"
          description="Open the link from your email, paste the token, or resend the message. Resend uses the business ID below."
        />

        <TenantIdField value={tenantId} onChange={setTenantId} />

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
              disabled={busy}
              onClick={() => void onVerifyManual()}
            >
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">{busy ? "Verifying link…" : null}</p>
        )}

        {message ? (
          <div className="mt-4">
            <AuthAlert variant="success">{message}</AuthAlert>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-4">
            <AuthAlert variant="error">{errorMessage}</AuthAlert>
          </div>
        ) : null}

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

        <p className="mt-6 text-center text-sm">
          <Link href={APP_ROUTES.login} className="font-medium text-primary underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    </>
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

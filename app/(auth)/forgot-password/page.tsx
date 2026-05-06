"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

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
import { requestPasswordReset } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

function ForgotPasswordPageContent() {
  const [, ensureTenantResolved] = useTenantIdPrefill();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      await requestPasswordReset(email.trim());
      setDone(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthBranding />
      <AuthCard>
        <AuthPageHeader
          title="Forgot password"
          description="We’ll email a reset link if this address has a password on this tenant. For security we always show the same confirmation."
        />

        {done ? (
          <div className="mt-5">
            <AuthAlert variant="success">
              If an account exists for that email, we sent reset instructions. You can close this tab
              and check your inbox.
            </AuthAlert>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link href={APP_ROUTES.login}>Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={onSubmit}>
            <label className="text-sm font-medium" htmlFor="forgot-email">
              Email
            </label>
            <input
              id="forgot-email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        {errorMessage ? (
          <div className="mt-4">
            <AuthAlert variant="error">{errorMessage}</AuthAlert>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm">
          <Link href={APP_ROUTES.login} className="font-medium text-primary underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ForgotPasswordPageContent />
    </Suspense>
  );
}

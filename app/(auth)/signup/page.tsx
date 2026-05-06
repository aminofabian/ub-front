"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthBranding } from "@/components/auth/auth-branding";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
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
import { registerAccount } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

function SignupPageContent() {
  const [, ensureTenantResolved] = useTenantIdPrefill();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (getSessionTokens()) {
      router.replace(APP_ROUTES.business);
    }
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
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      const result = await registerAccount(name.trim(), email.trim(), password);
      if (result.status.toLowerCase() === "active") {
        setVerificationLink(null);
        setSuccessMessage(`Account ready for ${result.email}. You can sign in.`);
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
      setErrorMessage(error instanceof Error ? error.message : "Sign up failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthBranding />
      <AuthCard>
        <AuthPageHeader
          title="Create account"
          description={
            <>
              Join an existing business on this shop. You&apos;ll get the{" "}
              <strong className="font-medium text-foreground">viewer</strong> role until an owner changes it.
            </>
          }
        />

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="text-sm font-medium" htmlFor="signup-name">
            Full name
          </label>
          <input
            id="signup-name"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
          <label className="text-sm font-medium" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <label className="text-sm font-medium" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating account…" : "Sign up"}
          </Button>
        </form>

        {successMessage ? (
          <div className="mt-4 space-y-3">
            <AuthAlert variant="success">{successMessage}</AuthAlert>
            {verificationLink ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">Verification link</p>
                <a
                  href={verificationLink}
                  className="mt-2 block break-all text-primary underline underline-offset-2"
                >
                  Open in this browser
                </a>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{verificationLink}</p>
              </div>
            ) : null}
            <Button variant="outline" className="w-full" asChild>
              <Link href={APP_ROUTES.login}>Go to sign in</Link>
            </Button>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4">
            <AuthAlert variant="error">{errorMessage}</AuthAlert>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href={APP_ROUTES.login} className="font-medium text-primary underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthBranding } from "@/components/auth/auth-branding";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { TenantIdField } from "@/components/auth/tenant-id-field";
import { Button } from "@/components/ui/button";
import {
  clearSessionTenantId,
  getSessionTenantId,
  getSessionTokens,
  setSessionTenantId,
} from "@/lib/auth";
import { registerAccount } from "@/lib/api";
import { APP_ROUTES, PUBLIC_TENANT_ID } from "@/lib/config";

export default function SignupPage() {
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (getSessionTokens()) {
      router.replace(APP_ROUTES.business);
    }
  }, [router]);

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

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      persistTenantId(tenantId);
      const result = await registerAccount(name.trim(), email.trim(), password);
      if (result.status.toLowerCase() === "active") {
        setSuccessMessage(`Account ready for ${result.email}. You can sign in.`);
      } else {
        setSuccessMessage(
          `You're almost done. We sent a link to ${result.email}. Open it to verify, then sign in.`,
        );
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
              Join an existing business using its tenant ID. You&apos;ll get the{" "}
              <strong className="font-medium text-foreground">viewer</strong> role until an owner changes it.
            </>
          }
        />

        <TenantIdField value={tenantId} onChange={setTenantId} />

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

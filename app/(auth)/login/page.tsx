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
import { loginWithPassword, loginWithPin } from "@/lib/api";
import { APP_ROUTES, PUBLIC_TENANT_ID } from "@/lib/config";

const AUTH_MODE = {
  password: "password",
  pin: "pin",
} as const;

type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>(AUTH_MODE.password);
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [branchId, setBranchId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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

  const onPasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      persistTenantId(tenantId);
      await loginWithPassword(email, password);
      router.push(APP_ROUTES.business);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPinLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      persistTenantId(tenantId);
      await loginWithPin(email, pin, branchId);
      router.push(APP_ROUTES.products);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "PIN login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthBranding />
      <AuthCard>
        <AuthPageHeader
          title="Sign in"
          description="Use email and password for owners and staff, or PIN for cashiers on a branch."
        />

        <TenantIdField value={tenantId} onChange={setTenantId} />

        <p className="mt-4 text-sm">
          New here?{" "}
          <Link href={APP_ROUTES.signup} className="font-medium text-primary underline underline-offset-2">
            Create an account
          </Link>
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant={mode === AUTH_MODE.password ? "default" : "outline"}
            onClick={() => setMode(AUTH_MODE.password)}
            type="button"
            size="sm"
          >
            Email & password
          </Button>
          <Button
            variant={mode === AUTH_MODE.pin ? "default" : "outline"}
            onClick={() => setMode(AUTH_MODE.pin)}
            type="button"
            size="sm"
          >
            PIN login
          </Button>
        </div>

        {mode === AUTH_MODE.password ? (
          <form className="mt-5 space-y-3" onSubmit={onPasswordLogin}>
            <label className="text-sm font-medium" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              type="email"
              placeholder="you@business.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor="login-password">
                Password
              </label>
              <Link
                href={APP_ROUTES.forgotPassword}
                className="text-xs font-medium text-primary underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={onPinLogin}>
            <label className="text-sm font-medium" htmlFor="pin-login-email">
              Email
            </label>
            <input
              id="pin-login-email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              type="email"
              placeholder="Cashier email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
            <label className="text-sm font-medium" htmlFor="pin-branch-id">
              Branch ID
            </label>
            <input
              id="pin-branch-id"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              type="text"
              placeholder="Branch UUID"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              autoComplete="off"
              required
            />
            <label className="text-sm font-medium" htmlFor="pin-value">
              PIN
            </label>
            <input
              id="pin-value"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              type="password"
              placeholder="4–6 digits"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in…" : "Sign in with PIN"}
            </Button>
          </form>
        )}

        {errorMessage ? (
          <div className="mt-4">
            <AuthAlert variant="error">{errorMessage}</AuthAlert>
          </div>
        ) : null}
      </AuthCard>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href={APP_ROUTES.verifyEmail} className="underline underline-offset-2">
          Verify email or resend link
        </Link>
      </p>
    </>
  );
}

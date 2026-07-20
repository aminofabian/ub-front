"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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
import { resetPasswordWithToken } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromQuery = searchParams.get("token") ?? "";
  const [, ensureTenantResolved] = useTenantIdPrefill();

  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  useEffect(() => {
    void ensureTenantResolved();
  }, [ensureTenantResolved]);

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
    setErrorMessage("");
    setMessage("");
    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const id = await ensureTenantResolved();
      if (!id?.trim()) {
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      persistTenantId(id);
      await resetPasswordWithToken(token.trim(), password);
      setMessage("Password updated. Redirecting to sign in…");
      router.replace(APP_ROUTES.login);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <AuthBranding />
      <AuthCard>
        <AuthPageHeader
          title="Set new password"
          description="Choose a new password for your account. This link expires after a short time."
        />

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="text-sm font-medium" htmlFor="reset-token">
            Reset token
          </label>
          <textarea
            id="reset-token"
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="From the email link"
            required
          />
          <label className="text-sm font-medium" htmlFor="reset-password">
            New password
          </label>
          <input
            id="reset-password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <label className="text-sm font-medium" htmlFor="reset-confirm">
            Confirm password
          </label>
          <input
            id="reset-confirm"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </Button>
        </form>

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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href={APP_ROUTES.login}
            className="font-medium text-primary underline underline-offset-2"
          >
            Customer sign-in
          </Link>
          {" · "}
          <Link
            href={APP_ROUTES.staffLogin}
            className="font-medium text-primary underline underline-offset-2"
          >
            Staff sign-in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

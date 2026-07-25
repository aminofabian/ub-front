"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBranding } from "@/components/auth/auth-branding";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { loginSupplierPortal } from "@/lib/marketplace-api";

export default function SupplierPortalLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await loginSupplierPortal(identifier, password);
      router.push(APP_ROUTES.supplierPortalOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <AuthBranding tagline="Supplier portal" showApiHint />
      <AuthCard>
        <AuthPageHeader
          title="Supplier sign in"
          description="Use the phone number you claimed with, or the email you added — plus your password."
        />
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="text-sm font-medium" htmlFor="sp-identifier">
            Phone or email
          </label>
          <input
            id="sp-identifier"
            type="text"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            value={identifier}
            onChange={(ev) => setIdentifier(ev.target.value)}
            autoComplete="username"
            placeholder="07… / 2547… or you@email.com"
            required
          />
          <label className="text-sm font-medium" htmlFor="sp-password">
            Password
          </label>
          <input
            id="sp-password"
            type="password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        {error ? (
          <div className="mt-4">
            <AuthAlert variant="error">{error}</AuthAlert>
          </div>
        ) : null}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href={APP_ROUTES.supplierPortalClaim} className="underline underline-offset-2">
            Claim with phone
          </Link>
          {" · "}
          <Link href="/" className="underline underline-offset-2">
            Business app home
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

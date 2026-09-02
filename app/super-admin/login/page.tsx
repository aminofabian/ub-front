"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthBranding } from "@/components/auth/auth-branding";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_ROUTES } from "@/lib/config";
import { loginSuperAdmin, saDeskHome } from "@/lib/super-admin-api";
import { getSuperAdminAccessToken } from "@/lib/super-admin-session";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getSuperAdminAccessToken()) {
      router.replace(APP_ROUTES.superAdminDashboard);
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await loginSuperAdmin(email, password);
      router.push(saDeskHome(result.deskRole));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <AuthBranding tagline="Super admin" showApiHint />
      <AuthCard>
        <AuthPageHeader
          title="Super-admin sign in"
          description="Platform operator access. Creates and manages tenants (businesses). Separate from shop staff login."
        />
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="sa-email">Email</Label>
            <Input
              id="sa-email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-password">Password</Label>
            <Input
              id="sa-password"
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
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
          <Link href="/" className="underline underline-offset-2">
            Tenant app home
          </Link>
          {" · "}
          <Link href={APP_ROUTES.staffLogin} className="underline underline-offset-2">
            Shop staff sign in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

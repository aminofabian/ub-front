"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, User } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type SuperAdminMe,
  changeSuperAdminPassword,
  fetchSuperAdminMe,
} from "@/lib/super-admin-api";

export default function SuperAdminSettingsPage() {
  const [me, setMe] = useState<SuperAdminMe | null>(null);
  const [loadError, setLoadError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setMe(await fetchSuperAdminMe());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load profile.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await changeSuperAdminPassword(currentPassword, newPassword);
      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed.");
    } finally {
      setBusy(false);
    }
  };

  const isPasswordFormValid =
    currentPassword.trim().length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword.length > 0;

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Profile & security"
        description="Manage your super admin identity and credentials. This account is separate from tenant shop staff."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {me ? (
          <Card className="border-border/70 shadow-sm lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <User className="size-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="font-heading text-lg">Profile</CardTitle>
                  <CardDescription>Operator identity on the platform.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</dt>
                  <dd className="text-sm font-medium">{me.name}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</dt>
                  <dd className="text-sm font-medium">{me.email}</dd>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Super Admin ID
                  </dt>
                  <dd className="break-all font-mono text-xs text-muted-foreground">{me.superAdminId}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : loadError ? null : (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading profile…</CardContent>
          </Card>
        )}

        <Card className="border-border/70 shadow-sm lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
                <KeyRound className="size-4" aria-hidden />
              </span>
              <div>
                <CardTitle className="font-heading text-lg">Change password</CardTitle>
                <CardDescription>Use a strong password that you don&apos;t reuse elsewhere.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}
            {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

            <form className="space-y-4" onSubmit={onChangePassword}>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="sa-cur-pw">
                  Current password
                </label>
                <Input
                  id="sa-cur-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(ev) => setCurrentPassword(ev.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="sa-new-pw">
                  New password
                </label>
                <Input
                  id="sa-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(ev) => setNewPassword(ev.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="sa-confirm-pw">
                  Confirm new password
                </label>
                <Input
                  id="sa-confirm-pw"
                  type="password"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={busy || !isPasswordFormValid}>
                {busy ? "Changing…" : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

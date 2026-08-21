"use client";

import { useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Profile"
        description="This account is separate from tenant shop staff."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="border-b border-border/60 px-4 py-4 sm:px-5">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Identity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Operator on the Kiosk platform.</p>
          </div>
          <div className="px-4 py-5 sm:px-5">
            {me ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">Name</dt>
                  <dd className="text-sm font-medium">{me.name}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="text-sm font-medium">{me.email}</dd>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Super admin ID</dt>
                  <dd className="break-all font-mono text-xs text-muted-foreground">{me.superAdminId}</dd>
                </div>
              </dl>
            ) : loadError ? null : (
              <p className="text-sm text-muted-foreground">Loading profile…</p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="border-b border-border/60 px-4 py-4 sm:px-5">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Password</h2>
            <p className="mt-1 text-sm text-muted-foreground">At least 8 characters. Don’t reuse a shop password.</p>
          </div>
          <div className="space-y-4 px-4 py-5 sm:px-5">
            {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}
            {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

            <form className="space-y-4" onSubmit={onChangePassword}>
              <div className="space-y-2">
                <Label htmlFor="sa-cur-pw">Current password</Label>
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
                <Label htmlFor="sa-new-pw">New password</Label>
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
                <Label htmlFor="sa-confirm-pw">Confirm new password</Label>
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
          </div>
        </section>
      </div>
    </div>
  );
}

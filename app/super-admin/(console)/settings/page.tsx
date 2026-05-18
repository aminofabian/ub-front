"use client";

import { useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your super admin account.
        </p>
      </div>

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      {/* Profile card */}
      {me ? (
        <section className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium">Profile</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-medium">{me.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm font-medium">{me.email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-muted-foreground">
                Super Admin ID
              </dt>
              <dd className="mt-1 font-mono text-xs text-muted-foreground">
                {me.superAdminId}
              </dd>
            </div>
          </dl>
        </section>
      ) : loadError ? null : (
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      {/* Change password */}
      <section className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a strong password that you don&apos;t use elsewhere.
        </p>

        {success ? (
          <div className="mt-4">
            <AuthAlert variant="success">{success}</AuthAlert>
          </div>
        ) : null}
        {error ? (
          <div className="mt-4">
            <AuthAlert variant="error">{error}</AuthAlert>
          </div>
        ) : null}

        <form className="mt-4 grid gap-3 sm:max-w-md" onSubmit={onChangePassword}>
          <label>
            <span className="text-sm font-medium">Current password</span>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={currentPassword}
              onChange={(ev) => setCurrentPassword(ev.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            <span className="text-sm font-medium">New password</span>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            <span className="text-sm font-medium">Confirm new password</span>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              required
              autoComplete="new-password"
            />
          </label>
          <div>
            <Button type="submit" disabled={busy || !isPasswordFormValid}>
              {busy ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

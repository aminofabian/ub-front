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
  fetchPlatformIntegrations,
  fetchSuperAdminMe,
  sendSuperAdminTestSms,
  updateSuperAdminProfile,
} from "@/lib/super-admin-api";

const PROVIDER_LABELS: Record<string, string> = {
  sozuri: "Sozuri",
  textsms: "TextSMS",
  africas_talking: "Africa's Talking",
};

export default function SuperAdminSettingsPage() {
  const [me, setMe] = useState<SuperAdminMe | null>(null);
  const [loadError, setLoadError] = useState("");

  const [phone, setPhone] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [smsProvider, setSmsProvider] = useState<string | null>(null);
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const [testError, setTestError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const profile = await fetchSuperAdminMe();
      setMe(profile);
      setPhone(profile.phone ?? "");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load profile.");
    }
    try {
      const integrations = await fetchPlatformIntegrations();
      const provider = integrations.smsProvider?.trim().toLowerCase() || "";
      setSmsProvider(provider || null);
      if (provider === "sozuri") {
        setSmsConfigured(integrations.hasSozuriApiKey || integrations.envSozuriConfigured);
      } else if (provider === "textsms") {
        setSmsConfigured(integrations.hasTextsmsApiKey || integrations.envTextsmsConfigured);
      } else if (provider === "africas_talking") {
        setSmsConfigured(true); // credentials come from server env
      } else {
        setSmsConfigured(false);
      }
    } catch {
      setSmsProvider(null);
      setSmsConfigured(null);
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

  const onSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    setPhoneSaved(false);
    setPhoneBusy(true);
    try {
      const next = await updateSuperAdminProfile({ phone: phone.trim() });
      setMe(next);
      setPhone(next.phone ?? "");
      setPhoneSaved(true);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Could not save phone.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const onTestSms = async () => {
    setTestError("");
    setTestResult("");
    setTesting(true);
    try {
      // Test goes to the number in the box — persist it first if unsaved.
      if (phone.trim() !== (me?.phone ?? "")) {
        const next = await updateSuperAdminProfile({ phone: phone.trim() });
        setMe(next);
        setPhone(next.phone ?? "");
      }
      const result = await sendSuperAdminTestSms();
      setTestResult(
        result.outcome === "sent"
          ? `Test SMS sent via ${result.channel} to ${result.phoneMasked}.`
          : `Test SMS ${result.outcome} via ${result.channel}.${result.detail ? ` ${result.detail}` : ""}`,
      );
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Could not send test SMS.");
    } finally {
      setTesting(false);
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

            <form
              className="mt-5 space-y-3 border-t border-border/60 pt-5"
              onSubmit={onSavePhone}
            >
              <div className="space-y-1.5">
                <Label htmlFor="sa-alert-phone">SMS alert phone</Label>
                <Input
                  id="sa-alert-phone"
                  type="tel"
                  value={phone}
                  onChange={(ev) => {
                    setPhone(ev.target.value);
                    setPhoneSaved(false);
                    setTestResult("");
                    setTestError("");
                  }}
                  placeholder="0712 345 678"
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Receive an SMS when a tenant activates Kiosk Pay or purchases a custom domain.
                  Leave blank to turn these alerts off.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Platform SMS:{" "}
                {smsConfigured === null ? (
                  <span className="text-muted-foreground/80">status unavailable</span>
                ) : smsConfigured ? (
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {PROVIDER_LABELS[smsProvider ?? ""] ?? "Configured"}
                  </span>
                ) : (
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    not configured — set one under Platform → Integrations
                  </span>
                )}
              </p>
              {phoneError ? <AuthAlert variant="error">{phoneError}</AuthAlert> : null}
              {phoneSaved ? (
                <AuthAlert variant="success">SMS alert phone saved.</AuthAlert>
              ) : null}
              {testError ? <AuthAlert variant="error">{testError}</AuthAlert> : null}
              {testResult ? <AuthAlert variant="success">{testResult}</AuthAlert> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" size="sm" disabled={phoneBusy}>
                  {phoneBusy ? "Saving…" : "Save alert phone"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={testing || !phone.trim()}
                  onClick={() => void onTestSms()}
                >
                  {testing ? "Sending…" : "Send test SMS"}
                </Button>
              </div>
            </form>
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

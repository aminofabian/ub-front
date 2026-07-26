"use client";

import { useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchSupplierPortalSettings,
  updateSupplierPortalSettings,
  type SupplierPortalSettingsRecord,
} from "@/lib/super-admin-api";

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
      </span>
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function SuperAdminSupplierPortalSettingsPage() {
  const [settings, setSettings] = useState<SupplierPortalSettingsRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [portalEnabled, setPortalEnabled] = useState(true);
  const [allowSelfClaim, setAllowSelfClaim] = useState(true);
  const [allowProfileEdits, setAllowProfileEdits] = useState(true);
  const [allowPaymentDetailEdits, setAllowPaymentDetailEdits] = useState(true);
  const [allowProductEdits, setAllowProductEdits] = useState(true);
  const [requireStoreApprovalProductEdits, setRequireStoreApprovalProductEdits] = useState(false);
  const [allowInvoiceDownloads, setAllowInvoiceDownloads] = useState(true);
  const [allowStatementDownloads, setAllowStatementDownloads] = useState(true);
  const [portalPublicUrl, setPortalPublicUrl] = useState("https://kiosk.ke/supplier-portal");
  const [claimEnabled, setClaimEnabled] = useState(true);
  const [claimMethod, setClaimMethod] = useState("phone_code");
  const [codeLength, setCodeLength] = useState(6);
  const [codeExpiryMinutes, setCodeExpiryMinutes] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [lockDurationMinutes, setLockDurationMinutes] = useState(15);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(60);
  const [autoLoginAfterSetup, setAutoLoginAfterSetup] = useState(true);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [passwordRequireNumber, setPasswordRequireNumber] = useState(false);
  const [passwordRequireUppercase, setPasswordRequireUppercase] = useState(false);
  const [passwordRequireSpecial, setPasswordRequireSpecial] = useState(false);
  const [invitationMessageTemplate, setInvitationMessageTemplate] = useState("");
  const [smsTemplate, setSmsTemplate] = useState("");
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState("");
  const [emailBodyTemplate, setEmailBodyTemplate] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  const applySettings = useCallback((row: SupplierPortalSettingsRecord) => {
    setSettings(row);
    setPortalEnabled(row.portalEnabled);
    setAllowSelfClaim(row.allowSelfClaim);
    setAllowProfileEdits(row.allowProfileEdits);
    setAllowPaymentDetailEdits(row.allowPaymentDetailEdits);
    setAllowProductEdits(row.allowProductEdits);
    setRequireStoreApprovalProductEdits(row.requireStoreApprovalProductEdits);
    setAllowInvoiceDownloads(row.allowInvoiceDownloads);
    setAllowStatementDownloads(row.allowStatementDownloads);
    setPortalPublicUrl(row.portalPublicUrl || "https://kiosk.ke/supplier-portal");
    setClaimEnabled(row.claimEnabled);
    setClaimMethod(row.claimMethod || "phone_code");
    setCodeLength(row.codeLength || 6);
    setCodeExpiryMinutes(row.codeExpiryMinutes || 30);
    setMaxAttempts(row.maxAttempts || 5);
    setLockDurationMinutes(row.lockDurationMinutes || 15);
    setResendCooldownSeconds(row.resendCooldownSeconds ?? 60);
    setAutoLoginAfterSetup(row.autoLoginAfterSetup);
    setPasswordMinLength(row.passwordMinLength || 8);
    setPasswordRequireNumber(row.passwordRequireNumber);
    setPasswordRequireUppercase(row.passwordRequireUppercase);
    setPasswordRequireSpecial(row.passwordRequireSpecial);
    setInvitationMessageTemplate(row.invitationMessageTemplate ?? "");
    setSmsTemplate(row.smsTemplate ?? "");
    setEmailSubjectTemplate(row.emailSubjectTemplate ?? "");
    setEmailBodyTemplate(row.emailBodyTemplate ?? "");
    setSupportPhone(row.supportPhone ?? "");
    setSupportEmail(row.supportEmail ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      applySettings(await fetchSupplierPortalSettings());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load settings.");
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const updated = await updateSupplierPortalSettings({
        portalEnabled,
        allowSelfClaim,
        allowProfileEdits,
        allowPaymentDetailEdits,
        allowProductEdits,
        requireStoreApprovalProductEdits,
        allowInvoiceDownloads,
        allowStatementDownloads,
        portalPublicUrl: portalPublicUrl.trim(),
        claimEnabled,
        claimMethod,
        codeLength,
        codeExpiryMinutes,
        maxAttempts,
        lockDurationMinutes,
        resendCooldownSeconds,
        autoLoginAfterSetup,
        passwordMinLength,
        passwordRequireNumber,
        passwordRequireUppercase,
        passwordRequireSpecial,
        invitationMessageTemplate,
        smsTemplate,
        emailSubjectTemplate,
        emailBodyTemplate,
        supportPhone: supportPhone.trim() || null,
        supportEmail: supportEmail.trim() || null,
      });
      applySettings(updated);
      setSuccess("Supplier Portal settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-4">
        <SuperAdminPageHeader title="Supplier Portal" description="Platform claim and permission settings." />
        <AuthAlert variant="error">{loadError}</AuthAlert>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <SuperAdminPageHeader title="Supplier Portal" description="Platform claim and permission settings." />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={onSave}>
      <SuperAdminPageHeader
        title="Supplier Portal"
        description="Control claim methods, OTP rules, templates, and what suppliers may edit or download."
        actions={
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Master switches for the authenticated portal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <ToggleRow
            id="portal-enabled"
            label="Enable Supplier Portal"
            description="Kill switch for login and claim."
            checked={portalEnabled}
            onChange={setPortalEnabled}
          />
          <ToggleRow
            id="allow-self-claim"
            label="Allow supplier self-claim"
            description="Phone OTP path without an invite."
            checked={allowSelfClaim}
            onChange={setAllowSelfClaim}
          />
          <ToggleRow
            id="allow-profile"
            label="Allow profile edits"
            checked={allowProfileEdits}
            onChange={setAllowProfileEdits}
          />
          <ToggleRow
            id="allow-payment"
            label="Allow payment detail edits"
            checked={allowPaymentDetailEdits}
            onChange={setAllowPaymentDetailEdits}
          />
          <ToggleRow
            id="allow-product"
            label="Allow product edits"
            checked={allowProductEdits}
            onChange={setAllowProductEdits}
          />
          <ToggleRow
            id="require-approval"
            label="Require store approval for product edits"
            checked={requireStoreApprovalProductEdits}
            onChange={setRequireStoreApprovalProductEdits}
          />
          <ToggleRow
            id="allow-invoice-dl"
            label="Allow invoice downloads"
            checked={allowInvoiceDownloads}
            onChange={setAllowInvoiceDownloads}
          />
          <ToggleRow
            id="allow-statement-dl"
            label="Allow statement downloads"
            checked={allowStatementDownloads}
            onChange={setAllowStatementDownloads}
          />
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium" htmlFor="portal-url">
              Portal public URL
            </label>
            <Input
              id="portal-url"
              value={portalPublicUrl}
              onChange={(e) => setPortalPublicUrl(e.target.value)}
              placeholder="https://kiosk.ke/supplier-portal"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claim configuration</CardTitle>
          <CardDescription>OTP and invitation challenge rules.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ToggleRow
            id="claim-enabled"
            label="Claim enabled"
            checked={claimEnabled}
            onChange={setClaimEnabled}
          />
          <ToggleRow
            id="auto-login"
            label="Auto-login after setup"
            checked={autoLoginAfterSetup}
            onChange={setAutoLoginAfterSetup}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="claim-method">
              Claim method
            </label>
            <select
              id="claim-method"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={claimMethod}
              onChange={(e) => setClaimMethod(e.target.value)}
            >
              <option value="phone_code">Phone + code</option>
              <option value="code_only">Code only (invite)</option>
              <option value="email_code">Email + code</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="code-length">
              OTP code length
            </label>
            <Input
              id="code-length"
              type="number"
              min={4}
              max={8}
              value={codeLength}
              onChange={(e) => setCodeLength(Number(e.target.value) || 6)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="code-expiry">
              Code expiry (minutes)
            </label>
            <Input
              id="code-expiry"
              type="number"
              min={1}
              value={codeExpiryMinutes}
              onChange={(e) => setCodeExpiryMinutes(Number(e.target.value) || 30)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="max-attempts">
              Maximum attempts
            </label>
            <Input
              id="max-attempts"
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value) || 5)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="lock-duration">
              Lock duration (minutes)
            </label>
            <Input
              id="lock-duration"
              type="number"
              min={1}
              value={lockDurationMinutes}
              onChange={(e) => setLockDurationMinutes(Number(e.target.value) || 15)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="resend-cooldown">
              Resend cooldown (seconds)
            </label>
            <Input
              id="resend-cooldown"
              type="number"
              min={0}
              value={resendCooldownSeconds}
              onChange={(e) => setResendCooldownSeconds(Number(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password policy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="pw-min">
              Minimum length
            </label>
            <Input
              id="pw-min"
              type="number"
              min={6}
              value={passwordMinLength}
              onChange={(e) => setPasswordMinLength(Number(e.target.value) || 8)}
            />
          </div>
          <ToggleRow
            id="pw-number"
            label="Require number"
            checked={passwordRequireNumber}
            onChange={setPasswordRequireNumber}
          />
          <ToggleRow
            id="pw-upper"
            label="Require uppercase"
            checked={passwordRequireUppercase}
            onChange={setPasswordRequireUppercase}
          />
          <ToggleRow
            id="pw-special"
            label="Require special character"
            checked={passwordRequireSpecial}
            onChange={setPasswordRequireSpecial}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Variables: {"{{supplier_name}}"} {"{{shop_name}}"} {"{{claim_code}}"} {"{{expiry_minutes}}"}{" "}
            {"{{portal_url}}"} {"{{support_phone}}"} {"{{support_email}}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="support-phone">
                Support phone
              </label>
              <Input id="support-phone" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="support-email">
                Support email
              </label>
              <Input id="support-email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="sms-template">
              SMS template
            </label>
            <textarea
              id="sms-template"
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="invite-template">
              Invitation message
            </label>
            <textarea
              id="invite-template"
              className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={invitationMessageTemplate}
              onChange={(e) => setInvitationMessageTemplate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email-subject">
              Email subject
            </label>
            <Input
              id="email-subject"
              value={emailSubjectTemplate}
              onChange={(e) => setEmailSubjectTemplate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email-body">
              Email body
            </label>
            <textarea
              id="email-body"
              className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={emailBodyTemplate}
              onChange={(e) => setEmailBodyTemplate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SaSection, SaToggleRow, saSelectClass } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSupplierPortalSettings,
  updateSupplierPortalSettings,
  type SupplierPortalSettingsRecord,
} from "@/lib/super-admin-api";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
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
  const [allowFindUnclaimedDrafts, setAllowFindUnclaimedDrafts] = useState(true);
  const [autoPromoteOnCreate, setAutoPromoteOnCreate] = useState(true);
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
    setAllowFindUnclaimedDrafts(row.allowFindUnclaimedDrafts ?? true);
    setAutoPromoteOnCreate(row.autoPromoteOnCreate ?? true);
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
        allowFindUnclaimedDrafts,
        autoPromoteOnCreate,
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

      <SaSection title="General" description="Master switches for the authenticated portal.">
        <div className="grid gap-3 sm:grid-cols-2">
          <SaToggleRow
            id="portal-enabled"
            label="Enable Supplier Portal"
            description="Kill switch for login and claim."
            checked={portalEnabled}
            onChange={setPortalEnabled}
          />
          <SaToggleRow
            id="allow-self-claim"
            label="Allow supplier self-claim"
            description="Phone OTP path without an invite."
            checked={allowSelfClaim}
            onChange={setAllowSelfClaim}
          />
          <SaToggleRow
            id="allow-profile"
            label="Allow profile edits"
            checked={allowProfileEdits}
            onChange={setAllowProfileEdits}
          />
          <SaToggleRow
            id="allow-payment"
            label="Allow payment detail edits"
            checked={allowPaymentDetailEdits}
            onChange={setAllowPaymentDetailEdits}
          />
          <SaToggleRow
            id="allow-product"
            label="Allow product edits"
            checked={allowProductEdits}
            onChange={setAllowProductEdits}
          />
          <SaToggleRow
            id="require-approval"
            label="Require store approval for product edits"
            checked={requireStoreApprovalProductEdits}
            onChange={setRequireStoreApprovalProductEdits}
          />
          <SaToggleRow
            id="allow-invoice-dl"
            label="Allow invoice downloads"
            checked={allowInvoiceDownloads}
            onChange={setAllowInvoiceDownloads}
          />
          <SaToggleRow
            id="allow-statement-dl"
            label="Allow statement downloads"
            checked={allowStatementDownloads}
            onChange={setAllowStatementDownloads}
          />
          <SaToggleRow
            id="allow-find-drafts"
            label="Find unclaimed / draft suppliers"
            description="Shops can look up draft global suppliers by name, phone, or S-number when adding a vendor."
            checked={allowFindUnclaimedDrafts}
            onChange={setAllowFindUnclaimedDrafts}
          />
          <SaToggleRow
            id="auto-promote-create"
            label="Auto-promote on create"
            description="Creating a supplier with no match also creates a global passport and assigns an S-number."
            checked={autoPromoteOnCreate}
            onChange={setAutoPromoteOnCreate}
          />
          <div className="sm:col-span-2">
            <Field id="portal-url" label="Portal public URL">
              <Input
                id="portal-url"
                value={portalPublicUrl}
                onChange={(e) => setPortalPublicUrl(e.target.value)}
                placeholder="https://kiosk.ke/supplier-portal"
              />
            </Field>
          </div>
        </div>
      </SaSection>

      <SaSection title="Claim" description="OTP and invitation challenge rules.">
        <div className="grid gap-4 sm:grid-cols-2">
          <SaToggleRow
            id="claim-enabled"
            label="Claim enabled"
            checked={claimEnabled}
            onChange={setClaimEnabled}
          />
          <SaToggleRow
            id="auto-login"
            label="Auto-login after setup"
            checked={autoLoginAfterSetup}
            onChange={setAutoLoginAfterSetup}
          />
          <Field id="claim-method" label="Claim method">
            <select
              id="claim-method"
              className={saSelectClass}
              value={claimMethod}
              onChange={(e) => setClaimMethod(e.target.value)}
            >
              <option value="phone_code">Phone + code</option>
              <option value="code_only">Code only (invite)</option>
              <option value="email_code">Email + code</option>
            </select>
          </Field>
          <Field id="code-length" label="OTP code length">
            <Input
              id="code-length"
              type="number"
              min={4}
              max={8}
              value={codeLength}
              onChange={(e) => setCodeLength(Number(e.target.value) || 6)}
            />
          </Field>
          <Field id="code-expiry" label="Code expiry (minutes)">
            <Input
              id="code-expiry"
              type="number"
              min={1}
              value={codeExpiryMinutes}
              onChange={(e) => setCodeExpiryMinutes(Number(e.target.value) || 30)}
            />
          </Field>
          <Field id="max-attempts" label="Maximum attempts">
            <Input
              id="max-attempts"
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value) || 5)}
            />
          </Field>
          <Field id="lock-duration" label="Lock duration (minutes)">
            <Input
              id="lock-duration"
              type="number"
              min={1}
              value={lockDurationMinutes}
              onChange={(e) => setLockDurationMinutes(Number(e.target.value) || 15)}
            />
          </Field>
          <Field id="resend-cooldown" label="Resend cooldown (seconds)">
            <Input
              id="resend-cooldown"
              type="number"
              min={0}
              value={resendCooldownSeconds}
              onChange={(e) => setResendCooldownSeconds(Number(e.target.value) || 0)}
            />
          </Field>
        </div>
      </SaSection>

      <SaSection title="Password">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="pw-min" label="Minimum length">
            <Input
              id="pw-min"
              type="number"
              min={6}
              value={passwordMinLength}
              onChange={(e) => setPasswordMinLength(Number(e.target.value) || 8)}
            />
          </Field>
          <SaToggleRow
            id="pw-number"
            label="Require number"
            checked={passwordRequireNumber}
            onChange={setPasswordRequireNumber}
          />
          <SaToggleRow
            id="pw-upper"
            label="Require uppercase"
            checked={passwordRequireUppercase}
            onChange={setPasswordRequireUppercase}
          />
          <SaToggleRow
            id="pw-special"
            label="Require special character"
            checked={passwordRequireSpecial}
            onChange={setPasswordRequireSpecial}
          />
        </div>
      </SaSection>

      <SaSection
        title="Templates"
        description={
          <>
            Variables: {"{{supplier_name}}"} {"{{shop_name}}"} {"{{claim_code}}"} {"{{expiry_minutes}}"}{" "}
            {"{{portal_url}}"} {"{{support_phone}}"} {"{{support_email}}"}
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="support-phone" label="Support phone">
              <Input id="support-phone" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
            </Field>
            <Field id="support-email" label="Support email">
              <Input id="support-email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </Field>
          </div>
          <Field id="sms-template" label="SMS template">
            <Textarea
              id="sms-template"
              className="min-h-28"
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
            />
          </Field>
          <Field id="invite-template" label="Invitation message">
            <Textarea
              id="invite-template"
              className="min-h-40"
              value={invitationMessageTemplate}
              onChange={(e) => setInvitationMessageTemplate(e.target.value)}
            />
          </Field>
          <Field id="email-subject" label="Email subject">
            <Input
              id="email-subject"
              value={emailSubjectTemplate}
              onChange={(e) => setEmailSubjectTemplate(e.target.value)}
            />
          </Field>
          <Field id="email-body" label="Email body">
            <Textarea
              id="email-body"
              className="min-h-36"
              value={emailBodyTemplate}
              onChange={(e) => setEmailBodyTemplate(e.target.value)}
            />
          </Field>
        </div>
      </SaSection>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

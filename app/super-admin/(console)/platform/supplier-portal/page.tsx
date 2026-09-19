"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RefreshCw, Truck } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSupplierPortalSettings,
  updateSupplierPortalSettings,
  type SupplierPortalSettingsRecord,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  SUPPLIER_PORTAL_NAV,
  SupplierPortalTheatre,
  type SupplierPortalSectionId,
} from "./_components/supplier-portal-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function sectionFromHash(hash: string): SupplierPortalSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (SUPPLIER_PORTAL_NAV.some((item) => item.id === id)) {
    return id as SupplierPortalSectionId;
  }
  return null;
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={dashboardLabelClass()}>
        {label}
      </Label>
      {children}
    </div>
  );
}

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
    <div
      className={cn(
        "flex items-start justify-between gap-3 border bg-white px-3 py-2.5",
        HAIRLINE,
      )}
    >
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] font-semibold tracking-[-0.015em] text-foreground">
          {label}
        </span>
        {description ? (
          <span className={cn(dashboardHintClass(), "mt-0.5 block")}>
            {description}
          </span>
        ) : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function SuperAdminSupplierPortalSettingsPage() {
  const [settings, setSettings] = useState<SupplierPortalSettingsRecord | null>(
    null,
  );
  const [loadError, setLoadError] = useState("");
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] =
    useState<SupplierPortalSectionId | null>(null);

  const [portalEnabled, setPortalEnabled] = useState(true);
  const [allowSelfClaim, setAllowSelfClaim] = useState(true);
  const [allowProfileEdits, setAllowProfileEdits] = useState(true);
  const [allowPaymentDetailEdits, setAllowPaymentDetailEdits] = useState(true);
  const [allowProductEdits, setAllowProductEdits] = useState(true);
  const [requireStoreApprovalProductEdits, setRequireStoreApprovalProductEdits] =
    useState(false);
  const [allowInvoiceDownloads, setAllowInvoiceDownloads] = useState(true);
  const [allowStatementDownloads, setAllowStatementDownloads] = useState(true);
  const [allowFindUnclaimedDrafts, setAllowFindUnclaimedDrafts] = useState(true);
  const [autoPromoteOnCreate, setAutoPromoteOnCreate] = useState(true);
  const [portalPublicUrl, setPortalPublicUrl] = useState(
    "https://kiosk.ke/supplier-portal",
  );
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
  const [passwordRequireUppercase, setPasswordRequireUppercase] =
    useState(false);
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
    } finally {
      setBooting(false);
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const applyHash = () => {
      const id = sectionFromHash(window.location.hash);
      if (id) setActiveSection(id);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const onSave = async () => {
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

  const sectionSummary = useCallback(
    (sectionId: SupplierPortalSectionId) => {
      switch (sectionId) {
        case "general":
          return (
            <>
              Portal{" "}
              <span className="font-semibold">
                {portalEnabled ? "on" : "off"}
              </span>
              {" · "}
              self-claim{" "}
              <span className="font-semibold">
                {allowSelfClaim ? "on" : "off"}
              </span>
              {" · "}
              product edits{" "}
              <span className="font-semibold">
                {allowProductEdits ? "on" : "off"}
              </span>
            </>
          );
        case "claim":
          return (
            <>
              Claim{" "}
              <span className="font-semibold">
                {claimEnabled ? "on" : "off"}
              </span>
              {" · "}
              <span className="font-semibold">
                {claimMethod === "code_only"
                  ? "code only"
                  : claimMethod === "email_code"
                    ? "email + code"
                    : "phone + code"}
              </span>
              {" · "}
              OTP{" "}
              <span className="font-semibold tabular-nums">{codeLength}</span>{" "}
              digits /{" "}
              <span className="font-semibold tabular-nums">
                {codeExpiryMinutes}
              </span>
              m
            </>
          );
        case "password":
          return (
            <>
              Min{" "}
              <span className="font-semibold tabular-nums">
                {passwordMinLength}
              </span>
              {" · "}
              {[
                passwordRequireNumber ? "number" : null,
                passwordRequireUppercase ? "uppercase" : null,
                passwordRequireSpecial ? "special" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "no extra rules"}
            </>
          );
        case "templates":
          return (
            <>
              Support{" "}
              <span className="font-semibold">
                {supportPhone || supportEmail || "not set"}
              </span>
              {" · "}
              SMS {smsTemplate.trim() ? "set" : "empty"}
            </>
          );
        default:
          return null;
      }
    },
    [
      portalEnabled,
      allowSelfClaim,
      allowProductEdits,
      claimEnabled,
      claimMethod,
      codeLength,
      codeExpiryMinutes,
      passwordMinLength,
      passwordRequireNumber,
      passwordRequireUppercase,
      passwordRequireSpecial,
      supportPhone,
      supportEmail,
      smsTemplate,
    ],
  );

  const drawerBody = (() => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-3">
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
            <ToggleRow
              id="allow-find-drafts"
              label="Find unclaimed / draft suppliers"
              description="Shops can look up draft global suppliers by name, phone, or S-number when adding a vendor."
              checked={allowFindUnclaimedDrafts}
              onChange={setAllowFindUnclaimedDrafts}
            />
            <ToggleRow
              id="auto-promote-create"
              label="Auto-promote on create"
              description="Creating a supplier with no match also creates a global passport and assigns an S-number."
              checked={autoPromoteOnCreate}
              onChange={setAutoPromoteOnCreate}
            />
            <Field id="portal-url" label="Portal public URL">
              <Input
                id="portal-url"
                className={dashboardInputClass()}
                value={portalPublicUrl}
                onChange={(e) => setPortalPublicUrl(e.target.value)}
                placeholder="https://kiosk.ke/supplier-portal"
              />
            </Field>
          </div>
        );
      case "claim":
        return (
          <div className="space-y-3">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="claim-method" label="Claim method">
                <select
                  id="claim-method"
                  className={dashboardSelectClass()}
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
                  className={dashboardInputClass()}
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
                  className={dashboardInputClass()}
                  type="number"
                  min={1}
                  value={codeExpiryMinutes}
                  onChange={(e) =>
                    setCodeExpiryMinutes(Number(e.target.value) || 30)
                  }
                />
              </Field>
              <Field id="max-attempts" label="Maximum attempts">
                <Input
                  id="max-attempts"
                  className={dashboardInputClass()}
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value) || 5)}
                />
              </Field>
              <Field id="lock-duration" label="Lock duration (minutes)">
                <Input
                  id="lock-duration"
                  className={dashboardInputClass()}
                  type="number"
                  min={1}
                  value={lockDurationMinutes}
                  onChange={(e) =>
                    setLockDurationMinutes(Number(e.target.value) || 15)
                  }
                />
              </Field>
              <Field id="resend-cooldown" label="Resend cooldown (seconds)">
                <Input
                  id="resend-cooldown"
                  className={dashboardInputClass()}
                  type="number"
                  min={0}
                  value={resendCooldownSeconds}
                  onChange={(e) =>
                    setResendCooldownSeconds(Number(e.target.value) || 0)
                  }
                />
              </Field>
            </div>
          </div>
        );
      case "password":
        return (
          <div className="space-y-3">
            <Field id="pw-min" label="Minimum length">
              <Input
                id="pw-min"
                className={dashboardInputClass()}
                type="number"
                min={6}
                value={passwordMinLength}
                onChange={(e) =>
                  setPasswordMinLength(Number(e.target.value) || 8)
                }
              />
            </Field>
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
          </div>
        );
      case "templates":
        return (
          <div className="space-y-4">
            <p className={cn(dashboardHintClass(), "leading-relaxed")}>
              Variables: {"{{supplier_name}}"} {"{{shop_name}}"}{" "}
              {"{{claim_code}}"} {"{{expiry_minutes}}"} {"{{portal_url}}"}{" "}
              {"{{support_phone}}"} {"{{support_email}}"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="support-phone" label="Support phone">
                <Input
                  id="support-phone"
                  className={dashboardInputClass()}
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                />
              </Field>
              <Field id="support-email" label="Support email">
                <Input
                  id="support-email"
                  className={dashboardInputClass()}
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </Field>
            </div>
            <Field id="sms-template" label="SMS template">
              <Textarea
                id="sms-template"
                className={cn(dashboardTextareaClass(), "min-h-28")}
                value={smsTemplate}
                onChange={(e) => setSmsTemplate(e.target.value)}
              />
            </Field>
            <Field id="invite-template" label="Invitation message">
              <Textarea
                id="invite-template"
                className={cn(dashboardTextareaClass(), "min-h-40")}
                value={invitationMessageTemplate}
                onChange={(e) => setInvitationMessageTemplate(e.target.value)}
              />
            </Field>
            <Field id="email-subject" label="Email subject">
              <Input
                id="email-subject"
                className={dashboardInputClass()}
                value={emailSubjectTemplate}
                onChange={(e) => setEmailSubjectTemplate(e.target.value)}
              />
            </Field>
            <Field id="email-body" label="Email body">
              <Textarea
                id="email-body"
                className={cn(dashboardTextareaClass(), "min-h-36")}
                value={emailBodyTemplate}
                onChange={(e) => setEmailBodyTemplate(e.target.value)}
              />
            </Field>
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={Truck}
        eyebrow="Platform"
        title="Supplier Portal"
        description="Claim methods, OTP rules, templates, and what suppliers may edit or download."
      >
        <button
          type="button"
          disabled={busy || booting}
          onClick={() => void load()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh supplier portal settings"
        >
          <RefreshCw
            className={cn("size-3.5", (busy || booting) && "animate-spin")}
            aria-hidden
          />
        </button>
        <Button
          type="button"
          size="sm"
          className={PRIMARY_BTN}
          disabled={busy || !settings}
          onClick={() => void onSave()}
        >
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {success ? <DashboardFeedback kind="success" text={success} /> : null}

      <SupplierPortalTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        portalEnabled={portalEnabled}
        claimEnabled={claimEnabled}
        claimMethod={claimMethod}
        passwordMinLength={passwordMinLength}
        loading={booting || !settings}
        sectionSummary={sectionSummary}
        drawerBody={drawerBody}
        drawerFooter={
          <Button
            type="button"
            className={PRIMARY_BTN}
            disabled={busy || !settings}
            onClick={() => void onSave()}
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        }
      />
    </div>
  );
}

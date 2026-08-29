"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageCircle,
  ShoppingBag,
  Banknote,
  Truck,
  Users,
} from "lucide-react";

import {
  DashboardFeedback,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { SmsCreditsDepletedBanner } from "@/components/messaging/sms-credits-header";
import { Button } from "@/components/ui/button";
import {
  clearOpsAlertPhone,
  fetchOpsAlertSettings,
  sendOpsAlertPhoneVerification,
  testOpsAlertSend,
  updateOpsAlertSettings,
  verifyOpsAlertPhone,
  type OpsAlertSettingsRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  canEdit: boolean;
};

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  icon,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
  icon: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-all",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        checked
          ? "border-primary/30 bg-primary/[0.06]"
          : "border-border/60 bg-background/80 hover:border-border",
      )}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function WhatsAppOpsAlertsPanel({ canEdit }: Props) {
  const [settings, setSettings] = useState<OpsAlertSettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [testing, setTesting] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [alertWebOrder, setAlertWebOrder] = useState(true);
  const [alertShift, setAlertShift] = useState(true);
  const [alertSupply, setAlertSupply] = useState(true);
  const [alertCreditPayment, setAlertCreditPayment] = useState(true);
  const [alertRestockDigest, setAlertRestockDigest] = useState(true);

  const applySettings = useCallback((data: OpsAlertSettingsRecord) => {
    setSettings(data);
    setEnabled(data.enabled);
    setAlertWebOrder(data.alertWebOrder);
    setAlertShift(data.alertShift);
    setAlertSupply(data.alertSupply);
    setAlertCreditPayment(data.alertCreditPayment);
    setAlertRestockDigest(data.alertRestockDigest);
    if (data.phone) {
      setPhoneInput(data.phone);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchOpsAlertSettings();
      applySettings(data);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to load WhatsApp alerts",
        kind: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSendCode() {
    if (!canEdit || !phoneInput.trim()) return;
    setSendingCode(true);
    setMessage(null);
    try {
      const result = await sendOpsAlertPhoneVerification(phoneInput.trim());
      setPhoneInput(result.phone);
      setCodeSent(true);
      setCodeInput("");
      setMessage({
        text: `Code sent via ${result.channel} to ${result.phoneMasked}`,
        kind: "success",
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to send code",
        kind: "error",
      });
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerify() {
    if (!canEdit || !phoneInput.trim() || !codeInput.trim()) return;
    setVerifying(true);
    setMessage(null);
    try {
      const result = await verifyOpsAlertPhone(phoneInput.trim(), codeInput.trim());
      setCodeSent(false);
      setCodeInput("");
      setMessage({
        text: `Verified ${result.phoneMasked}`,
        kind: "success",
      });
      await load();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Verification failed",
        kind: "error",
      });
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateOpsAlertSettings({
        enabled,
        alertWebOrder,
        alertShift,
        alertSupply,
        alertCreditPayment,
        alertRestockDigest,
      });
      applySettings(updated);
      setMessage({ text: "WhatsApp alerts saved", kind: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to save",
        kind: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleClearPhone() {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await clearOpsAlertPhone();
      applySettings(updated);
      setPhoneInput("");
      setCodeSent(false);
      setCodeInput("");
      setMessage({ text: "Alert number removed", kind: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to clear number",
        kind: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!canEdit) return;
    setTesting(true);
    setMessage(null);
    try {
      const result = await testOpsAlertSend();
      setMessage({
        text: `Test ${result.outcome} via ${result.channel} → ${result.phoneMasked}`,
        kind: result.outcome === "sent" || result.outcome === "stub" ? "success" : "error",
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Test send failed",
        kind: "error",
      });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/90 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading WhatsApp alerts…
      </div>
    );
  }

  return (
    <section
      id="settings-whatsapp-alerts"
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm"
    >
      <div className="h-1 w-full bg-emerald-500/70" />
      <div className="space-y-4 p-4 sm:p-5">
        <header className="space-y-1">
          <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            WhatsApp alerts
          </h3>
          <p className="text-sm text-muted-foreground">
            Get alerts on a verified owner number when key store events happen.
            SMS is preferred when configured (reliable). Free-form WhatsApp alone
            only works inside Meta&apos;s 24h reply window — that is why shift
            open/close can go silent even when credit templates still send.
          </p>
        </header>

        {message ? (
          <DashboardFeedback kind={message.kind} text={message.text} />
        ) : null}

        <SmsCreditsDepletedBanner />

        {!settings?.messagingReady ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-3 text-xs text-amber-950 dark:text-amber-100">
            Configure WhatsApp or SMS under Customers → messaging settings
            before verifying a number.
          </p>
        ) : null}

        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Alert number</p>
              <p className="text-xs text-muted-foreground">
                {settings?.phoneVerified
                  ? `Verified ${settings.phoneMasked}`
                  : "Enter a phone, send a code, then verify"}
              </p>
            </div>
            {settings?.phoneVerified ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div>
              <label className={dashboardLabelClass()} htmlFor="ops-alert-phone">
                Phone
              </label>
              <input
                id="ops-alert-phone"
                className={dashboardInputClass()}
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setCodeSent(false);
                }}
                placeholder="07XXXXXXXX or +2547XXXXXXXX"
                disabled={!canEdit || sendingCode || verifying}
                autoComplete="tel"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-xl sm:w-auto"
                disabled={!canEdit || sendingCode || !phoneInput.trim()}
                onClick={() => void handleSendCode()}
              >
                {sendingCode ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MessageCircle className="size-4" aria-hidden />
                )}
                <span className="ml-1.5">Send code</span>
              </Button>
            </div>
          </div>

          {codeSent || (!settings?.phoneVerified && codeInput) ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div>
                <label className={dashboardLabelClass()} htmlFor="ops-alert-code">
                  4-digit code
                </label>
                <input
                  id="ops-alert-code"
                  className={dashboardInputClass()}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  inputMode="numeric"
                  disabled={!canEdit || verifying}
                  maxLength={4}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="h-10 w-full rounded-xl sm:w-auto"
                  disabled={!canEdit || verifying || codeInput.length !== 4}
                  onClick={() => void handleVerify()}
                >
                  {verifying ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  <span className={verifying ? "ml-1.5" : ""}>Verify</span>
                </Button>
              </div>
            </div>
          ) : null}

          {settings?.phoneVerified ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                disabled={!canEdit || testing}
                onClick={() => void handleTest()}
              >
                {testing ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                ) : null}
                Send test alert
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl text-xs text-muted-foreground"
                disabled={!canEdit || saving}
                onClick={() => void handleClearPhone()}
              >
                Remove number
              </Button>
            </div>
          ) : null}
        </div>

        <ToggleRow
          checked={enabled}
          onChange={setEnabled}
          disabled={!canEdit || !settings?.phoneVerified}
          icon={<MessageCircle className="size-4" aria-hidden />}
          title="Enable WhatsApp alerts"
          description={
            !settings?.phoneVerified
              ? "Verify a number first"
              : enabled
                ? "Sending alerts to the verified number above"
                : "Alerts are OFF — turn this on and save, or re-verify the number"
          }
        />

        {settings?.phoneVerified && !enabled ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-3 text-xs text-amber-950 dark:text-amber-100">
            Your number is verified, but alerts are disabled. Turn on
            &quot;Enable WhatsApp alerts&quot; and click Save — otherwise shifts
            and web orders will not notify you (test send still works).
          </p>
        ) : null}

        <div className="grid gap-2 lg:grid-cols-2">
          <ToggleRow
            checked={alertWebOrder}
            onChange={setAlertWebOrder}
            disabled={!canEdit}
            icon={<ShoppingBag className="size-4" aria-hidden />}
            title="Web orders"
            description="When a customer places a storefront order"
          />
          <ToggleRow
            checked={alertShift}
            onChange={setAlertShift}
            disabled={!canEdit}
            icon={<Banknote className="size-4" aria-hidden />}
            title="Shifts"
            description="When a till shift is opened or closed (SMS when configured — WhatsApp alone only works for 24h after you message the business number)"
          />
          <ToggleRow
            checked={alertSupply}
            onChange={setAlertSupply}
            disabled={!canEdit}
            icon={<Truck className="size-4" aria-hidden />}
            title="Supply bills"
            description="When a supply invoice is posted"
          />
          <ToggleRow
            checked={alertCreditPayment}
            onChange={setAlertCreditPayment}
            disabled={!canEdit}
            icon={<Users className="size-4" aria-hidden />}
            title="Credit payments"
            description="When a customer tab payment is received"
          />
          <ToggleRow
            checked={alertRestockDigest}
            onChange={setAlertRestockDigest}
            disabled={!canEdit}
            icon={<ClipboardList className="size-4" aria-hidden />}
            title="Tonight's restock list"
            description="When the nightly restock list is ready to review"
          />
        </div>

        {canEdit ? (
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              className="h-9 rounded-xl"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
              ) : null}
              Save alert prefs
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            You need credit settings permission to change WhatsApp alerts.
          </p>
        )}
      </div>
    </section>
  );
}

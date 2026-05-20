"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import {
  DashboardFeedback,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchCreditSaleReminderSettings,
  updateCreditSaleReminderSettings,
  type CreditSaleReminderSettingsRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  canEdit: boolean;
};

export function CreditSaleReminderSettings({ canEdit }: Props) {
  const [settings, setSettings] = useState<CreditSaleReminderSettingsRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [rapidApiKey, setRapidApiKey] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappVersion, setWhatsappVersion] = useState("v25.0");
  const [smsProvider, setSmsProvider] = useState("none");
  const [smsUsername, setSmsUsername] = useState("");
  const [smsApiKey, setSmsApiKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchCreditSaleReminderSettings();
      setSettings(data);
      setEnabled(data.enabled);
      setPaymentUrl(data.paymentAccountUrl);
      setWhatsappPhoneId(data.whatsappMetaPhoneNumberId ?? "");
      setWhatsappVersion(data.whatsappMetaGraphVersion || "v25.0");
      setSmsProvider(data.smsProvider || "none");
      setSmsUsername(data.smsAfricasTalkingUsername ?? "");
      setRapidApiKey("");
      setWhatsappToken("");
      setSmsApiKey("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load reminder settings.";
      setMessage({
        text:
          msg.includes("500") || /internal server error/i.test(msg)
            ? `${msg} The API database may need migration V95/V96 (credit tab reminder columns). Redeploy the backend or run Flyway, then reload.`
            : msg,
        kind: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: Parameters<typeof updateCreditSaleReminderSettings>[0] = {
        enabled,
        paymentAccountUrl: paymentUrl.trim(),
        whatsappMetaPhoneNumberId: whatsappPhoneId.trim() || null,
        whatsappMetaGraphVersion: whatsappVersion.trim() || "v25.0",
        smsProvider,
        smsAfricasTalkingUsername:
          smsProvider === "africas_talking" ? smsUsername.trim() : null,
      };
      if (rapidApiKey.trim()) {
        body.rapidApiKey = rapidApiKey.trim();
      }
      if (whatsappToken.trim()) {
        body.whatsappMetaAccessToken = whatsappToken.trim();
      }
      if (smsApiKey.trim()) {
        body.smsAfricasTalkingApiKey = smsApiKey.trim();
      }
      const updated = await updateCreditSaleReminderSettings(body);
      setSettings(updated);
      setRapidApiKey("");
      setWhatsappToken("");
      setSmsApiKey("");
      setMessage({ text: "Reminder settings saved.", kind: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Save failed.",
        kind: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <p className="text-sm text-muted-foreground">Loading credit tab reminders…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-primary/[0.03] to-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Credit tab reminders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When a customer takes items on credit, send a short payment reminder with
            your account link. WhatsApp is tried first (RapidAPI lookup + Meta); SMS
            is the fallback.
          </p>
        </div>
      </div>

      {message ? (
        <div className="mt-4">
          <DashboardFeedback kind={message.kind} text={message.text} />
        </div>
      ) : null}

      {settings && !settings.secretsReadable ? (
        <p className="mt-4 rounded-lg border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {settings.secretsReadError ??
            "API keys cannot be stored until the server encryption key is configured."}
        </p>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={(e) => void onSave(e)}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={!canEdit}
          />
          <span>Send reminders after credit (tab) sales</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={dashboardLabelClass()}>Payment account URL</span>
          <input
            className={dashboardInputClass()}
            value={paymentUrl}
            onChange={(e) => setPaymentUrl(e.target.value)}
            placeholder={settings?.suggestedPaymentAccountUrl}
            required
            disabled={!canEdit}
          />
          <span className="text-xs text-muted-foreground">
            Shoppers open this link to view their tab and pay (e.g.{" "}
            <span className="font-mono">{settings?.suggestedPaymentAccountUrl}</span>
            ).
          </span>
        </label>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">WhatsApp</p>
          <label className="flex flex-col gap-1.5">
            <span className={dashboardLabelClass()}>RapidAPI key</span>
            <input
              type="password"
              className={dashboardInputClass()}
              value={rapidApiKey}
              onChange={(e) => setRapidApiKey(e.target.value)}
              placeholder={
                settings?.hasRapidApiKey ? "••••••••  (leave blank to keep)" : "Paste key"
              }
              disabled={!canEdit || !settings?.secretsReadable}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={dashboardLabelClass()}>Meta phone number ID</span>
            <input
              className={dashboardInputClass()}
              value={whatsappPhoneId}
              onChange={(e) => setWhatsappPhoneId(e.target.value)}
              placeholder="From Meta Business / Graph API"
              disabled={!canEdit}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={dashboardLabelClass()}>Meta access token</span>
            <input
              type="password"
              className={dashboardInputClass()}
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
              placeholder={
                settings?.hasWhatsappMetaAccessToken
                  ? "••••••••  (leave blank to keep)"
                  : "Paste token"
              }
              disabled={!canEdit || !settings?.secretsReadable}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:max-w-xs">
            <span className={dashboardLabelClass()}>Graph API version</span>
            <input
              className={dashboardInputClass()}
              value={whatsappVersion}
              onChange={(e) => setWhatsappVersion(e.target.value)}
              disabled={!canEdit}
            />
          </label>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">SMS fallback</p>
          <label className="flex flex-col gap-1.5 sm:max-w-xs">
            <span className={dashboardLabelClass()}>Provider</span>
            <select
              className={cn(dashboardInputClass(), "h-10")}
              value={smsProvider}
              onChange={(e) => setSmsProvider(e.target.value)}
              disabled={!canEdit}
            >
              <option value="none">None (log only in dev)</option>
              <option value="africas_talking">Africa&apos;s Talking</option>
            </select>
          </label>
          {smsProvider === "africas_talking" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>Username</span>
                <input
                  className={dashboardInputClass()}
                  value={smsUsername}
                  onChange={(e) => setSmsUsername(e.target.value)}
                  disabled={!canEdit}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>API key</span>
                <input
                  type="password"
                  className={dashboardInputClass()}
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  placeholder={
                    settings?.hasSmsAfricasTalkingApiKey
                      ? "••••••••  (leave blank to keep)"
                      : "Paste key"
                  }
                  disabled={!canEdit || !settings?.secretsReadable}
                  autoComplete="off"
                />
              </label>
            </>
          ) : null}
        </div>

        {canEdit ? (
          <Button type="submit" disabled={saving || !settings?.secretsReadable}>
            {saving ? "Saving…" : "Save reminder settings"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            You need credit settings permission to change these values.
          </p>
        )}
      </form>
    </section>
  );
}

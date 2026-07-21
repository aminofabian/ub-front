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
  MessagingTestResultCard,
  messagingTestHeadline,
} from "@/components/credits/messaging-test-result-card";
import {
  fetchCreditSaleReminderSettings,
  testCreditSaleReminderSend,
  updateCreditSaleReminderSettings,
  type CreditSaleReminderSettingsRecord,
  type CreditSaleReminderTestResult,
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
  const [rapidApiHost, setRapidApiHost] = useState("");
  const [rapidApiLookupUrl, setRapidApiLookupUrl] = useState("");
  const [rapidApiPhoneField, setRapidApiPhoneField] = useState("phone");
  const [rapidApiPhoneDigitsOnly, setRapidApiPhoneDigitsOnly] = useState(false);
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappVersion, setWhatsappVersion] = useState("v25.0");
  const [smsProvider, setSmsProvider] = useState("none");
  const [smsUsername, setSmsUsername] = useState("");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsSozuriProject, setSmsSozuriProject] = useState("");
  const [smsSozuriApiKey, setSmsSozuriApiKey] = useState("");
  const [smsSozuriFrom, setSmsSozuriFrom] = useState("Sozuri");
  const [smsSozuriType, setSmsSozuriType] = useState("transactional");
  const [smsSozuriApiUrl, setSmsSozuriApiUrl] = useState(
    "https://sozuri.net/api/v1/messaging",
  );
  const [smsTextsmsPartnerId, setSmsTextsmsPartnerId] = useState("");
  const [smsTextsmsApiKey, setSmsTextsmsApiKey] = useState("");
  const [smsTextsmsShortcode, setSmsTextsmsShortcode] = useState("");
  const [smsTextsmsApiUrl, setSmsTextsmsApiUrl] = useState(
    "https://sms.textsms.co.ke/api/services/sendsms/",
  );
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<CreditSaleReminderTestResult | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchCreditSaleReminderSettings();
      setSettings(data);
      setEnabled(data.enabled);
      setPaymentUrl(data.paymentAccountUrl);
      setRapidApiHost(data.rapidApiHost ?? "");
      setRapidApiLookupUrl(data.rapidApiLookupUrl ?? "");
      setRapidApiPhoneField(data.rapidApiPhoneField || "phone");
      setRapidApiPhoneDigitsOnly(Boolean(data.rapidApiPhoneDigitsOnly));
      setWhatsappPhoneId(data.whatsappMetaPhoneNumberId ?? "");
      setWhatsappVersion(data.whatsappMetaGraphVersion || "v25.0");
      setSmsProvider(data.smsProvider || "none");
      setSmsUsername(data.smsAfricasTalkingUsername ?? "");
      setSmsSozuriProject(data.smsSozuriProject ?? "");
      setSmsSozuriFrom(data.smsSozuriFrom || "Sozuri");
      setSmsSozuriType(data.smsSozuriType || "transactional");
      setSmsSozuriApiUrl(
        data.smsSozuriApiUrl || "https://sozuri.net/api/v1/messaging",
      );
      setSmsTextsmsPartnerId(data.smsTextsmsPartnerId ?? "");
      setSmsTextsmsShortcode(data.smsTextsmsShortcode ?? "");
      setSmsTextsmsApiUrl(
        data.smsTextsmsApiUrl || "https://sms.textsms.co.ke/api/services/sendsms/",
      );
      setRapidApiKey("");
      setWhatsappToken("");
      setSmsApiKey("");
      setSmsSozuriApiKey("");
      setSmsTextsmsApiKey("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load reminder settings.";
      setMessage({
        text:
          msg.includes("500") || /internal server error/i.test(msg)
            ? `${msg} Redeploy the backend (Flyway V95–V97) if settings never loaded. If save fails with 500, redeploy the latest API build (API key encryption fix).`
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

  const onTestSend = async () => {
    if (!canEdit) return;
    setTesting(true);
    setTestResult(null);
    setMessage(null);
    try {
      const result = await testCreditSaleReminderSend(testPhone.trim());
      setTestResult(result);
      const ok = result.outcome === "sent";
      setMessage({
        text: messagingTestHeadline(result, "full"),
        kind: ok ? "success" : "error",
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Test send failed.",
        kind: "error",
      });
    } finally {
      setTesting(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: Parameters<typeof updateCreditSaleReminderSettings>[0] = {
        enabled,
        paymentAccountUrl: paymentUrl.trim(),
        rapidApiHost: rapidApiHost.trim() || null,
        rapidApiLookupUrl: rapidApiLookupUrl.trim() || null,
        rapidApiPhoneField: rapidApiPhoneField.trim() || null,
        rapidApiPhoneDigitsOnly,
        whatsappMetaPhoneNumberId: whatsappPhoneId.trim() || null,
        whatsappMetaGraphVersion: whatsappVersion.trim() || "v25.0",
        smsProvider,
        smsAfricasTalkingUsername:
          smsProvider === "africas_talking" ? smsUsername.trim() : null,
        smsSozuriProject: smsProvider === "sozuri" ? smsSozuriProject.trim() : null,
        smsSozuriFrom: smsProvider === "sozuri" ? smsSozuriFrom.trim() || "Sozuri" : null,
        smsSozuriType:
          smsProvider === "sozuri" ? smsSozuriType.trim() || "transactional" : null,
        smsSozuriApiUrl:
          smsProvider === "sozuri"
            ? smsSozuriApiUrl.trim() || "https://sozuri.net/api/v1/messaging"
            : null,
        smsTextsmsPartnerId:
          smsProvider === "textsms" ? smsTextsmsPartnerId.trim() : null,
        smsTextsmsShortcode:
          smsProvider === "textsms" ? smsTextsmsShortcode.trim() : null,
        smsTextsmsApiUrl:
          smsProvider === "textsms"
            ? smsTextsmsApiUrl.trim() ||
              "https://sms.textsms.co.ke/api/services/sendsms/"
            : null,
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
      if (smsSozuriApiKey.trim()) {
        body.smsSozuriApiKey = smsSozuriApiKey.trim();
      }
      if (smsTextsmsApiKey.trim()) {
        body.smsTextsmsApiKey = smsTextsmsApiKey.trim();
      }
      const updated = await updateCreditSaleReminderSettings(body);
      setSettings(updated);
      setRapidApiKey("");
      setWhatsappToken("");
      setSmsApiKey("");
      setSmsSozuriApiKey("");
      setSmsTextsmsApiKey("");
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
            is the fallback. Use the separate WhatsApp and SMS test panels below to
            verify each channel alone. The test here runs the full reminder pipeline.
          </p>
        </div>
      </div>

      {message ? (
        <div className="mt-4">
          <DashboardFeedback kind={message.kind} text={message.text} />
        </div>
      ) : null}

      {settings?.secretsReadError ? (
        <p className="mt-4 rounded-lg border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {settings.secretsReadError}
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
              disabled={!canEdit}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={dashboardLabelClass()}>RapidAPI lookup URL</span>
            <input
              className={dashboardInputClass()}
              value={rapidApiLookupUrl}
              onChange={(e) => setRapidApiLookupUrl(e.target.value)}
              placeholder="https://whatsapp-osint.p.rapidapi.com/bizos"
              disabled={!canEdit}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={dashboardLabelClass()}>RapidAPI host</span>
            <input
              className={dashboardInputClass()}
              value={rapidApiHost}
              onChange={(e) => setRapidApiHost(e.target.value)}
              placeholder="whatsapp-osint.p.rapidapi.com"
              disabled={!canEdit}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={dashboardLabelClass()}>Phone JSON field</span>
              <input
                className={dashboardInputClass()}
                value={rapidApiPhoneField}
                onChange={(e) => setRapidApiPhoneField(e.target.value)}
                placeholder="phone"
                disabled={!canEdit}
              />
              <span className="text-xs text-muted-foreground">
                e.g. <span className="font-mono">phone</span> or{" "}
                <span className="font-mono">phone_number</span>
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm sm:pt-7">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={rapidApiPhoneDigitsOnly}
                onChange={(e) => setRapidApiPhoneDigitsOnly(e.target.checked)}
                disabled={!canEdit}
              />
              <span>Send digits only (strip +)</span>
            </label>
          </div>
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
              disabled={!canEdit}
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
          <p className="text-xs text-muted-foreground">
            Leave TextSMS / Sozuri fields blank to use Super Admin → Platform integrations defaults.
            Provider &quot;None&quot; still inherits the platform default provider when set.
          </p>
          <label className="flex flex-col gap-1.5 sm:max-w-xs">
            <span className={dashboardLabelClass()}>Provider</span>
            <select
              className={cn(dashboardInputClass(), "h-10")}
              value={smsProvider}
              onChange={(e) => setSmsProvider(e.target.value)}
              disabled={!canEdit}
            >
              <option value="none">None (log only in dev)</option>
              <option value="textsms">TextSMS (textsms.co.ke)</option>
              <option value="sozuri">Sozuri</option>
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
                  disabled={!canEdit}
                  autoComplete="off"
                />
              </label>
            </>
          ) : null}
          {smsProvider === "sozuri" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>Project</span>
                <input
                  className={dashboardInputClass()}
                  value={smsSozuriProject}
                  onChange={(e) => setSmsSozuriProject(e.target.value)}
                  placeholder="kiosk.ke"
                  disabled={!canEdit}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>API key</span>
                <input
                  type="password"
                  className={dashboardInputClass()}
                  value={smsSozuriApiKey}
                  onChange={(e) => setSmsSozuriApiKey(e.target.value)}
                  placeholder={
                    settings?.hasSmsSozuriApiKey
                      ? "••••••••  (leave blank to keep)"
                      : "Paste Sozuri API key"
                  }
                  disabled={!canEdit}
                  autoComplete="off"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={dashboardLabelClass()}>Sender ID (from)</span>
                  <input
                    className={dashboardInputClass()}
                    value={smsSozuriFrom}
                    onChange={(e) => setSmsSozuriFrom(e.target.value)}
                    placeholder="Sozuri"
                    disabled={!canEdit}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={dashboardLabelClass()}>Message type</span>
                  <select
                    className={cn(dashboardInputClass(), "h-10")}
                    value={smsSozuriType}
                    onChange={(e) => setSmsSozuriType(e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="transactional">Transactional</option>
                    <option value="promotional">Promotional</option>
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>API URL</span>
                <input
                  className={dashboardInputClass()}
                  value={smsSozuriApiUrl}
                  onChange={(e) => setSmsSozuriApiUrl(e.target.value)}
                  placeholder="https://sozuri.net/api/v1/messaging"
                  disabled={!canEdit}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Callbacks (set in Sozuri dashboard):{" "}
                <span className="font-mono">/webhooks/sozuri/inbox</span> and{" "}
                <span className="font-mono">/webhooks/sozuri/delivery</span> on your
                API host. Use type that matches your registered sender ID.
              </p>
            </>
          ) : null}
          {smsProvider === "textsms" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={dashboardLabelClass()}>Partner ID</span>
                  <input
                    className={dashboardInputClass()}
                    value={smsTextsmsPartnerId}
                    onChange={(e) => setSmsTextsmsPartnerId(e.target.value)}
                    placeholder="From TextSMS dashboard"
                    disabled={!canEdit}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={dashboardLabelClass()}>Shortcode / sender ID</span>
                  <input
                    className={dashboardInputClass()}
                    value={smsTextsmsShortcode}
                    onChange={(e) => setSmsTextsmsShortcode(e.target.value)}
                    placeholder="Approved shortcode"
                    disabled={!canEdit}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>API key</span>
                <input
                  type="password"
                  className={dashboardInputClass()}
                  value={smsTextsmsApiKey}
                  onChange={(e) => setSmsTextsmsApiKey(e.target.value)}
                  placeholder={
                    settings?.hasSmsTextsmsApiKey
                      ? "••••••••  (leave blank to keep)"
                      : "Paste TextSMS API key"
                  }
                  disabled={!canEdit}
                  autoComplete="off"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>API URL</span>
                <input
                  className={dashboardInputClass()}
                  value={smsTextsmsApiUrl}
                  onChange={(e) => setSmsTextsmsApiUrl(e.target.value)}
                  placeholder="https://sms.textsms.co.ke/api/services/sendsms/"
                  disabled={!canEdit}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Blank fields inherit Super Admin → Platform integrations TextSMS defaults.
              </p>
            </>
          ) : null}
        </div>

        {canEdit ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
              <span className={dashboardLabelClass()}>Test phone</span>
              <input
                className={dashboardInputClass()}
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="0712345678"
                disabled={testing}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={testing || !testPhone.trim() || !enabled}
              onClick={() => void onTestSend()}
            >
              {testing ? "Sending…" : "Test full reminder flow"}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save reminder settings"}
            </Button>
          </div>
        ) : null}

        {testResult && canEdit ? (
          <MessagingTestResultCard
            result={testResult}
            variant="full"
            className="mt-3"
          />
        ) : null}

        {!canEdit ? (
          <p className="text-xs text-muted-foreground">
            You need credit settings permission to change these values.
          </p>
        ) : null}
      </form>
    </section>
  );
}

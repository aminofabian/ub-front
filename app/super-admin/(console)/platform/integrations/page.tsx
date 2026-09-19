"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Plug, RefreshCw } from "lucide-react";
import Link from "next/link";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  fetchPlatformIntegrations,
  updatePlatformIntegrations,
  type PlatformIntegrationsRecord,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  INTEGRATIONS_NAV,
  IntegrationsTheatre,
  type IntegrationsSectionId,
} from "./_components/integrations-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function sectionFromHash(hash: string): IntegrationsSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (INTEGRATIONS_NAV.some((item) => item.id === id)) {
    return id as IntegrationsSectionId;
  }
  return null;
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id?: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {id ? (
        <Label htmlFor={id} className={dashboardLabelClass()}>
          {label}
        </Label>
      ) : (
        <p className={dashboardLabelClass()}>{label}</p>
      )}
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

function KeyStatus({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
        ready
          ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] text-[var(--pos-primary,#0f766e)]"
          : "border-amber-700/35 text-amber-800",
      )}
    >
      {ready ? "Key ready" : "No key"}
    </span>
  );
}

function ClearKeyButton({
  disabled,
  onClick,
  label = "Clear stored key",
}: {
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 rounded-none text-[#9a2e16] hover:text-[#9a2e16]"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export default function SuperAdminPlatformIntegrationsPage() {
  const [settings, setSettings] = useState<PlatformIntegrationsRecord | null>(
    null,
  );
  const [loadError, setLoadError] = useState("");
  const [booting, setBooting] = useState(true);
  const [activeSection, setActiveSection] =
    useState<IntegrationsSectionId | null>(null);

  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekHost, setDeepseekHost] = useState("");
  const [deepseekUrl, setDeepseekUrl] = useState("");
  const [deepseekModel, setDeepseekModel] = useState("");
  const [rapidApiWhatsappKey, setRapidApiWhatsappKey] = useState("");
  const [rapidApiWhatsappHost, setRapidApiWhatsappHost] = useState("");
  const [rapidApiWhatsappLookupUrl, setRapidApiWhatsappLookupUrl] =
    useState("");
  const [rapidApiWhatsappPhoneField, setRapidApiWhatsappPhoneField] =
    useState("phone");
  const [rapidApiWhatsappPhoneDigitsOnly, setRapidApiWhatsappPhoneDigitsOnly] =
    useState(false);
  const [whatsappMetaAccessToken, setWhatsappMetaAccessToken] = useState("");
  const [whatsappMetaPhoneNumberId, setWhatsappMetaPhoneNumberId] =
    useState("");
  const [whatsappMetaGraphVersion, setWhatsappMetaGraphVersion] =
    useState("v25.0");
  const [whatsappMetaWebhookVerifyToken, setWhatsappMetaWebhookVerifyToken] =
    useState("");
  const [whatsappMetaAppSecret, setWhatsappMetaAppSecret] = useState("");
  const [smsProvider, setSmsProvider] = useState("none");
  const [sozuriProject, setSozuriProject] = useState("");
  const [sozuriApiKey, setSozuriApiKey] = useState("");
  const [sozuriFrom, setSozuriFrom] = useState("Sozuri");
  const [sozuriType, setSozuriType] = useState("transactional");
  const [sozuriApiUrl, setSozuriApiUrl] = useState(
    "https://sozuri.net/api/v1/messaging",
  );
  const [textsmsPartnerId, setTextsmsPartnerId] = useState("");
  const [textsmsApiKey, setTextsmsApiKey] = useState("");
  const [textsmsShortcode, setTextsmsShortcode] = useState("");
  const [textsmsApiUrl, setTextsmsApiUrl] = useState(
    "https://sms.textsms.co.ke/api/services/sendsms/",
  );

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const applySettings = useCallback((row: PlatformIntegrationsRecord) => {
    setSettings(row);
    setDeepseekHost(row.deepseekHost ?? "");
    setDeepseekUrl(row.deepseekUrl ?? "");
    setDeepseekModel(row.deepseekModel ?? "");
    setRapidApiWhatsappHost(row.rapidApiWhatsappHost ?? "");
    setRapidApiWhatsappLookupUrl(row.rapidApiWhatsappLookupUrl ?? "");
    setRapidApiWhatsappPhoneField(row.rapidApiWhatsappPhoneField || "phone");
    setRapidApiWhatsappPhoneDigitsOnly(
      Boolean(row.rapidApiWhatsappPhoneDigitsOnly),
    );
    setWhatsappMetaPhoneNumberId(row.whatsappMetaPhoneNumberId ?? "");
    setWhatsappMetaGraphVersion(row.whatsappMetaGraphVersion || "v25.0");
    setSmsProvider(row.smsProvider || "none");
    setSozuriProject(row.sozuriProject ?? "");
    setSozuriFrom(row.sozuriFrom || "Sozuri");
    setSozuriType(row.sozuriType || "transactional");
    setSozuriApiUrl(row.sozuriApiUrl || "https://sozuri.net/api/v1/messaging");
    setTextsmsPartnerId(row.textsmsPartnerId ?? "");
    setTextsmsShortcode(row.textsmsShortcode ?? "");
    setTextsmsApiUrl(
      row.textsmsApiUrl || "https://sms.textsms.co.ke/api/services/sendsms/",
    );
    setDeepseekApiKey("");
    setRapidApiWhatsappKey("");
    setWhatsappMetaAccessToken("");
    setWhatsappMetaWebhookVerifyToken("");
    setWhatsappMetaAppSecret("");
    setSozuriApiKey("");
    setTextsmsApiKey("");
  }, []);

  const load = useCallback(async () => {
    setBooting(true);
    setLoadError("");
    try {
      applySettings(await fetchPlatformIntegrations());
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load integrations.",
      );
    } finally {
      setBooting(false);
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const apply = () => {
      const next = sectionFromHash(window.location.hash);
      if (next) setActiveSection(next);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const onSave = async () => {
    setError("");
    setSuccess("");
    if (smsProvider === "textsms") {
      const hasStoredKey = Boolean(settings?.hasTextsmsApiKey);
      if (
        !textsmsPartnerId.trim() ||
        !textsmsShortcode.trim() ||
        (!textsmsApiKey.trim() && !hasStoredKey)
      ) {
        setError(
          "TextSMS needs partner ID, shortcode, and API key before you can save. " +
            "If a key is already stored, partner ID and shortcode must still be filled in.",
        );
        return;
      }
    }
    setBusy(true);
    try {
      const body: Parameters<typeof updatePlatformIntegrations>[0] = {
        deepseekHost: deepseekHost.trim(),
        deepseekUrl: deepseekUrl.trim(),
        deepseekModel: deepseekModel.trim(),
        rapidApiWhatsappHost: rapidApiWhatsappHost.trim(),
        rapidApiWhatsappLookupUrl: rapidApiWhatsappLookupUrl.trim(),
        rapidApiWhatsappPhoneField:
          rapidApiWhatsappPhoneField.trim() || "phone",
        rapidApiWhatsappPhoneDigitsOnly,
        whatsappMetaPhoneNumberId: whatsappMetaPhoneNumberId.trim(),
        whatsappMetaGraphVersion: whatsappMetaGraphVersion.trim() || "v25.0",
        smsProvider: smsProvider.trim() || "none",
        sozuriProject: sozuriProject.trim(),
        sozuriFrom: sozuriFrom.trim() || "Sozuri",
        sozuriType: sozuriType.trim() || "transactional",
        sozuriApiUrl:
          sozuriApiUrl.trim() || "https://sozuri.net/api/v1/messaging",
        textsmsPartnerId: textsmsPartnerId.trim(),
        textsmsShortcode: textsmsShortcode.trim(),
        textsmsApiUrl:
          textsmsApiUrl.trim() ||
          "https://sms.textsms.co.ke/api/services/sendsms/",
      };
      if (deepseekApiKey.trim()) body.deepseekApiKey = deepseekApiKey.trim();
      if (rapidApiWhatsappKey.trim()) {
        body.rapidApiWhatsappKey = rapidApiWhatsappKey.trim();
      }
      if (whatsappMetaAccessToken.trim()) {
        body.whatsappMetaAccessToken = whatsappMetaAccessToken.trim();
      }
      if (whatsappMetaWebhookVerifyToken.trim()) {
        body.whatsappMetaWebhookVerifyToken =
          whatsappMetaWebhookVerifyToken.trim();
      }
      if (whatsappMetaAppSecret.trim()) {
        body.whatsappMetaAppSecret = whatsappMetaAppSecret.trim();
      }
      if (sozuriApiKey.trim()) body.sozuriApiKey = sozuriApiKey.trim();
      if (textsmsApiKey.trim()) body.textsmsApiKey = textsmsApiKey.trim();

      const updated = await updatePlatformIntegrations(body);
      applySettings(updated);
      setSuccess("Platform integration settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const clearSecret = (
    id: string,
    title: string,
    description: string,
    body: Parameters<typeof updatePlatformIntegrations>[0],
    successMessage: string,
  ) => {
    showThemedConfirmToast({
      id,
      title,
      description,
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          applySettings(await updatePlatformIntegrations(body));
          setSuccess(successMessage);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Could not clear secret.",
          );
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const keysReady = [
    settings?.hasDeepseekApiKey,
    settings?.hasRapidapiWhatsappKey,
    settings?.hasWhatsappMetaAccessToken,
    settings?.hasSozuriApiKey,
    settings?.hasTextsmsApiKey,
  ].filter(Boolean).length;

  const metaReady = Boolean(
    settings?.hasWhatsappMetaAccessToken &&
      whatsappMetaPhoneNumberId.trim(),
  );

  const sectionSummary = (sectionId: IntegrationsSectionId): ReactNode => {
    switch (sectionId) {
      case "deepseek":
        return (
          <>
            Key{" "}
            <span className="font-semibold">
              {settings?.hasDeepseekApiKey ? "stored" : "missing"}
            </span>
            {settings?.envDeepseekConfigured ? " · env also set" : null}
          </>
        );
      case "meta":
        return (
          <>
            Token{" "}
            <span className="font-semibold">
              {settings?.hasWhatsappMetaAccessToken ? "yes" : "no"}
            </span>
            {" · "}
            verify{" "}
            <span className="font-semibold">
              {settings?.hasWhatsappMetaWebhookVerifyToken ? "yes" : "no"}
            </span>
            {" · "}
            secret{" "}
            <span className="font-semibold">
              {settings?.hasWhatsappMetaAppSecret ? "yes" : "no"}
            </span>
          </>
        );
      case "lookup":
        return (
          <>
            Key{" "}
            <span className="font-semibold">
              {settings?.hasRapidapiWhatsappKey ? "stored" : "missing"}
            </span>
            {" · "}
            digits only{" "}
            <span className="font-semibold">
              {rapidApiWhatsappPhoneDigitsOnly ? "on" : "off"}
            </span>
          </>
        );
      case "sms":
        return (
          <>
            Provider{" "}
            <span className="font-semibold capitalize">
              {smsProvider === "africas_talking"
                ? "Africa's Talking"
                : smsProvider === "none"
                  ? "none"
                  : smsProvider}
            </span>
          </>
        );
      default:
        return null;
    }
  };

  const drawerBody = (() => {
    if (!activeSection) return null;

    if (activeSection === "deepseek") {
      return (
        <div className="space-y-4">
          <p className={dashboardHintClass()}>
            Legacy RapidAPI DeepSeek key. Product descriptions now use{" "}
            <Link
              href="/super-admin/platform/sokomind"
              className="font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
            >
              SokoMind
            </Link>
            , same as storefront theme AI.
          </p>
          <div className="flex items-center gap-2">
            <KeyStatus ready={Boolean(settings?.hasDeepseekApiKey)} />
            {settings?.envDeepseekConfigured ? (
              <span className={dashboardHintClass()}>env also configured</span>
            ) : null}
          </div>
          <Field id="sa-deepseek-key" label="RapidAPI key (DeepSeek)">
            <Input
              id="sa-deepseek-key"
              type="password"
              autoComplete="off"
              className={dashboardInputClass()}
              placeholder={
                settings?.hasDeepseekApiKey
                  ? "••••••••  (leave blank to keep)"
                  : "Paste RapidAPI key"
              }
              value={deepseekApiKey}
              onChange={(ev) => setDeepseekApiKey(ev.target.value)}
            />
            {settings?.hasDeepseekApiKey ? (
              <ClearKeyButton
                disabled={busy}
                onClick={() =>
                  clearSecret(
                    "clear-deepseek-key",
                    "Remove DeepSeek API key?",
                    "The stored DeepSeek API key will be cleared.",
                    { deepseekApiKey: "" },
                    "DeepSeek API key cleared.",
                  )
                }
              />
            ) : null}
          </Field>
          <Field id="sa-deepseek-url" label="API URL">
            <Input
              id="sa-deepseek-url"
              className={dashboardInputClass()}
              value={deepseekUrl}
              onChange={(ev) => setDeepseekUrl(ev.target.value)}
              placeholder="https://deepseek-v31.p.rapidapi.com/"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="sa-deepseek-host" label="RapidAPI host">
              <Input
                id="sa-deepseek-host"
                className={dashboardInputClass()}
                value={deepseekHost}
                onChange={(ev) => setDeepseekHost(ev.target.value)}
                placeholder="deepseek-v31.p.rapidapi.com"
              />
            </Field>
            <Field id="sa-deepseek-model" label="Model">
              <Input
                id="sa-deepseek-model"
                className={dashboardInputClass()}
                value={deepseekModel}
                onChange={(ev) => setDeepseekModel(ev.target.value)}
                placeholder="DeepSeek-V3-0324"
              />
            </Field>
          </div>
        </div>
      );
    }

    if (activeSection === "meta") {
      return (
        <div className="space-y-4">
          <p className={dashboardHintClass()}>
            Platform defaults for outbound WhatsApp and{" "}
            <code className="font-mono text-[10px]">/webhooks/whatsapp</code>.
            Tenants can override access token / phone ID on the Credit tab.
          </p>
          <p className={dashboardHintClass()}>
            Access token: {settings?.hasWhatsappMetaAccessToken ? "yes" : "no"}
            {" · "}
            verify:{" "}
            {settings?.hasWhatsappMetaWebhookVerifyToken ? "yes" : "no"}
            {" · "}
            app secret: {settings?.hasWhatsappMetaAppSecret ? "yes" : "no"}
            {settings?.envWhatsappMetaConfigured
              ? " · env also configured"
              : null}
          </p>
          <Field id="sa-meta-access-token" label="Access token">
            <Input
              id="sa-meta-access-token"
              type="password"
              autoComplete="off"
              className={dashboardInputClass()}
              placeholder={
                settings?.hasWhatsappMetaAccessToken
                  ? "••••••••  (leave blank to keep)"
                  : "Paste Meta WhatsApp access token"
              }
              value={whatsappMetaAccessToken}
              onChange={(ev) => setWhatsappMetaAccessToken(ev.target.value)}
            />
            {settings?.hasWhatsappMetaAccessToken ? (
              <ClearKeyButton
                label="Clear stored token"
                disabled={busy}
                onClick={() =>
                  clearSecret(
                    "clear-meta-access-token",
                    "Remove Meta access token?",
                    "Env fallback still applies if set. Tenant overrides still apply.",
                    { whatsappMetaAccessToken: "" },
                    "Meta WhatsApp access token cleared.",
                  )
                }
              />
            ) : null}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="sa-meta-phone-id" label="Phone number ID">
              <Input
                id="sa-meta-phone-id"
                className={dashboardInputClass()}
                value={whatsappMetaPhoneNumberId}
                onChange={(ev) => setWhatsappMetaPhoneNumberId(ev.target.value)}
                placeholder="1252977897893339"
              />
            </Field>
            <Field id="sa-meta-graph-version" label="Graph API version">
              <Input
                id="sa-meta-graph-version"
                className={dashboardInputClass()}
                value={whatsappMetaGraphVersion}
                onChange={(ev) => setWhatsappMetaGraphVersion(ev.target.value)}
                placeholder="v25.0"
              />
            </Field>
          </div>
          <Field id="sa-meta-verify-token" label="Webhook verify token">
            <Input
              id="sa-meta-verify-token"
              type="password"
              autoComplete="off"
              className={dashboardInputClass()}
              placeholder={
                settings?.hasWhatsappMetaWebhookVerifyToken
                  ? "••••••••  (leave blank to keep)"
                  : "Same token configured in Meta dashboard"
              }
              value={whatsappMetaWebhookVerifyToken}
              onChange={(ev) =>
                setWhatsappMetaWebhookVerifyToken(ev.target.value)
              }
            />
            {settings?.hasWhatsappMetaWebhookVerifyToken ? (
              <ClearKeyButton
                label="Clear stored token"
                disabled={busy}
                onClick={() =>
                  clearSecret(
                    "clear-meta-webhook-verify",
                    "Remove webhook verify token?",
                    "Env fallback still applies if set.",
                    { whatsappMetaWebhookVerifyToken: "" },
                    "Webhook verify token cleared.",
                  )
                }
              />
            ) : null}
          </Field>
          <Field id="sa-meta-app-secret" label="App secret">
            <Input
              id="sa-meta-app-secret"
              type="password"
              autoComplete="off"
              className={dashboardInputClass()}
              placeholder={
                settings?.hasWhatsappMetaAppSecret
                  ? "••••••••  (leave blank to keep)"
                  : "Meta app secret for X-Hub-Signature-256"
              }
              value={whatsappMetaAppSecret}
              onChange={(ev) => setWhatsappMetaAppSecret(ev.target.value)}
            />
            {settings?.hasWhatsappMetaAppSecret ? (
              <ClearKeyButton
                label="Clear stored secret"
                disabled={busy}
                onClick={() =>
                  clearSecret(
                    "clear-meta-app-secret",
                    "Remove Meta app secret?",
                    "Env fallback still applies if set.",
                    { whatsappMetaAppSecret: "" },
                    "Meta app secret cleared.",
                  )
                }
              />
            ) : null}
          </Field>
          <p className={dashboardHintClass()}>
            Callback URL:{" "}
            <code className="font-mono text-[10px]">
              {"{API_PUBLIC_BASE_URL}/webhooks/whatsapp"}
            </code>
          </p>
        </div>
      );
    }

    if (activeSection === "lookup") {
      return (
        <div className="space-y-4">
          <p className={dashboardHintClass()}>
            Platform defaults for RapidAPI WhatsApp number lookup. Tenants can
            override in Credit tab reminders.
          </p>
          <div className="flex items-center gap-2">
            <KeyStatus ready={Boolean(settings?.hasRapidapiWhatsappKey)} />
          </div>
          <Field id="sa-rapidapi-wa-key" label="RapidAPI key">
            <Input
              id="sa-rapidapi-wa-key"
              type="password"
              autoComplete="off"
              className={dashboardInputClass()}
              placeholder={
                settings?.hasRapidapiWhatsappKey
                  ? "••••••••  (leave blank to keep)"
                  : "Paste RapidAPI key"
              }
              value={rapidApiWhatsappKey}
              onChange={(ev) => setRapidApiWhatsappKey(ev.target.value)}
            />
            {settings?.hasRapidapiWhatsappKey ? (
              <ClearKeyButton
                disabled={busy}
                onClick={() =>
                  clearSecret(
                    "clear-whatsapp-key",
                    "Remove RapidAPI WhatsApp key?",
                    "Tenant overrides still apply.",
                    { rapidApiWhatsappKey: "" },
                    "RapidAPI WhatsApp key cleared.",
                  )
                }
              />
            ) : null}
          </Field>
          <Field id="sa-rapidapi-wa-url" label="Lookup URL">
            <Input
              id="sa-rapidapi-wa-url"
              className={dashboardInputClass()}
              value={rapidApiWhatsappLookupUrl}
              onChange={(ev) => setRapidApiWhatsappLookupUrl(ev.target.value)}
              placeholder="https://whatsapp-osint.p.rapidapi.com/bizos"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="sa-rapidapi-wa-host" label="RapidAPI host">
              <Input
                id="sa-rapidapi-wa-host"
                className={dashboardInputClass()}
                value={rapidApiWhatsappHost}
                onChange={(ev) => setRapidApiWhatsappHost(ev.target.value)}
                placeholder="whatsapp-osint.p.rapidapi.com"
              />
            </Field>
            <Field id="sa-rapidapi-wa-field" label="Phone JSON field">
              <Input
                id="sa-rapidapi-wa-field"
                className={dashboardInputClass()}
                value={rapidApiWhatsappPhoneField}
                onChange={(ev) => setRapidApiWhatsappPhoneField(ev.target.value)}
                placeholder="phone"
              />
            </Field>
          </div>
          <ToggleRow
            id="sa-rapidapi-wa-digits"
            label="Send digits only"
            description="Strip + and spaces before lookup."
            checked={rapidApiWhatsappPhoneDigitsOnly}
            onChange={setRapidApiWhatsappPhoneDigitsOnly}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className={dashboardHintClass()}>
          Platform default SMS provider. Tenants can override per business on
          the Credit tab.
        </p>
        <Field id="sa-sms-provider" label="Default SMS provider">
          <select
            id="sa-sms-provider"
            className={cn(dashboardSelectClass(), "sm:max-w-xs")}
            value={smsProvider}
            onChange={(ev) => setSmsProvider(ev.target.value)}
          >
            <option value="none">None</option>
            <option value="textsms">TextSMS (textsms.co.ke)</option>
            <option value="sozuri">Sozuri</option>
            <option value="africas_talking">
              Africa&apos;s Talking (tenant creds)
            </option>
          </select>
        </Field>

        {smsProvider === "sozuri" ? (
          <>
            <div className="flex items-center gap-2">
              <KeyStatus ready={Boolean(settings?.hasSozuriApiKey)} />
            </div>
            <Field id="sa-sozuri-project" label="Sozuri project">
              <Input
                id="sa-sozuri-project"
                className={dashboardInputClass()}
                value={sozuriProject}
                onChange={(ev) => setSozuriProject(ev.target.value)}
                placeholder="kiosk.ke"
              />
            </Field>
            <Field id="sa-sozuri-key" label="Sozuri API key">
              <Input
                id="sa-sozuri-key"
                type="password"
                autoComplete="off"
                className={dashboardInputClass()}
                placeholder={
                  settings?.hasSozuriApiKey
                    ? "••••••••  (leave blank to keep)"
                    : "Paste Sozuri API key"
                }
                value={sozuriApiKey}
                onChange={(ev) => setSozuriApiKey(ev.target.value)}
              />
              {settings?.hasSozuriApiKey ? (
                <ClearKeyButton
                  disabled={busy}
                  onClick={() =>
                    clearSecret(
                      "clear-sozuri-key",
                      "Remove Sozuri API key?",
                      "Tenant overrides still apply.",
                      { sozuriApiKey: "" },
                      "Sozuri API key cleared.",
                    )
                  }
                />
              ) : null}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="sa-sozuri-from" label="Sender ID (from)">
                <Input
                  id="sa-sozuri-from"
                  className={dashboardInputClass()}
                  value={sozuriFrom}
                  onChange={(ev) => setSozuriFrom(ev.target.value)}
                  placeholder="Sozuri"
                />
              </Field>
              <Field id="sa-sozuri-type" label="Message type">
                <select
                  id="sa-sozuri-type"
                  className={dashboardSelectClass()}
                  value={sozuriType}
                  onChange={(ev) => setSozuriType(ev.target.value)}
                >
                  <option value="transactional">Transactional</option>
                  <option value="promotional">Promotional</option>
                </select>
              </Field>
            </div>
            <Field id="sa-sozuri-url" label="API URL">
              <Input
                id="sa-sozuri-url"
                className={dashboardInputClass()}
                value={sozuriApiUrl}
                onChange={(ev) => setSozuriApiUrl(ev.target.value)}
                placeholder="https://sozuri.net/api/v1/messaging"
              />
            </Field>
            <p className={dashboardHintClass()}>
              Callbacks:{" "}
              <code className="font-mono text-[10px]">
                /webhooks/sozuri/inbox
              </code>{" "}
              and{" "}
              <code className="font-mono text-[10px]">
                /webhooks/sozuri/delivery
              </code>
            </p>
          </>
        ) : null}

        {smsProvider === "textsms" ? (
          <>
            <div className="flex items-center gap-2">
              <KeyStatus ready={Boolean(settings?.hasTextsmsApiKey)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="sa-textsms-partner" label="Partner ID">
                <Input
                  id="sa-textsms-partner"
                  className={dashboardInputClass()}
                  value={textsmsPartnerId}
                  onChange={(ev) => setTextsmsPartnerId(ev.target.value)}
                  placeholder="Partner ID from TextSMS"
                />
              </Field>
              <Field id="sa-textsms-shortcode" label="Shortcode / sender ID">
                <Input
                  id="sa-textsms-shortcode"
                  className={dashboardInputClass()}
                  value={textsmsShortcode}
                  onChange={(ev) => setTextsmsShortcode(ev.target.value)}
                  placeholder="Approved shortcode"
                />
              </Field>
            </div>
            <Field id="sa-textsms-key" label="API key">
              <Input
                id="sa-textsms-key"
                type="password"
                autoComplete="off"
                className={dashboardInputClass()}
                placeholder={
                  settings?.hasTextsmsApiKey
                    ? "••••••••  (leave blank to keep)"
                    : "Paste TextSMS API key"
                }
                value={textsmsApiKey}
                onChange={(ev) => setTextsmsApiKey(ev.target.value)}
              />
              {settings?.hasTextsmsApiKey ? (
                <ClearKeyButton
                  disabled={busy}
                  onClick={() =>
                    clearSecret(
                      "clear-textsms-key",
                      "Remove TextSMS API key?",
                      "Tenant overrides still apply.",
                      { textsmsApiKey: "" },
                      "TextSMS API key cleared.",
                    )
                  }
                />
              ) : null}
            </Field>
            <Field id="sa-textsms-url" label="API URL">
              <Input
                id="sa-textsms-url"
                className={dashboardInputClass()}
                value={textsmsApiUrl}
                onChange={(ev) => setTextsmsApiUrl(ev.target.value)}
                placeholder="https://sms.textsms.co.ke/api/services/sendsms/"
              />
            </Field>
            <p className={dashboardHintClass()}>
              Sends to{" "}
              <code className="font-mono text-[10px]">sms.textsms.co.ke</code>{" "}
              with partner ID, API key, mobile, message, and shortcode.
            </p>
          </>
        ) : null}

        {smsProvider === "africas_talking" ? (
          <p className={dashboardHintClass()}>
            Africa&apos;s Talking credentials are configured per tenant on the
            Credit tab reminders settings.
          </p>
        ) : null}

        <Link
          href="/super-admin/platform/sms-credits"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
        >
          SMS credits &amp; limits
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    );
  })();

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={Plug}
        eyebrow="Platform"
        title="Integrations"
        description="Platform-wide API keys and provider endpoints. Tenants can still override per business."
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
          aria-label="Refresh integrations"
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
          disabled={busy || !settings || Boolean(loadError)}
          onClick={() => void onSave()}
        >
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {success ? <DashboardFeedback kind="success" text={success} /> : null}
      {settings?.encryptionEphemeral ? (
        <DashboardFeedback
          kind="error"
          text="APP_PAYMENTS_ENCRYPTION_KEY is not set on the server. Stored keys will be lost on restart. Set the encryption key before saving secrets here."
        />
      ) : null}
      {settings && !settings.secretsReadable && settings.secretsError ? (
        <DashboardFeedback kind="error" text={settings.secretsError} />
      ) : null}

      <IntegrationsTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        keysReady={keysReady}
        smsProvider={smsProvider}
        metaReady={metaReady}
        loading={booting || !settings}
        sectionSummary={sectionSummary}
        drawerBody={drawerBody}
        drawerFooter={
          <Button
            type="button"
            className={PRIMARY_BTN}
            disabled={busy || !settings || Boolean(loadError)}
            onClick={() => void onSave()}
          >
            {busy ? "Saving…" : "Save settings"}
          </Button>
        }
      />
    </div>
  );
}

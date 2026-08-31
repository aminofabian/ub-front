"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SaSection, SaToggleRow, saSelectClass } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchPlatformIntegrations,
  updatePlatformIntegrations,
  type PlatformIntegrationsRecord,
} from "@/lib/super-admin-api";

function Field({
  id,
  label,
  children,
}: {
  id?: string;
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

export default function SuperAdminPlatformIntegrationsPage() {
  const [settings, setSettings] = useState<PlatformIntegrationsRecord | null>(null);
  const [loadError, setLoadError] = useState("");

  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekHost, setDeepseekHost] = useState("");
  const [deepseekUrl, setDeepseekUrl] = useState("");
  const [deepseekModel, setDeepseekModel] = useState("");
  const [rapidApiWhatsappKey, setRapidApiWhatsappKey] = useState("");
  const [rapidApiWhatsappHost, setRapidApiWhatsappHost] = useState("");
  const [rapidApiWhatsappLookupUrl, setRapidApiWhatsappLookupUrl] = useState("");
  const [rapidApiWhatsappPhoneField, setRapidApiWhatsappPhoneField] = useState("phone");
  const [rapidApiWhatsappPhoneDigitsOnly, setRapidApiWhatsappPhoneDigitsOnly] =
    useState(false);
  const [whatsappMetaAccessToken, setWhatsappMetaAccessToken] = useState("");
  const [whatsappMetaPhoneNumberId, setWhatsappMetaPhoneNumberId] = useState("");
  const [whatsappMetaGraphVersion, setWhatsappMetaGraphVersion] = useState("v25.0");
  const [whatsappMetaWebhookVerifyToken, setWhatsappMetaWebhookVerifyToken] = useState("");
  const [whatsappMetaAppSecret, setWhatsappMetaAppSecret] = useState("");
  const [smsProvider, setSmsProvider] = useState("none");
  const [sozuriProject, setSozuriProject] = useState("");
  const [sozuriApiKey, setSozuriApiKey] = useState("");
  const [sozuriFrom, setSozuriFrom] = useState("Sozuri");
  const [sozuriType, setSozuriType] = useState("transactional");
  const [sozuriApiUrl, setSozuriApiUrl] = useState("https://sozuri.net/api/v1/messaging");
  const [textsmsPartnerId, setTextsmsPartnerId] = useState("");
  const [textsmsApiKey, setTextsmsApiKey] = useState("");
  const [textsmsShortcode, setTextsmsShortcode] = useState("");
  const [textsmsApiUrl, setTextsmsApiUrl] = useState(
    "https://sms.textsms.co.ke/api/services/sendsms/",
  );

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const row = await fetchPlatformIntegrations();
      setSettings(row);
      setDeepseekHost(row.deepseekHost ?? "");
      setDeepseekUrl(row.deepseekUrl ?? "");
      setDeepseekModel(row.deepseekModel ?? "");
      setRapidApiWhatsappHost(row.rapidApiWhatsappHost ?? "");
      setRapidApiWhatsappLookupUrl(row.rapidApiWhatsappLookupUrl ?? "");
      setRapidApiWhatsappPhoneField(row.rapidApiWhatsappPhoneField || "phone");
      setRapidApiWhatsappPhoneDigitsOnly(Boolean(row.rapidApiWhatsappPhoneDigitsOnly));
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
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load integrations.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
        rapidApiWhatsappPhoneField: rapidApiWhatsappPhoneField.trim() || "phone",
        rapidApiWhatsappPhoneDigitsOnly,
        whatsappMetaPhoneNumberId: whatsappMetaPhoneNumberId.trim(),
        whatsappMetaGraphVersion: whatsappMetaGraphVersion.trim() || "v25.0",
        smsProvider: smsProvider.trim() || "none",
        sozuriProject: sozuriProject.trim(),
        sozuriFrom: sozuriFrom.trim() || "Sozuri",
        sozuriType: sozuriType.trim() || "transactional",
        sozuriApiUrl: sozuriApiUrl.trim() || "https://sozuri.net/api/v1/messaging",
        textsmsPartnerId: textsmsPartnerId.trim(),
        textsmsShortcode: textsmsShortcode.trim(),
        textsmsApiUrl:
          textsmsApiUrl.trim() || "https://sms.textsms.co.ke/api/services/sendsms/",
      };
      if (deepseekApiKey.trim()) {
        body.deepseekApiKey = deepseekApiKey.trim();
      }
      if (rapidApiWhatsappKey.trim()) {
        body.rapidApiWhatsappKey = rapidApiWhatsappKey.trim();
      }
      if (whatsappMetaAccessToken.trim()) {
        body.whatsappMetaAccessToken = whatsappMetaAccessToken.trim();
      }
      if (whatsappMetaWebhookVerifyToken.trim()) {
        body.whatsappMetaWebhookVerifyToken = whatsappMetaWebhookVerifyToken.trim();
      }
      if (whatsappMetaAppSecret.trim()) {
        body.whatsappMetaAppSecret = whatsappMetaAppSecret.trim();
      }
      if (sozuriApiKey.trim()) {
        body.sozuriApiKey = sozuriApiKey.trim();
      }
      if (textsmsApiKey.trim()) {
        body.textsmsApiKey = textsmsApiKey.trim();
      }
      const updated = await updatePlatformIntegrations(body);
      setSettings(updated);
      setDeepseekApiKey("");
      setRapidApiWhatsappKey("");
      setWhatsappMetaAccessToken("");
      setWhatsappMetaWebhookVerifyToken("");
      setWhatsappMetaAppSecret("");
      setSozuriApiKey("");
      setTextsmsApiKey("");
      setWhatsappMetaPhoneNumberId(updated.whatsappMetaPhoneNumberId ?? "");
      setWhatsappMetaGraphVersion(updated.whatsappMetaGraphVersion || "v25.0");
      setSuccess("Platform integration settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const onClearDeepseekKey = () => {
    showThemedConfirmToast({
      id: "clear-deepseek-key",
      title: "Remove DeepSeek API key?",
      description: "The stored DeepSeek API key will be cleared.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated = await updatePlatformIntegrations({ deepseekApiKey: "" });
          setSettings(updated);
          setDeepseekApiKey("");
          setSuccess("DeepSeek API key cleared.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not clear key.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const onClearWhatsappKey = () => {
    showThemedConfirmToast({
      id: "clear-whatsapp-key",
      title: "Remove RapidAPI WhatsApp key?",
      description: "Tenant overrides still apply.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated = await updatePlatformIntegrations({ rapidApiWhatsappKey: "" });
          setSettings(updated);
          setRapidApiWhatsappKey("");
          setSuccess("RapidAPI WhatsApp key cleared.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not clear key.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const onClearMetaAccessToken = () => {
    showThemedConfirmToast({
      id: "clear-meta-access-token",
      title: "Remove Meta access token?",
      description: "Env fallback still applies if set. Tenant overrides still apply.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated = await updatePlatformIntegrations({ whatsappMetaAccessToken: "" });
          setSettings(updated);
          setWhatsappMetaAccessToken("");
          setSuccess("Meta WhatsApp access token cleared.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not clear token.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const onClearMetaWebhookVerifyToken = () => {
    showThemedConfirmToast({
      id: "clear-meta-webhook-verify",
      title: "Remove webhook verify token?",
      description: "Env fallback still applies if set.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated = await updatePlatformIntegrations({
            whatsappMetaWebhookVerifyToken: "",
          });
          setSettings(updated);
          setWhatsappMetaWebhookVerifyToken("");
          setSuccess("Webhook verify token cleared.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not clear token.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const onClearMetaAppSecret = () => {
    showThemedConfirmToast({
      id: "clear-meta-app-secret",
      title: "Remove Meta app secret?",
      description: "Env fallback still applies if set.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated = await updatePlatformIntegrations({ whatsappMetaAppSecret: "" });
          setSettings(updated);
          setWhatsappMetaAppSecret("");
          setSuccess("Meta app secret cleared.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not clear secret.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const onClearSozuriKey = () => {
    showThemedConfirmToast({
      id: "clear-sozuri-key",
      title: "Remove Sozuri API key?",
      description: "Tenant overrides still apply.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated = await updatePlatformIntegrations({ sozuriApiKey: "" });
          setSettings(updated);
          setSozuriApiKey("");
          setSuccess("Sozuri API key cleared.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not clear key.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const onClearTextsmsKey = () => {
    showThemedConfirmToast({
      id: "clear-textsms-key",
      title: "Remove TextSMS API key?",
      description: "Tenant overrides still apply.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated = await updatePlatformIntegrations({ textsmsApiKey: "" });
          setSettings(updated);
          setTextsmsApiKey("");
          setSuccess("TextSMS API key cleared.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not clear key.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Platform integrations"
        description="Configure platform-wide API keys and provider endpoints in the admin UI. Tenants can still override per business."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      {settings && !settings.secretsReadable && settings.secretsError ? (
        <AuthAlert variant="error">{settings.secretsError}</AuthAlert>
      ) : null}

      {settings?.encryptionEphemeral ? (
        <AuthAlert variant="error">
          APP_PAYMENTS_ENCRYPTION_KEY is not set on the server. Stored keys will be lost on restart
          and cannot be decrypted reliably. Set the encryption key in production before saving
          secrets here.
        </AuthAlert>
      ) : null}

      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

      <form className="space-y-6" onSubmit={onSave}>
        <SaSection
          title="Product description AI"
          description='Legacy RapidAPI DeepSeek key. Product descriptions now use Super Admin → Platform → SokoMind, same as storefront theme AI.'
        >
          <div className="space-y-4">
            {settings ? (
              <p className="text-xs text-muted-foreground">
                Stored key: {settings.hasDeepseekApiKey ? "yes" : "no"}
              </p>
            ) : null}
            <Field id="sa-deepseek-key" label="RapidAPI key (DeepSeek)">
              <Input
                id="sa-deepseek-key"
                type="password"
                autoComplete="off"
                placeholder={
                  settings?.hasDeepseekApiKey
                    ? "••••••••  (leave blank to keep)"
                    : "Paste RapidAPI key"
                }
                value={deepseekApiKey}
                onChange={(ev) => setDeepseekApiKey(ev.target.value)}
              />
              {settings?.hasDeepseekApiKey ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => void onClearDeepseekKey()}
                >
                  Clear stored key
                </Button>
              ) : null}
            </Field>
            <Field id="sa-deepseek-url" label="API URL">
              <Input
                id="sa-deepseek-url"
                value={deepseekUrl}
                onChange={(ev) => setDeepseekUrl(ev.target.value)}
                placeholder="https://deepseek-v31.p.rapidapi.com/"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sa-deepseek-host" label="RapidAPI host">
                <Input
                  id="sa-deepseek-host"
                  value={deepseekHost}
                  onChange={(ev) => setDeepseekHost(ev.target.value)}
                  placeholder="deepseek-v31.p.rapidapi.com"
                />
              </Field>
              <Field id="sa-deepseek-model" label="Model">
                <Input
                  id="sa-deepseek-model"
                  value={deepseekModel}
                  onChange={(ev) => setDeepseekModel(ev.target.value)}
                  placeholder="DeepSeek-V3-0324"
                />
              </Field>
            </div>
          </div>
        </SaSection>

        <SaSection
          title="Meta WhatsApp Cloud API"
          description={
            <>
              Platform defaults for outbound WhatsApp and the{" "}
              <span className="font-mono">/webhooks/whatsapp</span> callback. Tenants can override
              access token / phone ID on the Credit tab. Env vars are optional last-resort fallbacks.
            </>
          }
        >
          <div className="space-y-4">
            {settings ? (
              <p className="text-xs text-muted-foreground">
                Stored access token: {settings.hasWhatsappMetaAccessToken ? "yes" : "no"}
                {" · "}
                verify token: {settings.hasWhatsappMetaWebhookVerifyToken ? "yes" : "no"}
                {" · "}
                app secret: {settings.hasWhatsappMetaAppSecret ? "yes" : "no"}
                {settings.envWhatsappMetaConfigured ? " · env also configured" : null}
              </p>
            ) : null}
            <Field id="sa-meta-access-token" label="Access token">
              <Input
                id="sa-meta-access-token"
                type="password"
                autoComplete="off"
                placeholder={
                  settings?.hasWhatsappMetaAccessToken
                    ? "••••••••  (leave blank to keep)"
                    : "Paste Meta WhatsApp access token"
                }
                value={whatsappMetaAccessToken}
                onChange={(ev) => setWhatsappMetaAccessToken(ev.target.value)}
              />
              {settings?.hasWhatsappMetaAccessToken ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => void onClearMetaAccessToken()}
                >
                  Clear stored token
                </Button>
              ) : null}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sa-meta-phone-id" label="Phone number ID">
                <Input
                  id="sa-meta-phone-id"
                  value={whatsappMetaPhoneNumberId}
                  onChange={(ev) => setWhatsappMetaPhoneNumberId(ev.target.value)}
                  placeholder="1252977897893339"
                />
              </Field>
              <Field id="sa-meta-graph-version" label="Graph API version">
                <Input
                  id="sa-meta-graph-version"
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
                placeholder={
                  settings?.hasWhatsappMetaWebhookVerifyToken
                    ? "••••••••  (leave blank to keep)"
                    : "Same token configured in Meta dashboard"
                }
                value={whatsappMetaWebhookVerifyToken}
                onChange={(ev) => setWhatsappMetaWebhookVerifyToken(ev.target.value)}
              />
              {settings?.hasWhatsappMetaWebhookVerifyToken ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => void onClearMetaWebhookVerifyToken()}
                >
                  Clear stored token
                </Button>
              ) : null}
            </Field>
            <Field id="sa-meta-app-secret" label="App secret">
              <Input
                id="sa-meta-app-secret"
                type="password"
                autoComplete="off"
                placeholder={
                  settings?.hasWhatsappMetaAppSecret
                    ? "••••••••  (leave blank to keep)"
                    : "Meta app secret for X-Hub-Signature-256"
                }
                value={whatsappMetaAppSecret}
                onChange={(ev) => setWhatsappMetaAppSecret(ev.target.value)}
              />
              {settings?.hasWhatsappMetaAppSecret ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => void onClearMetaAppSecret()}
                >
                  Clear stored secret
                </Button>
              ) : null}
            </Field>
            <p className="text-xs text-muted-foreground">
              Callback URL:{" "}
              <span className="font-mono">{"{API_PUBLIC_BASE_URL}/webhooks/whatsapp"}</span>
            </p>
          </div>
        </SaSection>

        <SaSection
          title="WhatsApp lookup"
          description="Platform defaults for RapidAPI WhatsApp number lookup. Tenants can override in Credit tab reminders."
        >
          <div className="space-y-4">
            {settings ? (
              <p className="text-xs text-muted-foreground">
                Stored key: {settings.hasRapidapiWhatsappKey ? "yes" : "no"}
              </p>
            ) : null}
            <Field id="sa-rapidapi-wa-key" label="RapidAPI key">
              <Input
                id="sa-rapidapi-wa-key"
                type="password"
                autoComplete="off"
                placeholder={
                  settings?.hasRapidapiWhatsappKey
                    ? "••••••••  (leave blank to keep)"
                    : "Paste RapidAPI key"
                }
                value={rapidApiWhatsappKey}
                onChange={(ev) => setRapidApiWhatsappKey(ev.target.value)}
              />
              {settings?.hasRapidapiWhatsappKey ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => void onClearWhatsappKey()}
                >
                  Clear stored key
                </Button>
              ) : null}
            </Field>
            <Field id="sa-rapidapi-wa-url" label="Lookup URL">
              <Input
                id="sa-rapidapi-wa-url"
                value={rapidApiWhatsappLookupUrl}
                onChange={(ev) => setRapidApiWhatsappLookupUrl(ev.target.value)}
                placeholder="https://whatsapp-osint.p.rapidapi.com/bizos"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sa-rapidapi-wa-host" label="RapidAPI host">
                <Input
                  id="sa-rapidapi-wa-host"
                  value={rapidApiWhatsappHost}
                  onChange={(ev) => setRapidApiWhatsappHost(ev.target.value)}
                  placeholder="whatsapp-osint.p.rapidapi.com"
                />
              </Field>
              <Field id="sa-rapidapi-wa-field" label="Phone JSON field">
                <Input
                  id="sa-rapidapi-wa-field"
                  value={rapidApiWhatsappPhoneField}
                  onChange={(ev) => setRapidApiWhatsappPhoneField(ev.target.value)}
                  placeholder="phone"
                />
              </Field>
            </div>
            <SaToggleRow
              id="sa-rapidapi-wa-digits"
              label="Send digits only"
              description="Strip + and spaces before lookup."
              checked={rapidApiWhatsappPhoneDigitsOnly}
              onChange={setRapidApiWhatsappPhoneDigitsOnly}
            />
          </div>
        </SaSection>

        <SaSection
          title="SMS fallback"
          description="Choose the platform default SMS provider. Tenants can override per business on the Credit tab. Env vars are optional last-resort fallback only."
        >
          <div className="space-y-4">
            <Field id="sa-sms-provider" label="Default SMS provider">
              <select
                id="sa-sms-provider"
                className={`${saSelectClass} sm:max-w-xs`}
                value={smsProvider}
                onChange={(ev) => setSmsProvider(ev.target.value)}
              >
                <option value="none">None</option>
                <option value="textsms">TextSMS (textsms.co.ke)</option>
                <option value="sozuri">Sozuri</option>
                <option value="africas_talking">Africa&apos;s Talking (tenant creds)</option>
              </select>
            </Field>

            {smsProvider === "sozuri" ? (
              <>
                {settings ? (
                  <p className="text-xs text-muted-foreground">
                    Stored Sozuri key: {settings.hasSozuriApiKey ? "yes" : "no"}
                  </p>
                ) : null}
                <Field id="sa-sozuri-project" label="Sozuri project">
                  <Input
                    id="sa-sozuri-project"
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
                    placeholder={
                      settings?.hasSozuriApiKey
                        ? "••••••••  (leave blank to keep)"
                        : "Paste Sozuri API key"
                    }
                    value={sozuriApiKey}
                    onChange={(ev) => setSozuriApiKey(ev.target.value)}
                  />
                  {settings?.hasSozuriApiKey ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => void onClearSozuriKey()}
                    >
                      Clear stored key
                    </Button>
                  ) : null}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="sa-sozuri-from" label="Sender ID (from)">
                    <Input
                      id="sa-sozuri-from"
                      value={sozuriFrom}
                      onChange={(ev) => setSozuriFrom(ev.target.value)}
                      placeholder="Sozuri"
                    />
                  </Field>
                  <Field id="sa-sozuri-type" label="Message type">
                    <select
                      id="sa-sozuri-type"
                      className={saSelectClass}
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
                    value={sozuriApiUrl}
                    onChange={(ev) => setSozuriApiUrl(ev.target.value)}
                    placeholder="https://sozuri.net/api/v1/messaging"
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Callbacks: <span className="font-mono">/webhooks/sozuri/inbox</span> and{" "}
                  <span className="font-mono">/webhooks/sozuri/delivery</span> on your API host.
                </p>
              </>
            ) : null}

            {smsProvider === "textsms" ? (
              <>
                {settings ? (
                  <p className="text-xs text-muted-foreground">
                    Stored TextSMS key: {settings.hasTextsmsApiKey ? "yes" : "no"}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="sa-textsms-partner" label="Partner ID">
                    <Input
                      id="sa-textsms-partner"
                      value={textsmsPartnerId}
                      onChange={(ev) => setTextsmsPartnerId(ev.target.value)}
                      placeholder="Partner ID from TextSMS"
                    />
                  </Field>
                  <Field id="sa-textsms-shortcode" label="Shortcode / sender ID">
                    <Input
                      id="sa-textsms-shortcode"
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
                    placeholder={
                      settings?.hasTextsmsApiKey
                        ? "••••••••  (leave blank to keep)"
                        : "Paste TextSMS API key"
                    }
                    value={textsmsApiKey}
                    onChange={(ev) => setTextsmsApiKey(ev.target.value)}
                  />
                  {settings?.hasTextsmsApiKey ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => void onClearTextsmsKey()}
                    >
                      Clear stored key
                    </Button>
                  ) : null}
                </Field>
                <Field id="sa-textsms-url" label="API URL">
                  <Input
                    id="sa-textsms-url"
                    value={textsmsApiUrl}
                    onChange={(ev) => setTextsmsApiUrl(ev.target.value)}
                    placeholder="https://sms.textsms.co.ke/api/services/sendsms/"
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Sends to <span className="font-mono">sms.textsms.co.ke</span> with partner ID, API
                  key, mobile (digits), message, and shortcode.
                </p>
              </>
            ) : null}

            {smsProvider === "africas_talking" ? (
              <p className="text-xs text-muted-foreground">
                Africa&apos;s Talking credentials are configured per tenant on the Credit tab
                reminders settings.
              </p>
            ) : null}
          </div>
        </SaSection>

        <div className="flex justify-end">
          <Link
            href="/super-admin/platform/sms-credits"
            className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            SMS credits &amp; limits
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Button type="submit" disabled={busy || !settings}>
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

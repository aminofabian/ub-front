"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Sparkles } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchPlatformIntegrations,
  updatePlatformIntegrations,
  type PlatformIntegrationsRecord,
} from "@/lib/super-admin-api";

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
      setDeepseekApiKey("");
      setRapidApiWhatsappKey("");
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
      };
      if (deepseekApiKey.trim()) {
        body.deepseekApiKey = deepseekApiKey.trim();
      } else if (settings && !settings.hasDeepseekApiKey && deepseekApiKey === "") {
        // leave unchanged
      }
      if (rapidApiWhatsappKey.trim()) {
        body.rapidApiWhatsappKey = rapidApiWhatsappKey.trim();
      }
      const updated = await updatePlatformIntegrations(body);
      setSettings(updated);
      setDeepseekApiKey("");
      setRapidApiWhatsappKey("");
      setSuccess("Platform integration settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const onClearDeepseekKey = async () => {
    if (!window.confirm("Remove the stored DeepSeek API key? Env fallback will be used if set.")) {
      return;
    }
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
  };

  const onClearWhatsappKey = async () => {
    if (
      !window.confirm(
        "Remove the stored RapidAPI WhatsApp key? Env / tenant overrides still apply.",
      )
    ) {
      return;
    }
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
  };

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Platform integrations"
        description="Configure platform-wide API keys and provider endpoints. Values saved here override environment variables for all tenants."
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

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="font-heading text-lg">Product description AI</CardTitle>
              <CardDescription>
                DeepSeek via RapidAPI — powers &quot;Generate with AI&quot; on product forms.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}
          {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

          {settings ? (
            <p className="text-xs text-muted-foreground">
              Stored key: {settings.hasDeepseekApiKey ? "yes" : "no"}
              {settings.envDeepseekConfigured ? " · Env fallback (RAPIDAPI_DEEPSEEK_KEY / RAPIDAPI_KEY): yes" : ""}
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={onSave}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sa-deepseek-key">
                RapidAPI key (DeepSeek)
              </label>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="sa-deepseek-url">
                  API URL
                </label>
                <Input
                  id="sa-deepseek-url"
                  value={deepseekUrl}
                  onChange={(ev) => setDeepseekUrl(ev.target.value)}
                  placeholder="https://deepseek-v31.p.rapidapi.com/"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="sa-deepseek-host">
                  RapidAPI host
                </label>
                <Input
                  id="sa-deepseek-host"
                  value={deepseekHost}
                  onChange={(ev) => setDeepseekHost(ev.target.value)}
                  placeholder="deepseek-v31.p.rapidapi.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="sa-deepseek-model">
                  Model
                </label>
                <Input
                  id="sa-deepseek-model"
                  value={deepseekModel}
                  onChange={(ev) => setDeepseekModel(ev.target.value)}
                  placeholder="DeepSeek-V3-0324"
                />
              </div>
            </div>

            <div className="border-t border-border/60 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">Credit reminders — WhatsApp lookup</p>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Platform fallback when a tenant has not set their own RapidAPI settings. Tenants can
                still override in Customers → Credit tab reminders. Switch host/URL to use a
                different RapidAPI WhatsApp validator product.
              </p>
              {settings ? (
                <p className="mb-2 text-xs text-muted-foreground">
                  Stored key: {settings.hasRapidapiWhatsappKey ? "yes" : "no"}
                  {settings.envRapidapiWhatsappConfigured ? " · Env RAPIDAPI_KEY: yes" : ""}
                </p>
              ) : null}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="sa-rapidapi-wa-key">
                    RapidAPI key
                  </label>
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="sa-rapidapi-wa-url">
                    Lookup URL
                  </label>
                  <Input
                    id="sa-rapidapi-wa-url"
                    value={rapidApiWhatsappLookupUrl}
                    onChange={(ev) => setRapidApiWhatsappLookupUrl(ev.target.value)}
                    placeholder="https://whatsapp-osint.p.rapidapi.com/bizos"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="sa-rapidapi-wa-host">
                      RapidAPI host
                    </label>
                    <Input
                      id="sa-rapidapi-wa-host"
                      value={rapidApiWhatsappHost}
                      onChange={(ev) => setRapidApiWhatsappHost(ev.target.value)}
                      placeholder="whatsapp-osint.p.rapidapi.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="sa-rapidapi-wa-field">
                      Phone JSON field
                    </label>
                    <Input
                      id="sa-rapidapi-wa-field"
                      value={rapidApiWhatsappPhoneField}
                      onChange={(ev) => setRapidApiWhatsappPhoneField(ev.target.value)}
                      placeholder="phone"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={rapidApiWhatsappPhoneDigitsOnly}
                    onChange={(ev) => setRapidApiWhatsappPhoneDigitsOnly(ev.target.checked)}
                  />
                  <span>Send digits only (strip + / spaces)</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Example for WhatsApp Number Validator: host{" "}
                  <span className="font-mono">whatsapp-number-validator3.p.rapidapi.com</span>, URL
                  ending in{" "}
                  <span className="font-mono">/WhatsappNumberHasItWithToken</span>, field{" "}
                  <span className="font-mono">phone_number</span>, digits only on.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={busy || !settings}>
              {busy ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

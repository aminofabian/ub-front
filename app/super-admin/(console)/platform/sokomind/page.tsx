"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Eye, KeyRound, Sparkles } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchSokoMindSettings,
  updateSokoMindSettings,
  type SokoMindSettingsRecord,
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

export default function SuperAdminSokoMindSettingsPage() {
  const [settings, setSettings] = useState<SokoMindSettingsRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [sokomindEnabled, setSokomindEnabled] = useState(false);
  const [guideEnabled, setGuideEnabled] = useState(true);
  const [brainEnabled, setBrainEnabled] = useState(false);
  const [eyeEnabled, setEyeEnabled] = useState(false);
  const [primaryProvider, setPrimaryProvider] = useState("openai");
  const [defaultLocale, setDefaultLocale] = useState("en-KE");

  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState("");
  const [openaiMiniModel, setOpenaiMiniModel] = useState("gpt-4o-mini");
  const [openaiSmartModel, setOpenaiSmartModel] = useState("gpt-4.1");
  const [openaiVisionModel, setOpenaiVisionModel] = useState("gpt-4o");

  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState("");
  const [anthropicMiniModel, setAnthropicMiniModel] = useState("claude-haiku-4-5-20251001");
  const [anthropicSmartModel, setAnthropicSmartModel] = useState("claude-sonnet-4-5-20250929");

  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("https://deepseek-v31.p.rapidapi.com/");
  const [deepseekHost, setDeepseekHost] = useState("deepseek-v31.p.rapidapi.com");
  const [deepseekModel, setDeepseekModel] = useState("DeepSeek-V3-0324");

  const [industryCompareEnabled, setIndustryCompareEnabled] = useState(false);
  const [industryCompareMinTwins, setIndustryCompareMinTwins] = useState(8);
  const [dailyTokenBudgetPerTenant, setDailyTokenBudgetPerTenant] = useState("");
  const [maxToolCallsPerRequest, setMaxToolCallsPerRequest] = useState(8);
  const [systemPromptExtra, setSystemPromptExtra] = useState("");

  const applySettings = useCallback((row: SokoMindSettingsRecord) => {
    setSettings(row);
    setSokomindEnabled(row.sokomindEnabled);
    setGuideEnabled(row.guideEnabled);
    setBrainEnabled(row.brainEnabled);
    setEyeEnabled(row.eyeEnabled);
    setPrimaryProvider(row.primaryProvider || "openai");
    setDefaultLocale(row.defaultLocale || "en-KE");
    setOpenaiBaseUrl(row.openaiBaseUrl ?? "");
    setOpenaiMiniModel(row.openaiMiniModel || "gpt-4o-mini");
    setOpenaiSmartModel(row.openaiSmartModel || "gpt-4.1");
    setOpenaiVisionModel(row.openaiVisionModel || "gpt-4o");
    setAnthropicBaseUrl(row.anthropicBaseUrl ?? "");
    setAnthropicMiniModel(row.anthropicMiniModel || "claude-haiku-4-5-20251001");
    setAnthropicSmartModel(row.anthropicSmartModel || "claude-sonnet-4-5-20250929");
    setDeepseekBaseUrl(row.deepseekBaseUrl || "https://deepseek-v31.p.rapidapi.com/");
    setDeepseekHost(row.deepseekHost || "deepseek-v31.p.rapidapi.com");
    setDeepseekModel(row.deepseekModel || "DeepSeek-V3-0324");
    setIndustryCompareEnabled(row.industryCompareEnabled);
    setIndustryCompareMinTwins(row.industryCompareMinTwins || 8);
    setDailyTokenBudgetPerTenant(
      row.dailyTokenBudgetPerTenant != null ? String(row.dailyTokenBudgetPerTenant) : "",
    );
    setMaxToolCallsPerRequest(row.maxToolCallsPerRequest || 8);
    setSystemPromptExtra(row.systemPromptExtra ?? "");
    setOpenaiApiKey("");
    setAnthropicApiKey("");
    setDeepseekApiKey("");
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const row = await fetchSokoMindSettings();
      applySettings(row);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load SokoMind settings.");
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
      const budgetTrim = dailyTokenBudgetPerTenant.trim();
      const body: Parameters<typeof updateSokoMindSettings>[0] = {
        sokomindEnabled,
        guideEnabled,
        brainEnabled,
        eyeEnabled,
        primaryProvider: primaryProvider.trim() || "openai",
        defaultLocale: defaultLocale.trim() || "en-KE",
        openaiBaseUrl: openaiBaseUrl.trim(),
        openaiMiniModel: openaiMiniModel.trim(),
        openaiSmartModel: openaiSmartModel.trim(),
        openaiVisionModel: openaiVisionModel.trim(),
        anthropicBaseUrl: anthropicBaseUrl.trim(),
        anthropicMiniModel: anthropicMiniModel.trim(),
        anthropicSmartModel: anthropicSmartModel.trim(),
        deepseekBaseUrl: deepseekBaseUrl.trim(),
        deepseekHost: deepseekHost.trim(),
        deepseekModel: deepseekModel.trim(),
        industryCompareEnabled,
        industryCompareMinTwins,
        maxToolCallsPerRequest,
        systemPromptExtra: systemPromptExtra.trim(),
      };
      if (budgetTrim === "") {
        body.clearDailyTokenBudget = true;
      } else {
        const parsed = Number.parseInt(budgetTrim, 10);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error("Daily token budget must be a non-negative integer (or blank).");
        }
        body.dailyTokenBudgetPerTenant = parsed;
      }
      if (openaiApiKey.trim()) body.openaiApiKey = openaiApiKey.trim();
      if (anthropicApiKey.trim()) body.anthropicApiKey = anthropicApiKey.trim();
      if (deepseekApiKey.trim()) body.deepseekApiKey = deepseekApiKey.trim();

      const updated = await updateSokoMindSettings(body);
      applySettings(updated);
      setSuccess("SokoMind settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  };

  const clearKey = (
    field: "openaiApiKey" | "anthropicApiKey" | "deepseekApiKey",
    label: string,
  ) => {
    showThemedConfirmToast({
      id: `clear-sokomind-${field}`,
      title: `Clear ${label}?`,
      description: `The stored ${label} will be cleared. Env fallback (if any) still applies at runtime.`,
      confirmLabel: "Clear",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated = await updateSokoMindSettings({ [field]: "" });
          applySettings(updated);
          setSuccess(`${label} cleared.`);
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
        title="SokoMind"
        description="Platform AI co-pilot — Guide (help), Brain (analytics / pricing), Eye (vision / images). Keys are encrypted at rest; never returned after save."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      {settings?.encryptionEphemeral ? (
        <AuthAlert variant="error">
          APP_PAYMENTS_ENCRYPTION_KEY is not set on the server. Stored keys will be lost on restart
          — set a stable encryption key in production.
        </AuthAlert>
      ) : null}
      {settings && !settings.secretsReadable && settings.secretsError ? (
        <AuthAlert variant="error">{settings.secretsError}</AuthAlert>
      ) : null}

      <form onSubmit={onSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" aria-hidden />
              Faces &amp; master switch
            </CardTitle>
            <CardDescription>
              Master off disables all SokoMind traffic. Face toggles gate Guide / Brain / Eye skills.
              Env fallbacks:{" "}
              <code className="text-xs">SOKOMIND_ENABLED</code>,{" "}
              <code className="text-xs">OPENAI_API_KEY</code>,{" "}
              <code className="text-xs">ANTHROPIC_API_KEY</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              id="sokomind-enabled"
              label="Enable SokoMind"
              description="Platform-wide kill switch. Off = no LLM calls from the gateway."
              checked={sokomindEnabled}
              onChange={setSokomindEnabled}
            />
            <ToggleRow
              id="guide-enabled"
              label="Guide"
              description="Contextual help, page explain, message drafts, error translator."
              checked={guideEnabled}
              onChange={setGuideEnabled}
            />
            <ToggleRow
              id="brain-enabled"
              label="Brain"
              description="Industry twins, Price Radar, NL analytics, restock recommendations."
              checked={brainEnabled}
              onChange={setBrainEnabled}
            />
            <ToggleRow
              id="eye-enabled"
              label="Eye"
              description="Photo → product, invoice OCR, Cloudinary AI transforms."
              checked={eyeEnabled}
              onChange={setEyeEnabled}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Primary provider</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={primaryProvider}
                  onChange={(e) => setPrimaryProvider(e.target.value)}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="deepseek">DeepSeek (direct)</option>
                  <option value="rapidapi_deepseek">DeepSeek via RapidAPI</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Default locale</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                >
                  <option value="en-KE">English (Kenya)</option>
                  <option value="sw-KE">Swahili (Kenya)</option>
                </select>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" aria-hidden />
              OpenAI
            </CardTitle>
            <CardDescription>
              Stored key: {settings?.hasOpenaiApiKey ? "yes" : "no"}
              {settings?.envOpenaiConfigured ? " · env fallback configured" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">API key</span>
              <div className="flex gap-2">
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings?.hasOpenaiApiKey ? "•••••••• (leave blank to keep)" : "sk-…"
                  }
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
                {settings?.hasOpenaiApiKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => clearKey("openaiApiKey", "OpenAI API key")}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Base URL (optional)</span>
              <Input
                value={openaiBaseUrl}
                onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Mini model</span>
                <Input value={openaiMiniModel} onChange={(e) => setOpenaiMiniModel(e.target.value)} />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Smart model</span>
                <Input
                  value={openaiSmartModel}
                  onChange={(e) => setOpenaiSmartModel(e.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Vision model</span>
                <Input
                  value={openaiVisionModel}
                  onChange={(e) => setOpenaiVisionModel(e.target.value)}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="size-4" aria-hidden />
              Anthropic
            </CardTitle>
            <CardDescription>
              Stored key: {settings?.hasAnthropicApiKey ? "yes" : "no"}
              {settings?.envAnthropicConfigured ? " · env fallback configured" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">API key</span>
              <div className="flex gap-2">
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings?.hasAnthropicApiKey ? "•••••••• (leave blank to keep)" : "sk-ant-…"
                  }
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                />
                {settings?.hasAnthropicApiKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => clearKey("anthropicApiKey", "Anthropic API key")}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Base URL (optional)</span>
              <Input
                value={anthropicBaseUrl}
                onChange={(e) => setAnthropicBaseUrl(e.target.value)}
                placeholder="https://api.anthropic.com"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Mini model</span>
                <Input
                  value={anthropicMiniModel}
                  onChange={(e) => setAnthropicMiniModel(e.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Smart model</span>
                <Input
                  value={anthropicSmartModel}
                  onChange={(e) => setAnthropicSmartModel(e.target.value)}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="size-4" aria-hidden />
              DeepSeek
            </CardTitle>
            <CardDescription>
              Stored key: {settings?.hasDeepseekApiKey ? "yes" : "no"}
              {settings?.envDeepseekConfigured ? " · env fallback configured" : ""}
              . Separate from catalog DeepSeek under Integrations (product descriptions).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">API key</span>
              <div className="flex gap-2">
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings?.hasDeepseekApiKey ? "•••••••• (leave blank to keep)" : "RapidAPI / DeepSeek key"
                  }
                  value={deepseekApiKey}
                  onChange={(e) => setDeepseekApiKey(e.target.value)}
                />
                {settings?.hasDeepseekApiKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => clearKey("deepseekApiKey", "DeepSeek API key")}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Base URL</span>
                <Input value={deepseekBaseUrl} onChange={(e) => setDeepseekBaseUrl(e.target.value)} />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Host (RapidAPI header)</span>
                <Input value={deepseekHost} onChange={(e) => setDeepseekHost(e.target.value)} />
              </label>
            </div>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Model</span>
              <Input value={deepseekModel} onChange={(e) => setDeepseekModel(e.target.value)} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guardrails</CardTitle>
            <CardDescription>
              Cost and privacy controls for Brain industry compare and tool-calling loops.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              id="industry-compare"
              label="Industry compare (twins)"
              description="Anonymized benchmarks across similar shops. Requires k-anonymity below."
              checked={industryCompareEnabled}
              onChange={setIndustryCompareEnabled}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Min twins (k-anonymity)</span>
                <Input
                  type="number"
                  min={2}
                  max={100}
                  value={industryCompareMinTwins}
                  onChange={(e) => setIndustryCompareMinTwins(Number(e.target.value) || 8)}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Daily token budget / tenant</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={dailyTokenBudgetPerTenant}
                  onChange={(e) => setDailyTokenBudgetPerTenant(e.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Max tool calls / request</span>
                <Input
                  type="number"
                  min={1}
                  max={32}
                  value={maxToolCallsPerRequest}
                  onChange={(e) => setMaxToolCallsPerRequest(Number(e.target.value) || 8)}
                />
              </label>
            </div>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Extra system prompt (optional)</span>
              <textarea
                className="min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={systemPromptExtra}
                onChange={(e) => setSystemPromptExtra(e.target.value)}
                placeholder="Platform-wide tone or policy notes appended to every skill…"
              />
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>
            Reload
          </Button>
          <Button type="submit" disabled={busy || Boolean(loadError)}>
            {busy ? "Saving…" : "Save SokoMind"}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SaSection, SaToggleRow, saSelectClass } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSokoMindSettings,
  updateSokoMindSettings,
  type SokoMindSettingsRecord,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

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
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("https://api.deepseek.com/chat/completions");
  const [deepseekHost, setDeepseekHost] = useState("deepseek-v31.p.rapidapi.com");
  const [deepseekModel, setDeepseekModel] = useState("DeepSeek-V3-0324");
  const [rapidapiDeepseekApiKey, setRapidapiDeepseekApiKey] = useState("");

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
    setDeepseekBaseUrl(row.deepseekBaseUrl || "https://api.deepseek.com/chat/completions");
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
    setRapidapiDeepseekApiKey("");
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
      if (rapidapiDeepseekApiKey.trim()) {
        body.rapidapiDeepseekApiKey = rapidapiDeepseekApiKey.trim();
      }

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
    field: "openaiApiKey" | "anthropicApiKey" | "deepseekApiKey" | "rapidapiDeepseekApiKey",
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

  const providerCards = [
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT models via api.openai.com",
      ready: Boolean(settings?.hasOpenaiApiKey || settings?.envOpenaiConfigured),
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude models via api.anthropic.com",
      ready: Boolean(settings?.hasAnthropicApiKey || settings?.envAnthropicConfigured),
    },
    {
      id: "deepseek",
      name: "DeepSeek · direct",
      description: "api.deepseek.com — your platform.deepseek.com key",
      ready: Boolean(settings?.hasDeepseekApiKey || settings?.envDeepseekConfigured),
    },
    {
      id: "rapidapi_deepseek",
      name: "DeepSeek · RapidAPI",
      description: "RapidAPI proxy — needs its own RapidAPI key",
      ready: Boolean(settings?.hasRapidapiDeepseekApiKey || settings?.envDeepseekConfigured),
    },
  ] as const;

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="SokoMind"
        description="Platform AI co-pilot — Guide (help), Brain (analytics / pricing), Eye (vision / images). Keys are encrypted at rest and never returned after save. DeepSeek direct and DeepSeek via RapidAPI are separate setups with separate keys."
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
        <SaSection
          title="Faces & master switch"
          description={
            <>
              Master off disables all SokoMind traffic. Face toggles gate Guide / Brain / Eye. Env fallbacks:{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">SOKOMIND_ENABLED</code>,{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">OPENAI_API_KEY</code>,{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">ANTHROPIC_API_KEY</code>.
            </>
          }
        >
          <div className="space-y-3">
            <SaToggleRow
              id="sokomind-enabled"
              label="Enable SokoMind"
              description="Platform-wide kill switch. Off = no LLM calls from the gateway."
              checked={sokomindEnabled}
              onChange={setSokomindEnabled}
            />
            <SaToggleRow
              id="guide-enabled"
              label="Guide"
              description="Contextual help, page explain, message drafts, error translator."
              checked={guideEnabled}
              onChange={setGuideEnabled}
            />
            <SaToggleRow
              id="brain-enabled"
              label="Brain"
              description="Industry twins, Price Radar, NL analytics, restock recommendations."
              checked={brainEnabled}
              onChange={setBrainEnabled}
            />
            <SaToggleRow
              id="eye-enabled"
              label="Eye"
              description="Photo → product, invoice OCR, Cloudinary AI transforms."
              checked={eyeEnabled}
              onChange={setEyeEnabled}
            />
            <div className="space-y-2">
              <span className="text-sm font-medium leading-none text-foreground">
                Primary provider
              </span>
              <div
                className="grid gap-2 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Primary AI provider"
              >
                {providerCards.map((card) => {
                  const active = primaryProvider === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPrimaryProvider(card.id)}
                      className={cn(
                        "relative rounded-xl border p-3 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/70 bg-background hover:border-foreground/25",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {card.name}
                        </span>
                        {active ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                            Active
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                        {card.description}
                      </span>
                      <span
                        className={cn(
                          "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          card.ready
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            card.ready ? "bg-emerald-500" : "bg-amber-500",
                          )}
                        />
                        {card.ready ? "Key ready" : "Needs a key"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Default locale" id="sa-soko-locale">
              <select
                id="sa-soko-locale"
                className={saSelectClass}
                value={defaultLocale}
                onChange={(e) => setDefaultLocale(e.target.value)}
              >
                <option value="en-KE">English (Kenya)</option>
                <option value="sw-KE">Swahili (Kenya)</option>
              </select>
            </Field>
          </div>
        </SaSection>

        <SaSection
          title="OpenAI"
          description={
            <>
              Stored key: {settings?.hasOpenaiApiKey ? "yes" : "no"}
              {settings?.envOpenaiConfigured ? " · env fallback configured" : ""}
            </>
          }
        >
          <div className="space-y-3">
            <Field label="API key" id="sa-openai-key">
              <div className="flex gap-2">
                <Input
                  id="sa-openai-key"
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
            </Field>
            <Field label="Base URL (optional)" id="sa-openai-base">
              <Input
                id="sa-openai-base"
                value={openaiBaseUrl}
                onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Mini model" id="sa-openai-mini">
                <Input id="sa-openai-mini" value={openaiMiniModel} onChange={(e) => setOpenaiMiniModel(e.target.value)} />
              </Field>
              <Field label="Smart model" id="sa-openai-smart">
                <Input id="sa-openai-smart" value={openaiSmartModel} onChange={(e) => setOpenaiSmartModel(e.target.value)} />
              </Field>
              <Field label="Vision model" id="sa-openai-vision">
                <Input id="sa-openai-vision" value={openaiVisionModel} onChange={(e) => setOpenaiVisionModel(e.target.value)} />
              </Field>
            </div>
          </div>
        </SaSection>

        <SaSection
          title="Anthropic"
          description={
            <>
              Stored key: {settings?.hasAnthropicApiKey ? "yes" : "no"}
              {settings?.envAnthropicConfigured ? " · env fallback configured" : ""}
            </>
          }
        >
          <div className="space-y-3">
            <Field label="API key" id="sa-anthropic-key">
              <div className="flex gap-2">
                <Input
                  id="sa-anthropic-key"
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
            </Field>
            <Field label="Base URL (optional)" id="sa-anthropic-base">
              <Input
                id="sa-anthropic-base"
                value={anthropicBaseUrl}
                onChange={(e) => setAnthropicBaseUrl(e.target.value)}
                placeholder="https://api.anthropic.com"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mini model" id="sa-anthropic-mini">
                <Input id="sa-anthropic-mini" value={anthropicMiniModel} onChange={(e) => setAnthropicMiniModel(e.target.value)} />
              </Field>
              <Field label="Smart model" id="sa-anthropic-smart">
                <Input id="sa-anthropic-smart" value={anthropicSmartModel} onChange={(e) => setAnthropicSmartModel(e.target.value)} />
              </Field>
            </div>
          </div>
        </SaSection>

        <SaSection
          title="DeepSeek"
          description={
            <>
              Two separate setups with two separate keys — a direct key will not
              work against the RapidAPI proxy and vice versa. Stored: direct{" "}
              {settings?.hasDeepseekApiKey ? "yes" : "no"}
              {settings?.envDeepseekConfigured ? " · env fallback" : ""}, RapidAPI{" "}
              {settings?.hasRapidapiDeepseekApiKey ? "yes" : "no"}. Independent
              from catalog DeepSeek under Integrations (product descriptions).
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Direct API <span className="font-normal text-muted-foreground">— platform.deepseek.com</span>
                </p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    primaryProvider === "deepseek"
                      ? "bg-primary/10 text-primary"
                      : settings?.hasDeepseekApiKey
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {primaryProvider === "deepseek"
                    ? "Active provider"
                    : settings?.hasDeepseekApiKey
                      ? "Key stored"
                      : "No key"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Your key from platform.deepseek.com, sent with Bearer auth to{" "}
                <code className="rounded bg-muted px-1 font-mono text-[11px]">api.deepseek.com</code>.
              </p>
              <div className="mt-3 space-y-3">
                <Field label="Direct API key" id="sa-deepseek-key">
                  <div className="flex gap-2">
                    <Input
                      id="sa-deepseek-key"
                      type="password"
                      autoComplete="off"
                      placeholder={
                        settings?.hasDeepseekApiKey ? "•••••••• (leave blank to keep)" : "sk-…"
                      }
                      value={deepseekApiKey}
                      onChange={(e) => setDeepseekApiKey(e.target.value)}
                    />
                    {settings?.hasDeepseekApiKey ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => clearKey("deepseekApiKey", "DeepSeek direct API key")}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </Field>
                <Field label="Base URL (optional)" id="sa-deepseek-base">
                  <Input
                    id="sa-deepseek-base"
                    value={deepseekBaseUrl}
                    onChange={(e) => setDeepseekBaseUrl(e.target.value)}
                    placeholder="https://api.deepseek.com/chat/completions"
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Via RapidAPI <span className="font-normal text-muted-foreground">— rapidapi.com key</span>
                </p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    primaryProvider === "rapidapi_deepseek"
                      ? "bg-primary/10 text-primary"
                      : settings?.hasRapidapiDeepseekApiKey
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {primaryProvider === "rapidapi_deepseek"
                    ? "Active provider"
                    : settings?.hasRapidapiDeepseekApiKey
                      ? "Key stored"
                      : "No key"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Your <span className="font-medium text-foreground">RapidAPI</span> key, sent with{" "}
                <code className="rounded bg-muted px-1 font-mono text-[11px]">x-rapidapi-key</code>{" "}
                to the proxy host. Needs its own key from rapidapi.com — a direct
                DeepSeek key will not work here.
              </p>
              <div className="mt-3 space-y-3">
                <Field label="RapidAPI key" id="sa-rapidapi-deepseek-key">
                  <div className="flex gap-2">
                    <Input
                      id="sa-rapidapi-deepseek-key"
                      type="password"
                      autoComplete="off"
                      placeholder={
                        settings?.hasRapidapiDeepseekApiKey
                          ? "•••••••• (leave blank to keep)"
                          : "RapidAPI key"
                      }
                      value={rapidapiDeepseekApiKey}
                      onChange={(e) => setRapidapiDeepseekApiKey(e.target.value)}
                    />
                    {settings?.hasRapidapiDeepseekApiKey ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          clearKey("rapidapiDeepseekApiKey", "DeepSeek RapidAPI key")
                        }
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </Field>
                <Field label="RapidAPI host (optional)" id="sa-deepseek-host">
                  <Input
                    id="sa-deepseek-host"
                    value={deepseekHost}
                    onChange={(e) => setDeepseekHost(e.target.value)}
                    placeholder="deepseek-v31.p.rapidapi.com"
                  />
                </Field>
              </div>
            </div>

            <Field label="Model (shared by both setups)" id="sa-deepseek-model">
              <Input
                id="sa-deepseek-model"
                value={deepseekModel}
                onChange={(e) => setDeepseekModel(e.target.value)}
              />
            </Field>
          </div>
        </SaSection>

        <SaSection
          title="Guardrails"
          description="Cost and privacy controls for Brain industry compare and tool-calling loops."
        >
          <div className="space-y-3">
            <SaToggleRow
              id="industry-compare"
              label="Industry compare (twins)"
              description="Anonymized benchmarks across similar shops. Requires k-anonymity below."
              checked={industryCompareEnabled}
              onChange={setIndustryCompareEnabled}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Min twins (k-anonymity)" id="sa-min-twins">
                <Input
                  id="sa-min-twins"
                  type="number"
                  min={2}
                  max={100}
                  value={industryCompareMinTwins}
                  onChange={(e) => setIndustryCompareMinTwins(Number(e.target.value) || 8)}
                />
              </Field>
              <Field label="Daily token budget / tenant" id="sa-token-budget">
                <Input
                  id="sa-token-budget"
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={dailyTokenBudgetPerTenant}
                  onChange={(e) => setDailyTokenBudgetPerTenant(e.target.value)}
                />
              </Field>
              <Field label="Max tool calls / request" id="sa-max-tools">
                <Input
                  id="sa-max-tools"
                  type="number"
                  min={1}
                  max={32}
                  value={maxToolCallsPerRequest}
                  onChange={(e) => setMaxToolCallsPerRequest(Number(e.target.value) || 8)}
                />
              </Field>
            </div>
            <Field label="Extra system prompt (optional)" id="sa-system-prompt">
              <Textarea
                id="sa-system-prompt"
                className="min-h-[88px]"
                value={systemPromptExtra}
                onChange={(e) => setSystemPromptExtra(e.target.value)}
                placeholder="Platform-wide tone or policy notes appended to every skill…"
              />
            </Field>
          </div>
        </SaSection>

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

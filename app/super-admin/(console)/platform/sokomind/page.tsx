"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

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
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSokoMindSettings,
  updateSokoMindSettings,
  type SokoMindSettingsRecord,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  SOKOMIND_NAV,
  SokoMindTheatre,
  type SokoMindSectionId,
} from "./_components/sokomind-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function sectionFromHash(hash: string): SokoMindSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (SOKOMIND_NAV.some((item) => item.id === id)) {
    return id as SokoMindSectionId;
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
      <span
        className={cn(
          "size-1.5",
          ready ? "bg-[var(--pos-primary,#0f766e)]" : "bg-amber-600",
        )}
        aria-hidden
      />
      {ready ? "Key ready" : "Needs a key"}
    </span>
  );
}

export default function SuperAdminSokoMindSettingsPage() {
  const [settings, setSettings] = useState<SokoMindSettingsRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SokoMindSectionId | null>(
    null,
  );

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
  const [anthropicMiniModel, setAnthropicMiniModel] = useState(
    "claude-haiku-4-5-20251001",
  );
  const [anthropicSmartModel, setAnthropicSmartModel] = useState(
    "claude-sonnet-4-5-20250929",
  );

  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [openrouterBaseUrl, setOpenrouterBaseUrl] = useState(
    "https://openrouter.ai/api/v1",
  );
  const [openrouterMiniModel, setOpenrouterMiniModel] =
    useState("z-ai/glm-5.3-flash");
  const [openrouterSmartModel, setOpenrouterSmartModel] =
    useState("z-ai/glm-4.6");
  const [openrouterImageModel, setOpenrouterImageModel] = useState(
    "google/gemini-2.5-flash-image",
  );

  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState(
    "https://api.deepseek.com/chat/completions",
  );
  const [deepseekHost, setDeepseekHost] = useState(
    "deepseek-v31.p.rapidapi.com",
  );
  const [deepseekModel, setDeepseekModel] = useState("DeepSeek-V3-0324");
  const [rapidapiDeepseekApiKey, setRapidapiDeepseekApiKey] = useState("");

  const [industryCompareEnabled, setIndustryCompareEnabled] = useState(false);
  const [industryCompareMinTwins, setIndustryCompareMinTwins] = useState(8);
  const [dailyTokenBudgetPerTenant, setDailyTokenBudgetPerTenant] =
    useState("");
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
    setAnthropicSmartModel(
      row.anthropicSmartModel || "claude-sonnet-4-5-20250929",
    );
    setOpenrouterBaseUrl(
      row.openrouterBaseUrl || "https://openrouter.ai/api/v1",
    );
    setOpenrouterMiniModel(row.openrouterMiniModel || "z-ai/glm-5.3-flash");
    setOpenrouterSmartModel(row.openrouterSmartModel || "z-ai/glm-4.6");
    setOpenrouterImageModel(
      row.openrouterImageModel || "google/gemini-2.5-flash-image",
    );
    setDeepseekBaseUrl(
      row.deepseekBaseUrl || "https://api.deepseek.com/chat/completions",
    );
    setDeepseekHost(row.deepseekHost || "deepseek-v31.p.rapidapi.com");
    setDeepseekModel(row.deepseekModel || "DeepSeek-V3-0324");
    setIndustryCompareEnabled(row.industryCompareEnabled);
    setIndustryCompareMinTwins(row.industryCompareMinTwins || 8);
    setDailyTokenBudgetPerTenant(
      row.dailyTokenBudgetPerTenant != null
        ? String(row.dailyTokenBudgetPerTenant)
        : "",
    );
    setMaxToolCallsPerRequest(row.maxToolCallsPerRequest || 8);
    setSystemPromptExtra(row.systemPromptExtra ?? "");
    setOpenaiApiKey("");
    setAnthropicApiKey("");
    setOpenrouterApiKey("");
    setDeepseekApiKey("");
    setRapidapiDeepseekApiKey("");
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      applySettings(await fetchSokoMindSettings());
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load SokoMind settings.",
      );
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
        openrouterBaseUrl: openrouterBaseUrl.trim(),
        openrouterMiniModel: openrouterMiniModel.trim(),
        openrouterSmartModel: openrouterSmartModel.trim(),
        openrouterImageModel: openrouterImageModel.trim(),
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
          throw new Error(
            "Daily token budget must be a non-negative integer (or blank).",
          );
        }
        body.dailyTokenBudgetPerTenant = parsed;
      }
      if (openaiApiKey.trim()) body.openaiApiKey = openaiApiKey.trim();
      if (anthropicApiKey.trim()) body.anthropicApiKey = anthropicApiKey.trim();
      if (openrouterApiKey.trim()) body.openrouterApiKey = openrouterApiKey.trim();
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
    field:
      | "openaiApiKey"
      | "anthropicApiKey"
      | "openrouterApiKey"
      | "deepseekApiKey"
      | "rapidapiDeepseekApiKey",
    label: string,
  ) => {
    showThemedConfirmToast({
      id: `clear-sokomind-${field}`,
      title: `Clear ${label}?`,
      description: "The stored key will be removed from Super Admin.",
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
      ready: Boolean(
        settings?.hasAnthropicApiKey || settings?.envAnthropicConfigured,
      ),
    },
    {
      id: "openrouter",
      name: "OpenRouter · GLM",
      description: "GLM chat + logos via openrouter.ai — one key",
      ready: Boolean(
        settings?.hasOpenrouterApiKey || settings?.envOpenrouterConfigured,
      ),
    },
    {
      id: "deepseek",
      name: "DeepSeek · direct",
      description: "api.deepseek.com — your platform.deepseek.com key",
      ready: Boolean(
        settings?.hasDeepseekApiKey || settings?.envDeepseekConfigured,
      ),
    },
    {
      id: "rapidapi_deepseek",
      name: "DeepSeek · RapidAPI",
      description: "RapidAPI proxy — needs its own RapidAPI key",
      ready: Boolean(
        settings?.hasRapidapiDeepseekApiKey || settings?.envDeepseekConfigured,
      ),
    },
  ] as const;

  const keysReady = providerCards.filter((c) => c.ready).length;

  const sectionSummary = useCallback(
    (sectionId: SokoMindSectionId) => {
      switch (sectionId) {
        case "faces":
          return (
            <>
              Master{" "}
              <span className="font-semibold">
                {sokomindEnabled ? "on" : "off"}
              </span>
              {" · "}
              Primary{" "}
              <span className="font-semibold">{primaryProvider}</span>
              {" · "}
              {[
                guideEnabled ? "Guide" : null,
                brainEnabled ? "Brain" : null,
                eyeEnabled ? "Eye" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "no faces"}
            </>
          );
        case "openai":
          return (
            <>
              Key{" "}
              <span className="font-semibold">
                {settings?.hasOpenaiApiKey ? "stored" : "not set"}
              </span>
              {" · "}
              {openaiMiniModel}
            </>
          );
        case "anthropic":
          return (
            <>
              Key{" "}
              <span className="font-semibold">
                {settings?.hasAnthropicApiKey ? "stored" : "not set"}
              </span>
              {" · "}
              {anthropicMiniModel}
            </>
          );
        case "openrouter":
          return (
            <>
              Key{" "}
              <span className="font-semibold">
                {settings?.hasOpenrouterApiKey ? "stored" : "not set"}
              </span>
              {" · "}
              {openrouterSmartModel}
            </>
          );
        case "deepseek":
          return (
            <>
              Direct{" "}
              <span className="font-semibold">
                {settings?.hasDeepseekApiKey ? "yes" : "no"}
              </span>
              {" · "}
              RapidAPI{" "}
              <span className="font-semibold">
                {settings?.hasRapidapiDeepseekApiKey ? "yes" : "no"}
              </span>
            </>
          );
        case "guardrails":
          return (
            <>
              Twins{" "}
              <span className="font-semibold">
                {industryCompareEnabled ? "on" : "off"}
              </span>
              {" · "}
              k=
              <span className="font-semibold tabular-nums">
                {industryCompareMinTwins}
              </span>
              {" · "}
              tools{" "}
              <span className="font-semibold tabular-nums">
                {maxToolCallsPerRequest}
              </span>
            </>
          );
        default:
          return null;
      }
    },
    [
      sokomindEnabled,
      primaryProvider,
      guideEnabled,
      brainEnabled,
      eyeEnabled,
      settings,
      openaiMiniModel,
      anthropicMiniModel,
      openrouterSmartModel,
      industryCompareEnabled,
      industryCompareMinTwins,
      maxToolCallsPerRequest,
    ],
  );

  const drawerBody = (() => {
    switch (activeSection) {
      case "faces":
        return (
          <div className="space-y-3">
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
            <div className="space-y-2">
              <p className={dashboardLabelClass()}>Primary provider</p>
              <div
                className="grid gap-2"
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
                        "relative border p-3 text-left transition-colors",
                        active
                          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]"
                          : cn(HAIRLINE, "bg-white hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"),
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold tracking-[-0.015em]">
                          {card.name}
                        </span>
                        {active ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--pos-primary,#0f766e)]">
                            Active
                          </span>
                        ) : null}
                      </span>
                      <span className={cn(dashboardHintClass(), "mt-1 block")}>
                        {card.description}
                      </span>
                      <span className="mt-2 inline-flex">
                        <KeyStatus ready={card.ready} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Default locale" id="sa-soko-locale">
              <select
                id="sa-soko-locale"
                className={dashboardSelectClass()}
                value={defaultLocale}
                onChange={(e) => setDefaultLocale(e.target.value)}
              >
                <option value="en-KE">English (Kenya)</option>
                <option value="sw-KE">Swahili (Kenya)</option>
              </select>
            </Field>
          </div>
        );
      case "openai":
        return (
          <div className="space-y-3">
            <p className={dashboardHintClass()}>
              Stored: {settings?.hasOpenaiApiKey ? "yes" : "no"}
            </p>
            <Field label="API key" id="sa-openai-key">
              <div className="flex gap-2">
                <Input
                  id="sa-openai-key"
                  className={dashboardInputClass()}
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings?.hasOpenaiApiKey
                      ? "•••••••• (leave blank to keep)"
                      : "sk-…"
                  }
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
                {settings?.hasOpenaiApiKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 rounded-none"
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
                className={dashboardInputClass()}
                value={openaiBaseUrl}
                onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Mini model" id="sa-openai-mini">
                <Input
                  id="sa-openai-mini"
                  className={dashboardInputClass()}
                  value={openaiMiniModel}
                  onChange={(e) => setOpenaiMiniModel(e.target.value)}
                />
              </Field>
              <Field label="Smart model" id="sa-openai-smart">
                <Input
                  id="sa-openai-smart"
                  className={dashboardInputClass()}
                  value={openaiSmartModel}
                  onChange={(e) => setOpenaiSmartModel(e.target.value)}
                />
              </Field>
              <Field label="Vision model" id="sa-openai-vision">
                <Input
                  id="sa-openai-vision"
                  className={dashboardInputClass()}
                  value={openaiVisionModel}
                  onChange={(e) => setOpenaiVisionModel(e.target.value)}
                />
              </Field>
            </div>
          </div>
        );
      case "anthropic":
        return (
          <div className="space-y-3">
            <p className={dashboardHintClass()}>
              Stored: {settings?.hasAnthropicApiKey ? "yes" : "no"}
            </p>
            <Field label="API key" id="sa-anthropic-key">
              <div className="flex gap-2">
                <Input
                  id="sa-anthropic-key"
                  className={dashboardInputClass()}
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings?.hasAnthropicApiKey
                      ? "•••••••• (leave blank to keep)"
                      : "sk-ant-…"
                  }
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                />
                {settings?.hasAnthropicApiKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 rounded-none"
                    disabled={busy}
                    onClick={() =>
                      clearKey("anthropicApiKey", "Anthropic API key")
                    }
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </Field>
            <Field label="Base URL (optional)" id="sa-anthropic-base">
              <Input
                id="sa-anthropic-base"
                className={dashboardInputClass()}
                value={anthropicBaseUrl}
                onChange={(e) => setAnthropicBaseUrl(e.target.value)}
                placeholder="https://api.anthropic.com"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mini model" id="sa-anthropic-mini">
                <Input
                  id="sa-anthropic-mini"
                  className={dashboardInputClass()}
                  value={anthropicMiniModel}
                  onChange={(e) => setAnthropicMiniModel(e.target.value)}
                />
              </Field>
              <Field label="Smart model" id="sa-anthropic-smart">
                <Input
                  id="sa-anthropic-smart"
                  className={dashboardInputClass()}
                  value={anthropicSmartModel}
                  onChange={(e) => setAnthropicSmartModel(e.target.value)}
                />
              </Field>
            </div>
          </div>
        );
      case "openrouter":
        return (
          <div className="space-y-3">
            <p className={dashboardHintClass()}>
              One key for GLM chat and logos. Stored:{" "}
              {settings?.hasOpenrouterApiKey ? "yes" : "no"}
            </p>
            <Field label="API key" id="sa-openrouter-key">
              <div className="flex gap-2">
                <Input
                  id="sa-openrouter-key"
                  className={dashboardInputClass()}
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings?.hasOpenrouterApiKey
                      ? "•••••••• (leave blank to keep)"
                      : "sk-or-v1-…"
                  }
                  value={openrouterApiKey}
                  onChange={(e) => setOpenrouterApiKey(e.target.value)}
                />
                {settings?.hasOpenrouterApiKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 rounded-none"
                    disabled={busy}
                    onClick={() =>
                      clearKey("openrouterApiKey", "OpenRouter API key")
                    }
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </Field>
            <Field label="Base URL (optional)" id="sa-openrouter-base">
              <Input
                id="sa-openrouter-base"
                className={dashboardInputClass()}
                value={openrouterBaseUrl}
                onChange={(e) => setOpenrouterBaseUrl(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
              />
            </Field>
            <div className="grid gap-3">
              <Field label="Mini model (GLM)" id="sa-openrouter-mini">
                <Input
                  id="sa-openrouter-mini"
                  className={dashboardInputClass()}
                  value={openrouterMiniModel}
                  onChange={(e) => setOpenrouterMiniModel(e.target.value)}
                  placeholder="z-ai/glm-5.3-flash"
                />
              </Field>
              <Field label="Smart model (GLM)" id="sa-openrouter-smart">
                <Input
                  id="sa-openrouter-smart"
                  className={dashboardInputClass()}
                  value={openrouterSmartModel}
                  onChange={(e) => setOpenrouterSmartModel(e.target.value)}
                  placeholder="z-ai/glm-4.6"
                />
              </Field>
              <Field label="Image model (logos)" id="sa-openrouter-image">
                <Input
                  id="sa-openrouter-image"
                  className={dashboardInputClass()}
                  value={openrouterImageModel}
                  onChange={(e) => setOpenrouterImageModel(e.target.value)}
                  placeholder="google/gemini-2.5-flash-image"
                />
              </Field>
            </div>
            <p className={cn(dashboardHintClass(), "leading-relaxed")}>
              GLM chat slugs are OpenRouter model IDs. Logos use OpenRouter’s
              Image API — Gemini Flash Image is the default.
            </p>
          </div>
        );
      case "deepseek":
        return (
          <div className="space-y-4">
            <p className={cn(dashboardHintClass(), "leading-relaxed")}>
              Two separate setups with two separate keys. Direct{" "}
              {settings?.hasDeepseekApiKey ? "yes" : "no"}, RapidAPI{" "}
              {settings?.hasRapidapiDeepseekApiKey ? "yes" : "no"}.
            </p>
            <div className={cn("space-y-3 border bg-white p-3", HAIRLINE)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold tracking-[-0.015em]">
                  Direct API
                </p>
                <KeyStatus ready={Boolean(settings?.hasDeepseekApiKey)} />
              </div>
              <Field label="Direct API key" id="sa-deepseek-key">
                <div className="flex gap-2">
                  <Input
                    id="sa-deepseek-key"
                    className={dashboardInputClass()}
                    type="password"
                    autoComplete="off"
                    placeholder={
                      settings?.hasDeepseekApiKey
                        ? "•••••••• (leave blank to keep)"
                        : "sk-…"
                    }
                    value={deepseekApiKey}
                    onChange={(e) => setDeepseekApiKey(e.target.value)}
                  />
                  {settings?.hasDeepseekApiKey ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 shrink-0 rounded-none"
                      disabled={busy}
                      onClick={() =>
                        clearKey("deepseekApiKey", "DeepSeek direct API key")
                      }
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field label="Base URL (optional)" id="sa-deepseek-base">
                <Input
                  id="sa-deepseek-base"
                  className={dashboardInputClass()}
                  value={deepseekBaseUrl}
                  onChange={(e) => setDeepseekBaseUrl(e.target.value)}
                  placeholder="https://api.deepseek.com/chat/completions"
                />
              </Field>
            </div>
            <div className={cn("space-y-3 border bg-white p-3", HAIRLINE)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold tracking-[-0.015em]">
                  Via RapidAPI
                </p>
                <KeyStatus
                  ready={Boolean(settings?.hasRapidapiDeepseekApiKey)}
                />
              </div>
              <Field label="RapidAPI key" id="sa-rapidapi-deepseek-key">
                <div className="flex gap-2">
                  <Input
                    id="sa-rapidapi-deepseek-key"
                    className={dashboardInputClass()}
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
                      className="h-8 shrink-0 rounded-none"
                      disabled={busy}
                      onClick={() =>
                        clearKey(
                          "rapidapiDeepseekApiKey",
                          "DeepSeek RapidAPI key",
                        )
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
                  className={dashboardInputClass()}
                  value={deepseekHost}
                  onChange={(e) => setDeepseekHost(e.target.value)}
                  placeholder="deepseek-v31.p.rapidapi.com"
                />
              </Field>
            </div>
            <Field label="Model (shared by both setups)" id="sa-deepseek-model">
              <Input
                id="sa-deepseek-model"
                className={dashboardInputClass()}
                value={deepseekModel}
                onChange={(e) => setDeepseekModel(e.target.value)}
              />
            </Field>
          </div>
        );
      case "guardrails":
        return (
          <div className="space-y-3">
            <ToggleRow
              id="industry-compare"
              label="Industry compare (twins)"
              description="Anonymized benchmarks across similar shops. Requires k-anonymity below."
              checked={industryCompareEnabled}
              onChange={setIndustryCompareEnabled}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Min twins (k-anonymity)" id="sa-min-twins">
                <Input
                  id="sa-min-twins"
                  className={dashboardInputClass()}
                  type="number"
                  min={2}
                  max={100}
                  value={industryCompareMinTwins}
                  onChange={(e) =>
                    setIndustryCompareMinTwins(Number(e.target.value) || 8)
                  }
                />
              </Field>
              <Field label="Daily token budget / tenant" id="sa-token-budget">
                <Input
                  id="sa-token-budget"
                  className={dashboardInputClass()}
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
                  className={dashboardInputClass()}
                  type="number"
                  min={1}
                  max={32}
                  value={maxToolCallsPerRequest}
                  onChange={(e) =>
                    setMaxToolCallsPerRequest(Number(e.target.value) || 8)
                  }
                />
              </Field>
            </div>
            <Field label="Extra system prompt (optional)" id="sa-system-prompt">
              <Textarea
                id="sa-system-prompt"
                className={cn(dashboardTextareaClass(), "min-h-[88px]")}
                value={systemPromptExtra}
                onChange={(e) => setSystemPromptExtra(e.target.value)}
                placeholder="Platform-wide tone or policy notes appended to every skill…"
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
        icon={Sparkles}
        eyebrow="Platform"
        title="SokoMind"
        description="API keys for OpenAI, Anthropic, OpenRouter, or DeepSeek — encrypted and never shown again after save."
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
          aria-label="Refresh SokoMind settings"
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
          disabled={busy || Boolean(loadError)}
          onClick={() => void onSave()}
        >
          {busy ? "Saving…" : "Save SokoMind"}
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {success ? <DashboardFeedback kind="success" text={success} /> : null}
      {settings?.encryptionEphemeral ? (
        <DashboardFeedback
          kind="error"
          text="APP_PAYMENTS_ENCRYPTION_KEY is not set on the server. Keys you paste here will be lost on restart until that key is set."
        />
      ) : null}
      {settings && !settings.secretsReadable && settings.secretsError ? (
        <DashboardFeedback kind="error" text={settings.secretsError} />
      ) : null}

      <SokoMindTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        sokomindEnabled={sokomindEnabled}
        guideEnabled={guideEnabled}
        brainEnabled={brainEnabled}
        eyeEnabled={eyeEnabled}
        primaryProvider={primaryProvider}
        keysReady={keysReady}
        loading={booting || !settings}
        sectionSummary={sectionSummary}
        drawerBody={drawerBody}
        drawerFooter={
          <Button
            type="button"
            className={PRIMARY_BTN}
            disabled={busy || Boolean(loadError)}
            onClick={() => void onSave()}
          >
            {busy ? "Saving…" : "Save SokoMind"}
          </Button>
        }
      />
    </div>
  );
}

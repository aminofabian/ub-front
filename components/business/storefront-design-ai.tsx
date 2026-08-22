"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, Wand2, X } from "lucide-react";

import {
  DashboardFeedback,
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchAiStatus,
  suggestStorefrontDesign,
  type StorefrontAiBrandKitSuggestion,
  type StorefrontAiCopySuggestion,
  type StorefrontAiSuggestResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Make it look like a premium organic grocery store",
  "Make it feel more Kenyan and local",
  "Make it look like a luxury butcher shop",
  "Make the products the focus — reduce the text",
];

const COPY_LABELS: { key: keyof StorefrontAiCopySuggestion; label: string }[] = [
  { key: "tagline", label: "Tagline" },
  { key: "description", label: "About the shop" },
  { key: "announcement", label: "Notice bar" },
  { key: "promoTitle", label: "Offer headline" },
  { key: "promoSubtitle", label: "Offer subtitle" },
  { key: "coupon", label: "Coupon" },
  { key: "ctaLabel", label: "Offer button" },
  { key: "heroHeadline", label: "Hero headline" },
  { key: "heroSubheadline", label: "Hero subheadline" },
  { key: "aboutHeading", label: "About heading" },
  { key: "socialHeading", label: "Social heading" },
  { key: "contactHeading", label: "Contact heading" },
];

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek (direct)",
  rapidapi_deepseek: "DeepSeek via RapidAPI",
};

type AiReadiness = "ready" | "off" | "unset" | "unknown";

function readinessLabel(readiness: AiReadiness, provider: string | null): string {
  switch (readiness) {
    case "ready":
      return `AI is ready — powered by ${PROVIDER_LABELS[provider ?? ""] ?? provider ?? "your provider"}.`;
    case "off":
      return "AI is switched off by the platform — ask your admin to enable it.";
    case "unset":
      return "AI has no provider key yet — ask your platform admin to connect one.";
    default:
      return "AI status is unavailable right now — try again in a moment.";
  }
}

const BRAND_KIT_LABELS: {
  key: keyof StorefrontAiBrandKitSuggestion;
  label: string;
}[] = [
  { key: "radius", label: "Corner radius" },
  { key: "buttons", label: "Button style" },
  { key: "density", label: "Spacing" },
  { key: "surface", label: "Background" },
];

/**
 * "Make my store look better" — one AI call against the merchant's current
 * design. The result is a suggestion the merchant reviews and applies; nothing
 * changes until they do.
 */
export function StorefrontDesignAiCard({
  draftDesignJson,
  onApply,
}: {
  draftDesignJson: string | null;
  onApply: (suggestion: StorefrontAiSuggestResponse) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<StorefrontAiSuggestResponse | null>(null);
  const [readiness, setReadiness] = useState<AiReadiness>("unknown");
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAiStatus().then((status) => {
      if (cancelled || !status) return;
      setProvider(status.primaryProvider ?? null);
      if (!status.enabled) {
        setReadiness("off");
      } else if (!status.providerConfigured) {
        setReadiness("unset");
      } else {
        setReadiness("ready");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await suggestStorefrontDesign(value, draftDesignJson);
      setSuggestion(result);
      setPrompt("");
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not reach the design assistant.",
      );
      setSuggestion(null);
    } finally {
      setBusy(false);
    }
  };

  const brandKitValues = suggestion?.brandKit
    ? BRAND_KIT_LABELS.filter(
        ({ key }) => suggestion.brandKit?.[key] != null && suggestion.brandKit[key] !== "",
      )
    : [];
  const copyValues = suggestion?.copy
    ? COPY_LABELS.filter(
        ({ key }) => suggestion.copy?.[key] != null && suggestion.copy[key] !== "",
      )
    : [];

  return (
    <div className={DASHBOARD_SECTION_SURFACE}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Sparkles className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Make my store look better
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Describe the feeling you want — the assistant suggests colors,
            spacing, button styles and copy based on your current design.
            Nothing changes until you apply it.
          </p>
        </div>
      </div>

      {error ? <DashboardFeedback kind="error" text={error} className="mt-4" /> : null}

      {readiness !== "unknown" ? (
        <p
          className={cn(
            "mt-4 flex items-center gap-2 text-xs font-medium",
            readiness === "ready"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400",
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              readiness === "ready" ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          {readinessLabel(readiness, provider)}
        </p>
      ) : null}

      {suggestion ? (
        <div className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-primary/4 p-4">
          {suggestion.summary ? (
            <p className="text-sm leading-relaxed text-foreground">
              {suggestion.summary}
            </p>
          ) : null}

          {brandKitValues.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Look &amp; feel
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {brandKitValues.map(({ key, label }) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-[13px] font-medium text-foreground"
                  >
                    <Check className="size-3.5 text-primary" aria-hidden />
                    {label}: {suggestion.brandKit?.[key]}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {copyValues.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Copy
              </p>
              <ul className="mt-2 space-y-1.5">
                {copyValues.map(({ key, label }) => (
                  <li key={key} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{label}: </span>
                      <span className="text-muted-foreground">
                        {suggestion.copy?.[key]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {brandKitValues.length === 0 && copyValues.length === 0 ? (
            <p className={dashboardHintClass()}>
              The assistant didn&apos;t suggest any changes — try describing the
              feeling differently.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={() => onApply(suggestion)} className="gap-1.5">
              <Wand2 className="size-4" aria-hidden />
              Apply suggestions
            </Button>
            <Button variant="ghost" onClick={() => setSuggestion(null)} className="gap-1.5">
              <X className="size-4" aria-hidden />
              Discard
            </Button>
          </div>
          <p className={dashboardHintClass()}>
            Applying fills in the form above — review, then save as usual.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <textarea
            aria-label="What should your store feel like?"
            className={cn(dashboardInputClass(), "min-h-24 resize-y")}
            value={prompt}
            maxLength={600}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Make it feel like a fresh, friendly neighbourhood shop"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void run(prompt)} disabled={busy || !prompt.trim()}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="size-4" aria-hidden />
              )}
              {busy ? "Thinking…" : "Suggest a look"}
            </Button>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={busy}
                  onClick={() => void run(ex)}
                  className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

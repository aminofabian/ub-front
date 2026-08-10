"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  LayoutTemplate,
  Loader2,
  Save,
  Store,
} from "lucide-react";

import {
  MilkRunWhatsAppDialog,
  milkRunNeedsWhatsApp,
} from "@/components/storefront/milk-run-whatsapp-dialog";
import { ThemePreviewArt } from "@/components/storefront/theme-preview-art";
import { Button } from "@/components/ui/button";
import {
  fetchBusiness,
  updateBusiness,
  type BusinessRecord,
} from "@/lib/api";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import {
  DEFAULT_LANDING_TEMPLATE_ID,
  DEFAULT_STORE_THEME_ID,
  LANDING_TEMPLATE_META,
  STORE_THEME_META,
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
  type LandingTemplateId,
  type StoreThemeId,
  type StorefrontTemplateMeta,
} from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";

type Mode = "store" | "landing";

export function StorefrontThemesStudio({
  business,
  onSaved,
}: {
  business: BusinessRecord | null;
  onSaved?: (business: BusinessRecord) => void;
}) {
  const storefrontOn = Boolean(business?.storefront?.enabled);
  const [mode, setMode] = useState<Mode>(storefrontOn ? "store" : "landing");
  const [storeThemeId, setStoreThemeId] = useState<StoreThemeId>(
    normalizeStoreThemeId(business?.storefront?.storeThemeId),
  );
  const [landingTemplateId, setLandingTemplateId] = useState<LandingTemplateId>(
    normalizeLandingTemplateId(business?.storefront?.landingTemplateId),
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waPromptOpen, setWaPromptOpen] = useState(false);
  const waPromptedRef = useRef(false);

  const landingWhatsapp =
    business?.storefront?.landingContent?.whatsapp?.trim() || "";

  useEffect(() => {
    setStoreThemeId(normalizeStoreThemeId(business?.storefront?.storeThemeId));
    setLandingTemplateId(
      normalizeLandingTemplateId(business?.storefront?.landingTemplateId),
    );
    setMode(business?.storefront?.enabled ? "store" : "landing");
  }, [
    business?.storefront?.storeThemeId,
    business?.storefront?.landingTemplateId,
    business?.storefront?.enabled,
  ]);

  useEffect(() => {
    if (mode !== "store" || waPromptedRef.current) return;
    if (milkRunNeedsWhatsApp(storeThemeId, landingWhatsapp)) {
      waPromptedRef.current = true;
      setWaPromptOpen(true);
    }
  }, [mode, storeThemeId, landingWhatsapp]);

  const items: readonly StorefrontTemplateMeta[] =
    mode === "store" ? STORE_THEME_META : LANDING_TEMPLATE_META;
  const selectedId = mode === "store" ? storeThemeId : landingTemplateId;
  const selected = useMemo(
    () => items.find((m) => m.id === selectedId) ?? items[0]!,
    [items, selectedId],
  );

  const dirty =
    storeThemeId !==
      normalizeStoreThemeId(business?.storefront?.storeThemeId) ||
    landingTemplateId !==
      normalizeLandingTemplateId(business?.storefront?.landingTemplateId);

  const previewUrl = business?.slug
    ? `https://${business.slug}.${PLATFORM_DOMAIN}/`
    : null;

  const save = async () => {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await updateBusiness({
        storefront: {
          storeThemeId: storeThemeId || DEFAULT_STORE_THEME_ID,
          landingTemplateId: landingTemplateId || DEFAULT_LANDING_TEMPLATE_ID,
        },
      });
      const next = await fetchBusiness();
      onSaved?.(next);
      setFeedback(
        mode === "store" ? "Store theme saved." : "Landing template saved.",
      );
      if (
        mode === "store" &&
        milkRunNeedsWhatsApp(
          storeThemeId,
          next.storefront?.landingContent?.whatsapp,
        )
      ) {
        setWaPromptOpen(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save theme.");
    } finally {
      setSaving(false);
    }
  };

  const pick = (id: string) => {
    setFeedback(null);
    if (mode === "store") {
      const next = normalizeStoreThemeId(id);
      setStoreThemeId(next);
      if (milkRunNeedsWhatsApp(next, landingWhatsapp)) {
        setWaPromptOpen(true);
      }
    } else {
      setLandingTemplateId(normalizeLandingTemplateId(id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="inline-flex rounded-2xl border border-border/70 bg-muted/40 p-1">
          <ModeTab
            active={mode === "store"}
            disabled={!storefrontOn}
            onClick={() => setMode("store")}
            icon={<Store className="size-3.5" aria-hidden />}
            label="Live shop"
            hint={storefrontOn ? undefined : "Turn on storefront in Settings"}
          />
          <ModeTab
            active={mode === "landing"}
            onClick={() => setMode("landing")}
            icon={<LayoutTemplate className="size-3.5" aria-hidden />}
            label="Coming-soon page"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {feedback ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {feedback}
            </p>
          ) : null}
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!dirty || saving}
            onClick={() => void save()}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            Save look
          </Button>
        </div>
      </div>

      {!storefrontOn && mode === "landing" ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Storefront is off — visitors see this landing page.{" "}
          <Link
            href={APP_ROUTES.businessSettings}
            className="font-medium underline underline-offset-2"
          >
            Enable storefront
          </Link>{" "}
          to unlock live shop themes.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Theme spine */}
        <div
          className="flex max-h-[min(70vh,44rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
          role="listbox"
          aria-label={mode === "store" ? "Store themes" : "Landing templates"}
        >
          <div className="shrink-0 border-b border-border/60 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {mode === "store" ? "Shelf of looks" : "Door signs"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {items.length} options · tap to stage
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2">
            {items.map((item, index) => {
              const selected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(item.id)}
                  className={cn(
                    "group flex w-full items-stretch gap-2.5 rounded-xl border p-2 text-left transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    selected
                      ? "border-foreground bg-foreground text-background shadow-md"
                      : "border-transparent bg-muted/35 hover:border-border hover:bg-muted/70",
                  )}
                >
                  <span
                    className="relative w-14 shrink-0 overflow-hidden rounded-lg"
                    style={{
                      background: `linear-gradient(145deg, ${item.previewFrom}, ${item.previewTo})`,
                    }}
                    aria-hidden
                  >
                    <span
                      className="absolute bottom-1.5 left-1.5 size-2.5 rounded-full shadow"
                      style={{ backgroundColor: item.accent }}
                    />
                    <span
                      className={cn(
                        "absolute right-1 top-1 font-mono text-[9px] tabular-nums",
                        selected ? "text-background/70" : "text-foreground/40",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 py-0.5">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-tight">
                        {item.name}
                      </span>
                      {selected ? (
                        <Check className="size-4 shrink-0" aria-hidden />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px] leading-snug",
                        selected
                          ? "text-background/75"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage */}
        <div className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Stage
                </p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight">
                  {selected.name}
                </h2>
                <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                  {selected.blurb}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {mode === "store" && selected.id === "milk-run" && !landingWhatsapp ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setWaPromptOpen(true)}
                  >
                    Add WhatsApp
                  </Button>
                ) : null}
                {previewUrl ? (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={previewUrl} target="_blank" rel="noreferrer">
                      Open live
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/80 via-background to-background p-3 sm:p-4">
              <ThemePreviewArt
                templateId={selected.id}
                className="mx-auto max-w-3xl shadow-lg ring-1 ring-black/5"
              />
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Illustrated layout sketch — save, then open your live shop to see
                real products and branding.
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-3 rounded-xl border border-dashed border-border/80 px-3 py-2.5 text-xs text-muted-foreground"
            style={{
              background: `linear-gradient(90deg, ${selected.previewFrom}55, transparent 55%)`,
            }}
          >
            <span
              className="size-3 shrink-0 rounded-full shadow-sm ring-2 ring-white"
              style={{ backgroundColor: selected.accent }}
              aria-hidden
            />
            <span>
              Accent signal for this look. Your brand colors still apply on the
              live site.
            </span>
          </div>
        </div>
      </div>

      <MilkRunWhatsAppDialog
        open={waPromptOpen}
        onOpenChange={setWaPromptOpen}
        initialWhatsapp={landingWhatsapp}
        existingLandingContent={business?.storefront?.landingContent ?? null}
        onSaved={async () => {
          const next = await fetchBusiness();
          onSaved?.(next);
          setFeedback("WhatsApp saved for Milk Run.");
        }}
      />
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
  icon,
  disabled,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={hint}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

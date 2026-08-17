"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Check,
  ExternalLink,
  LayoutTemplate,
  Loader2,
  Save,
  Store,
  Undo2,
} from "lucide-react";

import { DashboardFeedback } from "@/components/dashboard-page-ui";
import {
  MilkRunWhatsAppDialog,
  milkRunNeedsWhatsApp,
} from "@/components/storefront/milk-run-whatsapp-dialog";
import { ThemePreviewArt } from "@/components/storefront/theme-preview-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchBusiness,
  updateBusiness,
  type BusinessRecord,
} from "@/lib/api";
import { APP_ROUTES, PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
import { storefrontPreviewUrl } from "@/lib/storefront-preview";
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
  const listId = useId();
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
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const landingWhatsapp =
    business?.storefront?.landingContent?.whatsapp?.trim() || "";
  const liveStoreId = normalizeStoreThemeId(
    business?.storefront?.storeThemeId,
  );
  const liveLandingId = normalizeLandingTemplateId(
    business?.storefront?.landingTemplateId,
  );

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
  const liveId = mode === "store" ? liveStoreId : liveLandingId;
  const selected = useMemo(
    () => items.find((m) => m.id === selectedId) ?? items[0]!,
    [items, selectedId],
  );

  const storeDirty = storeThemeId !== liveStoreId;
  const landingDirty = landingTemplateId !== liveLandingId;
  const dirty = storeDirty || landingDirty;
  const currentModeDirty = mode === "store" ? storeDirty : landingDirty;

  const shopBase = business?.slug
    ? slugDerivedShopUrl(business.slug) ||
      `https://${business.slug}.${PLATFORM_DOMAIN}`
    : "";
  const previewUrl = shopBase
    ? storefrontPreviewUrl(shopBase, mode, selectedId)
    : null;

  const pick = useCallback(
    (id: string) => {
      setFeedback(null);
      setError(null);
      if (mode === "store") {
        const next = normalizeStoreThemeId(id);
        setStoreThemeId(next);
        if (milkRunNeedsWhatsApp(next, landingWhatsapp)) {
          setWaPromptOpen(true);
        }
      } else {
        setLandingTemplateId(normalizeLandingTemplateId(id));
      }
    },
    [landingWhatsapp, mode],
  );

  const revert = () => {
    setStoreThemeId(liveStoreId);
    setLandingTemplateId(liveLandingId);
    setFeedback(null);
    setError(null);
  };

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
        mode === "store"
          ? `${selected.name} is now on your shop.`
          : `${selected.name} is now the coming-soon page.`,
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

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === selectedId);
    if (index < 0) return;

    const cols =
      typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches
        ? 3
        : typeof window !== "undefined" &&
            window.matchMedia("(min-width: 640px)").matches
          ? 2
          : 1;

    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = Math.min(items.length - 1, index + (event.key === "ArrowDown" ? cols : 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = Math.max(0, index - (event.key === "ArrowUp" ? cols : 1));
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = items.length - 1;
    } else {
      return;
    }

    if (next === index) return;
    event.preventDefault();
    const id = items[next]!.id;
    pick(id);
    cardRefs.current.get(id)?.focus();
  };

  return (
    <div className="space-y-6">
      <div
        className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/40 p-1"
        role="tablist"
        aria-label="Which page to style"
      >
        <ModeTab
          active={mode === "store"}
          onClick={() => setMode("store")}
          icon={<Store className="size-4" aria-hidden />}
          label="Live shop"
          hint={
            storefrontOn
              ? "What customers see now"
              : "Ready for when you turn the shop on"
          }
        />
        <ModeTab
          active={mode === "landing"}
          onClick={() => setMode("landing")}
          icon={<LayoutTemplate className="size-4" aria-hidden />}
          label="Coming-soon"
          hint={
            storefrontOn
              ? "Shown if you turn the shop off"
              : "What visitors see today"
          }
        />
      </div>

      {!storefrontOn ? (
        <div
          role="status"
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 text-sm leading-relaxed text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50"
        >
          <p className="min-w-0 flex-1">
            The shop is off, so visitors see the coming-soon page. You can still
            pick a live-shop look — it appears when you{" "}
            <Link
              href={APP_ROUTES.businessSettings}
              className="font-medium underline underline-offset-2"
            >
              turn the storefront on
            </Link>
            .
          </p>
        </div>
      ) : null}

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {feedback && !dirty ? (
        <DashboardFeedback kind="success" text={feedback} />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {mode === "store" ? "Shop looks" : "Coming-soon pages"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {currentModeDirty
              ? mode === "store"
                ? `Save to put ${selected.name} on your shop.`
                : `Save to use ${selected.name} as the coming-soon page.`
              : mode === "store"
                ? `${selected.name} is on your shop.`
                : `${selected.name} is the coming-soon page.`}
          </p>
        </div>
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label={mode === "store" ? "Shop looks" : "Coming-soon pages"}
        aria-activedescendant={`${listId}-${selectedId}`}
        onKeyDown={onGridKeyDown}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const isLive = item.id === liveId;
          const showWhatsApp =
            isSelected &&
            mode === "store" &&
            item.id === "milk-run" &&
            !landingWhatsapp;

          return (
            <div
              key={item.id}
              id={`${listId}-${item.id}`}
              ref={(node) => {
                if (node) cardRefs.current.set(item.id, node);
                else cardRefs.current.delete(item.id);
              }}
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => pick(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  pick(item.id);
                }
              }}
              className={cn(
                "group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card text-left transition duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isSelected
                  ? "border-foreground shadow-sm"
                  : "border-border/70 hover:border-foreground/25",
              )}
            >
              <div className="relative overflow-hidden">
                <ThemePreviewArt
                  templateId={item.id}
                  className="pointer-events-none rounded-none border-0 shadow-none ring-0"
                />
                {isSelected ? (
                  <span className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
                    <Check className="size-4" aria-hidden />
                  </span>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight tracking-tight">
                    {item.name}
                  </p>
                  {isLive ? (
                    <Badge variant="success" className="shrink-0">
                      On your shop
                    </Badge>
                  ) : isSelected ? (
                    <Badge variant="outline" className="shrink-0">
                      Selected
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.blurb}
                </p>
                {isSelected && (previewUrl || showWhatsApp) ? (
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {showWhatsApp ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setWaPromptOpen(true);
                        }}
                      >
                        Add WhatsApp
                      </Button>
                    ) : null}
                    {previewUrl ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Preview
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {dirty ? (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-20 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-background/95 p-3 shadow-lg shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-foreground">
            {currentModeDirty ? (
              mode === "store" ? (
                <>
                  <span className="font-semibold">{selected.name}</span> is not
                  on your shop yet. Save to show it to customers.
                </>
              ) : (
                <>
                  <span className="font-semibold">{selected.name}</span> is not
                  the coming-soon page yet.
                </>
              )
            ) : (
              <>You have an unsaved look on the other tab.</>
            )}
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={saving}
              onClick={revert}
            >
              <Undo2 className="size-3.5" aria-hidden />
              Keep current
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void save()}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {saving ? "Saving…" : "Save to your shop"}
            </Button>
          </div>
        </div>
      ) : null}

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
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "hidden text-xs leading-snug sm:block",
          active ? "text-muted-foreground" : "text-muted-foreground/80",
        )}
      >
        {hint}
      </span>
    </button>
  );
}

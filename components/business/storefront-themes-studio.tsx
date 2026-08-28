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
  type ReactNode,
} from "react";
import {
  Check,
  Columns2,
  ExternalLink,
  Loader2,
  Save,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";

import { DashboardFeedback } from "@/components/dashboard-page-ui";
import {
  ThemeTryOnPhone,
  type ThemeTryOnScreen,
} from "@/components/business/theme-try-on-phone";
import {
  MilkRunWhatsAppDialog,
  milkRunNeedsWhatsApp,
} from "@/components/storefront/milk-run-whatsapp-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchBusiness,
  fetchItemsPage,
  updateBusiness,
  type BusinessRecord,
} from "@/lib/api";
import { APP_ROUTES, PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
import { parseStorefrontDesignJson } from "@/lib/storefront-design";
import { storefrontPreviewUrl } from "@/lib/storefront-preview";
import {
  DEFAULT_LANDING_TEMPLATE_ID,
  DEFAULT_STORE_THEME_ID,
  LANDING_TEMPLATE_META,
  STORE_THEME_META,
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
  recommendLandingTemplateId,
  recommendStoreThemeId,
  shortlistLandingTemplateIds,
  shortlistStoreThemeIds,
  storeThemeVibes,
  type LandingTemplateId,
  type StoreThemeId,
  type StorefrontTemplateMeta,
} from "@/lib/storefront-templates";
import { pickTryOnProducts, catalogRecommendTokens, type ThemeTryOnProduct } from "@/lib/theme-try-on";
import { trackStorefrontEditEvent } from "@/lib/storefront-staff-edit";
import { loadThemePins, saveThemePins } from "@/lib/storefront-theme-prefs";
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
  const [activeVibe, setActiveVibe] = useState<string>("All");
  const [seeAllLooks, setSeeAllLooks] = useState(false);
  const [pinnedByMode, setPinnedByMode] = useState<Record<Mode, string[]>>(
    () => loadThemePins(),
  );
  const [tryOnProducts, setTryOnProducts] = useState<ThemeTryOnProduct[]>([]);
  const [catalogTokens, setCatalogTokens] = useState<string[]>([]);
  const [tryOnScreen, setTryOnScreen] = useState<ThemeTryOnScreen>("home");
  const openedAtRef = useRef(Date.now());
  const shortlistCandidateRef = useRef<string | null>(null);

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
    let cancelled = false;
    void fetchItemsPage(undefined, {
      catalogScope: "SKUS_ONLY",
      page: 0,
      size: 24,
    })
      .then((page) => {
        if (cancelled) return;
        setTryOnProducts(
          pickTryOnProducts(page.content, business?.currency ?? "KES"),
        );
        setCatalogTokens(catalogRecommendTokens(page.content));
      })
      .catch(() => {
        if (cancelled) return;
        setTryOnProducts([]);
        setCatalogTokens([]);
      });
    return () => {
      cancelled = true;
    };
  }, [business?.currency]);

  useEffect(() => {
    saveThemePins(pinnedByMode);
  }, [pinnedByMode]);

  useEffect(() => {
    trackStorefrontEditEvent("themes_studio_opened");
  }, []);

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

  const vibes = useMemo(
    () => (mode === "store" ? storeThemeVibes(items) : []),
    [mode, items],
  );

  const recommendInput = useMemo(
    () =>
      business
        ? {
            name: business.name,
            profile: business.profile ?? null,
            catalog: catalogTokens,
          }
        : null,
    [business, catalogTokens],
  );
  const recommendedId = useMemo(
    () =>
      mode === "store"
        ? recommendStoreThemeId(recommendInput)
        : recommendLandingTemplateId(recommendInput),
    [mode, recommendInput],
  );
  const recommendedMeta = useMemo(
    () =>
      (mode === "store" ? STORE_THEME_META : LANDING_TEMPLATE_META).find(
        (m) => m.id === recommendedId,
      ) ?? items[0]!,
    [mode, recommendedId, items],
  );
  const shortlistIds = useMemo(
    () =>
      mode === "store"
        ? shortlistStoreThemeIds(recommendInput)
        : shortlistLandingTemplateIds(recommendInput),
    [mode, recommendInput],
  );
  const isFirstRun =
    mode === "store"
      ? liveStoreId === DEFAULT_STORE_THEME_ID
      : liveLandingId === DEFAULT_LANDING_TEMPLATE_ID;
  const showShortlist = isFirstRun && !seeAllLooks;
  const showRecommendation = !showShortlist && recommendedId !== selectedId;

  const visibleItems = useMemo(() => {
    const pool = showShortlist
      ? shortlistIds
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is StorefrontTemplateMeta => Boolean(item))
      : items;
    if (showShortlist || activeVibe === "All") return pool;
    return pool.filter((item) => item.vibes.includes(activeVibe));
  }, [items, activeVibe, showShortlist, shortlistIds]);

  const pinned = pinnedByMode[mode];

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

  const storeName = business?.name?.trim() || "Your shop";
  const logoUrl = business?.branding?.logoUrl ?? null;
  const brandPrimary = business?.branding?.primaryColor ?? null;
  const landingContent = {
    hours: business?.storefront?.landingContent?.hours ?? null,
    address: business?.storefront?.landingContent?.address ?? null,
  };
  const heroUrl =
    parseStorefrontDesignJson(business?.storefront?.designJson)?.photos?.hero
      ?.url ?? null;
  const designHref =
    mode === "store"
      ? `${APP_ROUTES.businessDesign}?tryTheme=${encodeURIComponent(selectedId)}`
      : `${APP_ROUTES.businessDesign}?tryLanding=${encodeURIComponent(selectedId)}`;

  const pick = useCallback(
    (id: string, source: "gallery" | "shortlist" | "pin" | "recommend" = "gallery") => {
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
      trackStorefrontEditEvent("themes_try_on", { id, source, mode });
      shortlistCandidateRef.current = source === "shortlist" ? id : null;
    },
    [landingWhatsapp, mode],
  );

  const togglePin = useCallback(
    (id: string) => {
      setPinnedByMode((prev) => {
        const current = prev[mode];
        const next = current.includes(id)
          ? current.filter((x) => x !== id)
          : current.length >= 2
            ? [...current.slice(1), id]
            : [...current, id];
        return { ...prev, [mode]: next };
      });
    },
    [mode],
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
      trackStorefrontEditEvent("themes_saved", {
        from: mode === "store" ? liveStoreId : liveLandingId,
        to: selectedId,
        elapsed_ms: Date.now() - openedAtRef.current,
        mode,
      });
      if (shortlistCandidateRef.current === selectedId) {
        trackStorefrontEditEvent("themes_shortlist_accepted", {
          id: selectedId,
          mode,
        });
      }
      setFeedback(
        mode === "store"
          ? `Customers now see ${selected.name} when they open your shop.`
          : `Visitors now see ${selected.name} until the shop is open for buying.`,
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
      setError(e instanceof Error ? e.message : "Could not update the customer website.");
    } finally {
      setSaving(false);
    }
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = visibleItems.findIndex((item) => item.id === selectedId);
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
      next = Math.min(visibleItems.length - 1, index + (event.key === "ArrowDown" ? cols : 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = Math.max(0, index - (event.key === "ArrowUp" ? cols : 1));
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = visibleItems.length - 1;
    } else {
      return;
    }

    if (next === index) return;
    event.preventDefault();
    const id = visibleItems[next]!.id;
    pick(id, showShortlist ? "shortlist" : "gallery");
    cardRefs.current.get(id)?.focus();
  };

  const switchLookMode = (next: Mode) => {
    setMode(next);
    setSeeAllLooks(false);
    setActiveVibe("All");
    if (next === "landing") setTryOnScreen("home");
  };

  const tryOnShared = {
    storeName,
    logoUrl,
    brandPrimary,
    landingContent,
    products: tryOnProducts,
    heroUrl,
    currency: business?.currency ?? "KES",
  };

  return (
    <div className="space-y-6">
      {!storefrontOn ? (
        <div
          role="status"
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 text-sm leading-relaxed text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50"
        >
          <p className="min-w-0 flex-1">
            The shop is not selling online yet, so visitors see the closed-sign
            page. You can still dress the open shop — customers only walk into
            it after you{" "}
            <Link
              href={APP_ROUTES.businessSettings}
              className="font-medium underline underline-offset-2"
            >
              turn selling on
            </Link>
            .
          </p>
        </div>
      ) : null}

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {feedback && !dirty ? (
        <DashboardFeedback kind="success" text={feedback} />
      ) : null}

      <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        {/* ------------------------------------------------------------ */}
        {/* Try-it-on pane — on top for phones, sticky right column on xl */}
        {/* ------------------------------------------------------------ */}
        <aside className="order-1 xl:order-2 xl:sticky xl:top-24">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] sm:p-5">
            {/* Compact on phones: small phone beside the essentials. Full
                vertical treatment on desktop where the pane is sticky. */}
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 xl:block">
              <div
                key={`${mode}-${selected.id}-${tryOnScreen}-mobile`}
                className="col-start-1 row-start-1 w-36 shrink-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 xl:hidden"
              >
                <ThemeTryOnPhone
                  item={selected}
                  kind={mode}
                  {...tryOnShared}
                  screen={tryOnScreen}
                  size="sm"
                />
              </div>
              <div
                key={`${mode}-${selected.id}-${tryOnScreen}`}
                className="hidden motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 xl:block"
              >
                <ThemeTryOnPhone
                  item={selected}
                  kind={mode}
                  {...tryOnShared}
                  screen={tryOnScreen}
                />
              </div>

              {mode === "store" ? (
                <div className="col-span-2 row-start-2 xl:mt-3">
                  <TryOnPageSegment
                    value={tryOnScreen}
                    onChange={setTryOnScreen}
                  />
                </div>
              ) : null}

              <div className="col-start-2 row-start-1 min-w-0 xl:mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {selected.name}
                  </h3>
                  {selected.id === liveId ? (
                    <Badge variant="success" className="shrink-0">
                      Customers see this
                    </Badge>
                  ) : selected.id === recommendedId && mode === "store" ? (
                    <Badge variant="outline" className="shrink-0 gap-1">
                      <Sparkles className="size-3" aria-hidden />
                      Best for you
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {selected.blurb}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    { color: selected.phone.accent, label: `${selected.name} accent` },
                    { color: selected.previewFrom, label: `${selected.name} paper` },
                    { color: selected.previewTo, label: `${selected.name} glow` },
                    ...(brandPrimary && brandPrimary !== selected.phone.accent
                      ? [{ color: brandPrimary, label: "Your brand colour" }]
                      : []),
                  ].map((swatch) => (
                    <span
                      key={swatch.label}
                      title={swatch.label}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: swatch.color }}
                    >
                      <span className="sr-only">{swatch.label}</span>
                    </span>
                  ))}
                  {selected.id === liveId ? (
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                      Live on your website
                    </span>
                  ) : null}
                </div>

                <ul className="mt-3 hidden space-y-1.5 xl:block">
                  {selected.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      <Check
                        className="mt-0.5 size-3.5 shrink-0 text-primary"
                        aria-hidden
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                  {tryOnProducts.length === 0 ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Add product photos in your catalogue — they will show up
                      here.
                    </p>
                  ) : null}

                <div className="mt-3 flex flex-col gap-2 xl:mt-4">
                  {previewUrl ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                    >
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackStorefrontEditEvent("themes_live_preview_clicked", {
                            id: selectedId,
                            mode,
                          })
                        }
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                        See it as a customer
                      </a>
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="ghost" className="gap-1.5">
                    <Link
                      href={designHref}
                      onClick={() =>
                        trackStorefrontEditEvent("themes_design_bridge_clicked", {
                          id: selectedId,
                          mode,
                        })
                      }
                    >
                      <Sparkles className="size-3.5" aria-hidden />
                      Fine-tune this look in Design
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {pinned.length > 0 ? (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Columns2 className="size-3.5" aria-hidden />
                  Compare side by side
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {pinned.map((id) => {
                    const meta = items.find((m) => m.id === id);
                    if (!meta) return null;
                    const isThis = meta.id === selectedId;
                    return (
                      <div key={meta.id} className="relative">
                        <button
                          type="button"
                          onClick={() => pick(meta.id, "pin")}
                          aria-pressed={isThis}
                          className={cn(
                            "block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            isThis ? "opacity-100" : "opacity-75 hover:opacity-100",
                          )}
                        >
                          <div
                            className={cn(
                              "overflow-hidden rounded-xl border",
                              isThis ? "border-foreground" : "border-border/70",
                            )}
                          >
                            <ThemeTryOnPhone
                              item={meta}
                              kind={mode}
                              {...tryOnShared}
                              size="sm"
                            />
                          </div>
                          <span
                            className={cn(
                              "mt-1.5 block truncate text-xs font-semibold",
                              isThis ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {meta.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Stop comparing ${meta.name}`}
                          onClick={() => togglePin(meta.id)}
                          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {/* ------------------------------------------------------------ */}
        {/* Gallery column                                                    */}
        {/* ------------------------------------------------------------ */}
        <div className="order-2 min-w-0 xl:order-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {showShortlist
                  ? "Start with one of these"
                  : mode === "store"
                    ? "Looks for the customer shop"
                    : storefrontOn
                      ? "Looks for the closed-sign page"
                      : "Looks for the page visitors see today"}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {showShortlist
                  ? "You can change it later. Each picture is your shop in that layout."
                  : currentModeDirty
                  ? `${selected.name} is only on this screen until you save.`
                  : mode === "store"
                    ? `Customers see ${selected.name} when they open your shop.`
                    : `Visitors see ${selected.name} until the shop is open for buying.`}
              </p>
            </div>
          </div>

          {showRecommendation ? (
            <div
              role="note"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10"
            >
              <p className="flex min-w-0 items-center gap-2 text-sm leading-relaxed text-emerald-950 dark:text-emerald-50">
                <Sparkles className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span className="min-w-0">
                  Shops like yours usually start with{" "}
                  <span className="font-semibold">{recommendedMeta.name}</span>{" "}
                  — {recommendedMeta.vibes[0]?.toLowerCase() ?? "a clean"} look
                  that suits {storeName}.
                </span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={() => pick(recommendedId, "recommend")}
              >
                Try it on
                <Sparkles className="size-3.5" aria-hidden />
              </Button>
            </div>
          ) : null}

          {vibes.length > 0 && !showShortlist ? (
            <div
              className="mt-4 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filter looks by type of shop"
            >
              <VibeChip
                active={activeVibe === "All"}
                onClick={() => setActiveVibe("All")}
              >
                All looks
              </VibeChip>
              {vibes.map((vibe) => (
                <VibeChip
                  key={vibe}
                  active={activeVibe === vibe}
                  onClick={() => setActiveVibe(vibe)}
                >
                  {vibe}
                </VibeChip>
              ))}
            </div>
          ) : null}

          {visibleItems.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No looks match this filter — try another one.
            </p>
          ) : (
            <div
              id={listId}
              role="listbox"
              aria-label={
                mode === "store"
                  ? "Looks for the customer shop"
                  : "Looks for the closed-sign page"
              }
              aria-activedescendant={
                visibleItems.some((item) => item.id === selectedId)
                  ? `${listId}-${selectedId}`
                  : undefined
              }
              onKeyDown={onGridKeyDown}
              className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {visibleItems.map((item) => {
                const isSelected = item.id === selectedId;
                const isLive = item.id === liveId;
                const isPinned = pinned.includes(item.id);
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
                    onClick={() => pick(item.id, showShortlist ? "shortlist" : "gallery")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        pick(item.id, showShortlist ? "shortlist" : "gallery");
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
                    <div className="relative overflow-hidden bg-muted/30">
                      <div className="pointer-events-none p-3 transition-transform duration-150 motion-safe:group-hover:scale-[1.02] sm:p-4">
                        <ThemeTryOnPhone
                          item={item}
                          kind={mode}
                          {...tryOnShared}
                          size="sm"
                          frame="card"
                        />
                      </div>
                      {isSelected ? (
                        <span className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
                          <Check className="size-4" aria-hidden />
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Compare ${item.name} side by side`}
                        aria-pressed={isPinned}
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePin(item.id);
                        }}
                        className={cn(
                          "absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          isPinned
                            ? "bg-foreground text-background"
                            : "bg-background/90 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Columns2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight tracking-tight">
                          {item.name}
                        </p>
                        {isLive ? (
                          <Badge variant="success" className="shrink-0">
                            Customers see this
                          </Badge>
                        ) : isSelected ? (
                          <Badge variant="outline" className="shrink-0">
                            Trying this on
                          </Badge>
                        ) : item.id === recommendedId ? (
                          <Badge variant="outline" className="shrink-0 gap-1">
                            <Sparkles className="size-3" aria-hidden />
                            Best for you
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.blurb}
                      </p>
                      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
                        {item.vibes.length > 0 ? (
                          <span className="text-[11px] font-medium text-muted-foreground/80">
                            {item.vibes.join(" · ")}
                          </span>
                        ) : null}
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
                        {isSelected && previewUrl ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="ml-auto gap-1.5"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackStorefrontEditEvent(
                                  "themes_live_preview_clicked",
                                  { id: selectedId, mode },
                                )
                              }
                            >
                              See it as a customer
                              <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showShortlist ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setSeeAllLooks(true);
                  trackStorefrontEditEvent("themes_see_all");
                }}
                className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                See all {items.length} looks
              </button>
            </div>
          ) : null}

          <div className="mt-6 border-t border-border/60 pt-4">
            {mode === "store" ? (
              <button
                type="button"
                onClick={() => switchLookMode("landing")}
                className="text-left text-sm leading-relaxed text-muted-foreground hover:text-foreground"
              >
                {storefrontOn
                  ? "If you pause selling, visitors see a closed sign — dress that too."
                  : "Dress the open shop for when you turn selling on."}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchLookMode("store")}
                className="text-left text-sm leading-relaxed text-muted-foreground hover:text-foreground"
              >
                {storefrontOn
                  ? "Back to looks for the customer shop."
                  : "Back to the page visitors see today."}
              </button>
            )}
          </div>

          {dirty ? (
            <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-20 mt-6 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-background/95 p-3 shadow-lg shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-sm text-foreground">
                {currentModeDirty ? (
                  <>
                    <span className="font-semibold">{selected.name}</span> is
                    only on this screen until you save. Layout and typeface
                    will change. Your logo, colours, and words stay.
                  </>
                ) : (
                  <>You started a look on the other page. Save so customers can see it.</>
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
                  Keep the old look
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
                  {saving ? "Putting it on the website…" : "Show this to customers"}
                </Button>
              </div>
            </div>
          ) : null}
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
          setFeedback("WhatsApp is now on the Milk Run customer website.");
        }}
      />
    </div>
  );
}

function VibeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/70 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const TRY_ON_PAGES: { id: ThemeTryOnScreen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "product", label: "A product" },
  { id: "cart", label: "Cart" },
];

function TryOnPageSegment({
  value,
  onChange,
}: {
  value: ThemeTryOnScreen;
  onChange: (screen: ThemeTryOnScreen) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Which page to try on"
      className="flex rounded-lg border border-border/70 bg-muted/50 p-0.5"
    >
      {TRY_ON_PAGES.map((page) => {
        const active = value === page.id;
        return (
          <button
            key={page.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(page.id)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {page.label}
          </button>
        );
      })}
    </div>
  );
}

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
  ChevronDown,
  Columns2,
  DoorClosed,
  ExternalLink,
  Filter,
  Loader2,
  Save,
  Sparkles,
  Store,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  DashboardFeedback,
  dashboardHintClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import {
  ThemeTryOnPhone,
  type ThemeTryOnScreen,
} from "@/components/business/theme-try-on-phone";
import {
  MilkRunWhatsAppDialog,
  milkRunNeedsWhatsApp,
} from "@/components/storefront/milk-run-whatsapp-dialog";
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
import {
  pickTryOnProducts,
  catalogRecommendTokens,
  type ThemeTryOnProduct,
} from "@/lib/theme-try-on";
import { trackStorefrontEditEvent } from "@/lib/storefront-staff-edit";
import { loadThemePins, saveThemePins } from "@/lib/storefront-theme-prefs";
import { cn } from "@/lib/utils";

type Mode = "store" | "landing";

const LINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const INK = "text-[var(--order-ink,#15231f)]";
const MUTED =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
const TEAL = "text-[var(--pos-primary,#0f766e)]";
const TEAL_BORDER = "border-[var(--pos-primary,#0f766e)]";
const SQUARE_BTN = "rounded-none shadow-none";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]";
const STAGE =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3.5%,white)]";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    (
      id: string,
      source: "gallery" | "shortlist" | "pin" | "recommend" = "gallery",
    ) => {
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
      setError(
        e instanceof Error ? e.message : "Could not update the customer website.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = visibleItems.findIndex((item) => item.id === selectedId);
    if (index < 0) return;

    const cols =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 640px)").matches
        ? 2
        : 1;

    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = Math.min(
        visibleItems.length - 1,
        index + (event.key === "ArrowDown" ? cols : 1),
      );
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
    setFiltersOpen(false);
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

  const vibeFilters = (
    <VibeFilterList
      vibes={vibes}
      activeVibe={activeVibe}
      onChange={setActiveVibe}
      disabled={showShortlist}
    />
  );

  const showMilkRunWhatsApp =
    mode === "store" && selected.id === "milk-run" && !landingWhatsapp;

  return (
    <div className="space-y-3">
      {!storefrontOn ? (
        <div
          role="status"
          className={cn(
            "border bg-white px-3 py-2 text-sm leading-relaxed",
            LINE,
            "border-amber-700/40 text-amber-800",
          )}
        >
          The shop is not selling online yet, so visitors see the closed-sign
          page. You can still dress the open shop. Customers only walk into it
          after you{" "}
          <Link
            href={APP_ROUTES.businessSettings}
            className="font-medium underline underline-offset-2"
          >
            turn selling on
          </Link>
          .
        </div>
      ) : null}

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {feedback && !dirty ? (
        <DashboardFeedback kind="success" text={feedback} />
      ) : null}

      <div className="flex flex-col gap-2 xl:hidden">
        <ModeSwitch
          mode={mode}
          storefrontOn={storefrontOn}
          onChange={switchLookMode}
        />
        {vibes.length > 0 && !showShortlist ? (
          <StudioDrawer
            id="filters-mobile"
            title="Filter by shop type"
            open={filtersOpen}
            onToggle={() => setFiltersOpen((open) => !open)}
            badge={activeVibe === "All" ? undefined : activeVibe}
            icon={<Filter className="size-3.5" aria-hidden />}
          >
            {vibeFilters}
          </StudioDrawer>
        ) : null}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[10.75rem_minmax(0,1fr)_17.5rem] xl:gap-5">
        <aside className="sticky top-24 hidden self-start xl:block">
          <div className="space-y-5">
            <div>
              <p className={dashboardLabelClass()}>Which page</p>
              <ModeSwitch
                mode={mode}
                storefrontOn={storefrontOn}
                onChange={switchLookMode}
                stacked
                className="mt-1.5"
              />
            </div>

            {vibes.length > 0 ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className={dashboardLabelClass()}>Shop type</p>
                  {activeVibe !== "All" && !showShortlist ? (
                    <button
                      type="button"
                      onClick={() => setActiveVibe("All")}
                      className={cn(
                        "text-[11px] font-medium underline-offset-2 hover:underline",
                        MUTED,
                        FOCUS,
                      )}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="mt-1.5">{vibeFilters}</div>
                {showShortlist ? (
                  <p className={cn("mt-2 leading-relaxed", dashboardHintClass())}>
                    Filters unlock after you open all looks.
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className={cn("leading-relaxed", dashboardHintClass())}>
              Your logo, colours, and words stay. Only the layout and typeface
              change when you save.
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h2
                className={cn(
                  "text-[15px] font-semibold tracking-[-0.02em]",
                  INK,
                )}
              >
                {showShortlist
                  ? "Start with one of these"
                  : mode === "store"
                    ? "Looks for the customer shop"
                    : storefrontOn
                      ? "Looks for the closed-sign page"
                      : "Looks for the page visitors see today"}
              </h2>
              <p className={cn("mt-0.5 text-[13px]", MUTED)}>
                {showShortlist
                  ? "Tap a look. The phone shows your shop in that layout."
                  : currentModeDirty
                    ? `${selected.name} is only on this screen until you save.`
                    : mode === "store"
                      ? `Customers see ${selected.name} when they open your shop.`
                      : `Visitors see ${selected.name} until the shop is open for buying.`}
              </p>
            </div>
            <p className={cn("text-[11px] tabular-nums", MUTED)}>
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "look" : "looks"}
              {activeVibe !== "All" && !showShortlist
                ? ` in ${activeVibe}`
                : null}
            </p>
          </div>

          {showRecommendation ? (
            <p
              role="note"
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 border bg-white px-3 py-2 text-[13px]",
                LINE,
                INK,
              )}
            >
              <span className="min-w-0">
                Shops like yours usually start with{" "}
                <span className="font-semibold">{recommendedMeta.name}</span>
                {recommendedMeta.vibes[0]
                  ? ` (${recommendedMeta.vibes[0].toLowerCase()})`
                  : null}
                .
              </span>
              <button
                type="button"
                onClick={() => pick(recommendedId, "recommend")}
                className={cn(
                  "shrink-0 text-[13px] font-semibold underline-offset-2 hover:underline",
                  TEAL,
                  FOCUS,
                )}
              >
                Try it on
              </button>
            </p>
          ) : null}

          {visibleItems.length === 0 ? (
            <p
              className={cn(
                "border border-dashed bg-white px-4 py-8 text-center text-sm",
                LINE,
                MUTED,
              )}
            >
              No looks match this filter. Try another shop type.
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
              className="grid gap-2 sm:grid-cols-2"
            >
              {visibleItems.map((item) => {
                const isSelected = item.id === selectedId;
                const isLive = item.id === liveId;
                const isPinned = pinned.includes(item.id);

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
                    onClick={() =>
                      pick(item.id, showShortlist ? "shortlist" : "gallery")
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        pick(
                          item.id,
                          showShortlist ? "shortlist" : "gallery",
                        );
                      }
                    }}
                    className={cn(
                      "group flex cursor-pointer flex-col bg-white text-left",
                      "rounded-none border",
                      LINE,
                      FOCUS,
                      isSelected
                        ? TEAL_BORDER
                        : "hover:border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex justify-center px-3 pb-2 pt-3",
                        STAGE,
                      )}
                    >
                      <div className="pointer-events-none w-[8.25rem]">
                        <ThemeTryOnPhone
                          item={item}
                          kind={mode}
                          {...tryOnShared}
                          size="tile"
                          frame="card"
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex items-start justify-between gap-2 border-t px-2.5 py-2",
                        LINE,
                      )}
                    >
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "flex items-center gap-1.5 text-[13px] font-semibold leading-tight tracking-[-0.02em]",
                            isSelected ? TEAL : INK,
                          )}
                        >
                          {isSelected ? (
                            <Check
                              className="size-3.5 shrink-0"
                              aria-hidden
                            />
                          ) : null}
                          <span className="truncate">{item.name}</span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <LookMark
                            live={isLive}
                            selected={isSelected && !isLive}
                            recommended={
                              !isLive &&
                              !isSelected &&
                              item.id === recommendedId
                            }
                          />
                          {item.vibes[0] ? (
                            <span className={cn("text-[11px]", MUTED)}>
                              {item.vibes[0]}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Compare ${item.name} side by side`}
                        aria-pressed={isPinned}
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePin(item.id);
                        }}
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center border transition-colors",
                          LINE,
                          FOCUS,
                          isPinned
                            ? cn(TEAL_BORDER, TEAL)
                            : cn(
                                MUTED,
                                "opacity-0 hover:text-[var(--order-ink,#15231f)] group-hover:opacity-100 group-focus-within:opacity-100",
                              ),
                          isPinned && "opacity-100",
                        )}
                      >
                        <Columns2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showShortlist ? (
            <button
              type="button"
              onClick={() => {
                setSeeAllLooks(true);
                trackStorefrontEditEvent("themes_see_all");
              }}
              className={cn(
                "text-[13px] font-medium underline underline-offset-2 hover:no-underline",
                INK,
                FOCUS,
              )}
            >
              See all {items.length} looks
            </button>
          ) : null}
        </div>

        <aside className="order-first xl:sticky xl:top-24 xl:order-none xl:self-start">
          <div className={cn("overflow-hidden border bg-white", LINE)}>
            <div className={cn("border-b px-3 pb-3 pt-3 sm:px-4", LINE, STAGE)}>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 xl:block">
                <div
                  key={`${mode}-${selected.id}-${tryOnScreen}-m`}
                  className="w-[7.5rem] shrink-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 xl:mx-auto xl:hidden"
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
                  className="mx-auto hidden w-full max-w-[11.25rem] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 xl:block"
                >
                  <ThemeTryOnPhone
                    item={selected}
                    kind={mode}
                    {...tryOnShared}
                    screen={tryOnScreen}
                  />
                </div>
                <div className="min-w-0 xl:mt-3 xl:text-center">
                  <div className="flex flex-wrap items-center gap-2 xl:justify-center">
                    <h3
                      className={cn(
                        "text-[15px] font-semibold tracking-[-0.02em]",
                        INK,
                      )}
                    >
                      {selected.name}
                    </h3>
                    {selected.id === liveId ? (
                      <LookMark live />
                    ) : (
                      <LookMark selected />
                    )}
                  </div>
                  {mode === "store" ? (
                    <div className="mt-2.5">
                      <TryOnPageSegment
                        value={tryOnScreen}
                        onChange={setTryOnScreen}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={cn("space-y-3 border-b px-3 py-3 sm:px-4", LINE)}>
              <p className={cn("text-[13px] leading-relaxed", MUTED)}>
                {selected.blurb}
              </p>
              <ul className="space-y-1">
                {selected.points.slice(0, 3).map((point) => (
                  <li
                    key={point}
                    className={cn(
                      "flex items-start gap-2 text-[12px] leading-relaxed",
                      MUTED,
                    )}
                  >
                    <Check
                      className={cn("mt-0.5 size-3.5 shrink-0", TEAL)}
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              {tryOnProducts.length === 0 ? (
                <p className={dashboardHintClass()}>
                  Add product photos in your catalogue. They will show up here.
                </p>
              ) : null}
              <ColourDots
                selected={selected}
                brandPrimary={brandPrimary}
              />
            </div>

            {pinned.length > 0 ? (
              <div className={cn("border-b px-3 py-3 sm:px-4", LINE)}>
                <p className={dashboardLabelClass()}>Compare</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
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
                          className={cn("block w-full text-left", FOCUS)}
                        >
                          <div
                            className={cn(
                              "overflow-hidden border",
                              isThis ? TEAL_BORDER : LINE,
                            )}
                          >
                            <ThemeTryOnPhone
                              item={meta}
                              kind={mode}
                              {...tryOnShared}
                              size="tile"
                              frame="card"
                            />
                          </div>
                          <span
                            className={cn(
                              "mt-1.5 block truncate text-[12px] font-semibold",
                              isThis ? TEAL : MUTED,
                            )}
                          >
                            {meta.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Stop comparing ${meta.name}`}
                          onClick={() => togglePin(meta.id)}
                          className={cn(
                            "absolute right-1 top-1 flex size-5 items-center justify-center border bg-white",
                            LINE,
                            MUTED,
                            FOCUS,
                            "hover:text-[var(--order-ink,#15231f)]",
                          )}
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-1 p-2.5 sm:p-3">
              {previewUrl ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className={cn(SQUARE_BTN, "justify-start gap-1.5")}
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
                    <ExternalLink className="size-3.5" aria-hidden />
                    See it as a customer
                  </a>
                </Button>
              ) : null}
              <Button
                asChild
                size="sm"
                variant="ghost"
                className={cn(SQUARE_BTN, "justify-start gap-1.5")}
              >
                <Link
                  href={designHref}
                  onClick={() =>
                    trackStorefrontEditEvent(
                      "themes_design_bridge_clicked",
                      { id: selectedId, mode },
                    )
                  }
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  Fine-tune in Design
                </Link>
              </Button>
              {showMilkRunWhatsApp ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(SQUARE_BTN, "justify-start")}
                  onClick={() => setWaPromptOpen(true)}
                >
                  Add WhatsApp
                </Button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {dirty ? (
        <div
          className={cn(
            "sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-20 flex flex-col gap-3 border bg-white p-3 sm:flex-row sm:items-center sm:justify-between",
            LINE,
          )}
        >
          <p className={cn("min-w-0 text-sm", INK)}>
            {currentModeDirty ? (
              <>
                <span className="font-semibold">{selected.name}</span> is only
                on this screen until you save. Layout and typeface will change.
                Your logo, colours, and words stay.
              </>
            ) : (
              <>
                You started a look on the other page. Save so customers can see
                it.
              </>
            )}
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(SQUARE_BTN, "gap-1.5")}
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
              className={cn(
                SQUARE_BTN,
                "gap-1.5 bg-[var(--pos-primary,#0f766e)] text-white hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_88%,#000)]",
              )}
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

function LookMark({
  live,
  selected,
  recommended,
}: {
  live?: boolean;
  selected?: boolean;
  recommended?: boolean;
}) {
  if (live) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center border px-1.5 py-0.5 text-[10px] font-semibold",
          TEAL_BORDER,
          TEAL,
        )}
      >
        Live
      </span>
    );
  }
  if (selected) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center border px-1.5 py-0.5 text-[10px] font-medium",
          LINE,
          MUTED,
        )}
      >
        Trying on
      </span>
    );
  }
  if (recommended) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[10px] font-medium",
          LINE,
          MUTED,
        )}
      >
        <Sparkles className="size-3" aria-hidden />
        Best for you
      </span>
    );
  }
  return null;
}

function ColourDots({
  selected,
  brandPrimary,
}: {
  selected: StorefrontTemplateMeta;
  brandPrimary: string | null;
}) {
  const swatches = [
    { color: selected.phone.accent, label: `${selected.name} accent` },
    { color: selected.previewFrom, label: `${selected.name} paper` },
    { color: selected.previewTo, label: `${selected.name} glow` },
    ...(brandPrimary && brandPrimary !== selected.phone.accent
      ? [{ color: brandPrimary, label: "Your brand colour" }]
      : []),
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {swatches.map((swatch) => (
        <span
          key={swatch.label}
          title={swatch.label}
          className={cn("inline-block size-5 border", LINE)}
          style={{ backgroundColor: swatch.color }}
        >
          <span className="sr-only">{swatch.label}</span>
        </span>
      ))}
    </div>
  );
}

function ModeSwitch({
  mode,
  storefrontOn,
  onChange,
  stacked = false,
  className,
}: {
  mode: Mode;
  storefrontOn: boolean;
  onChange: (mode: Mode) => void;
  stacked?: boolean;
  className?: string;
}) {
  const options: {
    id: Mode;
    label: string;
    hint: string;
    icon: LucideIcon;
  }[] = [
    {
      id: "store",
      label: "Open shop",
      hint: storefrontOn
        ? "What buyers see now"
        : "Ready when you turn selling on",
      icon: Store,
    },
    {
      id: "landing",
      label: "Closed sign",
      hint: storefrontOn
        ? "If you pause selling"
        : "What visitors see today",
      icon: DoorClosed,
    },
  ];

  return (
    <div
      role="group"
      aria-label="Which page to dress"
      className={cn(
        stacked ? "flex flex-col gap-1" : "grid grid-cols-2 gap-1.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = mode === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-none border bg-white px-2.5 py-2 text-left transition-colors",
              FOCUS,
              active ? cn(TEAL_BORDER, TEAL) : cn(LINE, INK, "hover:border-[var(--pos-primary,#0f766e)]"),
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="text-[13px] font-semibold leading-none">
                {opt.label}
              </span>
            </span>
            <span className={cn("mt-1 block text-[11px] leading-snug", MUTED)}>
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function VibeFilterList({
  vibes,
  activeVibe,
  onChange,
  disabled,
}: {
  vibes: string[];
  activeVibe: string;
  onChange: (vibe: string) => void;
  disabled?: boolean;
}) {
  const all = ["All", ...vibes];
  return (
    <div
      role="group"
      aria-label="Filter looks by type of shop"
      className={cn(
        "flex flex-col gap-px",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {all.map((vibe) => {
        const active = activeVibe === vibe;
        return (
          <button
            key={vibe}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(vibe)}
            className={cn(
              "rounded-none px-2 py-1.5 text-left text-[12px] font-medium transition-colors",
              FOCUS,
              active
                ? cn(TEAL, "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]")
                : cn(MUTED, "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-[var(--order-ink,#15231f)]"),
            )}
          >
            {vibe === "All" ? "All looks" : vibe}
          </button>
        );
      })}
    </div>
  );
}

function StudioDrawer({
  id,
  title,
  open,
  onToggle,
  children,
  badge,
  icon,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("border bg-white", LINE)}>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3.5%,white)]",
          FOCUS,
        )}
      >
        {icon ? <span className={MUTED}>{icon}</span> : null}
        <span
          className={cn(
            "min-w-0 flex-1 text-[12px] font-semibold",
            INK,
          )}
        >
          {title}
        </span>
        {badge ? (
          <span
            className={cn(
              "border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              LINE,
              MUTED,
            )}
          >
            {badge}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200",
            MUTED,
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        hidden={!open}
        className={cn(open && "border-t px-3 pb-3 pt-2", LINE)}
      >
        {open ? children : null}
      </div>
    </div>
  );
}

const TRY_ON_PAGES: { id: ThemeTryOnScreen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "product", label: "Product" },
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
      className={cn("flex border bg-white p-0.5", LINE)}
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
              "flex-1 px-2 py-1.5 text-[12px] font-medium transition-colors",
              FOCUS,
              active ? cn(TEAL, "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]") : cn(MUTED, "hover:text-[var(--order-ink,#15231f)]"),
            )}
          >
            {page.label}
          </button>
        );
      })}
    </div>
  );
}

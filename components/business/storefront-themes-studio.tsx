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
  Columns2,
  DoorClosed,
  ExternalLink,
  Loader2,
  Save,
  Search,
  Sparkles,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  DashboardFeedback,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { ThemeLiveFrame } from "@/components/business/theme-live-frame";
import {
  MilkRunWhatsAppDialog,
  milkRunNeedsWhatsApp,
} from "@/components/storefront/milk-run-whatsapp-dialog";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { ShopCartPreviewProvider } from "@/hooks/use-shop-cart";
import { useMediaLg } from "@/hooks/use-media-lg";
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
  const [query, setQuery] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
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
    const vibeFiltered =
      showShortlist || activeVibe === "All"
        ? pool
        : pool.filter((item) => item.vibes.includes(activeVibe));
    const q = query.trim().toLowerCase();
    if (!q) return vibeFiltered;
    return vibeFiltered.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.blurb.toLowerCase().includes(q) ||
        item.vibes.some((v) => v.toLowerCase().includes(q)),
    );
  }, [items, activeVibe, showShortlist, shortlistIds, query]);

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
  const logoDarkUrl = business?.branding?.logoDarkUrl ?? null;
  const brandPrimary = business?.branding?.primaryColor ?? null;
  const landingContent = business?.storefront?.landingContent ?? null;
  const design = parseStorefrontDesignJson(business?.storefront?.designJson);
  const heroUrl = design?.photos?.hero?.url ?? null;
  const liveMeta = items.find((item) => item.id === liveId) ?? selected;
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
      setMobileDetailOpen(true);
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

    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = Math.min(visibleItems.length - 1, index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = Math.max(0, index - 1);
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
    setQuery("");
  };

  const tryOnShared = {
    storeName,
    logoUrl,
    logoDarkUrl,
    brandPrimary,
    landingContent,
    products: tryOnProducts,
    heroUrl,
    currency: business?.currency ?? "KES",
    slug: business?.slug ?? null,
    design,
  };

  const showMilkRunWhatsApp =
    mode === "store" && selected.id === "milk-run" && !landingWhatsapp;

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search looks…"
              aria-label="Search shop looks"
            />
          </label>
          {vibes.length > 0 && !showShortlist ? (
            <div className="flex flex-wrap gap-1">
              {["All", ...vibes].map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  aria-pressed={activeVibe === vibe}
                  onClick={() => setActiveVibe(vibe)}
                  className={cn(
                    "inline-flex h-7 items-center rounded-none border px-1.5 text-[10px] font-semibold",
                    FOCUS,
                    activeVibe === vibe
                      ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                      : cn(LINE, MUTED),
                  )}
                >
                  {vibe === "All" ? "All" : vibe}
                </button>
              ))}
            </div>
          ) : null}
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {visibleItems.length}{" "}
            {visibleItems.length === 1 ? "look" : "looks"}
            {showShortlist ? " · starter shortlist" : ""}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {visibleItems.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              No looks match this filter.
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
            >
              <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
                {visibleItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isLive = item.id === liveId;
                  const isPinned = pinned.includes(item.id);
                  return (
                    <li key={item.id}>
                      <div
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
                          "group relative flex w-full cursor-pointer items-center gap-2.5 text-left transition-colors",
                          denser
                            ? "px-2.5 py-2 sm:px-3"
                            : "min-h-[3.25rem] px-3 py-3",
                          FOCUS,
                          isSelected
                            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                            : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center border text-[10px] font-bold uppercase",
                            isSelected || isLive
                              ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                              : cn(LINE, MUTED),
                          )}
                          aria-hidden
                        >
                          {item.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate font-semibold tracking-[-0.015em]",
                              denser ? "text-[12.5px]" : "text-[14px]",
                              isSelected ? TEAL : INK,
                            )}
                          >
                            {item.name}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                            {item.vibes[0] ?? item.blurb}
                          </p>
                        </div>
                        <LookMark
                          live={isLive}
                          selected={isSelected && !isLive}
                          recommended={
                            !isLive &&
                            !isSelected &&
                            item.id === recommendedId
                          }
                        />
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
                              : cn(MUTED, "opacity-60 hover:opacity-100"),
                          )}
                        >
                          <Columns2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {showShortlist ? (
          <button
            type="button"
            onClick={() => {
              setSeeAllLooks(true);
              trackStorefrontEditEvent("themes_see_all");
            }}
            className={cn(
              dashboardHintClass(),
              "shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 text-left underline-offset-4 hover:text-foreground hover:underline",
            )}
          >
            See all {items.length} looks
          </button>
        ) : null}
      </div>
    );
  };

  const stage = (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div
        key={`${mode}-${selected.id}`}
        className="w-full max-w-[14rem] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      >
        <ThemeLiveFrame item={selected} kind={mode} {...tryOnShared} />
      </div>
      <div className="mt-4 text-center">
        <p
          className="text-[1.15rem] font-semibold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {selected.name}
        </p>
        <p className={cn(dashboardHintClass(), "mt-1.5 max-w-[16rem]")}>
          {selected.id === liveId
            ? "Live for customers"
            : `${selected.name} is on the stage — save when it feels right.`}
        </p>
      </div>
    </div>
  );

  const dossier = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className={cn("space-y-3 border-b px-4 py-4", LINE)}>
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              "text-[1.15rem] font-semibold leading-none tracking-[-0.03em]",
              INK,
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {selected.name}
          </h3>
          {selected.id === liveId ? <LookMark live /> : <LookMark selected />}
        </div>
        {dirty ? (
          <LookCommit
            currentModeDirty={currentModeDirty}
            selectedName={selected.name}
            liveName={liveMeta.name}
            saving={saving}
            onCancel={revert}
            onSave={() => void save()}
          />
        ) : null}
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
        <ColourDots selected={selected} brandPrimary={brandPrimary} />
      </div>

      {pinned.length > 0 ? (
        <div className={cn("border-b px-4 py-3", LINE)}>
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
                      <ThemeLiveFrame
                        item={meta}
                        kind={mode}
                        {...tryOnShared}
                        size="tile"
                        lazy
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

      <div className="mt-auto flex flex-col gap-1 p-3">
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
        <Button
          asChild
          size="sm"
          variant="ghost"
          className={cn(SQUARE_BTN, "justify-start gap-1.5")}
        >
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
        <p className={cn("mt-2 leading-relaxed", dashboardHintClass())}>
          Your logo, colours, and words stay. Only the layout and typeface
          change when you save.
        </p>
      </div>
    </div>
  );

  return (
    <ShopCartPreviewProvider>
      <div className="flex min-h-0 flex-col gap-1.5">
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

        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
            LINE,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <ModeSwitch
              mode={mode}
              storefrontOn={storefrontOn}
              onChange={switchLookMode}
            />
            <p className={cn("text-[12px] tabular-nums", MUTED)}>
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--order-ink,#15231f)]">
                <span
                  className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
                  aria-hidden
                />
                {selected.name}
              </span>
              {" · "}
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "look" : "looks"}
              {activeVibe !== "All" && !showShortlist
                ? ` in ${activeVibe}`
                : null}
            </p>
          </div>
          {showRecommendation ? (
            <button
              type="button"
              onClick={() => pick(recommendedId, "recommend")}
              className={cn(
                "h-7 px-1.5 text-[11px] font-semibold underline-offset-2 hover:underline",
                TEAL,
                FOCUS,
              )}
            >
              Try {recommendedMeta.name}
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            "hidden h-[min(80dvh,52rem)] overflow-hidden border lg:grid",
            "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
            "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
            "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
          )}
        >
          <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
            {roster({ fill: true, denser: true })}
          </div>
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
            <p
              className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
              aria-hidden
            >
              The look
            </p>
            {stage}
          </div>
          <div
            ref={setDockRoot}
            className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
          >
            {isLg ? null : dossier}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2 lg:hidden">
          <div className={cn("overflow-hidden border bg-white", LINE)}>
            {roster({ fill: false, denser: false })}
          </div>
        </div>

        <FormDrawer
          open={isLg || mobileDetailOpen}
          onOpenChange={(open) => {
            if (!isLg) setMobileDetailOpen(open);
          }}
          contextLabel={mode === "store" ? "Shop look" : "Closed-sign look"}
          title={selected.name}
          description={
            selected.id === liveId
              ? "Live for customers"
              : "Trying on — not saved yet"
          }
          headerDensity="compact"
          bodyLayout="fill"
          appearance="sharp"
          docked={isLg}
          dockRoot={dockRoot}
        >
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-white",
              isLg ? "h-full" : "h-[min(82dvh,42rem)]",
            )}
          >
            {isLg ? null : (
              <div className={cn("shrink-0 border-b px-4 py-3", LINE, STAGE)}>
                <div className="mx-auto w-[7.5rem]">
                  <ThemeLiveFrame
                    item={selected}
                    kind={mode}
                    {...tryOnShared}
                    size="sm"
                  />
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {dossier}
            </div>
          </div>
        </FormDrawer>

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
    </ShopCartPreviewProvider>
  );
}
function LookCommit({
  currentModeDirty,
  selectedName,
  liveName,
  saving,
  onCancel,
  onSave,
}: {
  currentModeDirty: boolean;
  selectedName: string;
  liveName: string;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-3 space-y-2 xl:text-center">
      <p className={cn("text-[13px] font-semibold", INK)}>
        {currentModeDirty ? `Save ${selectedName}?` : "Save the other page too?"}
      </p>
      <p className={cn("text-[12px] leading-relaxed", MUTED)}>
        {currentModeDirty
          ? `Customers still see ${liveName}.`
          : "A look on the other page is not saved yet."}
      </p>
      <div className="flex flex-wrap gap-2 xl:justify-center">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(SQUARE_BTN, "gap-1.5")}
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={onSave}
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
          {saving ? "Saving…" : "Save this look"}
        </Button>
      </div>
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
        Not live
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

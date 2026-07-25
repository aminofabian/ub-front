"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Package,
  Search,
  SlidersHorizontal,
  Store,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchMarketplaceSupplierBySlug,
  fetchMarketplaceSupplierDetail,
  listMarketplaceLocations,
  searchMarketplaceProducts,
  searchMarketplaceSuppliers,
  type MarketplaceProductSearchRow,
  type MarketplaceSupplierDetail,
  type MarketplaceSupplierSearchRow,
} from "@/lib/marketplace-api";
import { cn, formatMoney } from "@/lib/utils";

import { MarketplaceOrderWorkspace } from "./_components/marketplace-order-panel";
import {
  mktChip,
  mktChipActive,
  mktPosAccentBar,
  mktPosHeader,
  mktPosSearch,
  mktPosShell,
  mktPosTile,
} from "./_components/marketplace-ui";

const SEARCH_DEBOUNCE_MS = 320;
const PRODUCT_PAGE_SIZE = 100;
const SUPPLIER_PAGE_SIZE = 100;

export default function PublicMarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading marketplace…
        </div>
      }
    >
      <PublicMarketplacePageInner />
    </Suspense>
  );
}

const QUICK_PROMPTS = [
  "rice",
  "cooking oil",
  "milk",
  "sugar",
  "flour",
  "soap",
] as const;

type SearchTab = "products" | "suppliers";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function PublicMarketplacePageInner() {
  const [tab, setTab] = useState<SearchTab>("products");
  const [searchInput, setSearchInput] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [suppliers, setSuppliers] = useState<MarketplaceSupplierSearchRow[]>([]);
  const [supplierColumn, setSupplierColumn] = useState<
    MarketplaceSupplierSearchRow[]
  >([]);
  const [products, setProducts] = useState<MarketplaceProductSearchRow[]>([]);
  const [productPage, setProductPage] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const [productLast, setProductLast] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [supplierDetail, setSupplierDetail] =
    useState<MarketplaceSupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(true);
  const ordering = Boolean(activeSupplierId && tab === "products");

  useEffect(() => {
    // Entering order mode: collapse browse chrome on small screens.
    if (typeof window === "undefined") return;
    const narrow = window.matchMedia("(max-width: 1023px)").matches;
    if (ordering && narrow) {
      setFiltersOpen(false);
      setSupplierPickerOpen(false);
    } else if (!ordering) {
      setFiltersOpen(true);
      setSupplierPickerOpen(true);
    }
  }, [ordering]);

  useEffect(() => {
    setSignedIn(Boolean(getSessionTokens()?.accessToken));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listMarketplaceLocations()
      .then((rows) => {
        if (!cancelled) setLocations(rows);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Supplier column for products tab (area-scoped).
  useEffect(() => {
    if (tab !== "products") return;
    let cancelled = false;
    void searchMarketplaceSuppliers({
      location: activeLocation ?? undefined,
      size: SUPPLIER_PAGE_SIZE,
    })
      .then((page) => {
        if (!cancelled) setSupplierColumn(page.content);
      })
      .catch(() => {
        if (!cancelled) setSupplierColumn([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, activeLocation]);

  const loadProducts = useCallback(
    async (page: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const result = await searchMarketplaceProducts({
          q: debouncedSearch,
          location: activeLocation ?? undefined,
          supplierId: activeSupplierId ?? undefined,
          page,
          size: PRODUCT_PAGE_SIZE,
        });
        setProducts((prev) =>
          append ? [...prev, ...result.content] : result.content,
        );
        setProductPage(result.number);
        setProductTotal(result.totalElements);
        setProductLast(result.last);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Search failed");
        if (!append) {
          setProducts([]);
          setProductTotal(0);
          setProductLast(true);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, activeLocation, activeSupplierId],
  );

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const page = await searchMarketplaceSuppliers({
        q: debouncedSearch,
        location: activeLocation ?? undefined,
        size: SUPPLIER_PAGE_SIZE,
      });
      setSuppliers(page.content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeLocation]);

  useEffect(() => {
    if (tab === "suppliers") {
      void loadSuppliers();
      return;
    }
    // Ordering workspace loads its own catalogue when a supplier is selected.
    if (activeSupplierId) {
      setLoading(false);
      return;
    }
    void loadProducts(0, false);
  }, [tab, loadProducts, loadSuppliers, activeSupplierId]);

  useEffect(() => {
    if (!activeSupplierId || tab !== "products") {
      setSupplierDetail(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    const slug =
      supplierColumn.find((s) => s.id === activeSupplierId)?.slug ?? null;
    const request = slug
      ? fetchMarketplaceSupplierBySlug(slug)
      : fetchMarketplaceSupplierDetail(activeSupplierId);
    void request
      .then((detail) => {
        if (!cancelled) setSupplierDetail(detail);
      })
      .catch((error) => {
        if (!cancelled) {
          setSupplierDetail(null);
          toast.error(
            error instanceof Error ? error.message : "Failed to load supplier",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSupplierId, tab, supplierColumn]);

  const categoryTags = useMemo(() => {
    const counts = new Map<string, number>();
    const source =
      tab === "products"
        ? products
            .map((p) => p.categoryName)
            .filter((v): v is string => Boolean(v?.trim()))
        : suppliers.flatMap((row) => row.categoryTags ?? []);
    for (const tag of source) {
      const key = tag.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([tag]) => tag);
  }, [products, suppliers, tab]);

  const visibleProducts = useMemo(() => {
    let filtered = products;
    // Client-side guard so supplier filter works even if API ignores supplierId.
    if (activeSupplierId) {
      filtered = filtered.filter((row) => row.supplierId === activeSupplierId);
    }
    if (activeTag) {
      filtered = filtered.filter(
        (row) =>
          row.categoryName?.trim().toLowerCase() === activeTag.toLowerCase(),
      );
    }
    return [...filtered].sort((a, b) => {
      const ai = a.imageUrl ? 0 : 1;
      const bi = b.imageUrl ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return (a.productName || "").localeCompare(b.productName || "");
    });
  }, [products, activeTag, activeSupplierId]);

  const visibleSuppliers = useMemo(() => {
    if (!activeTag) return suppliers;
    const needle = activeTag.toLowerCase();
    return suppliers.filter((row) =>
      (row.categoryTags ?? []).some((tag) => tag.toLowerCase() === needle),
    );
  }, [suppliers, activeTag]);

  const locationChips = useMemo(() => {
    const fromResults =
      tab === "products"
        ? [
            ...products.flatMap(
              (p) => p.locations ?? (p.location ? [p.location] : []),
            ),
            ...supplierColumn.flatMap(
              (s) => s.locations ?? (s.location ? [s.location] : []),
            ),
          ]
        : suppliers.flatMap(
            (s) => s.locations ?? (s.location ? [s.location] : []),
          );
    const merged = new Set<string>();
    for (const loc of [...locations, ...fromResults]) {
      const key = loc?.trim();
      if (key) merged.add(key);
    }
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [locations, products, suppliers, supplierColumn, tab]);

  const showSupplierRail =
    tab === "products" && supplierColumn.length > 0;

  const activeSupplierName =
    supplierColumn.find((s) => s.id === activeSupplierId)?.name ?? null;

  const resultCount =
    tab === "suppliers" ? visibleSuppliers.length : visibleProducts.length;
  // If API ignored supplierId, products still contain other suppliers — count visible only.
  const supplierFilterIsClientOnly =
    Boolean(activeSupplierId) &&
    products.some((p) => p.supplierId !== activeSupplierId);
  const displayProductCount = supplierFilterIsClientOnly
    ? visibleProducts.length
    : productTotal || resultCount;
  const hasQuery = Boolean(
    debouncedSearch.trim() || activeTag || activeLocation || activeSupplierId,
  );

  const clearFilters = () => {
    setSearchInput("");
    setActiveTag(null);
    setActiveLocation(null);
    setActiveSupplierId(null);
  };

  return (
    <div
      className="min-h-dvh bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,#f7f4ef),#efeae2_42%,#e7e1d6)] text-[var(--pos-ink,#1c1915)]"
      style={{ ["--pos-primary" as string]: "#0f766e" }}
    >
      <header className="sticky top-0 z-30 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,#faf8f4_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <KioskLogo size="sm" href="/" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Marketplace
            </span>
          </div>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link
                href={APP_ROUTES.suppliers}
                className="inline-flex h-7 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
              >
                My suppliers
              </Link>
            ) : (
              <Link
                href={APP_ROUTES.login}
                className="inline-flex h-7 items-center bg-[var(--pos-primary,#0f766e)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--pos-primary-ink,#fff)]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto flex w-full max-w-[1400px] flex-col px-2 pt-2 sm:px-5 sm:pt-3",
          ordering ? "pb-2 max-lg:pb-0" : "pb-8 sm:pb-10",
        )}
      >
        <div
          className={cn(
            "mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5",
            ordering && "max-lg:hidden",
          )}
        >
          <p className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            marketplace
            <span className="font-sans text-muted-foreground/80">
              {" "}
              · area → supplier → shelf
            </span>
          </p>
          {hasQuery && !loading ? (
            <button
              type="button"
              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            mktPosShell,
            "relative flex min-h-0 flex-col",
            // Phone: fill the viewport like a till. Desktop: capped workspace.
            "h-[calc(100dvh-3.25rem)] max-lg:rounded-none max-lg:border-x-0",
            "lg:h-[min(82dvh,58rem)] lg:min-h-[32rem]",
          )}
        >
          {/* Passport-style identity + search strip */}
          <section
            className={cn(
              "relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2 sm:px-3",
              ordering && "max-lg:py-1.5",
            )}
          >
            <span aria-hidden className={mktPosAccentBar} />
            <div className="space-y-2 pl-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-[15px] font-semibold leading-tight text-[var(--pos-ink,#1c1915)]">
                    {activeSupplierName ??
                      (activeLocation ? activeLocation : "All suppliers")}
                  </h1>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {loading || detailLoading
                      ? "Loading…"
                      : tab === "products" && activeSupplierId && supplierDetail
                        ? `${supplierDetail.products.length} product${supplierDetail.products.length === 1 ? "" : "s"} · tap to order`
                        : tab === "products"
                          ? `${displayProductCount} product${displayProductCount === 1 ? "" : "s"}`
                          : `${resultCount} supplier${resultCount === 1 ? "" : "s"}`}
                    {activeTag ? ` · ${activeTag}` : ""}
                    {tab === "products" &&
                    !activeSupplierId &&
                    !supplierFilterIsClientOnly &&
                    !productLast &&
                    visibleProducts.length < productTotal
                      ? ` · showing ${visibleProducts.length}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {(locationChips.length > 0 || categoryTags.length > 0) && (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-8 items-center gap-1 border px-2 text-[10px] font-semibold uppercase tracking-[0.08em] lg:hidden",
                        filtersOpen
                          ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground",
                      )}
                      onClick={() => setFiltersOpen((v) => !v)}
                      aria-expanded={filtersOpen}
                    >
                      <SlidersHorizontal className="size-3" />
                      Filters
                      {activeLocation || activeTag ? (
                        <span className="font-mono tabular-nums">·</span>
                      ) : null}
                    </button>
                  )}
                  <div
                    role="tablist"
                    aria-label="Marketplace view"
                    className={cn(
                      "flex rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]",
                      ordering && "max-lg:hidden",
                    )}
                  >
                    {(
                      [
                        {
                          id: "products" as const,
                          label: "Products",
                          short: "Shelf",
                          icon: Package,
                        },
                        {
                          id: "suppliers" as const,
                          label: "Suppliers",
                          short: "Vendors",
                          icon: Truck,
                        },
                      ] as const
                    ).map((item) => {
                      const Icon = item.icon;
                      const active = tab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          className={cn(
                            "inline-flex h-8 items-center gap-1.5 rounded-none px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition sm:px-3",
                            active
                              ? "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                              : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] hover:text-[var(--pos-ink,#1c1915)]",
                          )}
                          onClick={() => {
                            setTab(item.id);
                            setActiveTag(null);
                            setActiveSupplierId(null);
                          }}
                        >
                          <Icon className="size-3" strokeWidth={2} />
                          <span className="sm:hidden">{item.short}</span>
                          <span className="hidden sm:inline">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "relative rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,#fff_82%,transparent)]",
                  ordering && "max-lg:hidden",
                )}
              >
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={mktPosSearch}
                  placeholder={
                    tab === "products"
                      ? "Find a product…"
                      : "Find a supplier…"
                  }
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoFocus
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-[var(--pos-ink,#1c1915)]"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>

              {!searchInput && tab === "products" && !ordering ? (
                <p className="text-[11px] text-muted-foreground max-lg:hidden">
                  <span className="font-medium text-[var(--pos-ink,#1c1915)]/70">
                    Popular
                  </span>
                  {": "}
                  {QUICK_PROMPTS.map((prompt, i) => (
                    <span key={prompt}>
                      {i > 0 ? " · " : null}
                      <button
                        type="button"
                        className="underline-offset-2 hover:text-[var(--pos-ink,#1c1915)] hover:underline"
                        onClick={() => {
                          setSearchInput(prompt);
                          setTab("products");
                        }}
                      >
                        {prompt}
                      </button>
                    </span>
                  ))}
                </p>
              ) : null}

              {locationChips.length || categoryTags.length ? (
                <div
                  className={cn(
                    "flex flex-col gap-1.5 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] pt-2",
                    !filtersOpen && "max-lg:hidden",
                  )}
                >
                  {locationChips.length ? (
                    <FilterRow label="1 · Area" icon={MapPin}>
                      <button
                        type="button"
                        className={cn(mktChip, !activeLocation && mktChipActive)}
                        onClick={() => {
                          setActiveLocation(null);
                          setActiveSupplierId(null);
                        }}
                      >
                        All
                      </button>
                      {locationChips.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          className={cn(
                            mktChip,
                            activeLocation === loc && mktChipActive,
                          )}
                          onClick={() => {
                            setActiveLocation((current) =>
                              current === loc ? null : loc,
                            );
                            setActiveSupplierId(null);
                          }}
                        >
                          {loc}
                        </button>
                      ))}
                    </FilterRow>
                  ) : null}
                  {categoryTags.length ? (
                    <FilterRow label="Category">
                      {activeTag ? (
                        <button
                          type="button"
                          className={cn(mktChip, mktChipActive)}
                          onClick={() => setActiveTag(null)}
                        >
                          {activeTag} ×
                        </button>
                      ) : null}
                      {categoryTags
                        .filter((tag) => tag !== activeTag)
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={mktChip}
                            onClick={() => setActiveTag(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                    </FilterRow>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          {/* Shelf workspace */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {loading ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <MarketplaceSkeleton tab={tab} />
              </div>
            ) : tab === "products" ? (
              <>
                {showSupplierRail ? (
                  <SupplierFilterColumn
                    suppliers={supplierColumn}
                    activeId={activeSupplierId}
                    areaLabel={activeLocation}
                    expanded={supplierPickerOpen}
                    onToggleExpanded={() =>
                      setSupplierPickerOpen((v) => !v)
                    }
                    onSelect={(id) => {
                      setActiveSupplierId(id);
                      if (id && typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
                        setSupplierPickerOpen(false);
                        setFiltersOpen(false);
                      }
                    }}
                  />
                ) : null}
                {activeSupplierId ? (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {detailLoading ? (
                      <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading shelf…
                      </div>
                    ) : supplierDetail ? (
                      <MarketplaceOrderWorkspace
                        key={supplierDetail.id}
                        detail={supplierDetail}
                        layout="shelf"
                        embedded
                      />
                    ) : (
                      <div className="flex flex-1 items-center justify-center p-3">
                        <EmptyState
                          title="Couldn’t load this supplier"
                          hint="Pick another supplier, or open their passport page."
                          onClear={() => setActiveSupplierId(null)}
                          showClear
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 py-2">
                      <h2 className="flex items-baseline gap-2 text-[13px] font-semibold leading-none text-[var(--pos-ink,#1c1915)]">
                        Shelf
                        <span className="font-mono text-[10px] font-medium tabular-nums tracking-normal text-muted-foreground">
                          {visibleProducts.length}
                        </span>
                      </h2>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-1.5 py-1.5 sm:px-2.5">
                      {visibleProducts.length === 0 ? (
                        <EmptyState
                          title={
                            hasQuery
                              ? "No products match"
                              : "No linked products yet"
                          }
                          hint={
                            hasQuery
                              ? "Try another name, location, or clear filters."
                              : "When businesses link products to active suppliers, those items appear here."
                          }
                          onClear={clearFilters}
                          showClear={hasQuery}
                        />
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                            {visibleProducts.map((row, index) => (
                              <ProductTile
                                key={`${row.supplierId}-${row.productId}`}
                                row={row}
                                index={index}
                              />
                            ))}
                          </div>
                          {!productLast ? (
                            <div className="flex justify-center py-2">
                              <button
                                type="button"
                                disabled={loadingMore}
                                className="inline-flex h-9 items-center gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] px-3 text-[12px] font-semibold hover:bg-card disabled:opacity-60"
                                onClick={() =>
                                  void loadProducts(productPage + 1, true)
                                }
                              >
                                {loadingMore ? (
                                  <>
                                    <Loader2 className="size-3.5 animate-spin" />
                                    Loading…
                                  </>
                                ) : (
                                  <>
                                    Load more
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      {visibleProducts.length}/{productTotal}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : visibleSuppliers.length === 0 ? (
              <div className="flex-1 p-3">
                <EmptyState
                  title={hasQuery ? "No suppliers match" : "No suppliers yet"}
                  hint={
                    hasQuery
                      ? "Try another name, location, or clear filters."
                      : "Active suppliers with linked products will show up here."
                  }
                  onClear={clearFilters}
                  showClear={hasQuery}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <div className="mb-2 flex items-center px-0.5">
                  <h2 className="flex items-baseline gap-2 text-[13px] font-semibold leading-none text-[var(--pos-ink,#1c1915)]">
                    Suppliers
                    <span className="font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
                      {visibleSuppliers.length}
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {visibleSuppliers.map((row, index) => (
                    <SupplierTile key={row.id} row={row} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SupplierFilterColumn({
  suppliers,
  activeId,
  areaLabel,
  expanded = true,
  onToggleExpanded,
  onSelect,
}: {
  suppliers: MarketplaceSupplierSearchRow[];
  activeId: string | null;
  areaLabel: string | null;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onSelect: (id: string | null) => void;
}) {
  const [supplierQuery, setSupplierQuery] = useState("");
  const filtered = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      const hay = [s.name, s.location, ...(s.locations ?? []), s.listedBy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [suppliers, supplierQuery]);

  const active = suppliers.find((s) => s.id === activeId) ?? null;

  return (
    <>
      {/* Mobile / tablet: collapsible filmstrip */}
      <div className="min-w-0 shrink-0 overflow-hidden border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] lg:hidden">
        {!expanded && active ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex w-full items-center gap-2 bg-[var(--pos-primary,#0f766e)] px-2.5 py-2 text-left text-[var(--pos-primary-ink,#fff)]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold uppercase tracking-[0.14em] opacity-80">
                Ordering from
              </span>
              <span className="block truncate text-[13px] font-semibold">
                {active.name}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 border border-white/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
              Change
              <ChevronDown className="size-3" />
            </span>
          </button>
        ) : (
          <>
            <button
              type="button"
              className={cn(mktPosHeader, "w-full cursor-pointer")}
              onClick={onToggleExpanded}
              aria-expanded={expanded}
            >
              <p>2 · Supplier{areaLabel ? ` · ${areaLabel}` : ""}</p>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono text-[10px] tabular-nums opacity-80">
                  {filtered.length}
                </span>
                {onToggleExpanded ? (
                  expanded ? (
                    <ChevronUp className="size-3.5 opacity-80" />
                  ) : (
                    <ChevronDown className="size-3.5 opacity-80" />
                  )
                ) : null}
              </span>
            </button>
            {expanded ? (
              <>
                <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-8 w-full rounded-none bg-transparent pl-7 pr-8 text-[12px] outline-none placeholder:text-muted-foreground/50"
                    placeholder="Search suppliers…"
                    value={supplierQuery}
                    onChange={(e) => setSupplierQuery(e.target.value)}
                  />
                  {supplierQuery ? (
                    <button
                      type="button"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                      onClick={() => setSupplierQuery("")}
                      aria-label="Clear supplier search"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </div>
                <div className="flex gap-1 overflow-x-auto p-1.5 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className={cn(
                      "flex h-14 w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center border px-1 text-center text-[10px] font-semibold leading-tight",
                      activeId == null
                        ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                        : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] text-muted-foreground",
                    )}
                  >
                    All
                  </button>
                  {filtered.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      title={s.name}
                      onClick={() => onSelect(activeId === s.id ? null : s.id)}
                      className={cn(
                        "flex h-14 w-[5.75rem] shrink-0 snap-start flex-col items-center justify-center gap-0.5 border px-1 text-center transition",
                        activeId === s.id
                          ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
                      )}
                    >
                      <span className="line-clamp-2 text-[10px] font-semibold leading-tight">
                        {s.name}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[9px] tabular-nums",
                          activeId === s.id
                            ? "opacity-80"
                            : "text-muted-foreground",
                        )}
                      >
                        {s.productCount}
                      </span>
                    </button>
                  ))}
                  {filtered.length === 0 ? (
                    <p className="px-2 py-3 text-[11px] text-muted-foreground">
                      No suppliers match “{supplierQuery}”.
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>

      {/* Desktop column */}
      <aside className="hidden h-full w-[12rem] shrink-0 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] lg:flex xl:w-[13.5rem]">
        <div className={mktPosHeader}>
          <p>2 · Supplier</p>
          <span className="font-mono text-[10px] tabular-nums opacity-80">
            {filtered.length}
          </span>
        </div>
        {areaLabel ? (
          <p className="shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 py-1 text-[10px] text-muted-foreground">
            in {areaLabel}
          </p>
        ) : null}
        <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-white/50">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-8 w-full rounded-none bg-transparent pl-7 pr-8 text-[12px] outline-none placeholder:text-muted-foreground/50"
            placeholder="Search suppliers…"
            value={supplierQuery}
            onChange={(e) => setSupplierQuery(e.target.value)}
          />
          {supplierQuery ? (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
              onClick={() => setSupplierQuery("")}
              aria-label="Clear supplier search"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
        <nav
          aria-label="Filter by supplier"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin]"
        >
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "flex w-full items-center gap-2 px-2 py-2 text-left text-[12px] font-semibold",
              activeId == null
                ? "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] hover:text-[var(--pos-ink,#1c1915)]",
            )}
          >
            All suppliers
          </button>
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(activeId === s.id ? null : s.id)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 border px-2 py-2 text-left transition",
                activeId === s.id
                  ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]"
                  : "border-transparent hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]",
              )}
            >
              <span className="text-[12px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
                {s.name}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {s.productCount} product{s.productCount === 1 ? "" : "s"}
              </span>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
              No suppliers match.
            </p>
          ) : null}
        </nav>
      </aside>
    </>
  );
}

function FilterRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof MapPin;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 sm:items-center">
      <span className="inline-flex w-[4.75rem] shrink-0 items-center gap-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:w-20 sm:pt-0">
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
        {children}
      </div>
    </div>
  );
}

function ProductImage({
  src,
  alt,
  hue,
  className,
  iconClassName = "size-5",
}: {
  src: string | null | undefined;
  alt: string;
  hue: number;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className={cn("relative overflow-hidden bg-muted/40", className)}
      style={
        showImage
          ? undefined
          : {
              background: `linear-gradient(145deg, hsl(${hue} 18% 88%), hsl(${(hue + 28) % 360} 14% 78%))`,
            }
      }
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          unoptimized
          className="object-contain p-0.5 transition-transform duration-300 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 30vw, (max-width: 1024px) 16vw, 120px"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-foreground/60">
          <Package className={iconClassName} />
        </span>
      )}
    </div>
  );
}

function ProductTile({
  row,
  index,
}: {
  row: MarketplaceProductSearchRow;
  index: number;
}) {
  const hue = hueFromId(row.productId);
  const href =
    row.supplierSlug && row.productSlug
      ? APP_ROUTES.marketplaceProduct(row.supplierSlug, row.productSlug)
      : row.supplierSlug
        ? APP_ROUTES.marketplaceSupplier(row.supplierSlug)
        : APP_ROUTES.marketplace;

  return (
    <Link
      href={href}
      className={mktPosTile}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <ProductImage
        src={row.imageUrl}
        alt={row.productName}
        hue={hue}
        className="aspect-square w-full shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]"
        iconClassName="size-5 opacity-55"
      />
      <div className="flex min-h-[3.25rem] w-full flex-1 flex-col justify-between gap-1 px-1 pb-1 pt-1">
        <p className="text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
          {row.productName}
        </p>
        <div className="space-y-0.5">
          <p className="font-mono text-[10px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
            {row.unitPrice != null
              ? formatMoney(row.unitPrice, row.currency ?? "KES")
              : "Ask"}
          </p>
          <p className="text-[9px] leading-tight text-muted-foreground">
            {row.supplierName}
            {row.location ? ` · ${row.location}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SupplierTile({
  row,
  index,
}: {
  row: MarketplaceSupplierSearchRow;
  index: number;
}) {
  const hue = hueFromId(row.id);
  const href = row.slug
    ? APP_ROUTES.marketplaceSupplier(row.slug)
    : APP_ROUTES.marketplace;

  return (
    <Link
      href={href}
      className={mktPosTile}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div
        className="relative flex aspect-[16/9] items-end px-2.5 pb-2"
        style={{
          background: `linear-gradient(145deg, hsl(${hue} 18% 88%), hsl(${(hue + 28) % 360} 14% 78%))`,
        }}
      >
        <span className="inline-flex size-9 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card/90 text-[11px] font-bold">
          {initials(row.name)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-2 pb-2 pt-1.5">
        <p className="text-[12px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
          {row.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {row.location || (row.locations?.[0] ?? "—")}
          {row.productCount
            ? ` · ${row.productCount} product${row.productCount === 1 ? "" : "s"}`
            : ""}
        </p>
        {row.listedBy ? (
          <p className="text-[9px] text-muted-foreground">
            Listed by {row.listedBy}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  hint,
  onClear,
  showClear = true,
}: {
  title: string;
  hint: string;
  onClear: () => void;
  showClear?: boolean;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,transparent)] px-6 py-10 text-center">
      <Store className="size-8 text-muted-foreground/40" />
      <p className="mt-3 text-[15px] font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
        {title}
      </p>
      <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">{hint}</p>
      {showClear ? (
        <button
          type="button"
          className="mt-4 inline-flex h-9 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card px-3 text-[12px] font-semibold hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]"
          onClick={onClear}
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function MarketplaceSkeleton({ tab }: { tab: SearchTab }) {
  return (
    <div
      className={cn(
        "grid gap-1",
        tab === "suppliers"
          ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
          : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6",
      )}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)]"
        >
          <div className="aspect-square animate-pulse bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)]" />
          <div className="space-y-1.5 p-1.5">
            <div className="h-3 w-full animate-pulse bg-muted/60" />
            <div className="h-2.5 w-1/2 animate-pulse bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

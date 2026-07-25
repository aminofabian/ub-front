"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Loader2,
  MapPin,
  Package,
  Search,
  Store,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  listMarketplaceLocations,
  searchMarketplaceProducts,
  searchMarketplaceSuppliers,
  type MarketplaceProductSearchRow,
  type MarketplaceSupplierSearchRow,
} from "@/lib/marketplace-api";
import { cn, formatMoney } from "@/lib/utils";

import { mktChip, mktChipActive } from "./_components/marketplace-ui";

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
    void loadProducts(0, false);
  }, [tab, loadProducts, loadSuppliers]);

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
  const activeSupplierSlug =
    supplierColumn.find((s) => s.id === activeSupplierId)?.slug ?? null;

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
      className="min-h-dvh bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_srgb,#0f766e_12%,#f7f4ef),#efeae2_42%,#e7e1d6)] text-[var(--pos-ink,#1c1915)]"
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
                className="inline-flex h-8 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
              >
                My suppliers
              </Link>
            ) : (
              <Link
                href={APP_ROUTES.login}
                className="inline-flex h-8 items-center bg-[var(--pos-primary,#0f766e)] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--pos-primary-ink,#fff)]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-3 pb-10 pt-3 sm:px-5">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <section className="relative overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)]">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
            />
            <div className="relative space-y-2.5 px-3 py-3 pl-4 sm:px-4 sm:pl-5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Catalogue
                  </p>
                  <h1 className="mt-0.5 text-[1.15rem] font-semibold leading-none tracking-tight text-[var(--pos-ink,#1c1915)] sm:text-[1.25rem]">
                    Source products. Order by WhatsApp.
                  </h1>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Area → supplier → products
                  </p>
                </div>
                <div className="flex shrink-0 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] p-0.5">
                  {(
                    [
                      { id: "products" as const, label: "Products", icon: Package },
                      { id: "suppliers" as const, label: "Suppliers", icon: Truck },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition",
                          active
                            ? "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                            : "text-muted-foreground hover:text-[var(--pos-ink,#1c1915)]",
                        )}
                        onClick={() => {
                          setTab(item.id);
                          setActiveTag(null);
                          setActiveSupplierId(null);
                        }}
                      >
                        <Icon className="size-3" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-white/80">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-9 w-full border-0 bg-transparent pl-8 pr-9 text-[13px] outline-none placeholder:text-muted-foreground/50"
                  placeholder={
                    tab === "products"
                      ? "Find products, barcodes, SKUs…"
                      : "Find suppliers…"
                  }
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoFocus
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>

              {!searchInput && tab === "products" ? (
                <p className="text-[11px] text-muted-foreground">
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

              {locationChips.length ? (
                <div className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] pt-2.5">
                  <FilterRow label="1 · Area" icon={MapPin}>
                    <button
                      type="button"
                      className={cn(mktChip, !activeLocation && mktChipActive)}
                      onClick={() => {
                        setActiveLocation(null);
                        setActiveSupplierId(null);
                      }}
                    >
                      All areas
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
              ) : categoryTags.length ? (
                <div className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] pt-2.5">
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
                </div>
              ) : null}
            </div>
          </section>

          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="text-sm font-medium">
              {loading ? (
                <span className="text-muted-foreground">Loading…</span>
              ) : (
                <>
                  <span className="font-heading text-lg font-semibold tabular-nums">
                    {tab === "products" ? displayProductCount : resultCount}
                  </span>
                  <span className="ml-1.5 text-muted-foreground">
                    {tab === "products"
                      ? `product${displayProductCount === 1 ? "" : "s"}`
                      : `supplier${resultCount === 1 ? "" : "s"}`}
                    {activeLocation ? ` · ${activeLocation}` : ""}
                    {activeSupplierName ? ` · ${activeSupplierName}` : ""}
                    {activeTag ? ` · ${activeTag}` : ""}
                    {tab === "products" &&
                    !supplierFilterIsClientOnly &&
                    !productLast &&
                    visibleProducts.length < productTotal
                      ? ` · showing ${visibleProducts.length}`
                      : ""}
                  </span>
                </>
              )}
            </p>
            {hasQuery && !loading ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </div>

          <section className="min-h-0">
            {loading ? (
              <MarketplaceSkeleton tab={tab} />
            ) : tab === "products" ? (
              visibleProducts.length === 0 && !showSupplierRail ? (
                <EmptyState
                  title={hasQuery ? "No products match" : "No linked products yet"}
                  hint={
                    hasQuery
                      ? "Try another name, location, or clear filters."
                      : "When businesses link products to active suppliers, those items appear here."
                  }
                  onClear={clearFilters}
                  showClear={hasQuery}
                />
              ) : (
                <div className="flex h-[min(78dvh,56rem)] min-h-[28rem] flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)] lg:flex-row">
                  {showSupplierRail ? (
                    <SupplierFilterColumn
                      suppliers={supplierColumn}
                      activeId={activeSupplierId}
                      areaLabel={activeLocation}
                      onSelect={setActiveSupplierId}
                    />
                  ) : null}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 py-2">
                      <h3 className="flex items-baseline gap-2 text-[13px] font-semibold leading-none text-[var(--pos-ink,#1c1915)]">
                        {activeSupplierName ?? "Shelf"}
                        <span className="font-mono text-[10px] font-medium tabular-nums tracking-normal text-muted-foreground">
                          {visibleProducts.length}
                        </span>
                      </h3>
                      {activeSupplierId && activeSupplierSlug ? (
                        <Link
                          href={APP_ROUTES.marketplaceSupplier(activeSupplierSlug)}
                          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--pos-primary,#0f766e)] hover:underline"
                        >
                          Open passport
                        </Link>
                      ) : null}
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-1.5 py-1.5 sm:px-2.5">
                      {visibleProducts.length === 0 ? (
                        <EmptyState
                          title={
                            activeSupplierId
                              ? "No products from this supplier"
                              : hasQuery
                                ? "No products match"
                                : "No linked products yet"
                          }
                          hint={
                            activeSupplierId
                              ? "Pick another supplier, or clear the supplier filter."
                              : hasQuery
                                ? "Try another name, location, or clear filters."
                                : "When businesses link products to active suppliers, those items appear here."
                          }
                          onClear={clearFilters}
                          showClear={hasQuery}
                        />
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
                                      {supplierFilterIsClientOnly
                                        ? visibleProducts.length
                                        : `${visibleProducts.length}/${productTotal}`}
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
                </div>
              )
            ) : visibleSuppliers.length === 0 ? (
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
            ) : (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visibleSuppliers.map((row, index) => (
                  <SupplierTile key={row.id} row={row} index={index} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SupplierFilterColumn({
  suppliers,
  activeId,
  areaLabel,
  onSelect,
}: {
  suppliers: MarketplaceSupplierSearchRow[];
  activeId: string | null;
  areaLabel: string | null;
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

  return (
    <>
      {/* Mobile */}
      <div className="min-w-0 shrink-0 overflow-hidden border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] lg:hidden">
        <div className="flex items-center justify-between bg-[var(--pos-primary,#0f766e)] px-2.5 py-1.5 text-[var(--pos-primary-ink,#fff)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
            2 · Supplier
            {areaLabel ? ` · ${areaLabel}` : ""}
          </p>
          <span className="font-mono text-[10px] tabular-nums opacity-80">
            {filtered.length}
          </span>
        </div>
        <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-8 w-full bg-transparent pl-7 pr-8 text-[12px] outline-none placeholder:text-muted-foreground/50"
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
        <div className="flex gap-1 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "flex h-14 w-[4.5rem] shrink-0 flex-col items-center justify-center border px-1 text-center text-[10px] font-semibold leading-tight",
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
                "flex h-14 w-[5.5rem] shrink-0 flex-col items-center justify-center gap-0.5 border px-1 text-center",
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
                  activeId === s.id ? "opacity-80" : "text-muted-foreground",
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
      </div>

      {/* Desktop column — same language as passport parent rail */}
      <aside className="hidden h-full w-[12rem] shrink-0 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] lg:flex xl:w-[13.5rem]">
        <div className="flex h-8 shrink-0 items-center justify-between bg-[var(--pos-primary,#0f766e)] px-2.5 text-[var(--pos-primary-ink,#fff)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
            2 · Supplier
          </p>
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
            className="h-8 w-full bg-transparent pl-7 pr-8 text-[12px] outline-none placeholder:text-muted-foreground/50"
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
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{children}</div>
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
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] text-left",
        "transition-[border-color,background-color,box-shadow] duration-150",
        "hover:z-[1] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] hover:bg-card",
        "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
      )}
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
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] text-left",
        "transition-[border-color,background-color,box-shadow] duration-150",
        "hover:z-[1] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] hover:bg-card",
        "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
      )}
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

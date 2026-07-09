"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  LogIn,
  MapPin,
  Package,
  Search,
  Store,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { KioskLogo } from "@/components/brand/kiosk-logo";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  connectMarketplaceSupplier,
  fetchMarketplaceSupplierDetail,
  searchMarketplaceProducts,
  searchMarketplaceSuppliers,
  type MarketplaceProductSearchRow,
  type MarketplaceSupplierDetail,
  type MarketplaceSupplierSearchRow,
} from "@/lib/marketplace-api";
import { fetchMe } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn, formatMoney } from "@/lib/utils";

import {
  mktChip,
  mktChipActive,
  mktHero,
  mktHeroPattern,
  mktPage,
  mktPanel,
  mktSearch,
  mktTile,
  mktTileMedia,
} from "./_components/marketplace-ui";

const SEARCH_DEBOUNCE_MS = 320;

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

type SearchTab = "products" | "suppliers";

function PublicMarketplacePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<SearchTab>("products");
  const [searchInput, setSearchInput] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<MarketplaceSupplierSearchRow[]>([]);
  const [products, setProducts] = useState<MarketplaceProductSearchRow[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MarketplaceSupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [canConnect, setCanConnect] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tokens = getSessionTokens();
    if (!tokens?.accessToken) {
      setSignedIn(false);
      setCanConnect(false);
      setSessionReady(true);
      return;
    }
    setSignedIn(true);
    void fetchMe()
      .then((me) => {
        if (cancelled) return;
        setCanConnect(
          hasPermission(me.permissions, Permission.MarketplaceSuppliersConnect),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSignedIn(false);
          setCanConnect(false);
        }
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "suppliers") {
        const page = await searchMarketplaceSuppliers({
          q: debouncedSearch,
          size: 60,
        });
        setSuppliers(page.content);
      } else {
        const page = await searchMarketplaceProducts({
          q: debouncedSearch,
          size: 60,
        });
        setProducts(page.content);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const loadDetail = useCallback(async (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setDetailLoading(true);
    try {
      const row = await fetchMarketplaceSupplierDetail(supplierId);
      setDetail(row);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load supplier",
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const supplierId = searchParams.get("supplier")?.trim();
    if (supplierId) {
      void loadDetail(supplierId);
    }
  }, [searchParams, loadDetail]);

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
    if (!activeTag) return products;
    const needle = activeTag.toLowerCase();
    return products.filter(
      (row) => row.categoryName?.trim().toLowerCase() === needle,
    );
  }, [products, activeTag]);

  const visibleSuppliers = useMemo(() => {
    if (!activeTag) return suppliers;
    const needle = activeTag.toLowerCase();
    return suppliers.filter((row) =>
      (row.categoryTags ?? []).some((tag) => tag.toLowerCase() === needle),
    );
  }, [suppliers, activeTag]);

  const onConnect = async () => {
    if (!selectedSupplierId) return;
    if (!signedIn) {
      router.push(
        `${APP_ROUTES.login}?next=${encodeURIComponent(
          `${APP_ROUTES.marketplace}?supplier=${selectedSupplierId}`,
        )}`,
      );
      return;
    }
    if (!canConnect) {
      toast.error("Your role cannot connect marketplace suppliers.");
      return;
    }
    setConnecting(true);
    try {
      const result = await connectMarketplaceSupplier(selectedSupplierId);
      toast.success(
        `Connected ${result.supplierName}. Imported ${result.importedProductLinks} product links.`,
      );
      router.push(
        `${APP_ROUTES.suppliers}?selected=${encodeURIComponent(result.localSupplierId)}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connect failed");
    } finally {
      setConnecting(false);
    }
  };

  const closeDetail = () => {
    setSelectedSupplierId(null);
    setDetail(null);
  };

  const resultCount =
    tab === "suppliers" ? visibleSuppliers.length : visibleProducts.length;
  const hasQuery = Boolean(debouncedSearch.trim() || activeTag);

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_55%),linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_35%,var(--background)))]">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <KioskLogo size="sm" href="/" />
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              Marketplace
            </span>
          </div>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href={APP_ROUTES.suppliers}>My suppliers</Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="rounded-xl">
                <Link href={APP_ROUTES.login}>
                  <LogIn className="mr-1.5 size-3.5" />
                  Sign in to connect
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className={cn(mktPage, "px-4 py-5 sm:px-6 sm:py-7")}>
        <div className="flex min-h-0 flex-1 flex-col gap-5 pb-8">
          <section className={mktHero}>
            <div className={mktHeroPattern} aria-hidden />
            <div className="relative space-y-5 px-5 py-6 sm:px-8 sm:py-8">
              <div className="max-w-2xl space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Public marketplace
                </p>
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Products from suppliers across the platform
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Browse every product listed by marketplace suppliers. Sign in
                  with your business to connect a vendor and import catalogue
                  links.
                </p>
              </div>

              <div className="relative max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={mktSearch}
                  placeholder={
                    tab === "products"
                      ? "Search products, barcodes, SKUs…"
                      : "Search suppliers, categories, regions…"
                  }
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoFocus
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl border border-border/60 bg-background/70 p-1 backdrop-blur-sm">
                  {(
                    [
                      {
                        id: "products" as const,
                        label: "Products",
                        icon: Package,
                      },
                      {
                        id: "suppliers" as const,
                        label: "Suppliers",
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
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => {
                          setTab(item.id);
                          setActiveTag(null);
                        }}
                      >
                        <Icon className="size-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {!searchInput && tab === "products"
                  ? QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className={mktChip}
                        onClick={() => {
                          setSearchInput(prompt);
                          setTab("products");
                        }}
                      >
                        {prompt}
                      </button>
                    ))
                  : null}

                {categoryTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={cn(mktChip, activeTag === tag && mktChipActive)}
                    onClick={() =>
                      setActiveTag((current) =>
                        current === tag ? null : tag,
                      )
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
            <div>
              <p className="font-heading text-xl font-semibold tracking-tight">
                {loading
                  ? "Loading catalogue…"
                  : tab === "products"
                    ? hasQuery
                      ? `${resultCount} product${resultCount === 1 ? "" : "s"}`
                      : "All marketplace products"
                    : hasQuery
                      ? `${resultCount} supplier${resultCount === 1 ? "" : "s"}`
                      : "All marketplace suppliers"}
              </p>
              <p className="text-xs text-muted-foreground">
                {tab === "products"
                  ? "Every active product linked to a marketplace supplier."
                  : "Select a vendor to preview their full catalogue."}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "grid min-h-0 flex-1 gap-4",
              selectedSupplierId
                ? "xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]"
                : "grid-cols-1",
            )}
          >
            <section className="min-h-0">
              {loading ? (
                <MarketplaceSkeleton tab={tab} />
              ) : tab === "products" ? (
                visibleProducts.length === 0 ? (
                  <EmptyState
                    title="No products found"
                    hint="Try another name or barcode, or clear filters."
                    onClear={() => {
                      setSearchInput("");
                      setActiveTag(null);
                    }}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {visibleProducts.map((row, index) => (
                      <ProductTile
                        key={`${row.supplierId}-${row.productId}`}
                        row={row}
                        index={index}
                        onSelect={() => void loadDetail(row.supplierId)}
                      />
                    ))}
                  </div>
                )
              ) : visibleSuppliers.length === 0 ? (
                <EmptyState
                  title="No suppliers match"
                  hint="Try another name, category, or clear filters."
                  onClear={() => {
                    setSearchInput("");
                    setActiveTag(null);
                  }}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {visibleSuppliers.map((row, index) => (
                    <SupplierTile
                      key={row.id}
                      row={row}
                      selected={selectedSupplierId === row.id}
                      index={index}
                      onSelect={() => void loadDetail(row.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {selectedSupplierId ? (
              <aside
                className={cn(
                  mktPanel,
                  "animate-in fade-in slide-in-from-right-2 duration-300",
                  "fixed inset-x-3 bottom-3 top-[4.5rem] z-40 xl:static xl:inset-auto xl:z-auto",
                )}
              >
                <SupplierStorefront
                  detail={detail}
                  loading={detailLoading}
                  connecting={connecting}
                  sessionReady={sessionReady}
                  signedIn={signedIn}
                  canConnect={canConnect}
                  onClose={closeDetail}
                  onConnect={() => void onConnect()}
                />
              </aside>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

function SupplierTile({
  row,
  selected,
  index,
  onSelect,
}: {
  row: MarketplaceSupplierSearchRow;
  selected: boolean;
  index: number;
  onSelect: () => void;
}) {
  const hue = hueFromId(row.id);
  return (
    <button
      type="button"
      data-selected={selected}
      className={mktTile}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={onSelect}
    >
      <div
        className={mktTileMedia}
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 42% 42% / 0.85), hsl(${(hue + 40) % 360} 35% 28% / 0.9))`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,white/20,transparent_45%)]" />
        <span className="relative flex size-12 items-center justify-center rounded-xl bg-white/15 text-sm font-semibold tracking-wide text-white backdrop-blur-sm">
          {initials(row.name)}
        </span>
        {row.deliveryRegions?.[0] ? (
          <span className="relative ml-auto inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <MapPin className="size-3" />
            {row.deliveryRegions[0]}
            {(row.deliveryRegions.length ?? 0) > 1
              ? ` +${row.deliveryRegions.length - 1}`
              : ""}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <p className="font-heading text-lg font-semibold leading-tight tracking-tight">
            {row.name}
          </p>
          {row.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {row.description}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Marketplace supplier
            </p>
          )}
        </div>
        {row.categoryTags?.length ? (
          <div className="mt-auto flex flex-wrap gap-1">
            {row.categoryTags.slice(0, 3).map((tag) => (
              <span key={tag} className={mktChip}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function ProductTile({
  row,
  index,
  onSelect,
}: {
  row: MarketplaceProductSearchRow;
  index: number;
  onSelect: () => void;
}) {
  const hue = hueFromId(row.productId);
  return (
    <button
      type="button"
      className={mktTile}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={onSelect}
    >
      <div
        className={cn(mktTileMedia, "h-24")}
        style={{
          background: `linear-gradient(145deg, hsl(${hue} 38% 88%), hsl(${(hue + 28) % 360} 30% 78%))`,
        }}
      >
        <span className="relative flex size-10 items-center justify-center rounded-xl bg-background/70 text-foreground shadow-sm">
          <Package className="size-4" />
        </span>
        {row.available === false ? (
          <span className="relative ml-auto rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Unavailable
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <p className="line-clamp-2 font-medium leading-snug">
            {row.productName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{row.supplierName}</p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0 text-[11px] text-muted-foreground">
            {row.barcode ? (
              <p className="truncate font-mono">{row.barcode}</p>
            ) : null}
            {row.packSize != null && row.packUnit ? (
              <p>
                {row.packSize} {row.packUnit}
              </p>
            ) : null}
          </div>
          {row.unitPrice != null ? (
            <p className="shrink-0 font-heading text-lg font-semibold tracking-tight">
              {formatMoney(row.unitPrice, row.currency ?? "KES")}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function SupplierStorefront({
  detail,
  loading,
  connecting,
  sessionReady,
  signedIn,
  canConnect,
  onClose,
  onConnect,
}: {
  detail: MarketplaceSupplierDetail | null;
  loading: boolean;
  connecting: boolean;
  sessionReady: boolean;
  signedIn: boolean;
  canConnect: boolean;
  onClose: () => void;
  onConnect: () => void;
}) {
  if (loading || !detail) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground xl:hidden"
            onClick={onClose}
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Opening storefront…
        </div>
      </div>
    );
  }

  const hue = hueFromId(detail.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="relative shrink-0 px-5 pb-5 pt-4 text-white"
        style={{
          background: `linear-gradient(145deg, hsl(${hue} 42% 38%), hsl(${(hue + 35) % 360} 36% 24%))`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,white/18,transparent_45%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-medium backdrop-blur-sm xl:hidden"
            onClick={onClose}
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
          <button
            type="button"
            className="ml-auto rounded-lg bg-white/10 p-1.5 backdrop-blur-sm hover:bg-white/20"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="relative mt-4 flex items-end gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold tracking-wide backdrop-blur-sm">
            {initials(detail.name)}
          </span>
          <div className="min-w-0 flex-1 pb-0.5">
            <h2 className="font-heading text-2xl font-semibold leading-tight tracking-tight">
              {detail.name}
            </h2>
            {detail.deliveryRegions?.length ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/80">
                <MapPin className="size-3.5" />
                Delivers to {detail.deliveryRegions.slice(0, 3).join(", ")}
                {detail.deliveryRegions.length > 3
                  ? ` +${detail.deliveryRegions.length - 3}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {detail.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {detail.description}
          </p>
        ) : null}

        {detail.categoryTags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {detail.categoryTags.map((tag) => (
              <span key={tag} className={mktChip}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="font-heading text-lg font-semibold tracking-tight">
              Catalogue
            </h3>
            <span className="text-xs text-muted-foreground">
              {detail.products.length} item
              {detail.products.length === 1 ? "" : "s"}
            </span>
          </div>
          {detail.products.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              No active products listed yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {detail.products.slice(0, 40).map((product) => (
                <li
                  key={product.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/45 bg-muted/20 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {[product.barcode, product.sku, product.categoryName]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {product.packSize != null && product.packUnit
                        ? ` · ${product.packSize} ${product.packUnit}`
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {product.unitPrice != null ? (
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(
                          product.unitPrice,
                          product.currency ?? "KES",
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Ask</p>
                    )}
                    {product.available ? (
                      <p className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-primary">
                        <Check className="size-3" />
                        Available
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Unavailable
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-border/50 bg-card/95 p-4 backdrop-blur">
        {!sessionReady ? (
          <Button className="h-11 w-full rounded-xl" disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Checking session…
          </Button>
        ) : !signedIn ? (
          <Button
            className="h-11 w-full rounded-xl text-sm font-semibold"
            onClick={onConnect}
          >
            <LogIn className="mr-2 size-4" />
            Sign in to add this supplier
          </Button>
        ) : canConnect ? (
          <Button
            className="h-11 w-full rounded-xl text-sm font-semibold"
            disabled={connecting}
            onClick={onConnect}
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Store className="mr-2 size-4" />
                Add to my suppliers
              </>
            )}
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            You can browse, but your role cannot connect marketplace suppliers.
          </p>
        )}
        <p className="text-center text-[11px] text-muted-foreground">
          Connecting imports catalogue links and enables portal purchase orders.
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  hint,
  onClear,
}: {
  title: string;
  hint: string;
  onClear: () => void;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-12 text-center">
      <Store className="size-10 text-muted-foreground/40" />
      <p className="mt-4 font-heading text-xl font-semibold tracking-tight">
        {title}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
      <Button
        type="button"
        variant="outline"
        className="mt-4 rounded-xl"
        onClick={onClear}
      >
        Clear search
      </Button>
    </div>
  );
}

function MarketplaceSkeleton({ tab }: { tab: SearchTab }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/40 bg-card"
        >
          <div
            className={cn(
              "animate-pulse bg-muted/60",
              tab === "suppliers" ? "h-28" : "h-24",
            )}
          />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted/70" />
            <div className="h-3 w-full animate-pulse rounded bg-muted/50" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

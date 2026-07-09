"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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

import { Button } from "@/components/ui/button";
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

import {
  mktChip,
  mktChipActive,
  mktHero,
  mktHeroPattern,
  mktPage,
  mktSearch,
  mktTile,
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
  const [locations, setLocations] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<MarketplaceSupplierSearchRow[]>([]);
  const [products, setProducts] = useState<MarketplaceProductSearchRow[]>([]);
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

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "suppliers") {
        const page = await searchMarketplaceSuppliers({
          q: debouncedSearch,
          location: activeLocation ?? undefined,
          size: 60,
        });
        setSuppliers(page.content);
      } else {
        const page = await searchMarketplaceProducts({
          q: debouncedSearch,
          location: activeLocation ?? undefined,
          size: 60,
        });
        setProducts(page.content);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch, activeLocation]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

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
    const filtered = !activeTag
      ? products
      : products.filter(
          (row) =>
            row.categoryName?.trim().toLowerCase() === activeTag.toLowerCase(),
        );
    return [...filtered].sort((a, b) => {
      const ai = a.imageUrl ? 0 : 1;
      const bi = b.imageUrl ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return (a.productName || "").localeCompare(b.productName || "");
    });
  }, [products, activeTag]);

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
        ? products.flatMap((p) => p.locations ?? (p.location ? [p.location] : []))
        : suppliers.flatMap(
            (s) => s.locations ?? (s.location ? [s.location] : []),
          );
    const merged = new Set<string>();
    for (const loc of [...locations, ...fromResults]) {
      const key = loc?.trim();
      if (key) merged.add(key);
    }
    return [...merged].sort((a, b) => a.localeCompare(b)).slice(0, 16);
  }, [locations, products, suppliers, tab]);

  const resultCount =
    tab === "suppliers" ? visibleSuppliers.length : visibleProducts.length;
  const hasQuery = Boolean(
    debouncedSearch.trim() || activeTag || activeLocation,
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_40%,var(--background)))]">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <KioskLogo size="sm" href="/" />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline">
              Marketplace
            </span>
          </div>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild variant="outline" size="sm" className="rounded-none">
                <Link href={APP_ROUTES.suppliers}>My suppliers</Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="rounded-none">
                <Link href={APP_ROUTES.login}>Sign in</Link>
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
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  Public marketplace
                </p>
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Source products. Order by WhatsApp.
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Open a product page to see its slug and only that supplier’s
                  linked catalogue — then build a quantity list and send a PDF
                  over WhatsApp.
                </p>
              </div>

              <div className="relative max-w-2xl">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={mktSearch}
                  placeholder={
                    tab === "products"
                      ? "Search products, barcodes, SKUs…"
                      : "Search suppliers…"
                  }
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoFocus
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex border border-border/60 bg-background p-0.5">
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
                          "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition",
                          active
                            ? "bg-foreground text-background"
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
              </div>

              {locationChips.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <MapPin className="size-3" />
                    Location
                  </span>
                  <button
                    type="button"
                    className={cn(mktChip, !activeLocation && mktChipActive)}
                    onClick={() => setActiveLocation(null)}
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
                      onClick={() =>
                        setActiveLocation((current) =>
                          current === loc ? null : loc,
                        )
                      }
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              ) : null}

              {categoryTags.length ? (
                <div className="flex flex-wrap items-center gap-2">
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
              ) : null}
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
                      : "Supplier-linked products"
                    : hasQuery
                      ? `${resultCount} supplier${resultCount === 1 ? "" : "s"}`
                      : "Suppliers with linked products"}
              </p>
              <p className="text-xs text-muted-foreground">
                {tab === "products"
                  ? "Click a product to open its public page and that supplier’s catalogue."
                  : "Click a supplier to open their public marketplace page."}
              </p>
            </div>
          </div>

          <section className="min-h-0">
            {loading ? (
              <MarketplaceSkeleton tab={tab} />
            ) : tab === "products" ? (
              visibleProducts.length === 0 ? (
                <EmptyState
                  title={hasQuery ? "No products match" : "No linked products yet"}
                  hint={
                    hasQuery
                      ? "Try another name, location, or clear filters."
                      : "When businesses link products to active suppliers, those items appear here."
                  }
                  onClear={() => {
                    setSearchInput("");
                    setActiveTag(null);
                    setActiveLocation(null);
                  }}
                  showClear={hasQuery}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {visibleProducts.map((row, index) => (
                    <ProductTile key={`${row.supplierId}-${row.productId}`} row={row} index={index} />
                  ))}
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
                onClear={() => {
                  setSearchInput("");
                  setActiveTag(null);
                  setActiveLocation(null);
                }}
                showClear={hasQuery}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
          className="object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 50vw, 240px"
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
      className={mktTile}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <ProductImage
        src={row.imageUrl}
        alt={row.productName}
        hue={hue}
        className="h-40 border-b border-border/50"
        iconClassName="size-7 opacity-55"
      />
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          {row.categoryName ? (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {row.categoryName}
            </p>
          ) : null}
          <p className="line-clamp-2 font-medium leading-snug">
            {row.productName}
          </p>
          {row.productSlug ? (
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {row.productSlug}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {row.supplierName}
            {row.supplierProductCount
              ? ` · ${row.supplierProductCount} products`
              : ""}
          </p>
          {row.location ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{row.location}</span>
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0 text-[11px] text-muted-foreground">
            {row.barcode ? (
              <p className="truncate font-mono">{row.barcode}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            {row.unitPrice != null ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Buying
                </p>
                <p className="font-heading text-lg font-semibold tracking-tight tabular-nums">
                  {formatMoney(row.unitPrice, row.currency ?? "KES")}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Ask price</p>
            )}
          </div>
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
      className={mktTile}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div
        className="relative flex h-24 items-end px-4 pb-3"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 18% 28%), hsl(${(hue + 40) % 360} 14% 18%))`,
        }}
      >
        <span className="relative flex size-11 items-center justify-center border border-white/25 bg-white/10 text-sm font-semibold tracking-wide text-white">
          {initials(row.name)}
        </span>
        <span className="relative ml-auto border border-white/20 bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white">
          {row.productCount} products
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <p className="font-heading text-lg font-semibold leading-tight tracking-tight">
            {row.name}
          </p>
          {row.slug ? (
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              /marketplace/s/{row.slug}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {[row.supplierType, row.listedBy ? `via ${row.listedBy}` : null]
              .filter(Boolean)
              .join(" · ") || "Supplier"}
          </p>
          {row.location ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {row.location}
            </p>
          ) : null}
        </div>
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
    <div className="flex min-h-[280px] flex-col items-center justify-center border border-dashed border-border/70 bg-muted/15 px-6 py-12 text-center">
      <Store className="size-10 text-muted-foreground/40" />
      <p className="mt-4 font-heading text-xl font-semibold tracking-tight">
        {title}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
      {showClear ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-none"
          onClick={onClear}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function MarketplaceSkeleton({ tab }: { tab: SearchTab }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden border border-border/40 bg-card">
          <div
            className={cn(
              "animate-pulse bg-muted/60",
              tab === "suppliers" ? "h-24" : "h-40",
            )}
          />
          <div className="space-y-2 p-3.5">
            <div className="h-4 w-3/4 animate-pulse bg-muted/70" />
            <div className="h-3 w-full animate-pulse bg-muted/50" />
            <div className="h-3 w-1/2 animate-pulse bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

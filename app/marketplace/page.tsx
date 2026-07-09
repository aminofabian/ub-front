"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
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
  fetchMarketplaceSupplierDetail,
  listMarketplaceLocations,
  searchMarketplaceProducts,
  searchMarketplaceSuppliers,
  type MarketplaceCatalogProductPreview,
  type MarketplaceProductSearchRow,
  type MarketplaceSupplierDetail,
  type MarketplaceSupplierSearchRow,
} from "@/lib/marketplace-api";
import { cn, formatMoney } from "@/lib/utils";

import {
  mktBtn,
  mktBtnGhost,
  mktChip,
  mktChipActive,
  mktHero,
  mktHeroPattern,
  mktPage,
  mktPanel,
  mktSearch,
  mktTile,
} from "./_components/marketplace-ui";
import {
  buildMarketplaceOrderPdf,
  buildWhatsAppOrderUrl,
  shareOrDownloadOrderPdf,
} from "./_lib/marketplace-order-pdf";

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
type CartQty = Record<string, number>;

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
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<SearchTab>("products");
  const [searchInput, setSearchInput] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<MarketplaceSupplierSearchRow[]>([]);
  const [products, setProducts] = useState<MarketplaceProductSearchRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [detail, setDetail] = useState<MarketplaceSupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cart, setCart] = useState<CartQty>({});
  const [sendingOrder, setSendingOrder] = useState(false);
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

  const openSupplier = useCallback(
    async (supplierId: string, productId?: string | null) => {
      setSelectedSupplierId(supplierId);
      setSelectedProductId(productId ?? null);
      setDetailLoading(true);
      try {
        const row = await fetchMarketplaceSupplierDetail(supplierId);
        setDetail(row);
        if (productId) {
          setCart((prev) =>
            prev[productId] ? prev : { ...prev, [productId]: 1 },
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load supplier",
        );
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const supplierId = searchParams.get("supplier")?.trim();
    const productId = searchParams.get("product")?.trim();
    if (supplierId) {
      void openSupplier(supplierId, productId);
    }
  }, [searchParams, openSupplier]);

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

  const closeDetail = () => {
    setSelectedSupplierId(null);
    setSelectedProductId(null);
    setDetail(null);
    setCart({});
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[productId];
      } else {
        next[productId] = qty;
      }
      return next;
    });
  };

  const cartLines = useMemo(() => {
    if (!detail) return [];
    return detail.products
      .filter((p) => (cart[p.id] ?? 0) > 0)
      .map((p) => ({
        product: p,
        qty: cart[p.id] ?? 0,
      }));
  }, [cart, detail]);

  const cartTotal = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      if (line.product.unitPrice == null) return sum;
      return sum + line.product.unitPrice * line.qty;
    }, 0);
  }, [cartLines]);

  const cartCurrency =
    cartLines.find((l) => l.product.currency)?.product.currency ?? "KES";

  const sendOrder = async () => {
    if (!detail || cartLines.length === 0) {
      toast.error("Add at least one product to the order.");
      return;
    }
    setSendingOrder(true);
    try {
      const lines = cartLines.map(({ product, qty }) => ({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        qty,
        unitPrice: product.unitPrice,
        currency: product.currency,
      }));
      const filename = `order-${detail.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.pdf`;
      const blob = buildMarketplaceOrderPdf({
        supplierName: detail.name,
        supplierPhone: detail.contactPhone,
        location: detail.location,
        listedBy: detail.listedBy,
        lines,
      });
      const wa = buildWhatsAppOrderUrl({
        phone: detail.contactPhone,
        supplierName: detail.name,
        lines,
        filename,
      });
      if (!wa && !detail.contactPhone) {
        toast.message("No WhatsApp number on this supplier — downloading PDF.");
      }
      const mode = await shareOrDownloadOrderPdf(blob, filename, wa);
      toast.success(
        mode === "shared"
          ? "Order shared — pick WhatsApp to send the PDF."
          : wa
            ? "PDF downloaded and WhatsApp opened with your order text."
            : "PDF downloaded. Attach it in WhatsApp to the supplier.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build order");
    } finally {
      setSendingOrder(false);
    }
  };

  const resultCount =
    tab === "suppliers" ? visibleSuppliers.length : visibleProducts.length;
  const hasQuery = Boolean(
    debouncedSearch.trim() || activeTag || activeLocation,
  );
  const panelOpen = Boolean(selectedSupplierId);

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
                  Open a product, review everything that supplier stocks, build
                  a quantity list, then send a PDF order over WhatsApp.
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
                  ? "Click a product to open the supplier catalogue and build an order."
                  : "Click a supplier to browse linked products and order."}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "grid min-h-0 flex-1 gap-4",
              panelOpen
                ? "xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]"
                : "grid-cols-1",
            )}
          >
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
                      <ProductTile
                        key={`${row.supplierId}-${row.productId}`}
                        row={row}
                        index={index}
                        selected={selectedProductId === row.productId}
                        onSelect={() =>
                          void openSupplier(row.supplierId, row.productId)
                        }
                      />
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
                    <SupplierTile
                      key={row.id}
                      row={row}
                      selected={selectedSupplierId === row.id}
                      index={index}
                      onSelect={() => void openSupplier(row.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {panelOpen ? (
              <aside
                className={cn(
                  mktPanel,
                  "fixed inset-x-0 bottom-0 top-14 z-40 xl:static xl:inset-auto xl:z-auto",
                )}
              >
                <ProductOrderPanel
                  detail={detail}
                  loading={detailLoading}
                  selectedProductId={selectedProductId}
                  cart={cart}
                  cartLines={cartLines}
                  cartTotal={cartTotal}
                  cartCurrency={cartCurrency}
                  sendingOrder={sendingOrder}
                  onClose={closeDetail}
                  onSelectProduct={(id) => {
                    setSelectedProductId(id);
                    setCart((prev) =>
                      prev[id] ? prev : { ...prev, [id]: 1 },
                    );
                  }}
                  onSetQty={setQty}
                  onSendOrder={() => void sendOrder()}
                />
              </aside>
            ) : null}
          </div>
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
  selected,
  onSelect,
}: {
  row: MarketplaceProductSearchRow;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const hue = hueFromId(row.productId);
  return (
    <button
      type="button"
      data-selected={selected}
      className={mktTile}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      onClick={onSelect}
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
    </button>
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
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      onClick={onSelect}
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
    </button>
  );
}

function ProductOrderPanel({
  detail,
  loading,
  selectedProductId,
  cart,
  cartLines,
  cartTotal,
  cartCurrency,
  sendingOrder,
  onClose,
  onSelectProduct,
  onSetQty,
  onSendOrder,
}: {
  detail: MarketplaceSupplierDetail | null;
  loading: boolean;
  selectedProductId: string | null;
  cart: CartQty;
  cartLines: { product: MarketplaceCatalogProductPreview; qty: number }[];
  cartTotal: number;
  cartCurrency: string;
  sendingOrder: boolean;
  onClose: () => void;
  onSelectProduct: (id: string) => void;
  onSetQty: (id: string, qty: number) => void;
  onSendOrder: () => void;
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
            className="ml-auto p-1.5 text-muted-foreground hover:bg-muted"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Opening product…
        </div>
      </div>
    );
  }

  const selected =
    detail.products.find((p) => p.id === selectedProductId) ??
    detail.products[0] ??
    null;
  const selectedQty = selected ? (cart[selected.id] ?? 0) : 0;
  const otherProducts = detail.products.filter((p) => p.id !== selected?.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground xl:hidden"
          onClick={onClose}
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="min-w-0 flex-1 px-2">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {detail.name}
            {detail.products.length
              ? ` · ${detail.products.length} products`
              : ""}
          </p>
        </div>
        <button
          type="button"
          className="p-1.5 text-muted-foreground hover:bg-muted"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {selected ? (
          <section className="space-y-3 border border-border/55 bg-muted/10 p-3">
            <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
              <ProductImage
                src={selected.imageUrl}
                alt={selected.name}
                hue={hueFromId(selected.id)}
                className="aspect-square border border-border/50"
                iconClassName="size-6 opacity-50"
              />
              <div className="min-w-0">
                {selected.categoryName ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {selected.categoryName}
                  </p>
                ) : null}
                <h2 className="font-heading text-xl font-semibold leading-tight tracking-tight">
                  {selected.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[selected.barcode, selected.sku].filter(Boolean).join(" · ") ||
                    "—"}
                </p>
                {detail.location ? (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {detail.location}
                  </p>
                ) : null}
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    {selected.unitPrice != null ? (
                      <>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Buying price
                        </p>
                        <p className="font-heading text-2xl font-semibold tabular-nums">
                          {formatMoney(
                            selected.unitPrice,
                            selected.currency ?? "KES",
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Ask price</p>
                    )}
                  </div>
                  <QtyControl
                    qty={selectedQty}
                    onChange={(qty) => onSetQty(selected.id, qty)}
                  />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <p className="border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
            No linked products for this supplier.
          </p>
        )}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-heading text-base font-semibold tracking-tight">
              More from {detail.name}
            </h3>
            <span className="text-xs text-muted-foreground">
              {detail.products.length} linked
            </span>
          </div>
          {otherProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              This is the only linked product for this supplier.
            </p>
          ) : (
            <ul className="space-y-2">
              {otherProducts.map((product) => (
                <li key={product.id}>
                  <CatalogueOrderRow
                    product={product}
                    qty={cart[product.id] ?? 0}
                    active={selectedProductId === product.id}
                    onSelect={() => onSelectProduct(product.id)}
                    onSetQty={(qty) => onSetQty(product.id, qty)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="shrink-0 space-y-3 border-t border-border/50 bg-card p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <ShoppingCart className="size-3.5" />
            {cartLines.length} line{cartLines.length === 1 ? "" : "s"}
          </span>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {formatMoney(cartTotal, cartCurrency)}
          </span>
        </div>
        <button
          type="button"
          className={cn(mktBtn, "w-full")}
          disabled={sendingOrder || cartLines.length === 0}
          onClick={onSendOrder}
        >
          {sendingOrder ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Preparing…
            </>
          ) : (
            <>
              <FileDown className="size-4" />
              PDF + WhatsApp order
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-muted-foreground">
          Downloads a PDF order sheet and opens WhatsApp with the supplier when
          a phone number is available.
        </p>
      </div>
    </div>
  );
}

function QtyControl({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (qty: number) => void;
}) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        className={cn(mktBtnGhost, "h-9 px-3 text-xs")}
        onClick={(e) => {
          e.stopPropagation();
          onChange(1);
        }}
      >
        <Plus className="size-3.5" />
        Add
      </button>
    );
  }
  return (
    <div
      className="inline-flex items-center border border-border"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex size-9 items-center justify-center hover:bg-muted"
        onClick={() => onChange(qty - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
        {qty}
      </span>
      <button
        type="button"
        className="flex size-9 items-center justify-center hover:bg-muted"
        onClick={() => onChange(qty + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function CatalogueOrderRow({
  product,
  qty,
  active,
  onSelect,
  onSetQty,
}: {
  product: MarketplaceCatalogProductPreview;
  qty: number;
  active: boolean;
  onSelect: () => void;
  onSetQty: (qty: number) => void;
}) {
  const hue = hueFromId(product.id);
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 border border-border/50 bg-muted/10 p-2",
        active && "border-foreground/40 bg-muted/25",
      )}
    >
      <button type="button" className="shrink-0" onClick={onSelect}>
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          hue={hue}
          className="size-14 border border-border/40"
          iconClassName="size-4 opacity-50"
        />
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
      >
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {[product.barcode, product.sku].filter(Boolean).join(" · ") || "—"}
        </p>
        {product.unitPrice != null ? (
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {formatMoney(product.unitPrice, product.currency ?? "KES")}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Ask</p>
        )}
      </button>
      <QtyControl qty={qty} onChange={onSetQty} />
    </div>
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

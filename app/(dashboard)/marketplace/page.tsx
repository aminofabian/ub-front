"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Package, Search, Store, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DashboardAccessDenied,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
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
import { cn, formatMoney } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 320;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type SearchTab = "suppliers" | "products";

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const { canViewMarketplace, canConnectMarketplace } = useDashboard();
  const [tab, setTab] = useState<SearchTab>("suppliers");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<MarketplaceSupplierSearchRow[]>([]);
  const [products, setProducts] = useState<MarketplaceProductSearchRow[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MarketplaceSupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "suppliers") {
        const page = await searchMarketplaceSuppliers({ q: debouncedSearch, size: 50 });
        setSuppliers(page.content);
      } else {
        const page = await searchMarketplaceProducts({ q: debouncedSearch, size: 50 });
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
      toast.error(error instanceof Error ? error.message : "Failed to load supplier");
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

  const onConnect = async () => {
    if (!selectedSupplierId || !canConnectMarketplace) return;
    setConnecting(true);
    try {
      const result = await connectMarketplaceSupplier(selectedSupplierId);
      toast.success(
        `Connected ${result.supplierName}. Imported ${result.importedProductLinks} product links.`,
      );
      window.location.href = `${APP_ROUTES.suppliers}?selected=${encodeURIComponent(result.localSupplierId)}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connect failed");
    } finally {
      setConnecting(false);
    }
  };

  if (!canViewMarketplace) {
    return (
      <DashboardAccessDenied
        title="Marketplace access required"
        description="Your role does not include permission to browse the supplier marketplace."
        backHref={APP_ROUTES.business}
      />
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Procurement
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Supplier marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Discover platform suppliers and products. Connect a supplier to add them to your directory
          and import catalogue links.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={tab === "suppliers" ? "Search suppliers…" : "Search products or barcodes…"}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border bg-muted/30 p-0.5">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === "suppliers" ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setTab("suppliers")}
          >
            Suppliers
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === "products" ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setTab("products")}
          >
            Products
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <section className="min-h-[320px] overflow-hidden rounded-xl border bg-card">
          {loading ? (
            <DashboardLoading label="Searching marketplace…" />
          ) : tab === "suppliers" ? (
            <ul className="divide-y">
              {suppliers.length === 0 ? (
                <li className="p-8 text-center text-sm text-muted-foreground">
                  No suppliers found. Try a different search.
                </li>
              ) : (
                suppliers.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40",
                        selectedSupplierId === row.id && "bg-muted/50",
                      )}
                      onClick={() => void loadDetail(row.id)}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Truck className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{row.name}</span>
                        {row.description ? (
                          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {row.description}
                          </span>
                        ) : null}
                        {row.categoryTags?.length ? (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {row.categoryTags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <ul className="divide-y">
              {products.length === 0 ? (
                <li className="p-8 text-center text-sm text-muted-foreground">
                  No products found. Try a product name or barcode.
                </li>
              ) : (
                products.map((row) => (
                  <li key={`${row.supplierId}-${row.productId}`}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40"
                      onClick={() => void loadDetail(row.supplierId)}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <Package className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{row.productName}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {row.supplierName}
                          {row.barcode ? ` · ${row.barcode}` : ""}
                          {row.sku ? ` · SKU ${row.sku}` : ""}
                        </span>
                        {row.unitPrice != null ? (
                          <span className="mt-1 block text-xs font-medium">
                            {formatMoney(row.unitPrice, row.currency ?? "KES")}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </section>

        <aside className="rounded-xl border bg-card p-4">
          {!selectedSupplierId ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Store className="size-8 opacity-40" />
              <p>Select a supplier to preview their catalogue and connect.</p>
            </div>
          ) : detailLoading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading supplier…
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{detail.name}</h2>
                {detail.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>
                ) : null}
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {detail.contactEmail ? <p>Email: {detail.contactEmail}</p> : null}
                  {detail.contactPhone ? <p>Phone: {detail.contactPhone}</p> : null}
                  {detail.deliveryRegions?.length ? (
                    <p>Delivers: {detail.deliveryRegions.join(", ")}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium">Catalogue preview</h3>
                <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                  {detail.products.length === 0 ? (
                    <li className="text-muted-foreground">No active products listed.</li>
                  ) : (
                    detail.products.slice(0, 20).map((product) => (
                      <li key={product.id} className="rounded-md border px-3 py-2">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.barcode ?? product.sku ?? "—"}
                          {product.unitPrice != null
                            ? ` · ${formatMoney(product.unitPrice, product.currency ?? "KES")}`
                            : ""}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {canConnectMarketplace ? (
                <Button className="w-full" disabled={connecting} onClick={() => void onConnect()}>
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    "Add to my suppliers"
                  )}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  You can browse the directory but need connect permission to add suppliers.
                </p>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Already connected?{" "}
                <Link href={APP_ROUTES.suppliers} className="underline underline-offset-2">
                  Open suppliers
                </Link>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load supplier details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

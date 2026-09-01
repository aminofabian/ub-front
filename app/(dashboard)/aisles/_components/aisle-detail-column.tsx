"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Layers,
  Package,
  Pencil,
  TrendingUp,
} from "lucide-react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import { boardMoney } from "@/components/credits/customer-board-theme";
import { DirectoryEmpty, DirectoryStat } from "@/components/credits/directory-workspace-ui";
import { Button } from "@/components/ui/button";
import {
  fetchCatalogListStats,
  fetchItemsPage,
  fetchPosTopProducts,
  itemListThumbnailUrl,
  type AisleRecord,
  type CatalogListStats,
  type ItemSummaryRecord,
  type PosTopProductRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { AisleBar, AislePanel } from "./aisle-ui";

type Props = {
  aisle: AisleRecord | null;
  allAisles: AisleRecord[];
  walkIndex: number;
  walkStops: number;
  catalogTotal: number;
  branchId: string;
  currency: string;
  canWrite: boolean;
  reorderBusy: boolean;
  onSelectAisle: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
};

function StatBlock({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return <DirectoryStat label={label} value={value} warn={warn} />;
}

function stockQty(row: ItemSummaryRecord): number {
  const n = Number(row.stockQty ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function linePrice(row: ItemSummaryRecord): number {
  const n = Number(row.bundlePrice ?? 0);
  return Number.isFinite(n) ? n : 0;
}

type CategoryRow = { name: string; count: number; stock: number };

export function AisleDetailColumn({
  aisle,
  allAisles,
  walkIndex,
  walkStops,
  catalogTotal,
  branchId,
  currency,
  canWrite,
  reorderBusy,
  onSelectAisle,
  onMoveUp,
  onMoveDown,
  onEdit,
  onToggleStatus,
}: Props) {
  const [products, setProducts] = useState<ItemSummaryRecord[]>([]);
  const [stats, setStats] = useState<CatalogListStats | null>(null);
  const [bestSellers, setBestSellers] = useState<PosTopProductRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const money = useCallback(
    (n: number | string | null | undefined) => boardMoney(n, currency),
    [currency],
  );

  const load = useCallback(async () => {
    if (!aisle) {
      setProducts([]);
      setStats(null);
      setBestSellers([]);
      return;
    }
    setLoading(true);
    try {
      const [page, listStats, topProducts] = await Promise.all([
        fetchItemsPage(undefined, {
          aisleId: aisle.id,
          branchId: branchId || undefined,
          catalogScope: "SKUS_ONLY",
          page: 0,
          size: 120,
          sort: [{ property: "name", direction: "asc" }],
        }),
        fetchCatalogListStats(undefined, {
          aisleId: aisle.id,
          branchId: branchId || undefined,
        }),
        branchId
          ? fetchPosTopProducts(branchId, { limit: 60 })
          : Promise.resolve([]),
      ]);
      setProducts(page.content);
      setHasMore(!page.last);
      setStats(listStats);
      const ids = new Set(page.content.map((p) => p.id));
      setBestSellers(
        topProducts.filter((p) => ids.has(p.id)).slice(0, 6),
      );
    } catch {
      setProducts([]);
      setStats(null);
      setBestSellers([]);
    } finally {
      setLoading(false);
    }
  }, [aisle, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalOnHand = useMemo(
    () => products.reduce((sum, p) => sum + stockQty(p), 0),
    [products],
  );

  const shelfValue = useMemo(
    () =>
      products.reduce((sum, p) => sum + stockQty(p) * linePrice(p), 0),
    [products],
  );

  const sortedByStock = useMemo(
    () => [...products].sort((a, b) => stockQty(b) - stockQty(a)),
    [products],
  );

  const emptyShelf = useMemo(
    () => products.filter((p) => stockQty(p) <= 0),
    [products],
  );

  const categoryMix = useMemo(() => {
    const map = new Map<string, CategoryRow>();
    for (const row of products) {
      const name = row.categoryName?.trim() || "Uncategorized";
      const prev = map.get(name) ?? { name, count: 0, stock: 0 };
      prev.count += 1;
      prev.stock += stockQty(row);
      map.set(name, prev);
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [products]);

  const maxStock = useMemo(
    () => Math.max(...sortedByStock.map(stockQty), 1),
    [sortedByStock],
  );

  const maxSold = useMemo(
    () =>
      Math.max(
        ...bestSellers.map((p) => Number(p.totalQuantity ?? 0)),
        1,
      ),
    [bestSellers],
  );

  const maxCategory = categoryMix[0]?.count ?? 1;

  const share =
    catalogTotal > 0 && aisle
      ? Math.round((aisle.productCount / catalogTotal) * 100)
      : 0;

  const prevAisle = walkIndex > 0 ? allAisles[walkIndex - 1] : null;
  const nextAisle =
    walkIndex >= 0 && walkIndex < allAisles.length - 1
      ? allAisles[walkIndex + 1]
      : null;

  const loadMore = async () => {
    if (!aisle || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchItemsPage(undefined, {
        aisleId: aisle.id,
        branchId: branchId || undefined,
        catalogScope: "SKUS_ONLY",
        page: Math.floor(products.length / 120),
        size: 120,
      });
      setProducts((prev) => [...prev, ...page.content]);
      setHasMore(!page.last);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!aisle) {
    return (
      <DirectoryEmpty
        title="Pick an aisle"
        description="Select a zone on the left to see stock, fast movers, category mix, and every product on that shelf."
      />
    );
  }

  if (loading) {
    return <DashboardLoading label="Loading aisle…" />;
  }

  return (
    <div className="min-h-0 space-y-2 overflow-y-auto">
      <AislePanel className="px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {aisle.code}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
              {aisle.name}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Stop {walkIndex + 1} of {walkStops}
              {!aisle.active ? " · inactive" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {prevAisle ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 max-w-[8rem] px-1.5 text-xs"
                onClick={() => onSelectAisle(prevAisle.id)}
              >
                <ChevronLeft className="size-3.5 shrink-0" />
                <span className="truncate">{prevAisle.name}</span>
              </Button>
            ) : null}
            {nextAisle ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 max-w-[8rem] px-1.5 text-xs"
                onClick={() => onSelectAisle(nextAisle.id)}
              >
                <span className="truncate">{nextAisle.name}</span>
                <ChevronRight className="size-3.5 shrink-0" />
              </Button>
            ) : null}
            <Button type="button" size="sm" className="h-7 text-xs" asChild>
              <Link
                href={`${APP_ROUTES.products}?aisleId=${encodeURIComponent(aisle.id)}`}
              >
                Catalog
                <ArrowRight className="ml-1 size-3" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto pb-0.5">
          <div className="flex min-w-max items-center gap-0.5">
            {allAisles.map((stop, index) => {
              const active = stop.id === aisle.id;
              return (
                <button
                  key={stop.id}
                  type="button"
                  title={stop.name}
                  className={cn(
                    "flex h-6 min-w-[1.5rem] items-center justify-center rounded px-1.5 text-[10px] font-bold tabular-nums transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    !stop.active && "opacity-60",
                  )}
                  onClick={() => onSelectAisle(stop.id)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
            <span>Catalog share</span>
            <span className="tabular-nums">{share}%</span>
          </div>
          <div className="mt-1">
            <AisleBar pct={share} />
          </div>
        </div>
      </AislePanel>

      <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-4">
        <StatBlock
          label="Products"
          value={aisle.productCount.toLocaleString()}
        />
        <StatBlock
          label="On hand"
          value={totalOnHand.toLocaleString("en-KE", { maximumFractionDigits: 0 })}
        />
        <StatBlock label="Shelf value" value={money(shelfValue)} />
        <StatBlock
          label="Out of stock"
          value={String(stats?.zeroStock ?? 0)}
          warn={(stats?.zeroStock ?? 0) > 0}
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {bestSellers.length > 0 ? (
          <AislePanel className="px-3 py-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-muted-foreground" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Best sellers
              </p>
            </div>
            <ul className="mt-2 space-y-2">
              {bestSellers.map((item, index) => {
                const qty = Number(item.totalQuantity ?? 0);
                const pct = Math.max((qty / maxSold) * 100, 4);
                return (
                  <li key={item.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {index + 1}. {item.name}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {qty.toLocaleString("en-KE", { maximumFractionDigits: 1 })} sold
                      </span>
                    </div>
                    <div className="mt-1">
                      <AisleBar pct={pct} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </AislePanel>
        ) : (
          <AislePanel className="flex items-center px-3 py-6">
            <p className="text-xs text-muted-foreground">
              No till velocity yet for products in this aisle.
            </p>
          </AislePanel>
        )}

        {categoryMix.length > 0 ? (
          <AislePanel className="px-3 py-3">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-muted-foreground" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                On the shelf
              </p>
            </div>
            <ul className="mt-2 space-y-2">
              {categoryMix.map((row) => {
                const pct = Math.max((row.count / maxCategory) * 100, 4);
                return (
                  <li key={row.name}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {row.name}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {row.count} · {row.stock.toLocaleString("en-KE", { maximumFractionDigits: 0 })} u
                      </span>
                    </div>
                    <div className="mt-1">
                      <AisleBar pct={pct} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </AislePanel>
        ) : null}
      </div>

      {emptyShelf.length > 0 ? (
        <AislePanel className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-600" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Running empty ({emptyShelf.length})
            </p>
          </div>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {emptyShelf.slice(0, 12).map((row) => (
              <span
                key={row.id}
                className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {row.name}
              </span>
            ))}
          </div>
        </AislePanel>
      ) : null}

      <AislePanel>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Package className="size-3.5 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Stock on shelf
              </p>
              <p className="text-[11px] text-muted-foreground">
                {products.length.toLocaleString()} loaded
                {hasMore ? "+" : ""} · low {stats?.lowStock ?? 0}
              </p>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No products tagged to this aisle yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {sortedByStock.slice(0, 40).map((row) => {
              const qty = stockQty(row);
              const pct = Math.max((qty / maxStock) * 100, qty > 0 ? 3 : 0);
              const thumb = itemListThumbnailUrl(row);
              const price = row.bundlePrice != null ? money(row.bundlePrice) : null;
              return (
                <li key={row.id} className="px-3 py-2">
                  <div className="flex gap-2.5">
                    <div className="size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[10px] font-bold uppercase text-muted-foreground">
                          {row.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {row.name}
                        </p>
                        {price ? (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {price}
                          </span>
                        ) : null}
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {row.sku}
                        {row.categoryName ? ` · ${row.categoryName}` : ""}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <AisleBar pct={pct} warn={qty === 0} />
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-[11px] font-semibold tabular-nums",
                            qty === 0
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-foreground",
                          )}
                        >
                          {qty.toLocaleString("en-KE", { maximumFractionDigits: 1 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore ? (
          <div className="border-t border-border/60 px-3 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full text-xs"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Loading…" : "Load more products"}
            </Button>
          </div>
        ) : null}
      </AislePanel>

      {canWrite ? (
        <AislePanel className="px-3 py-3">
          <h2 className="text-xs font-semibold text-foreground">Manage aisle</h2>
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <Button type="button" variant="default" size="sm" className="h-7 text-xs" onClick={onEdit}>
                <Pencil className="mr-1.5 size-3" />
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onToggleStatus}>
                {aisle.active ? "Deactivate" : "Activate"}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-dashed border-border px-2.5 py-1.5">
              <span className="text-[11px] text-muted-foreground">Walk order</span>
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={reorderBusy || walkIndex === 0}
                  onClick={onMoveUp}
                  aria-label="Move up"
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={reorderBusy || walkIndex >= walkStops - 1}
                  onClick={onMoveDown}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </AislePanel>
      ) : null}
    </div>
  );
}

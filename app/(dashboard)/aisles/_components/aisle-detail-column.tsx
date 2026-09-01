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
import {
  INK,
  MUTED,
  NAVY_DEEP,
  WhiteCard,
  boardMoney,
} from "@/components/credits/customer-board-theme";
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
  hint,
  lead,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  lead?: boolean;
  warn?: boolean;
}) {
  return (
    <WhiteCard className={lead ? "min-h-[5.5rem] px-4 py-4" : "px-3 py-3"}>
      <p
        className="text-[11px] font-semibold uppercase tracking-[-0.02em]"
        style={{ color: MUTED }}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-bold tabular-nums tracking-[-0.03em]",
          lead ? "text-[1.45rem]" : "text-[1.15rem]",
        )}
        style={{ color: warn ? "#b45309" : INK }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
          {hint}
        </p>
      ) : null}
    </WhiteCard>
  );
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
      <WhiteCard className="px-5 py-12">
        <p className="max-w-[65ch] text-[15px] leading-relaxed" style={{ color: INK }}>
          Select an aisle on the left to see what lives on that shelf — stock
          levels, fast movers, category mix, and every product tagged to the zone.
        </p>
      </WhiteCard>
    );
  }

  if (loading) {
    return <DashboardLoading label="Scanning shelf zone…" />;
  }

  return (
    <div className="min-h-0 space-y-3 overflow-y-auto">
      <WhiteCard className="px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: MUTED }}
            >
              Aisle details
            </p>
            <p
              className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "#0c3a66" }}
            >
              {aisle.code}
            </p>
            <h2
              className="mt-0.5 text-[1.5rem] font-bold leading-tight tracking-[-0.03em]"
              style={{ color: INK }}
            >
              {aisle.name}
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
              Stop {walkIndex + 1} of {walkStops}
              {!aisle.active ? " · inactive" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {prevAisle ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 rounded-none border-[#d5deea] px-2"
                style={{ color: INK }}
                onClick={() => onSelectAisle(prevAisle.id)}
              >
                <ChevronLeft className="size-4" />
                <span className="max-w-[6rem] truncate">{prevAisle.name}</span>
              </Button>
            ) : null}
            {nextAisle ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 rounded-none border-[#d5deea] px-2"
                style={{ color: INK }}
                onClick={() => onSelectAisle(nextAisle.id)}
              >
                <span className="max-w-[6rem] truncate">{nextAisle.name}</span>
                <ChevronRight className="size-4" />
              </Button>
            ) : null}
            <Button type="button" className="h-9 rounded-none" asChild>
              <Link
                href={`${APP_ROUTES.products}?aisleId=${encodeURIComponent(aisle.id)}`}
              >
                Catalog
                <ArrowRight className="ml-2 size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-1">
            {allAisles.map((stop, index) => {
              const active = stop.id === aisle.id;
              return (
                <button
                  key={stop.id}
                  type="button"
                  title={stop.name}
                  className={cn(
                    "flex h-9 min-w-[2.25rem] items-center justify-center px-2 text-[11px] font-bold tabular-nums transition-colors",
                    active
                      ? "bg-[#0c3a66] text-white"
                      : "bg-[#eef1f4] text-[#3a5570] hover:bg-[#d5deea]",
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

        <div className="mt-4">
          <div
            className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[-0.02em]"
            style={{ color: MUTED }}
          >
            <span>Catalog share</span>
            <span className="tabular-nums">{share}%</span>
          </div>
          <div className="mt-2 h-2 w-full bg-[#d5deea]">
            <div
              className="h-2 origin-left bg-[#0c3a66]"
              style={{
                width: "100%",
                transform: `scaleX(${Math.min(100, share) / 100})`,
              }}
            />
          </div>
        </div>
      </WhiteCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="Products"
          value={aisle.productCount.toLocaleString()}
          hint="Tagged to aisle"
        />
        <StatBlock
          label="On hand"
          value={totalOnHand.toLocaleString("en-KE", { maximumFractionDigits: 0 })}
          hint={branchId ? "Units at branch" : "Pick a branch"}
          lead
        />
        <StatBlock
          label="Shelf value"
          value={money(shelfValue)}
          hint="Stock × shelf price"
        />
        <StatBlock
          label="Out of stock"
          value={String(stats?.zeroStock ?? 0)}
          hint="Needs restock"
          warn={(stats?.zeroStock ?? 0) > 0}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {bestSellers.length > 0 ? (
          <WhiteCard className="px-4 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4" style={{ color: "#0c3a66" }} aria-hidden />
              <p
                className="text-[11px] font-semibold uppercase tracking-[-0.02em]"
                style={{ color: MUTED }}
              >
                Best sellers
              </p>
            </div>
            <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
              Fast movers in this aisle from recent till sales
            </p>
            <ul className="mt-3 space-y-2">
              {bestSellers.map((item, index) => {
                const qty = Number(item.totalQuantity ?? 0);
                const pct = Math.max((qty / maxSold) * 100, 4);
                return (
                  <li key={item.id}>
                    <div
                      className="flex items-center justify-between gap-2 text-[13px]"
                      style={{ color: INK }}
                    >
                      <span className="min-w-0 truncate font-medium">
                        {index + 1}. {item.name}
                      </span>
                      <span
                        className="shrink-0 tabular-nums text-[12px]"
                        style={{ color: MUTED }}
                      >
                        {qty.toLocaleString("en-KE", { maximumFractionDigits: 1 })} sold
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-[#d5deea]">
                      <div
                        className="h-2 origin-left"
                        style={{
                          width: "100%",
                          transform: `scaleX(${pct / 100})`,
                          background: index === 0 ? "#0c3a66" : "#2a6aa3",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </WhiteCard>
        ) : (
          <WhiteCard className="flex items-center px-4 py-8">
            <p className="text-[13px]" style={{ color: MUTED }}>
              No till velocity yet for products in this aisle.
            </p>
          </WhiteCard>
        )}

        {categoryMix.length > 0 ? (
          <WhiteCard className="px-4 py-4">
            <div className="flex items-center gap-2">
              <Layers className="size-4" style={{ color: "#0c3a66" }} aria-hidden />
              <p
                className="text-[11px] font-semibold uppercase tracking-[-0.02em]"
                style={{ color: MUTED }}
              >
                What&apos;s on the shelf
              </p>
            </div>
            <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
              Category mix by product count
            </p>
            <ul className="mt-3 space-y-2">
              {categoryMix.map((row, index) => {
                const pct = Math.max((row.count / maxCategory) * 100, 4);
                return (
                  <li key={row.name}>
                    <div
                      className="flex items-center justify-between gap-2 text-[13px]"
                      style={{ color: INK }}
                    >
                      <span className="min-w-0 truncate font-medium">{row.name}</span>
                      <span
                        className="shrink-0 tabular-nums text-[12px]"
                        style={{ color: MUTED }}
                      >
                        {row.count} · {row.stock.toLocaleString("en-KE", { maximumFractionDigits: 0 })} u
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-[#d5deea]">
                      <div
                        className="h-2 origin-left"
                        style={{
                          width: "100%",
                          transform: `scaleX(${pct / 100})`,
                          background: index === 0 ? "#0c3a66" : "#2a6aa3",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </WhiteCard>
        ) : null}
      </div>

      {emptyShelf.length > 0 ? (
        <WhiteCard className="px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[#b45309]" aria-hidden />
            <p
              className="text-[11px] font-semibold uppercase tracking-[-0.02em]"
              style={{ color: MUTED }}
            >
              Running empty ({emptyShelf.length})
            </p>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {emptyShelf.slice(0, 12).map((row) => (
              <span
                key={row.id}
                className="shrink-0 bg-[#fff4e5] px-2.5 py-1.5 text-[12px] font-medium text-[#8a5a00]"
              >
                {row.name}
              </span>
            ))}
          </div>
        </WhiteCard>
      ) : null}

      <WhiteCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef1f4] px-4 py-3">
          <div className="flex items-center gap-2">
            <Package className="size-4" style={{ color: MUTED }} aria-hidden />
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[-0.02em]"
                style={{ color: MUTED }}
              >
                Stock on shelf
              </p>
              <p className="text-[12px]" style={{ color: MUTED }}>
                {products.length.toLocaleString()} loaded
                {hasMore ? "+" : ""} · low {stats?.lowStock ?? 0}
              </p>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="px-4 py-10 text-center text-[14px]" style={{ color: MUTED }}>
            No products tagged to this aisle yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#eef1f4]">
            {sortedByStock.slice(0, 40).map((row) => {
              const qty = stockQty(row);
              const pct = Math.max((qty / maxStock) * 100, qty > 0 ? 3 : 0);
              const thumb = itemListThumbnailUrl(row);
              const price = row.bundlePrice != null ? money(row.bundlePrice) : null;
              return (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex gap-3">
                    <div className="size-11 shrink-0 overflow-hidden bg-[#eef1f4]">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex size-full items-center justify-center text-[10px] font-bold uppercase"
                          style={{ color: MUTED }}
                        >
                          {row.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p
                          className="truncate text-[14px] font-semibold tracking-[-0.02em]"
                          style={{ color: INK }}
                        >
                          {row.name}
                        </p>
                        {price ? (
                          <span className="text-[12px] tabular-nums" style={{ color: MUTED }}>
                            {price}
                          </span>
                        ) : null}
                      </div>
                      <p className="font-mono text-[11px]" style={{ color: MUTED }}>
                        {row.sku}
                        {row.categoryName ? ` · ${row.categoryName}` : ""}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 min-w-0 flex-1 bg-[#d5deea]">
                          <div
                            className="h-2 origin-left"
                            style={{
                              width: "100%",
                              transform: `scaleX(${pct / 100})`,
                              background: qty === 0 ? "#c4a484" : "#2a6aa3",
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-[12px] font-semibold tabular-nums",
                            qty === 0 && "text-[#b45309]",
                          )}
                          style={qty === 0 ? undefined : { color: INK }}
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
          <div className="border-t border-[#eef1f4] px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-none border-[#d5deea]"
              style={{ color: INK }}
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Loading…" : "Load more products"}
            </Button>
          </div>
        ) : null}
      </WhiteCard>

      {canWrite ? (
        <section className="overflow-hidden rounded-none" style={{ background: NAVY_DEEP }}>
          <h2 className="px-3 pt-3 pb-2 text-[13px] font-semibold tracking-[-0.02em] text-white">
            Manage aisle
          </h2>
          <div className="space-y-2 px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="h-10 rounded-none bg-white hover:bg-white/90"
                style={{ color: INK }}
                onClick={onEdit}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-none border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={onToggleStatus}
              >
                {aisle.active ? "Deactivate" : "Activate"}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-none border border-dashed border-white/20 px-3 py-2">
              <span className="text-[11px] text-white/75">Walk order</span>
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-white hover:bg-white/10"
                  disabled={reorderBusy || walkIndex === 0}
                  onClick={onMoveUp}
                  aria-label="Move up"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-white hover:bg-white/10"
                  disabled={reorderBusy || walkIndex >= walkStops - 1}
                  onClick={onMoveDown}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

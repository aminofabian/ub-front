"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package, RefreshCw, Search } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBatchDashboard,
  fetchBranches,
  fetchCategories,
  fetchItemsPage,
  type BranchRecord,
  type CategoryRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const STOCK_SURFACE =
  "overflow-hidden rounded-xl border border-[#EEEEEE] bg-white";
const STOCK_MUTED = "text-[#888888]";
const STOCK_ACCENT = "#B08D48";
const STOCK_LOW = "#C47A5A";
const STOCK_TRACK = "#F0F0F0";

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

type StockStatusFilter = "all" | "in_stock" | "low" | "out";

type StockRow = {
  id: string;
  name: string;
  stock: number;
  reorderLevel: number | null;
  categoryId: string | null;
  categoryName: string | null;
};

const STOCK_STATUS_FILTERS: { id: StockStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_stock", label: "In stock" },
  { id: "low", label: "Low stock" },
  { id: "out", label: "Out of stock" },
];

function toNum(n: number | string | null | undefined): number | null {
  if (n == null || n === "") return null;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

function displayItemName(item: ItemSummaryRecord): string {
  const base = item.name?.trim() || item.sku?.trim() || "Unnamed item";
  const suffix = item.size?.trim() || item.variantName?.trim();
  return suffix ? `${base} ${suffix}` : base;
}

function isOutOfStock(stock: number): boolean {
  return stock <= 0;
}

function isLowStock(stock: number, reorderLevel: number | null): boolean {
  if (isOutOfStock(stock)) return false;
  if (reorderLevel != null && reorderLevel > 0) return stock <= reorderLevel;
  return false;
}

function isInStock(stock: number, reorderLevel: number | null): boolean {
  return stock > 0 && !isLowStock(stock, reorderLevel);
}

function matchesStockStatus(
  row: StockRow,
  status: StockStatusFilter,
): boolean {
  switch (status) {
    case "in_stock":
      return isInStock(row.stock, row.reorderLevel);
    case "low":
      return isLowStock(row.stock, row.reorderLevel);
    case "out":
      return isOutOfStock(row.stock);
    default:
      return true;
  }
}

function FilterPills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-[#EEEEEE] bg-white p-1"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(({ id, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border border-[#E8DFD0] bg-[#F9F6F0] text-[#B08D48]"
                : "border border-transparent text-[#666666] hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function barCapacity(stock: number, reorderLevel: number | null): number {
  if (reorderLevel != null && reorderLevel > 0) {
    return Math.max(reorderLevel * 4, stock, reorderLevel);
  }
  return Math.max(stock, 1);
}

function barFillPercent(stock: number, reorderLevel: number | null): number {
  const cap = barCapacity(stock, reorderLevel);
  return Math.min(100, Math.max(0, Math.round((stock / cap) * 100)));
}

function StockRowItem({ row }: { row: StockRow }) {
  const out = isOutOfStock(row.stock);
  const low = isLowStock(row.stock, row.reorderLevel);
  const fill = barFillPercent(row.stock, row.reorderLevel);
  const leftLabel =
    row.stock === 1 ? "1 left" : `${row.stock.toLocaleString("en-KE")} left`;

  return (
    <Link
      href={`${APP_ROUTES.products}?search=${encodeURIComponent(row.name)}`}
      className="block px-5 py-4 transition-colors hover:bg-[#F9F6F0]/50"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[15px] font-medium text-[#333333]">
          {row.name}
        </span>
        <span
          className={cn(
            "shrink-0 text-sm tabular-nums",
            out || low ? "font-medium text-[#C47A5A]" : "text-[#666666]",
          )}
        >
          {out ? "Out of stock" : leftLabel}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: STOCK_TRACK }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${fill}%`,
            backgroundColor: out || low ? STOCK_LOW : STOCK_ACCENT,
          }}
        />
      </div>
    </Link>
  );
}

function StockListSkeleton() {
  return (
    <div className={STOCK_SURFACE}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border-b border-[#EEEEEE] px-5 py-4 last:border-0"
        >
          <div className="mb-2.5 flex justify-between gap-3">
            <div className="h-4 w-40 rounded bg-[#EEEEEE] animate-pulse" />
            <div className="h-4 w-14 rounded bg-[#EEEEEE] animate-pulse" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#EEEEEE] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function StockLevelsPage() {
  const { me, branchId: sessionBranchId } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryRead);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("all");
  const [rows, setRows] = useState<StockRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchBranches().catch(() => [] as BranchRecord[]),
      fetchCategories().catch(() => [] as CategoryRecord[]),
    ]).then(([branchList, categoryList]) => {
      setBranches(branchList);
      setCategories(
        [...categoryList]
          .filter((c) => c.active !== false)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  }, []);

  useEffect(() => {
    const id = (sessionBranchId ?? "").trim();
    if (!id) return;
    const valid = branches.some((b) => b.id === id);
    if (valid) setBranchId(id);
  }, [sessionBranchId, branches]);

  const load = useCallback(async () => {
    const branch = branchId.trim();
    if (!branch) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const reorderByItemId = new Map<string, number>();
      const categoryByItemId = new Map<string, string>();
      const dashboard = await fetchBatchDashboard({ branchId: branch }).catch(
        () => null,
      );
      for (const product of dashboard?.lowStockProducts ?? []) {
        const level = toNum(product.reorderLevel);
        if (level != null) reorderByItemId.set(product.itemId, level);
        if (product.categoryName?.trim()) {
          categoryByItemId.set(product.itemId, product.categoryName.trim());
        }
      }

      const selectedCategory = categoryId.trim();

      const collected: StockRow[] = [];
      let page = 0;
      let last = false;

      while (!last && page < MAX_PAGES) {
        const result = await fetchItemsPage(undefined, {
          branchId: branch,
          catalogScope: "SKUS_ONLY",
          categoryId: selectedCategory || undefined,
          includeCategoryDescendants: Boolean(selectedCategory),
          page,
          size: PAGE_SIZE,
          sort: [{ property: "name", direction: "asc" }],
        });

        for (const item of result.content) {
          if (item.groupLabelOnly) continue;
          const stock = toNum(item.stockQty) ?? 0;
          collected.push({
            id: item.id,
            name: displayItemName(item),
            stock,
            reorderLevel: reorderByItemId.get(item.id) ?? null,
            categoryId: item.categoryId ?? null,
            categoryName:
              item.categoryName?.trim() ||
              categoryByItemId.get(item.id) ||
              null,
          });
        }

        last = result.last;
        page += 1;
      }

      collected.sort((a, b) => {
        const aOut = isOutOfStock(a.stock);
        const bOut = isOutOfStock(b.stock);
        if (aOut !== bOut) return aOut ? -1 : 1;
        const aLow = isLowStock(a.stock, a.reorderLevel);
        const bLow = isLowStock(b.stock, b.reorderLevel);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return a.stock - b.stock;
      });

      setRows(collected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stock levels.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, categoryId]);

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [load, allowed]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesStockStatus(r, statusFilter)) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  const stockCounts = useMemo(
    () => ({
      total: rows.length,
      inStock: rows.filter((r) => isInStock(r.stock, r.reorderLevel)).length,
      low: rows.filter((r) => isLowStock(r.stock, r.reorderLevel)).length,
      out: rows.filter((r) => isOutOfStock(r.stock)).length,
    }),
    [rows],
  );

  const emptyMessage = useMemo(() => {
    if (search.trim()) return "No products match your search.";
    if (statusFilter === "low") return "No low-stock products for this branch.";
    if (statusFilter === "out") return "No out-of-stock products for this branch.";
    if (statusFilter === "in_stock") return "No in-stock products for this branch.";
    if (categoryId) return "No products in this category.";
    return "No stocked products found for this branch.";
  }, [search, statusFilter, categoryId]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Stock levels"
        description="You need inventory read access to view stock levels."
        backHref={APP_ROUTES.overview}
        backLabel="Back to overview"
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "space-y-6")}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={cn("text-sm font-medium", STOCK_MUTED)}>Inventory</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-black">
            Stock
          </h1>
          <p className={cn("mt-1 text-sm", STOCK_MUTED)}>
            {rows.length > 0
              ? `${stockCounts.total.toLocaleString("en-KE")} products · ${stockCounts.low.toLocaleString("en-KE")} low · ${stockCounts.out.toLocaleString("en-KE")} out`
              : "On-hand levels for your catalogue at the selected branch."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-[#EEEEEE] bg-white"
          onClick={() => void load()}
          disabled={loading || !branchId}
        >
          <RefreshCw
            className={cn("size-4", loading && "animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#888888]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className={cn(dashboardInputClass(), "pl-9")}
            aria-label="Search stock"
          />
        </div>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className={cn(dashboardSelectClass(), "sm:w-56")}
          aria-label="Branch"
        >
          <option value="">Select branch</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <FilterPills
          options={STOCK_STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
          ariaLabel="Stock status"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={cn(dashboardSelectClass(), "w-full sm:w-56")}
          aria-label="Category"
          disabled={!branchId}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!branchId ? (
        <div
          className={cn(
            STOCK_SURFACE,
            "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
          )}
        >
          <Package className="size-10 text-[#CCCCCC]" aria-hidden />
          <p className={cn("text-sm", STOCK_MUTED)}>
            Choose a branch to see stock levels.
          </p>
        </div>
      ) : loading ? (
        <StockListSkeleton />
      ) : filteredRows.length === 0 ? (
        <div
          className={cn(
            STOCK_SURFACE,
            "px-6 py-16 text-center text-sm",
            STOCK_MUTED,
          )}
        >
          {emptyMessage}
        </div>
      ) : (
        <div className={STOCK_SURFACE}>
          <div className="divide-y divide-[#EEEEEE]">
            {filteredRows.map((row) => (
              <StockRowItem key={row.id} row={row} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

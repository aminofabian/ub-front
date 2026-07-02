"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter, useSessionItemType } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchAllocationPreview,
  fetchBatchDashboard,
  fetchBranches,
  fetchCategories,
  fetchItemsPage,
  postBatchDecrease,
  postStockIncrease,
  type BranchRecord,
  type CategoryRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import {
  canEditStockLevels,
  canViewStockLevels,
  inventoryQuickLinksForUser,
} from "@/lib/inventory-access";
import { cn } from "@/lib/utils";

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
  /** Package variants hold stock on a parent SKU, so inline editing is disabled. */
  editable: boolean;
};

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

type StockStatCardProps = {
  label: string;
  value: number;
  active: boolean;
  tone?: "default" | "success" | "warning" | "danger";
  onClick: () => void;
};

function StockStatCard({
  label,
  value,
  active,
  tone = "default",
  onClick,
}: StockStatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-all sm:px-3",
        active
          ? "border-primary/35 bg-primary/5 ring-1 ring-primary/15"
          : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
      )}
    >
      <span className="truncate text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 text-base font-bold tabular-nums leading-none",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
          tone === "danger" && "text-destructive",
          tone === "default" && "text-foreground",
        )}
      >
        {value.toLocaleString("en-KE")}
      </span>
    </button>
  );
}

type StockRowItemProps = {
  row: StockRow;
  canWrite: boolean;
  editing: boolean;
  editQty: string;
  editCost: string;
  saving: boolean;
  onEditQtyChange: (value: string) => void;
  onEditCostChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
};

function StockRowItem({
  row,
  canWrite,
  editing,
  editQty,
  editCost,
  saving,
  onEditQtyChange,
  onEditCostChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: StockRowItemProps) {
  const out = isOutOfStock(row.stock);
  const low = isLowStock(row.stock, row.reorderLevel);
  const fill = barFillPercent(row.stock, row.reorderLevel);
  const leftLabel =
    row.stock === 1 ? "1 left" : `${row.stock.toLocaleString("en-KE")} left`;

  const target = Number(editQty.trim());
  const showCost =
    editing && Number.isFinite(target) && target > row.stock;

  return (
    <div className="px-3 py-2 transition-colors hover:bg-muted/20 sm:px-4">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <Link
              href={`${APP_ROUTES.products}?search=${encodeURIComponent(row.name)}`}
              className="truncate text-sm font-medium text-foreground hover:underline"
            >
              {row.name}
            </Link>
            {row.categoryName ? (
              <span className="hidden shrink-0 truncate text-[11px] text-muted-foreground sm:inline">
                {row.categoryName}
              </span>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoFocus
              value={editQty}
              disabled={saving}
              onChange={(e) => onEditQtyChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
              placeholder="Qty"
              aria-label={`New stock for ${row.name}`}
            />
            {showCost ? (
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={editCost}
                disabled={saving}
                onChange={(e) => onEditCostChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
                placeholder="Cost"
                aria-label={`Unit cost for ${row.name}`}
              />
            ) : null}
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={saving || !editQty.trim()}
              className="inline-flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Save stock"
            >
              <Check className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              aria-label="Cancel"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "text-sm tabular-nums",
                out || low
                  ? "font-medium text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {out ? "Out of stock" : leftLabel}
            </span>
            {canWrite && row.editable ? (
              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                aria-label={`Edit stock for ${row.name}`}
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        )}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            out || low ? "bg-destructive/70" : "bg-primary/70",
          )}
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  );
}

function StockListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border-b border-border/60 px-4 py-2.5 last:border-0"
        >
          <div className="mb-1.5 flex justify-between gap-3">
            <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-1 w-full animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function StockLevelsPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const { itemTypeId: headerItemTypeId } = useSessionItemType();
  const allowed = canViewStockLevels(me, business);
  const canWrite = canEditStockLevels(me, business);

  const quickLinks = useMemo(() => inventoryQuickLinksForUser(me), [me]);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  // Follow the global header branch selection (pinned for locked roles).
  const { branchLocked: isBranchLockedRole } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });
  // Two-way binding: changing the branch on this page updates the global header
  // so the rest of the app follows along.
  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      if (!isBranchLockedRole) setHeaderBranchId(id);
    },
    [isBranchLockedRole, setHeaderBranchId],
  );
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("all");
  const [rows, setRows] = useState<StockRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editCost, setEditCost] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = useCallback((row: StockRow) => {
    setEditId(row.id);
    setEditQty(String(row.stock));
    setEditCost("");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditId(null);
    setEditQty("");
    setEditCost("");
  }, []);

  const saveEdit = useCallback(
    async (row: StockRow) => {
      const branch = branchId.trim();
      if (!branch || !canWrite) return;
      const targetRaw = editQty.trim();
      const target = Number(targetRaw);
      if (!targetRaw || !Number.isFinite(target) || target < 0) {
        toast.error("Enter an on-hand quantity of zero or more.");
        return;
      }
      const delta = Math.round((target - row.stock) * 10000) / 10000;
      if (Math.abs(delta) < 0.0001) {
        cancelEdit();
        return;
      }

      setSavingEdit(true);
      try {
        if (delta > 0) {
          const costRaw = editCost.trim();
          const unitCost = costRaw === "" ? 0 : Number(costRaw);
          if (!Number.isFinite(unitCost) || unitCost < 0) {
            toast.error("Unit cost must be a valid non-negative number.");
            setSavingEdit(false);
            return;
          }
          await postStockIncrease({
            branchId: branch,
            itemId: row.id,
            quantity: delta,
            unitCost,
            notes: "Stock set from stock levels page",
          });
        } else {
          const decreaseQty = Math.abs(delta);
          const allocations = await fetchAllocationPreview({
            itemId: row.id,
            branchId: branch,
            quantity: decreaseQty,
          });
          if (!allocations.length) {
            toast.error("Could not allocate stock to remove for this branch.");
            setSavingEdit(false);
            return;
          }
          let allocated = 0;
          for (const line of allocations) {
            const q = Number(line.quantity);
            if (!Number.isFinite(q) || q <= 0) continue;
            allocated += q;
            await postBatchDecrease({
              batchId: line.batchId,
              quantity: q,
              reason: "Stock set from stock levels page",
            });
          }
          if (allocated < decreaseQty - 0.0001) {
            toast.error(
              `Only ${allocated} could be removed; check batch availability.`,
            );
            setRows((prev) =>
              prev.map((r) =>
                r.id === row.id ? { ...r, stock: row.stock - allocated } : r,
              ),
            );
            setSavingEdit(false);
            setEditId(null);
            return;
          }
        }
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, stock: target } : r)),
        );
        toast.success(`${row.name} set to ${target.toLocaleString("en-KE")}.`);
        setEditId(null);
        setEditQty("");
        setEditCost("");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Stock update failed.",
        );
      } finally {
        setSavingEdit(false);
      }
    },
    [branchId, canWrite, editQty, editCost, cancelEdit],
  );

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

  // Fall back to the first active branch when the header has no selection.
  useEffect(() => {
    if (isBranchLockedRole || branchId || branches.length === 0) return;
    const fallback = branches.find((b) => b.active)?.id ?? branches[0]?.id ?? "";
    if (fallback) setBranchId(fallback);
  }, [isBranchLockedRole, branchId, branches]);

  const load = useCallback(async () => {
    const branch = branchId.trim();
    if (!branch) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setEditId(null);
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
          itemTypeId: headerItemTypeId?.trim() || undefined,
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
            editable: !item.packageVariant,
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
  }, [branchId, categoryId, headerItemTypeId]);

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

  const activeBranchName =
    branches.find((b) => b.id === branchId)?.name?.trim() || "";

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Stock levels"
        description="You need inventory read access to view stock levels."
        backHref={APP_ROUTES.business}
        backLabel="Back to business"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-4">
        <header className="space-y-2 border-b border-border/50 pb-4">
          <DashboardPageHero
            compact
            showActiveScope
            icon={Warehouse}
            eyebrow="Inventory"
            title="Stock"
            description="On-hand by branch — click a stat to filter."
          />
          {quickLinks.length > 0 ? (
            <DashboardQuickLinks compact links={quickLinks} />
          ) : null}
        </header>

        <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/15 p-3">
          {(rows.length > 0 || loading) && (
            <div
              className="flex flex-wrap gap-1.5 sm:flex-nowrap"
              role="group"
              aria-label="Stock summary"
            >
              <StockStatCard
                label="All"
                value={stockCounts.total}
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              />
              <StockStatCard
                label="In stock"
                value={stockCounts.inStock}
                active={statusFilter === "in_stock"}
                tone="success"
                onClick={() => setStatusFilter("in_stock")}
              />
              <StockStatCard
                label="Low"
                value={stockCounts.low}
                active={statusFilter === "low"}
                tone="warning"
                onClick={() => setStatusFilter("low")}
              />
              <StockStatCard
                label="Out"
                value={stockCounts.out}
                active={statusFilter === "out"}
                tone="danger"
                onClick={() => setStatusFilter("out")}
              />
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[11rem]">
              <span className="text-muted-foreground">Branch</span>
              <select
                value={branchId}
                onChange={(e) => onChangeBranch(e.target.value)}
                disabled={isBranchLockedRole}
                className={cn(
                  dashboardSelectClass(),
                  "h-9 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60",
                )}
                aria-label="Branch"
              >
                <option value="">Select branch…</option>
                {branches
                  .filter((b) => b.active || b.id === branchId)
                  .filter((b) => !isBranchLockedRole || b.id === me?.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="flex min-w-[10rem] flex-[2] flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Search</span>
              <span className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Product name…"
                  className={cn(
                    dashboardInputClass(),
                    "h-9 py-1.5 pl-8 text-sm",
                  )}
                  aria-label="Search stock"
                />
              </span>
            </label>

            <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[11rem]">
              <span className="text-muted-foreground">Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={cn(dashboardSelectClass(), "h-9 py-1.5 text-sm")}
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
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              onClick={() => void load()}
              disabled={loading || !branchId}
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
                aria-hidden
              />
              {loading ? "…" : "Refresh"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        {!canWrite && rows.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            View-only — your role cannot edit quantities here. Ask an admin to
            enable stock editing in Business settings.
          </p>
        ) : null}

        {!branchId ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-10 text-center">
            <Package className="size-8 text-muted-foreground/40" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {isBranchLockedRole
                ? "Your account is not assigned to a branch. Contact your administrator."
                : "Choose a branch to see stock levels."}
            </p>
          </div>
        ) : loading ? (
          <StockListSkeleton />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-tight sm:text-sm">
                {filteredRows.length.toLocaleString("en-KE")} product
                {filteredRows.length === 1 ? "" : "s"}
                {statusFilter !== "all"
                  ? ` · ${statusFilter === "in_stock" ? "in stock" : statusFilter === "low" ? "low stock" : "out of stock"}`
                  : ""}
                {activeBranchName ? ` · ${activeBranchName}` : ""}
              </h2>
              {search.trim() && filteredRows.length !== rows.length ? (
                <span className="text-xs text-muted-foreground">
                  {filteredRows.length} of {rows.length} match search
                </span>
              ) : null}
            </div>

            {filteredRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="divide-y divide-border/60 bg-card">
                {filteredRows.map((row) => (
                  <StockRowItem
                    key={row.id}
                    row={row}
                    canWrite={canWrite}
                    editing={editId === row.id}
                    editQty={editId === row.id ? editQty : ""}
                    editCost={editId === row.id ? editCost : ""}
                    saving={savingEdit && editId === row.id}
                    onEditQtyChange={setEditQty}
                    onEditCostChange={setEditCost}
                    onStartEdit={() => startEdit(row)}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={() => void saveEdit(row)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

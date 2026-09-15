"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Lock,
  Minus,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import {
  useSyncBranchFilter,
  useSessionItemType,
} from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchActiveStockTakeSession,
  fetchAllocationPreview,
  fetchBatchDashboard,
  fetchBranches,
  fetchCategories,
  fetchAisles,
  fetchItemTypes,
  fetchItemsPage,
  fetchSupplierItemLinks,
  fetchSuppliers,
  patchItem,
  postBatchDecrease,
  postStockIncrease,
  type AisleRecord,
  type BranchRecord,
  type CategoryRecord,
  type ItemSummaryRecord,
  type ItemTypeRecord,
  type SupplierRecord,
} from "@/lib/api";
import {
  formatProductNameForCatalog,
  joinProductNameParts,
} from "@/lib/catalog-display";
import {
  canEditStockLevels,
  canViewStockLevels,
  inventoryHubActionsForUser,
} from "@/lib/inventory-access";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { textMatchesQuery } from "@/lib/text-search";
import { ColumnResizeHandle } from "@/lib/column-resize-handle";
import {
  StockActionHub,
  type FullCountProgress,
} from "./stock-action-hub";
import { StockFilterMenu } from "./stock-filter-menu";
import sheetStyles from "./stock-table-columns.module.css";
import {
  STOCK_COL_CSS_VARS,
  STOCK_COL_WIDTHS_RESTORE_SCRIPT,
  STOCK_COLUMN_LABELS,
  STOCK_COLUMN_ORDER,
  type StockResizableCol,
} from "./stock-column-widths";
import { useStockColumnWidths } from "./use-stock-column-widths";

const PAGE_SIZE = 50;

type StockStatusFilter = "all" | "in_stock" | "low" | "out" | "loss";

/** How the stock table is ordered after status/search filters. */
type StockSort =
  | "attention"
  | "sell_desc"
  | "buy_desc"
  | "value_desc";

type StockRow = {
  id: string;
  name: string;
  /** Parent / family product title when this row is a variant. */
  familyName: string | null;
  /** Option / size / variant label. */
  variantName: string | null;
  /** Parent item id when this row is a variant SKU. */
  variantOfItemId: string | null;
  sku: string;
  barcode: string;
  brand: string;
  stock: number;
  reorderLevel: number | null;
  categoryId: string | null;
  categoryName: string | null;
  /** Department / item type. */
  itemTypeId: string | null;
  departmentName: string | null;
  /** Shelf zone / aisle. */
  aisleId: string | null;
  shelfName: string | null;
  /** Catalog shelf / sell price (bundle price). */
  sellPrice: number | null;
  /** Reference buying / cost price. */
  buyPrice: number | null;
  /** Package variants hold stock on a parent SKU, so inline editing is disabled. */
  editable: boolean;
};

function toNum(n: number | string | null | undefined): number | null {
  if (n == null || n === "") return null;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

function fmtMoney(n: number | null, currency: string): string {
  if (n == null) return "—";
  try {
    return n.toLocaleString(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    return n.toFixed(2);
  }
}

function compareNullableDesc(
  a: number | null,
  b: number | null,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

function sortStockRows(list: StockRow[], sort: StockSort): StockRow[] {
  const next = [...list];
  next.sort((a, b) => {
    switch (sort) {
      case "sell_desc": {
        const bySell = compareNullableDesc(a.sellPrice, b.sellPrice);
        return bySell !== 0 ? bySell : a.name.localeCompare(b.name);
      }
      case "buy_desc": {
        const byBuy = compareNullableDesc(a.buyPrice, b.buyPrice);
        return byBuy !== 0 ? byBuy : a.name.localeCompare(b.name);
      }
      case "value_desc": {
        const aVal =
          a.buyPrice != null && a.stock > 0 ? a.buyPrice * a.stock : null;
        const bVal =
          b.buyPrice != null && b.stock > 0 ? b.buyPrice * b.stock : null;
        const byVal = compareNullableDesc(aVal, bVal);
        return byVal !== 0 ? byVal : a.name.localeCompare(b.name);
      }
      case "attention":
      default: {
        const aOut = isOutOfStock(a.stock);
        const bOut = isOutOfStock(b.stock);
        if (aOut !== bOut) return aOut ? -1 : 1;
        const aLow = isLowStock(a.stock, a.reorderLevel);
        const bLow = isLowStock(b.stock, b.reorderLevel);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return a.stock - b.stock;
      }
    }
  });
  return next;
}

function displayItemName(item: ItemSummaryRecord): string {
  const base = item.name?.trim() || item.sku?.trim() || "Unnamed item";
  const suffix = item.size?.trim() || item.variantName?.trim();
  // name is often already family+option from the API; join without repeating.
  return joinProductNameParts(base, suffix) || base;
}

function familyNameFromItem(item: ItemSummaryRecord): string | null {
  return (
    item.parentName?.trim() ||
    item.name?.trim() ||
    null
  );
}

function variantNameFromItem(item: ItemSummaryRecord): string | null {
  return item.variantName?.trim() || item.size?.trim() || null;
}

function mapItemToStockRow(
  item: ItemSummaryRecord,
  reorderByItemId: Map<string, number>,
  categoryByItemId: Map<string, string>,
): StockRow {
  const stock = toNum(item.stockQty) ?? 0;
  return {
    id: item.id,
    name: displayItemName(item),
    familyName: familyNameFromItem(item),
    variantName: variantNameFromItem(item),
    variantOfItemId: item.variantOfItemId?.trim() || null,
    sku: item.sku?.trim() || "",
    barcode: item.barcode?.trim() || "",
    brand: item.brand?.trim() || "",
    stock,
    reorderLevel: reorderByItemId.get(item.id) ?? null,
    categoryId: item.categoryId ?? null,
    categoryName:
      item.categoryName?.trim() ||
      categoryByItemId.get(item.id) ||
      null,
    itemTypeId: item.itemTypeId?.trim() || null,
    departmentName: null,
    aisleId: item.aisleId?.trim() || null,
    shelfName: item.aisleName?.trim() || item.aisleCode?.trim() || null,
    sellPrice: toNum(item.bundlePrice),
    buyPrice: toNum(item.buyingPrice),
    editable: !item.packageVariant,
  };
}

function composeStockDisplayName(
  familyName: string | null,
  variantName: string | null,
  fallback: string,
): string {
  const base = familyName?.trim() || fallback.trim() || "Unnamed item";
  const suffix = variantName?.trim();
  return joinProductNameParts(base, suffix) || base;
}

/** Sell below buy = margin loss (both prices set). */
function isPriceLoss(
  buyPrice: number | null,
  sellPrice: number | null,
): boolean {
  return buyPrice != null && sellPrice != null && sellPrice < buyPrice;
}

function parseMoneyInput(raw: string): number | null | undefined {
  const t = raw.trim().replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function priceInputValue(n: number | null): string {
  return n == null ? "" : String(n);
}

const catalogCellInput = cn(
  "h-8 w-full rounded-none border-0 bg-transparent px-2 text-[12px] leading-none",
  "text-[var(--order-ink,#15231f)]",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_34%,transparent)]",
  "caret-[var(--pos-primary,#0f766e)]",
  "selection:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_18%,transparent)]",
  "transition-colors duration-150",
  "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3.5%,transparent)]",
  "focus-visible:bg-white focus-visible:outline-none",
  "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const catalogCellMoneyInput = cn(
  catalogCellInput,
  "text-right font-mono tabular-nums",
);

const catalogCellSelect = cn(
  catalogCellInput,
  "cursor-pointer appearance-none pr-5",
);

const stockTool = cn(
  "h-7 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
  "px-2 text-[11px] tracking-[-0.01em] text-[var(--order-ink,#15231f)]",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
  "caret-[var(--pos-primary,#0f766e)]",
  "selection:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_18%,transparent)]",
  "transition-[border-color] duration-150",
  "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const stockCell = cn(
  "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] px-2.5 py-[0.4rem] align-middle",
);

const stockHeadCell = cn(
  "sticky top-0 z-[1] whitespace-nowrap bg-white px-2.5 py-1.5 text-left",
  "text-[10px] font-semibold tracking-[-0.02em]",
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]",
  "shadow-[inset_0_-1px_0_0_color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
);

/** Drag handle on the right edge of a stock table header cell. */
const stockColResizeHandleClass = cn(
  "absolute inset-y-0 -right-1.5 z-20 w-3 cursor-col-resize touch-none",
  "opacity-0 transition-opacity duration-75",
  "hover:opacity-100 group-hover/stock-col:opacity-100",
  "before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:-translate-x-1/2",
  "before:bg-transparent hover:before:bg-[var(--pos-primary,#0f766e)]",
  "group-hover/stock-col:before:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]",
  "active:before:bg-[var(--pos-primary,#0f766e)]",
  "focus-visible:opacity-100 focus-visible:outline-none",
  "focus-visible:before:bg-[var(--pos-primary,#0f766e)]",
);

const stockMute =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]";

const stockInk = "text-[var(--order-ink,#15231f)]";

const stockHair =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

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
    case "loss":
      return isPriceLoss(row.buyPrice, row.sellPrice);
    default:
      return true;
  }
}


type StockStatCardProps = {
  label: string;
  value: number;
  active: boolean;
  tone?: "default" | "success" | "warning" | "danger" | "loss";
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
        "inline-flex h-7 items-center gap-1 px-2 text-[11px] tracking-[-0.01em] transition-colors duration-150",
        "border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] last:border-r-0",
        active
          ? tone === "loss"
            ? "bg-orange-600 font-semibold text-white"
            : "bg-[var(--pos-primary,#0f766e)] font-semibold text-white"
          : cn(
              "font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
              "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)] hover:text-[var(--order-ink,#15231f)]",
            ),
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "font-mono text-[11px] tabular-nums",
          active ? "text-white/90" : "font-semibold",
          !active &&
            tone === "success" &&
            value > 0 &&
            "text-emerald-700 dark:text-emerald-400",
          !active &&
            tone === "warning" &&
            value > 0 &&
            "text-amber-700 dark:text-amber-400",
          !active &&
            tone === "danger" &&
            value > 0 &&
            "text-rose-700 dark:text-rose-400",
          !active &&
            tone === "loss" &&
            value > 0 &&
            "text-orange-700 dark:text-orange-300",
        )}
      >
        {value.toLocaleString("en-KE")}
      </span>
    </button>
  );
}

/** Mobile status chip — larger tap target than the desktop strip. */
function MobileStatusChip({
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
        "inline-flex h-11 shrink-0 items-center gap-1.5 border px-3.5 text-[13px] tracking-[-0.01em] transition-colors",
        stockHair,
        active
          ? tone === "loss"
            ? "border-orange-600 bg-orange-600 font-semibold text-white"
            : tone === "danger"
              ? "border-rose-600 bg-rose-600 font-semibold text-white"
              : tone === "warning"
                ? "border-amber-600 bg-amber-600 font-semibold text-white"
                : "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] font-semibold text-white"
          : cn(
              "bg-white font-medium",
              stockMute,
              "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
            ),
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "font-mono text-[13px] tabular-nums",
          active ? "text-white/95" : "font-semibold",
          !active &&
            tone === "success" &&
            value > 0 &&
            "text-emerald-700 dark:text-emerald-400",
          !active &&
            tone === "warning" &&
            value > 0 &&
            "text-amber-700 dark:text-amber-400",
          !active &&
            tone === "danger" &&
            value > 0 &&
            "text-rose-700 dark:text-rose-400",
          !active &&
            tone === "loss" &&
            value > 0 &&
            "text-orange-700 dark:text-orange-300",
          !active && tone === "default" && stockInk,
        )}
      >
        {value.toLocaleString("en-KE")}
      </span>
    </button>
  );
}

type StockRowItemProps = {
  row: StockRow;
  currency: string;
  canWrite: boolean;
  canCatalogWrite: boolean;
  categories: CategoryRecord[];
  itemTypes: ItemTypeRecord[];
  aisles: AisleRecord[];
  editing: boolean;
  editQty: string;
  editCost: string;
  saving: boolean;
  savingCatalog: boolean;
  onEditQtyChange: (value: string) => void;
  onEditCostChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onSaveFamily: (value: string) => void;
  onSaveVariant: (value: string) => void;
  onSaveCategory: (categoryId: string) => void;
  onSaveDepartment: (itemTypeId: string) => void;
  onSaveShelf: (aisleId: string) => void;
  onSaveBuyPrice: (value: string) => void;
  onSaveSellPrice: (value: string) => void;
};

function stockStatusMeta(row: StockRow): {
  out: boolean;
  low: boolean;
  loss: boolean;
  label: string;
  className: string;
} {
  const out = isOutOfStock(row.stock);
  const low = isLowStock(row.stock, row.reorderLevel);
  const loss = isPriceLoss(row.buyPrice, row.sellPrice);
  const label = out ? "Out" : low ? "Low" : "OK";
  const className = out
    ? "bg-rose-500/12 text-rose-800 dark:text-rose-300"
    : low
      ? "bg-amber-500/12 text-amber-900 dark:text-amber-200"
      : cn("bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,transparent)]", stockMute);
  return { out, low, loss, label, className };
}

const mobileFieldInput = cn(
  "h-14 w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white",
  "px-3 text-[18px] leading-none text-[var(--order-ink,#15231f)]",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
  "caret-[var(--pos-primary,#0f766e)]",
  "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const mobileStepBtn = cn(
  "inline-flex size-14 shrink-0 items-center justify-center border bg-white transition-colors",
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
  "text-[var(--order-ink,#15231f)]",
  "active:scale-[0.96] active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)]",
  "disabled:cursor-not-allowed disabled:opacity-40",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
);

type StockMobileCardProps = {
  row: StockRow;
  currency: string;
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

/** Thumb-first Take stock row — whole row opens qty pad; − / + then Save. */
function StockMobileCard({
  row,
  currency,
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
}: StockMobileCardProps) {
  const { out, low, loss, label, className: statusClass } = stockStatusMeta(row);
  const target = Number(editQty.trim());
  const targetOk = editQty.trim() !== "" && Number.isFinite(target) && target >= 0;
  const showCost = editing && targetOk && target > row.stock;
  const delta =
    editing && targetOk
      ? Math.round((target - row.stock) * 10000) / 10000
      : 0;
  const metaBits = [row.shelfName, row.barcode || row.sku].filter(Boolean);
  const canEdit = canWrite && row.editable;

  const bumpQty = (step: number) => {
    const current = Number(editQty.trim());
    const base = Number.isFinite(current) ? current : row.stock;
    const next = Math.max(0, Math.round((base + step) * 10000) / 10000);
    onEditQtyChange(String(next));
  };

  const qtyTone = out
    ? "border-rose-300/70 bg-rose-50 text-rose-800 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200"
    : low
      ? "border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100"
      : "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] text-[var(--order-ink,#15231f)]";

  return (
    <article
      className={cn(
        "transition-colors",
        editing
          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)]"
          : loss
            ? "bg-orange-500/[0.05]"
            : "bg-white",
      )}
    >
      {!editing ? (
        <button
          type="button"
          onClick={canEdit ? onStartEdit : undefined}
          disabled={!canEdit}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors",
            canEdit &&
              "active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
            "disabled:cursor-default",
          )}
          aria-label={
            canEdit
              ? `Set shelf qty for ${row.name}, currently ${row.stock}`
              : row.name
          }
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p
                className={cn(
                  "min-w-0 flex-1 text-[15px] font-semibold leading-snug tracking-[-0.015em]",
                  stockInk,
                )}
              >
                {row.name}
              </p>
              <span
                className={cn(
                  "mt-0.5 inline-flex shrink-0 items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
                  statusClass,
                )}
              >
                {label}
              </span>
            </div>
            {metaBits.length > 0 ? (
              <p className={cn("mt-1 truncate text-[12px] tabular-nums", stockMute)}>
                {metaBits.join(" · ")}
              </p>
            ) : null}
            {!canEdit && !row.editable ? (
              <p className={cn("mt-1 text-[11px]", stockMute)}>Stock on parent SKU</p>
            ) : null}
          </div>

          <div
            className={cn(
              "flex min-h-[3.75rem] min-w-[5.5rem] shrink-0 flex-col items-center justify-center gap-0.5 border px-2.5",
              qtyTone,
            )}
          >
            <span className="font-mono text-[1.65rem] font-semibold tabular-nums leading-none tracking-[-0.03em]">
              {row.stock.toLocaleString("en-KE")}
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.1em]",
                canEdit
                  ? "text-[var(--pos-primary,#0f766e)]"
                  : "opacity-60",
              )}
            >
              {canEdit ? "Set" : "Qty"}
            </span>
          </div>
        </button>
      ) : (
        <div className="space-y-3.5 px-3 py-3.5">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[15px] font-semibold leading-snug tracking-[-0.015em]",
                stockInk,
              )}
            >
              {row.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className={stockMute}>
                System{" "}
                <span className={cn("font-mono font-semibold tabular-nums", stockInk)}>
                  {row.stock.toLocaleString("en-KE")}
                </span>
              </span>
              {targetOk && Math.abs(delta) >= 0.0001 ? (
                <span
                  className={cn(
                    "font-mono font-semibold tabular-nums",
                    delta > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-300",
                  )}
                >
                  → {delta > 0 ? "+" : ""}
                  {delta.toLocaleString("en-KE")}
                </span>
              ) : (
                <span className={stockMute}>· type or tap − / +</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => bumpQty(-1)}
              disabled={saving || (targetOk && target <= 0)}
              className={mobileStepBtn}
              aria-label="Decrease by 1"
            >
              <Minus className="size-6" strokeWidth={2.25} aria-hidden />
            </button>
            <label className="min-w-0 flex-1">
              <span className="sr-only">On shelf now</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                autoFocus
                value={editQty}
                disabled={saving}
                onChange={(e) => onEditQtyChange(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
                className={cn(
                  mobileFieldInput,
                  "text-center font-mono text-[1.6rem] font-semibold tabular-nums",
                )}
                placeholder="0"
                aria-label={`New stock for ${row.name}`}
              />
            </label>
            <button
              type="button"
              onClick={() => bumpQty(1)}
              disabled={saving}
              className={mobileStepBtn}
              aria-label="Increase by 1"
            >
              <Plus className="size-6" strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          {showCost ? (
            <label className="block min-w-0">
              <span
                className={cn(
                  "mb-1.5 block text-[12px] font-semibold",
                  stockMute,
                )}
              >
                Cost per unit for +{delta.toLocaleString("en-KE")}
                {row.buyPrice != null ? (
                  <span className="ml-1 font-normal">
                    (buy {fmtMoney(row.buyPrice, currency)})
                  </span>
                ) : null}
              </span>
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
                className={cn(mobileFieldInput, "font-mono tabular-nums")}
                placeholder="0"
                aria-label={`Unit cost for ${row.name}`}
              />
            </label>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={saving || !targetOk || Math.abs(delta) < 0.0001}
              className="inline-flex h-14 flex-1 items-center justify-center gap-1.5 bg-[var(--pos-primary,#0f766e)] text-[15px] font-semibold text-white transition-[opacity,transform] active:scale-[0.99] active:opacity-90 disabled:opacity-40"
            >
              <Check className="size-5" aria-hidden />
              {saving
                ? "Saving…"
                : targetOk && Math.abs(delta) >= 0.0001
                  ? `Save ${target.toLocaleString("en-KE")}`
                  : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className={cn(
                "inline-flex h-14 items-center justify-center gap-1.5 border px-5 text-[15px] font-medium transition-colors disabled:opacity-40",
                stockHair,
                stockMute,
                "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]",
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function StockRowItem({
  row,
  currency,
  canWrite,
  canCatalogWrite,
  categories,
  itemTypes,
  aisles,
  editing,
  editQty,
  editCost,
  saving,
  savingCatalog,
  onEditQtyChange,
  onEditCostChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSaveFamily,
  onSaveVariant,
  onSaveCategory,
  onSaveDepartment,
  onSaveShelf,
  onSaveBuyPrice,
  onSaveSellPrice,
}: StockRowItemProps) {
  const { out, low, loss, label: statusLabel, className: statusClass } =
    stockStatusMeta(row);

  const target = Number(editQty.trim());
  const showCost =
    editing && Number.isFinite(target) && target > row.stock;

  return (
    <tr
      className={cn(
        "transition-colors duration-150",
        "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)]",
        loss &&
          "bg-orange-500/[0.06] hover:bg-orange-500/[0.1] dark:bg-orange-400/[0.09] dark:hover:bg-orange-400/[0.14]",
      )}
    >
      <td className={stockCell}>
        <Link
          href={`${APP_ROUTES.products}?search=${encodeURIComponent(row.name)}`}
          className={cn(
            "block truncate text-[12.5px] font-medium tracking-[-0.01em]",
            stockInk,
            "underline-offset-2 hover:text-[var(--pos-primary,#0f766e)] hover:underline",
          )}
        >
          {row.name}
        </Link>
        {row.barcode ? (
          <span
            className={cn(
              "mt-0.5 block truncate font-mono text-[10px] tabular-nums",
              stockMute,
            )}
          >
            {row.barcode}
          </span>
        ) : null}
      </td>
      <td className={cn(stockCell, "p-0")}>
        {canCatalogWrite ? (
          <input
            key={`family-${row.id}-${row.familyName ?? ""}`}
            type="text"
            defaultValue={row.familyName ?? ""}
            disabled={savingCatalog}
            onBlur={(e) => onSaveFamily(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = row.familyName ?? "";
                e.currentTarget.blur();
              }
            }}
            className={catalogCellInput}
            placeholder="Family"
            aria-label={`Family name for ${row.name}`}
          />
        ) : (
          <span className={cn("block truncate px-2 py-1.5 text-[12px]", stockMute)}>
            {row.familyName ?? "—"}
          </span>
        )}
      </td>
      <td className={cn(stockCell, "p-0")}>
        {canCatalogWrite ? (
          <input
            key={`variant-${row.id}-${row.variantName ?? ""}`}
            type="text"
            defaultValue={row.variantName ?? ""}
            disabled={savingCatalog}
            onBlur={(e) => onSaveVariant(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = row.variantName ?? "";
                e.currentTarget.blur();
              }
            }}
            className={catalogCellInput}
            placeholder="Variant"
            aria-label={`Variant name for ${row.name}`}
          />
        ) : (
          <span className={cn("block truncate px-2 py-1.5 text-[12px]", stockMute)}>
            {row.variantName ?? "—"}
          </span>
        )}
      </td>
      <td className={cn(stockCell, "p-0")}>
        {canCatalogWrite ? (
          <select
            value={row.categoryId ?? ""}
            disabled={savingCatalog}
            onChange={(e) => onSaveCategory(e.target.value)}
            className={catalogCellSelect}
            aria-label={`Category for ${row.name}`}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className={cn("block truncate px-2 py-1.5 text-[12px]", stockMute)}>
            {row.categoryName ?? "—"}
          </span>
        )}
      </td>
      <td className={cn(stockCell, "p-0")}>
        {canCatalogWrite ? (
          <select
            value={row.itemTypeId ?? ""}
            disabled={savingCatalog}
            onChange={(e) => onSaveDepartment(e.target.value)}
            className={catalogCellSelect}
            aria-label={`Department for ${row.name}`}
          >
            <option value="">—</option>
            {itemTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={cn("block truncate px-2 py-1.5 text-[12px]", stockMute)}>
            {row.departmentName ?? "—"}
          </span>
        )}
      </td>
      <td className={cn(stockCell, "p-0")}>
        {canCatalogWrite ? (
          <select
            value={row.aisleId ?? ""}
            disabled={savingCatalog}
            onChange={(e) => onSaveShelf(e.target.value)}
            className={catalogCellSelect}
            aria-label={`Shelf for ${row.name}`}
          >
            <option value="">—</option>
            {aisles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code?.trim() ? `${a.code} · ${a.name}` : a.name}
              </option>
            ))}
          </select>
        ) : (
          <span className={cn("block truncate px-2 py-1.5 text-[12px]", stockMute)}>
            {row.shelfName ?? "—"}
          </span>
        )}
      </td>
      <td className={cn(stockCell, "p-0")}>
        {editing ? (
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
            className={cn(catalogCellMoneyInput, "disabled:opacity-60")}
            placeholder="Qty"
            aria-label={`New stock for ${row.name}`}
          />
        ) : (
          <span
            className={cn(
              "block px-2 py-1.5 text-right font-mono text-[12px] tabular-nums",
              out || low
                ? "font-semibold text-rose-700 dark:text-rose-300"
                : stockInk,
            )}
          >
            {row.stock.toLocaleString("en-KE")}
          </span>
        )}
      </td>
      <td className={cn(stockCell, "text-right font-mono text-[12px] tabular-nums", stockMute)}>
        {row.reorderLevel != null && row.reorderLevel > 0
          ? row.reorderLevel.toLocaleString("en-KE")
          : "—"}
      </td>
      <td className={cn(stockCell, "p-0")}>
        {canCatalogWrite ? (
          <input
            key={`buy-${row.id}-${row.buyPrice ?? ""}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={priceInputValue(row.buyPrice)}
            disabled={savingCatalog}
            onBlur={(e) => onSaveBuyPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = priceInputValue(row.buyPrice);
                e.currentTarget.blur();
              }
            }}
            className={cn(
              catalogCellMoneyInput,
              loss && "font-semibold text-orange-800 dark:text-orange-300",
            )}
            placeholder="Buy"
            aria-label={`Buy price for ${row.name}`}
          />
        ) : (
          <span
            className={cn(
              "block px-2 py-1.5 text-right font-mono text-[12px] tabular-nums",
              loss
                ? "font-semibold text-orange-800 dark:text-orange-300"
                : stockInk,
            )}
          >
            {fmtMoney(row.buyPrice, currency)}
          </span>
        )}
      </td>
      <td className={cn(stockCell, "p-0")}>
        {canCatalogWrite ? (
          <input
            key={`sell-${row.id}-${row.sellPrice ?? ""}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={priceInputValue(row.sellPrice)}
            disabled={savingCatalog}
            onBlur={(e) => onSaveSellPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = priceInputValue(row.sellPrice);
                e.currentTarget.blur();
              }
            }}
            className={cn(
              catalogCellMoneyInput,
              loss && "font-semibold text-orange-800 dark:text-orange-300",
            )}
            placeholder="Sell"
            aria-label={`Sell price for ${row.name}`}
          />
        ) : (
          <span
            className={cn(
              "block px-2 py-1.5 text-right font-mono text-[12px] tabular-nums",
              loss
                ? "font-semibold text-orange-800 dark:text-orange-300"
                : stockInk,
            )}
          >
            {fmtMoney(row.sellPrice, currency)}
          </span>
        )}
      </td>
      <td className={cn(stockCell, "p-0")}>
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
            className={cn(catalogCellMoneyInput, "disabled:opacity-60")}
            placeholder="Cost"
            aria-label={`Unit cost for ${row.name}`}
          />
        ) : (
          <span className={cn("block px-2 py-1.5 text-right text-[12px]", stockMute)}>
            —
          </span>
        )}
      </td>
      <td className={stockCell}>
        <span
          className={cn(
            "inline-flex min-w-[2.25rem] items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
            statusClass,
          )}
        >
          {statusLabel}
        </span>
      </td>
      <td className={cn(stockCell, "p-0 text-right")}>
        {editing ? (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={saving || !editQty.trim()}
              className="inline-flex size-8 items-center justify-center bg-[var(--pos-primary,#0f766e)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Save stock"
            >
              <Check className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className={cn(
                "inline-flex size-8 items-center justify-center transition-colors disabled:opacity-40",
                stockMute,
                "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] hover:text-[var(--order-ink,#15231f)]",
              )}
              aria-label="Cancel"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : canWrite && row.editable ? (
          <button
            type="button"
            onClick={onStartEdit}
            className={cn(
              "inline-flex size-8 items-center justify-center transition-colors",
              stockMute,
              "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] hover:text-[var(--pos-primary,#0f766e)]",
            )}
            aria-label={`Edit stock for ${row.name}`}
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
        ) : (
          <span className={cn("block px-2 text-[10px]", stockMute)}>—</span>
        )}
      </td>
    </tr>
  );
}

function StockListSkeleton() {
  return (
    <div className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 px-3 py-3.5"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-[70%] animate-pulse rounded-sm bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
            <div className="h-2.5 w-[45%] animate-pulse rounded-sm bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
            <div className="h-2.5 w-[55%] animate-pulse rounded-sm bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,transparent)]" />
          </div>
          <div className="h-12 w-[4.5rem] shrink-0 animate-pulse border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,transparent)]" />
        </div>
      ))}
    </div>
  );
}

export function StockLevelsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLevelsView = searchParams.get("view") === "levels";

  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const {
    itemTypeId: headerItemTypeId,
    setItemTypeId,
    itemTypeLabel,
    itemTypes: sessionItemTypes,
  } = useSessionItemType();
  const allowed = canViewStockLevels(me, business);
  const canWrite = canEditStockLevels(me, business);
  const canCatalogWrite = hasPermission(
    me?.permissions,
    Permission.CatalogItemsWrite,
  );
  const currency = business?.currency?.trim() || "KES";
  const departmentLocked =
    me?.role?.key === "grocery_clerk" && sessionItemTypes.length === 1;

  const hubActions = useMemo(
    () => inventoryHubActionsForUser(me, business),
    [me, business],
  );

  const openLevels = useCallback(
    (status: "out" | "low" | "all" = "all") => {
      const params = new URLSearchParams();
      params.set("view", "levels");
      if (status === "out" || status === "low") {
        params.set("status", status);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router],
  );

  const closeLevels = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);


  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [aisles, setAisles] = useState<AisleRecord[]>([]);
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
  const [sortBy, setSortBy] = useState<StockSort>("attention");
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [supplierItemIds, setSupplierItemIds] = useState<Set<string> | null>(
    null,
  );
  const [supplierFilterLoading, setSupplierFilterLoading] = useState(false);
  const [fullCountProgress, setFullCountProgress] =
    useState<FullCountProgress | null>(null);

  useEffect(() => {
    if (!isLevelsView) return;
    const raw = searchParams.get("status");
    if (
      raw === "all" ||
      raw === "in_stock" ||
      raw === "low" ||
      raw === "out" ||
      raw === "loss"
    ) {
      setStatusFilter(raw);
    }
  }, [isLevelsView, searchParams]);

  const [rows, setRows] = useState<StockRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editCost, setEditCost] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingCatalogId, setSavingCatalogId] = useState<string | null>(null);
  /** Mobile: branch / supplier / sort stay collapsed until needed. */
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const loadMoreRef = useRef<() => void>(() => {});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const { guideRef, beginResize, resetColumn } =
    useStockColumnWidths(shellRef);
  const renderColHandle = (edge: StockResizableCol) => (
    <ColumnResizeHandle
      edge={edge}
      label={STOCK_COLUMN_LABELS[edge]}
      onResizeStart={beginResize}
      onReset={() => resetColumn(edge)}
      className={stockColResizeHandleClass}
    />
  );
  const reorderByItemIdRef = useRef(new Map<string, number>());
  const categoryByItemIdRef = useRef(new Map<string, string>());

  const departmentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of itemTypes) {
      map.set(t.id, t.label);
    }
    return map;
  }, [itemTypes]);

  const shelfLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of aisles) {
      const code = a.code?.trim();
      map.set(a.id, code ? `${code} · ${a.name}` : a.name);
    }
    return map;
  }, [aisles]);

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  const startEdit = useCallback((row: StockRow) => {
    setEditId(row.id);
    setEditQty(String(row.stock));
    // Prefill catalog buy price so increasing stock rarely needs retyping cost.
    setEditCost(row.buyPrice != null ? String(row.buyPrice) : "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditId(null);
    setEditQty("");
    setEditCost("");
  }, []);

  const saveFamily = useCallback(
    async (row: StockRow, raw: string) => {
      if (!canCatalogWrite) return;
      const next = formatProductNameForCatalog(raw);
      const prev = (row.familyName ?? "").trim();
      if (next === prev) return;
      if (!next) {
        toast.error("Family name is required.");
        return;
      }
      const targetId = row.variantOfItemId?.trim() || row.id;
      setSavingCatalogId(row.id);
      try {
        await patchItem(targetId, { name: next });
        setRows((list) =>
          list.map((r) => {
            if (r.id !== targetId && r.variantOfItemId !== targetId) {
              return r;
            }
            return {
              ...r,
              familyName: next,
              name: composeStockDisplayName(
                next,
                r.variantName,
                next,
              ),
            };
          }),
        );
        toast.success("Family name updated.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update family name.",
        );
      } finally {
        setSavingCatalogId(null);
      }
    },
    [canCatalogWrite],
  );

  const saveVariant = useCallback(
    async (row: StockRow, raw: string) => {
      if (!canCatalogWrite) return;
      const next = raw.trim().replace(/\s+/g, " ");
      const prev = (row.variantName ?? "").trim();
      if (next === prev) return;
      setSavingCatalogId(row.id);
      try {
        await patchItem(row.id, { variantName: next });
        const variantName = next || null;
        setRows((list) =>
          list.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  variantName,
                  name: composeStockDisplayName(
                    r.familyName,
                    variantName,
                    r.familyName || r.name,
                  ),
                }
              : r,
          ),
        );
        toast.success("Variant name updated.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update variant name.",
        );
      } finally {
        setSavingCatalogId(null);
      }
    },
    [canCatalogWrite],
  );

  const saveCategory = useCallback(
    async (row: StockRow, nextCategoryId: string) => {
      if (!canCatalogWrite) return;
      const next = nextCategoryId.trim();
      const prev = (row.categoryId ?? "").trim();
      if (next === prev) return;
      setSavingCatalogId(row.id);
      try {
        await patchItem(row.id, { categoryId: next });
        setRows((list) =>
          list.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  categoryId: next || null,
                  categoryName: next
                    ? categoryLabelById.get(next) ?? r.categoryName
                    : null,
                }
              : r,
          ),
        );
        toast.success("Category updated.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update category.",
        );
      } finally {
        setSavingCatalogId(null);
      }
    },
    [canCatalogWrite, categoryLabelById],
  );

  const saveDepartment = useCallback(
    async (row: StockRow, nextItemTypeId: string) => {
      if (!canCatalogWrite) return;
      const next = nextItemTypeId.trim();
      const prev = (row.itemTypeId ?? "").trim();
      if (next === prev) return;
      if (!next) {
        toast.error("Pick a department.");
        return;
      }
      setSavingCatalogId(row.id);
      try {
        await patchItem(row.id, { itemTypeId: next });
        setRows((list) =>
          list.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  itemTypeId: next,
                  departmentName: departmentLabelById.get(next) ?? r.departmentName,
                }
              : r,
          ),
        );
        toast.success("Department updated.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update department.",
        );
      } finally {
        setSavingCatalogId(null);
      }
    },
    [canCatalogWrite, departmentLabelById],
  );

  const saveShelf = useCallback(
    async (row: StockRow, nextAisleId: string) => {
      if (!canCatalogWrite) return;
      const next = nextAisleId.trim();
      const prev = (row.aisleId ?? "").trim();
      if (next === prev) return;
      setSavingCatalogId(row.id);
      try {
        await patchItem(row.id, { aisleId: next });
        setRows((list) =>
          list.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  aisleId: next || null,
                  shelfName: next
                    ? shelfLabelById.get(next) ?? r.shelfName
                    : null,
                }
              : r,
          ),
        );
        toast.success(next ? "Shelf updated." : "Shelf cleared.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update shelf.",
        );
      } finally {
        setSavingCatalogId(null);
      }
    },
    [canCatalogWrite, shelfLabelById],
  );

  const saveBuyPrice = useCallback(
    async (row: StockRow, raw: string) => {
      if (!canCatalogWrite) return;
      const parsed = parseMoneyInput(raw);
      if (parsed === undefined) {
        toast.error("Enter a valid buy price of zero or more.");
        return;
      }
      const prev = row.buyPrice;
      if (parsed == null && prev == null) return;
      if (parsed != null && prev != null && Math.abs(parsed - prev) < 0.0001) {
        return;
      }
      if (parsed == null) {
        toast.error("Buy price is required.");
        return;
      }
      setSavingCatalogId(row.id);
      try {
        await patchItem(row.id, { buyingPrice: parsed });
        setRows((list) =>
          list.map((r) =>
            r.id === row.id ? { ...r, buyPrice: parsed } : r,
          ),
        );
        toast.success("Buy price updated.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update buy price.",
        );
      } finally {
        setSavingCatalogId(null);
      }
    },
    [canCatalogWrite],
  );

  const saveSellPrice = useCallback(
    async (row: StockRow, raw: string) => {
      if (!canCatalogWrite) return;
      const parsed = parseMoneyInput(raw);
      if (parsed === undefined) {
        toast.error("Enter a valid sell price of zero or more.");
        return;
      }
      const prev = row.sellPrice;
      if (parsed == null && prev == null) return;
      if (parsed != null && prev != null && Math.abs(parsed - prev) < 0.0001) {
        return;
      }
      if (parsed == null) {
        toast.error("Sell price is required.");
        return;
      }
      setSavingCatalogId(row.id);
      try {
        await patchItem(row.id, { bundlePrice: parsed });
        setRows((list) =>
          list.map((r) =>
            r.id === row.id ? { ...r, sellPrice: parsed } : r,
          ),
        );
        toast.success("Sell price updated.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update sell price.",
        );
      } finally {
        setSavingCatalogId(null);
      }
    },
    [canCatalogWrite],
  );

  const saveEdit = useCallback(
    async (row: StockRow) => {
      const branch = branchId.trim();
      if (!branch || !canWrite) return;
      const targetRaw = editQty.trim();
      const target = Number(targetRaw);
      if (!targetRaw || !Number.isFinite(target) || target < 0) {
        toast.error("Enter an in-store quantity of zero or more.");
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
      fetchItemTypes().catch(() => [] as ItemTypeRecord[]),
      fetchAisles().catch(() => [] as AisleRecord[]),
      fetchSuppliers().catch(() => [] as SupplierRecord[]),
    ]).then(
      ([branchList, categoryList, itemTypeList, aisleList, supplierList]) => {
        setBranches(branchList);
        setCategories(
          [...categoryList]
            .filter((c) => c.active !== false)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setItemTypes(
          [...itemTypeList]
            .filter((t) => t.active !== false)
            .sort(
              (a, b) =>
                a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
            ),
        );
        setAisles(
          [...aisleList]
            .filter((a) => a.active !== false)
            .sort(
              (a, b) =>
                a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
            ),
        );
        setSuppliers(
          [...supplierList]
            .filter((s) => (s.status || "").toLowerCase() !== "inactive")
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      },
    );
  }, []);

  // Fall back to the first active branch when the header has no selection.
  useEffect(() => {
    if (isBranchLockedRole || branchId || branches.length === 0) return;
    const fallback = branches.find((b) => b.active)?.id ?? branches[0]?.id ?? "";
    if (fallback) setBranchId(fallback);
  }, [isBranchLockedRole, branchId, branches]);

  // Supplier → catalog item ids for Take stock filter.
  useEffect(() => {
    const sid = supplierId.trim();
    if (!sid) {
      setSupplierItemIds(null);
      setSupplierFilterLoading(false);
      return;
    }
    let cancelled = false;
    setSupplierFilterLoading(true);
    void fetchSupplierItemLinks(sid, {
      branchId: branchId.trim() || null,
    })
      .then((links) => {
        if (cancelled) return;
        const ids = new Set(
          links
            .filter((l) => l.active !== false)
            .map((l) => l.itemId.trim())
            .filter(Boolean),
        );
        setSupplierItemIds(ids);
      })
      .catch(() => {
        if (cancelled) return;
        setSupplierItemIds(new Set());
        toast.error("Could not load products for that supplier.");
      })
      .finally(() => {
        if (!cancelled) setSupplierFilterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId, branchId]);

  // Resume Full count across days — progress for hub + levels banner.
  useEffect(() => {
    const branch = branchId.trim();
    if (!branch || !allowed) {
      setFullCountProgress(null);
      return;
    }
    let cancelled = false;
    void fetchActiveStockTakeSession(branch)
      .then((res) => {
        if (cancelled) return;
        const session = res.session;
        if (!session || session.status !== "in_progress") {
          setFullCountProgress(null);
          return;
        }
        const total = session.summary?.totalCount ?? session.lines?.length ?? 0;
        const remaining = session.summary?.remainingCount ?? 0;
        const counted = Math.max(
          0,
          (session.summary?.submittedCount ?? 0) +
            (session.summary?.confirmedCount ?? 0),
        );
        const done = counted > 0 ? counted : Math.max(0, total - remaining);
        if (remaining <= 0 || total <= 0) {
          setFullCountProgress(null);
          return;
        }
        setFullCountProgress({
          counted: done,
          total,
          remaining,
          sessionName: session.name?.trim() || "Full count",
        });
      })
      .catch(() => {
        if (!cancelled) setFullCountProgress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, allowed]);

  const loadPage = useCallback(
    async (opts: { reset: boolean }) => {
      const branch = branchId.trim();
      if (!branch) {
        setRows([]);
        setHasMore(false);
        hasMoreRef.current = false;
        setTotalElements(0);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (opts.reset) {
        setLoading(true);
        setError(null);
        setEditId(null);
        setLoadingMore(false);
        loadingMoreRef.current = false;
        pageRef.current = 0;
        hasMoreRef.current = true;
        setHasMore(true);
      } else {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      try {
        if (opts.reset) {
          const reorderByItemId = new Map<string, number>();
          const categoryByItemId = new Map<string, string>();
          const dashboard = await fetchBatchDashboard({
            branchId: branch,
          }).catch(() => null);
          for (const product of dashboard?.lowStockProducts ?? []) {
            const level = toNum(product.reorderLevel);
            if (level != null) reorderByItemId.set(product.itemId, level);
            if (product.categoryName?.trim()) {
              categoryByItemId.set(product.itemId, product.categoryName.trim());
            }
          }
          reorderByItemIdRef.current = reorderByItemId;
          categoryByItemIdRef.current = categoryByItemId;
        }

        const page = opts.reset ? 0 : pageRef.current + 1;
        const selectedCategory = categoryId.trim();
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

        const mapped = result.content
          .filter((item) => !item.groupLabelOnly)
          .map((item) =>
            mapItemToStockRow(
              item,
              reorderByItemIdRef.current,
              categoryByItemIdRef.current,
            ),
          );

        if (opts.reset) {
          setRows(mapped);
        } else {
          setRows((prev) => {
            const seen = new Set(prev.map((r) => r.id));
            const next = [...prev];
            for (const row of mapped) {
              if (!seen.has(row.id)) next.push(row);
            }
            return next;
          });
        }

        pageRef.current = page;
        const more = !result.last;
        hasMoreRef.current = more;
        setHasMore(more);
        setTotalElements(result.totalElements ?? 0);
      } catch (e) {
        if (opts.reset) {
          setError(
            e instanceof Error ? e.message : "Failed to load stock levels.",
          );
          setRows([]);
          setHasMore(false);
          hasMoreRef.current = false;
          setTotalElements(0);
        } else {
          toast.error(
            e instanceof Error ? e.message : "Failed to load more stock.",
          );
        }
      } finally {
        if (opts.reset) setLoading(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [branchId, categoryId, headerItemTypeId],
  );

  const load = useCallback(() => {
    void loadPage({ reset: true });
  }, [loadPage]);

  const loadMore = useCallback(() => {
    void loadPage({ reset: false });
  }, [loadPage]);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    if (departmentLabelById.size === 0 && shelfLabelById.size === 0) return;
    setRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        let row = r;
        if (departmentLabelById.size > 0) {
          if (!r.itemTypeId) {
            if (r.departmentName != null) {
              changed = true;
              row = { ...row, departmentName: null };
            }
          } else {
            const label = departmentLabelById.get(r.itemTypeId) ?? null;
            if (label !== row.departmentName) {
              changed = true;
              row = { ...row, departmentName: label };
            }
          }
        }
        if (shelfLabelById.size > 0 && r.aisleId) {
          const shelf = shelfLabelById.get(r.aisleId) ?? row.shelfName;
          if (shelf !== row.shelfName) {
            changed = true;
            row = { ...row, shelfName: shelf };
          }
        }
        return row;
      });
      return changed ? next : prev;
    });
  }, [departmentLabelById, shelfLabelById]);

  useEffect(() => {
    if (!allowed) return;
    void loadPage({ reset: true });
  }, [loadPage, allowed]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (supplierItemIds && !supplierItemIds.has(r.id)) return false;
      if (!matchesStockStatus(r, statusFilter)) return false;
      if (
        q &&
        !textMatchesQuery(
          q,
          r.name,
          r.familyName,
          r.variantName,
          r.sku,
          r.barcode,
          r.brand,
          r.categoryName,
          r.departmentName,
          r.shelfName,
        )
      ) {
        return false;
      }
      return true;
    });
    return sortStockRows(filtered, sortBy);
  }, [rows, search, statusFilter, sortBy, supplierItemIds]);

  // When filters hide the loaded page, keep fetching until matches appear or list ends.
  useEffect(() => {
    if (loading || loadingMore || !hasMore || supplierFilterLoading) return;
    if (rows.length === 0) return;
    const filtering =
      Boolean(search.trim()) ||
      statusFilter !== "all" ||
      Boolean(supplierId.trim());
    if (!filtering) return;
    if (filteredRows.length > 0) return;
    loadMore();
  }, [
    loading,
    loadingMore,
    hasMore,
    supplierFilterLoading,
    rows.length,
    filteredRows.length,
    search,
    statusFilter,
    supplierId,
    loadMore,
  ]);

  useEffect(() => {
    if (loading || !hasMore) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreRef.current();
        }
      },
      {
        root: root ?? null,
        rootMargin: "240px 0px",
        threshold: 0,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, hasMore, filteredRows.length, rows.length]);

  const stockCounts = useMemo(
    () => ({
      total: rows.length,
      inStock: rows.filter((r) => isInStock(r.stock, r.reorderLevel)).length,
      low: rows.filter((r) => isLowStock(r.stock, r.reorderLevel)).length,
      out: rows.filter((r) => isOutOfStock(r.stock)).length,
      loss: rows.filter((r) => isPriceLoss(r.buyPrice, r.sellPrice)).length,
    }),
    [rows],
  );

  const emptyMessage = useMemo(() => {
    if (supplierId.trim() && supplierFilterLoading) {
      return "Loading supplier products…";
    }
    if (supplierId.trim() && supplierItemIds?.size === 0) {
      return "No catalog products linked to this supplier.";
    }
    if (supplierId.trim()) return "No stocked products for this supplier.";
    if (search.trim()) return "No products match your search.";
    if (statusFilter === "low") return "No low-stock products for this branch.";
    if (statusFilter === "out") return "No out-of-stock products for this branch.";
    if (statusFilter === "in_stock") return "No in-stock products for this branch.";
    if (statusFilter === "loss") return "No products selling below buy price.";
    if (categoryId) return "No products in this category.";
    return "No stocked products found for this branch.";
  }, [
    search,
    statusFilter,
    categoryId,
    supplierId,
    supplierItemIds,
    supplierFilterLoading,
  ]);

  const sortFilterOptions = useMemo(
    () =>
      [
        { value: "attention" as const, label: "Attention" },
        { value: "sell_desc" as const, label: "Highest sell" },
        { value: "buy_desc" as const, label: "Highest buy" },
        { value: "value_desc" as const, label: "Costliest" },
      ] as const,
    [],
  );

  const supplierFilterOptions = useMemo(
    () => [
      { value: "", label: "All suppliers" },
      ...suppliers.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ],
    [suppliers],
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ],
    [categories],
  );

  const activeBranchName =
    branches.find((b) => b.id === branchId)?.name?.trim() || "";

  const fullCountPct =
    fullCountProgress && fullCountProgress.total > 0
      ? Math.min(
          100,
          Math.round(
            (fullCountProgress.counted / fullCountProgress.total) * 100,
          ),
        )
      : 0;

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

  const departmentRail = (
    <div
      className={cn(
        "flex items-center gap-1.5 border-b px-2 py-1.5 sm:px-1.5 sm:py-1",
        "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]",
        "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)]",
      )}
    >
      <span
        className={cn(
          "shrink-0 px-1 text-[9px] font-bold uppercase tracking-[0.16em]",
          "text-[var(--pos-primary,#0f766e)]",
        )}
      >
        Dept
      </span>
      {departmentLocked ? (
        <span
          className={cn(
            "inline-flex min-w-0 flex-1 items-center gap-1.5 truncate px-1.5 py-1.5 text-[13px] font-semibold sm:py-1 sm:text-[12px]",
            stockInk,
          )}
          title="Department switching is disabled for your role"
        >
          <Lock className="size-3.5 shrink-0 opacity-60 sm:size-3" aria-hidden />
          {itemTypeLabel || sessionItemTypes[0]?.label || "Department"}
        </span>
      ) : (
        <div
          className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Department"
        >
          <button
            type="button"
            onClick={() => setItemTypeId("")}
            className={cn(
              "h-9 shrink-0 px-3 text-[12px] font-semibold tracking-[-0.01em] transition-colors sm:h-7 sm:px-2.5 sm:text-[11px]",
              !headerItemTypeId.trim()
                ? "bg-[var(--pos-primary,#0f766e)] text-white"
                : cn(
                    "border bg-white",
                    stockHair,
                    stockMute,
                    "active:text-[var(--order-ink,#15231f)] hover:text-[var(--order-ink,#15231f)]",
                  ),
            )}
          >
            All
          </button>
          {sessionItemTypes.map((t) => {
            const active = headerItemTypeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setItemTypeId(t.id)}
                className={cn(
                  "h-9 max-w-[10rem] shrink-0 truncate px-3 text-[12px] font-semibold tracking-[-0.01em] transition-colors sm:h-7 sm:px-2.5 sm:text-[11px]",
                  active
                    ? "bg-[var(--pos-primary,#0f766e)] text-white"
                    : cn(
                        "border bg-white",
                        stockHair,
                        stockMute,
                        "active:text-[var(--order-ink,#15231f)] hover:text-[var(--order-ink,#15231f)]",
                      ),
                )}
                title={t.label}
              >
                {t.label}
                {t.isDefault ? " ★" : ""}
              </button>
            );
          })}
        </div>
      )}
      {isLevelsView && (rows.length > 0 || loading) ? (
        <p
          className={cn(
            "hidden shrink-0 truncate pl-1 text-[10px] sm:block",
            stockMute,
          )}
        >
          <span className={cn("font-semibold tabular-nums", stockInk)}>
            {filteredRows.length.toLocaleString("en-KE")}
          </span>
          {hasMore || (totalElements > 0 && rows.length < totalElements)
            ? ` · ${rows.length.toLocaleString("en-KE")}${
                totalElements > 0
                  ? `/${totalElements.toLocaleString("en-KE")}`
                  : ""
              }`
            : " shown"}
        </p>
      ) : null}
    </div>
  );

  if (!isLevelsView) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className={cn("rounded-none border bg-white", stockHair)}>
          {departmentRail}
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <StockActionHub
              actions={hubActions}
              branchName={activeBranchName}
              departmentLabel={itemTypeLabel}
              outCount={loading && rows.length === 0 ? null : stockCounts.out}
              lowCount={loading && rows.length === 0 ? null : stockCounts.low}
              countsLoading={loading && rows.length === 0}
              onOpenLevels={openLevels}
              fullCountProgress={fullCountProgress}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="flex min-h-0 flex-col gap-1">
        <header
          className={cn(
            "sticky top-0 z-20 -mx-3 flex items-center gap-3 border-b bg-white/92 px-3 py-2.5 backdrop-blur-xl sm:mx-0 sm:border",
            stockHair,
          )}
        >
          <button
            type="button"
            onClick={closeLevels}
            className={cn(
              "inline-flex size-11 items-center justify-center border transition-colors sm:size-9",
              stockHair,
              stockMute,
              "active:border-[var(--pos-primary,#0f766e)] active:text-[var(--pos-primary,#0f766e)]",
              "hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--pos-primary,#0f766e)]",
            )}
            aria-label="Back to Stock"
          >
            <ArrowLeft className="size-5 sm:size-4" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "truncate font-heading text-[1.2rem] font-semibold tracking-[-0.02em]",
                stockInk,
              )}
            >
              Inventory
            </h1>
            <p className={cn("truncate text-[12px]", stockMute)}>
              {[activeBranchName, itemTypeLabel].filter(Boolean).join(" · ") ||
                "Tap a product · set shelf qty"}
            </p>
          </div>
        </header>

        <div className={cn("rounded-none border bg-white", stockHair)}>
          {departmentRail}

          {fullCountProgress && fullCountProgress.remaining > 0 ? (
            <Link
              href={APP_ROUTES.inventoryStockTake}
              className={cn(
                "flex items-center gap-2.5 border-b px-3 py-2.5 transition-colors",
                stockHair,
                "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]",
                "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
              )}
            >
              <ClipboardList
                className="size-4 shrink-0 text-[var(--pos-primary,#0f766e)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-[12px] font-semibold tracking-[-0.01em]", stockInk)}>
                  Full count · {fullCountProgress.counted.toLocaleString("en-KE")}/
                  {fullCountProgress.total.toLocaleString("en-KE")}
                  <span className={cn("ml-1.5 font-normal", stockMute)}>
                    · {fullCountProgress.remaining.toLocaleString("en-KE")} left
                  </span>
                </p>
                <div
                  className={cn(
                    "mt-1.5 h-1 overflow-hidden bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,white)]",
                  )}
                  role="progressbar"
                  aria-valuenow={fullCountPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Full count progress"
                >
                  <div
                    className="h-full bg-[var(--pos-primary,#0f766e)]"
                    style={{ width: `${fullCountPct}%` }}
                  />
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 text-[10px] font-bold uppercase tracking-[0.1em]",
                  "text-[var(--pos-primary,#0f766e)]",
                )}
              >
                Resume
              </span>
            </Link>
          ) : null}

          {/* Search + status + filters — always above the list on mobile */}
          <div
            className={cn(
              "border-b bg-white sm:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)]",
              stockHair,
            )}
          >
            {/* Mobile: search + filters toggle */}
            <div className="flex items-center gap-2 px-2.5 py-2 sm:hidden">
              <span className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, barcode, SKU…"
                  className={cn(
                    "h-11 w-full rounded-none border bg-white pl-10 pr-3 text-[15px]",
                    stockHair,
                    stockInk,
                    "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
                    "caret-[var(--pos-primary,#0f766e)]",
                    "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
                  )}
                  aria-label="Search stock"
                />
              </span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className={cn(
                  "relative inline-flex h-11 shrink-0 items-center gap-1.5 border bg-white px-3 text-[12px] font-semibold",
                  stockHair,
                  stockInk,
                  mobileFiltersOpen &&
                    "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
                )}
                aria-expanded={mobileFiltersOpen}
                aria-label="More filters"
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                Filters
                {supplierId || categoryId || sortBy !== "attention" ? (
                  <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[var(--pos-primary,#0f766e)]" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading || !branchId}
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center border bg-white",
                  stockHair,
                  "disabled:opacity-50",
                )}
                aria-label="Refresh stock"
              >
                <RefreshCw
                  className={cn("size-4", loading && "animate-spin")}
                  aria-hidden
                />
              </button>
            </div>

            {/* Mobile: status chips */}
            {(rows.length > 0 || loading) && (
              <div
                className={cn(
                  "flex gap-1.5 overflow-x-auto px-2.5 pb-2 sm:hidden",
                  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                )}
                role="group"
                aria-label="Stock status"
              >
                <MobileStatusChip
                  label="All"
                  value={stockCounts.total}
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                />
                <MobileStatusChip
                  label="Out"
                  value={stockCounts.out}
                  active={statusFilter === "out"}
                  tone="danger"
                  onClick={() => setStatusFilter("out")}
                />
                <MobileStatusChip
                  label="Low"
                  value={stockCounts.low}
                  active={statusFilter === "low"}
                  tone="warning"
                  onClick={() => setStatusFilter("low")}
                />
                <MobileStatusChip
                  label="In"
                  value={stockCounts.inStock}
                  active={statusFilter === "in_stock"}
                  tone="success"
                  onClick={() => setStatusFilter("in_stock")}
                />
                <MobileStatusChip
                  label="Loss"
                  value={stockCounts.loss}
                  active={statusFilter === "loss"}
                  tone="loss"
                  onClick={() => setStatusFilter("loss")}
                />
              </div>
            )}

            {/* Mobile: secondary filters panel */}
            {mobileFiltersOpen ? (
              <div
                className={cn(
                  "grid grid-cols-2 gap-2 border-t px-2.5 py-2.5 sm:hidden",
                  stockHair,
                )}
              >
                {!isBranchLockedRole ? (
                  <label className="col-span-2 block min-w-0">
                    <span
                      className={cn(
                        "mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em]",
                        stockMute,
                      )}
                    >
                      Branch
                    </span>
                    <select
                      value={branchId}
                      onChange={(e) => onChangeBranch(e.target.value)}
                      className={cn(
                        "h-11 w-full cursor-pointer border bg-white px-3 text-[14px]",
                        stockHair,
                        stockInk,
                      )}
                      aria-label="Branch"
                    >
                      <option value="">Choose branch…</option>
                      {branches
                        .filter((b) => b.active || b.id === branchId)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
                <div className="min-w-0">
                  <span
                    className={cn(
                      "mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em]",
                      stockMute,
                    )}
                  >
                    Category
                  </span>
                  <StockFilterMenu
                    className="w-full [&_button]:h-11 [&_button]:text-[13px]"
                    label="Category"
                    value={categoryId}
                    options={categoryFilterOptions}
                    onChange={setCategoryId}
                    disabled={!branchId}
                    wide
                  />
                </div>
                <div className="min-w-0">
                  <span
                    className={cn(
                      "mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em]",
                      stockMute,
                    )}
                  >
                    Supplier
                  </span>
                  <StockFilterMenu
                    className="w-full [&_button]:h-11 [&_button]:text-[13px]"
                    label="Supplier"
                    value={supplierId}
                    options={supplierFilterOptions}
                    onChange={setSupplierId}
                    disabled={!branchId || suppliers.length === 0}
                    wide
                  />
                </div>
                <div className="col-span-2 min-w-0">
                  <span
                    className={cn(
                      "mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em]",
                      stockMute,
                    )}
                  >
                    Sort
                  </span>
                  <StockFilterMenu
                    className="w-full [&_button]:h-11 [&_button]:text-[13px]"
                    label="Sort"
                    value={sortBy}
                    options={sortFilterOptions}
                    onChange={setSortBy}
                    disabled={!branchId}
                  />
                </div>
              </div>
            ) : null}

            {/* Desktop / tablet: dense one-row toolbar */}
            <div
              className={cn(
                "hidden flex-wrap items-center gap-x-1.5 gap-y-1 px-1.5 py-1 sm:flex",
              )}
            >
              {(rows.length > 0 || loading) && (
                <div
                  className={cn(
                    "max-w-full overflow-hidden border bg-white",
                    stockHair,
                  )}
                  role="group"
                  aria-label="Stock summary"
                >
                  <div className="inline-flex">
                    <StockStatCard
                      label="All"
                      value={stockCounts.total}
                      active={statusFilter === "all"}
                      onClick={() => setStatusFilter("all")}
                    />
                    <StockStatCard
                      label="In"
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
                    <StockStatCard
                      label="Loss"
                      value={stockCounts.loss}
                      active={statusFilter === "loss"}
                      tone="loss"
                      onClick={() => setStatusFilter("loss")}
                    />
                  </div>
                </div>
              )}

              <span className="relative min-w-0 flex-1 basis-[8rem]">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className={cn(stockTool, "w-full pl-7")}
                  aria-label="Search stock"
                />
              </span>

              {!isBranchLockedRole ? (
                <select
                  value={branchId}
                  onChange={(e) => onChangeBranch(e.target.value)}
                  className={cn(
                    stockTool,
                    "w-[8.25rem] cursor-pointer py-0",
                  )}
                  aria-label="Branch"
                >
                  <option value="">Branch…</option>
                  {branches
                    .filter((b) => b.active || b.id === branchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              ) : null}

              <StockFilterMenu
                className="w-[8.75rem]"
                label="Category"
                value={categoryId}
                options={categoryFilterOptions}
                onChange={setCategoryId}
                disabled={!branchId}
                wide
              />

              <StockFilterMenu
                className="w-[9.5rem]"
                label="Supplier"
                value={supplierId}
                options={supplierFilterOptions}
                onChange={setSupplierId}
                disabled={!branchId || suppliers.length === 0}
                wide
              />

              <StockFilterMenu
                className="w-[9.25rem]"
                label="Sort"
                value={sortBy}
                options={sortFilterOptions}
                onChange={setSortBy}
                disabled={!branchId}
                align="end"
              />

              <button
                type="button"
                onClick={() => void load()}
                disabled={loading || !branchId}
                className={cn(
                  stockTool,
                  "inline-flex size-7 shrink-0 items-center justify-center px-0",
                  "hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--pos-primary,#0f766e)]",
                  "disabled:opacity-50",
                )}
                aria-label="Refresh stock"
              >
                <RefreshCw
                  className={cn("size-3.5", loading && "animate-spin")}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          {error ? (
            <p className="border-b border-rose-600/20 bg-rose-500/5 px-3 py-1.5 text-xs text-rose-800 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          {canWrite && rows.length > 0 ? (
            <p
              className={cn(
                "border-b px-3 py-2 text-[12px] sm:hidden",
                stockHair,
                "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)]",
                "text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]",
              )}
            >
              Tap any row → set qty with − / + → Save
            </p>
          ) : !canWrite && !canCatalogWrite && rows.length > 0 ? (
            <p
              className={cn(
                "border-b px-3 py-1.5 text-[11px]",
                stockHair,
                stockMute,
              )}
            >
              View-only — ask an admin for stock or catalog edit access.
            </p>
          ) : null}

          {!branchId ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Package
                className="size-6 text-[color-mix(in_srgb,var(--order-ink,#15231f)_26%,transparent)]"
                aria-hidden
              />
              <p className={cn("max-w-sm text-[13px]", stockMute)}>
                {isBranchLockedRole
                  ? "Your account is not assigned to a branch. Contact your administrator."
                  : "Choose a branch to see in-store stock."}
              </p>
            </div>
          ) : loading ? (
            <StockListSkeleton />
          ) : filteredRows.length === 0 ? (
            <div className={cn("px-4 py-12 text-center text-[13px]", stockMute)}>
              <p className={cn("font-medium", stockInk)}>
                {loadingMore || hasMore
                  ? "Loading more products…"
                  : emptyMessage}
              </p>
              {!loadingMore && !hasMore ? (
                <p className="mt-1 text-[11px]">
                  Try another filter, category, or search.
                </p>
              ) : null}
              <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="max-h-[min(78dvh,56rem)] overflow-auto overscroll-contain selection:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_16%,transparent)] sm:max-h-[min(74vh,56rem)]"
            >
              {/* Mobile: stacked cards — edit stock without horizontal scroll */}
              <div
                className={cn(
                  "divide-y sm:hidden",
                  "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]",
                )}
              >
                {filteredRows.map((row) => (
                  <StockMobileCard
                    key={row.id}
                    row={row}
                    currency={currency}
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

              {/* Desktop: full spreadsheet */}
              <div
                ref={shellRef}
                className={cn(sheetStyles.shell, "hidden sm:block")}
              >
                {/* Restores persisted widths before the table's first paint. */}
                <script
                  dangerouslySetInnerHTML={{
                    __html: STOCK_COL_WIDTHS_RESTORE_SCRIPT,
                  }}
                />
                <div
                  ref={guideRef}
                  className={sheetStyles.guide}
                  hidden
                  aria-hidden
                />
                <table
                  className="table-fixed border-collapse text-left"
                  style={{ width: "var(--stock-table-min-width)" }}
                >
                  <colgroup>
                    {STOCK_COLUMN_ORDER.map((col) => (
                      <col
                        key={col}
                        style={{ width: `var(${STOCK_COL_CSS_VARS[col]})` }}
                      />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(stockHeadCell, "group/stock-col")}>
                        Product
                        {renderColHandle("product")}
                      </th>
                      <th className={cn(stockHeadCell, "group/stock-col")}>
                        Family
                        {renderColHandle("family")}
                      </th>
                      <th className={cn(stockHeadCell, "group/stock-col")}>
                        Variant
                        {renderColHandle("variant")}
                      </th>
                      <th className={cn(stockHeadCell, "group/stock-col")}>
                        Category
                        {renderColHandle("category")}
                      </th>
                      <th className={cn(stockHeadCell, "group/stock-col")}>
                        Department
                        {renderColHandle("department")}
                      </th>
                      <th className={cn(stockHeadCell, "group/stock-col")}>
                        Shelf
                        {renderColHandle("shelf")}
                      </th>
                      <th
                        className={cn(stockHeadCell, "group/stock-col text-right")}
                      >
                        In store
                        {renderColHandle("inStore")}
                      </th>
                      <th
                        className={cn(stockHeadCell, "group/stock-col text-right")}
                      >
                        Reorder
                        {renderColHandle("reorder")}
                      </th>
                      <th
                        className={cn(stockHeadCell, "group/stock-col text-right")}
                      >
                        Buy
                        {renderColHandle("buy")}
                      </th>
                      <th
                        className={cn(stockHeadCell, "group/stock-col text-right")}
                      >
                        Sell
                        {renderColHandle("sell")}
                      </th>
                      <th
                        className={cn(stockHeadCell, "group/stock-col text-right")}
                      >
                        Unit cost
                        {renderColHandle("unitCost")}
                      </th>
                      <th className={cn(stockHeadCell, "group/stock-col")}>
                        Status
                        {renderColHandle("status")}
                      </th>
                      <th
                        className={cn(stockHeadCell, "group/stock-col text-right")}
                      >
                        Edit
                        {renderColHandle("edit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <StockRowItem
                        key={row.id}
                        row={row}
                        currency={currency}
                        canWrite={canWrite}
                        canCatalogWrite={canCatalogWrite}
                        categories={categories}
                        itemTypes={itemTypes}
                        aisles={aisles}
                        editing={editId === row.id}
                        editQty={editId === row.id ? editQty : ""}
                        editCost={editId === row.id ? editCost : ""}
                        saving={savingEdit && editId === row.id}
                        savingCatalog={savingCatalogId === row.id}
                        onEditQtyChange={setEditQty}
                        onEditCostChange={setEditCost}
                        onStartEdit={() => startEdit(row)}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={() => void saveEdit(row)}
                        onSaveFamily={(value) => void saveFamily(row, value)}
                        onSaveVariant={(value) => void saveVariant(row, value)}
                        onSaveCategory={(value) => void saveCategory(row, value)}
                        onSaveDepartment={(value) =>
                          void saveDepartment(row, value)
                        }
                        onSaveShelf={(value) => void saveShelf(row, value)}
                        onSaveBuyPrice={(value) => void saveBuyPrice(row, value)}
                        onSaveSellPrice={(value) =>
                          void saveSellPrice(row, value)
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div ref={sentinelRef} className="h-8 w-full" aria-hidden />
              {loadingMore ? (
                <p
                  className={cn(
                    "border-t px-3 py-1.5 text-center text-[11px]",
                    stockHair,
                    stockMute,
                  )}
                >
                  Loading more…
                </p>
              ) : null}
              {!hasMore && rows.length > 0 ? (
                <p
                  className={cn(
                    "border-t px-3 py-1.5 text-center text-[11px]",
                    stockHair,
                    "text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]",
                  )}
                >
                  End of list
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

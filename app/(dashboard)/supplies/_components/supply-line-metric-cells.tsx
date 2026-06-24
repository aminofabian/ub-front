"use client";

import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { nsdInput } from "./new-supply-drawer-ui";

type MetricTone =
  | "empty"
  | "invalid"
  | "active"
  | "ready"
  | "computed"
  | "matched"
  | "readonly"
  | "low"
  | "out";

const METRIC_SHELL: Record<MetricTone, string> = {
  empty: "border-border/70 bg-muted/15",
  invalid:
    "border-amber-500/40 bg-amber-500/[0.07] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]",
  active:
    "border-foreground/20 bg-background shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]",
  ready:
    "border-primary/45 bg-primary/[0.07] shadow-[inset_0_0_0_1px_rgba(40,167,69,0.1)]",
  computed:
    "border-primary/40 bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgba(40,167,69,0.08)]",
  matched:
    "border-primary/35 bg-primary/[0.05] shadow-[inset_0_0_0_1px_rgba(40,167,69,0.06)]",
  readonly: "border-border/50 bg-muted/25",
  low:
    "border-amber-500/40 bg-amber-500/[0.07] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]",
  out:
    "border-red-500/45 bg-red-500/[0.07] shadow-[inset_0_0_0_1px_rgba(239,68,68,0.08)]",
};

function parsePositiveQty(raw: string): number | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function parseNonNeg(raw: string): number | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

function moneyMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

function formatQty(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type CompactProps = {
  compact?: boolean;
  label?: string;
};

type SupplyQtyCellProps = CompactProps & {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  isReady?: boolean;
};

export function SupplyQtyCell({
  value,
  onChange,
  disabled = false,
  isReady = false,
  compact = false,
  label,
}: SupplyQtyCellProps) {
  const parsed = parsePositiveQty(value);
  const hasText = value.trim().length > 0;
  const tone: MetricTone = !hasText
    ? "empty"
    : parsed == null
      ? "invalid"
      : isReady
        ? "ready"
        : "active";

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-0.5" : "gap-1")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "relative flex min-w-0 items-center rounded-sm border transition-[border-color,background-color,box-shadow] duration-150",
          compact ? "h-7" : "h-8",
          METRIC_SHELL[tone],
        )}
      >
        <input
          className={cn(
            nsdInput,
            "h-full min-w-0 flex-1 border-0 bg-transparent px-1.5 shadow-none",
            "text-right font-mono tabular-nums",
            compact ? "text-xs" : "text-sm",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            tone === "ready" && "font-semibold text-primary",
            tone === "invalid" && "text-amber-800 dark:text-amber-200",
          )}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          inputMode="decimal"
          placeholder="0"
          aria-label="Quantity received"
        />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1 leading-none">
        {tone === "invalid" ? (
          <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
            Enter qty &gt; 0
          </span>
        ) : tone === "ready" ? (
          <span className="rounded-sm bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">
            Ready
          </span>
        ) : parsed != null ? (
          <span className="text-[10px] text-muted-foreground">
            +{formatQty(parsed)} units
          </span>
        ) : null}
      </div>
    </div>
  );
}

type SupplyStockCellProps = CompactProps & {
  stock: number | null;
  reorderLevel?: number | null;
};

function resolveStockTone(
  stock: number | null,
  reorderLevel: number | null | undefined,
): MetricTone {
  if (stock == null) {
    return "empty";
  }
  if (stock <= 0) {
    return "out";
  }
  if (
    reorderLevel != null &&
    reorderLevel > 0 &&
    stock <= reorderLevel
  ) {
    return "low";
  }
  return "readonly";
}

export function SupplyStockCell({
  stock,
  reorderLevel = null,
  compact = false,
  label,
}: SupplyStockCellProps) {
  const tone = resolveStockTone(stock, reorderLevel);

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-0.5" : "gap-1")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 items-center justify-end rounded-sm border px-1.5 transition-[border-color,background-color,box-shadow] duration-150",
          compact ? "h-7" : "h-8",
          METRIC_SHELL[tone],
        )}
        title={
          stock != null
            ? reorderLevel != null && reorderLevel > 0
              ? `On hand ${formatQty(stock)} · reorder at ${formatQty(reorderLevel)}`
              : `On hand ${formatQty(stock)}`
            : "Stock level unavailable for this line"
        }
      >
        <span
          className={cn(
            "font-mono tabular-nums",
            compact ? "text-xs" : "text-sm",
            stock == null && "text-muted-foreground/60",
            tone === "out" && "font-semibold text-red-700 dark:text-red-300",
            tone === "low" && "font-semibold text-amber-800 dark:text-amber-200",
            tone === "readonly" && "text-foreground",
          )}
        >
          {stock != null ? formatQty(stock) : "—"}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 leading-none">
        {tone === "out" ? (
          <span className="rounded-sm bg-red-500/12 px-1 py-px text-[10px] font-medium text-red-700 dark:text-red-300">
            Out of stock
          </span>
        ) : tone === "low" ? (
          <span className="rounded-sm bg-amber-500/12 px-1 py-px text-[10px] font-medium text-amber-800 dark:text-amber-200">
            Low
            {reorderLevel != null && reorderLevel > 0
              ? ` · ≤${formatQty(reorderLevel)}`
              : ""}
          </span>
        ) : stock != null ? (
          <span className="text-[10px] text-muted-foreground">On hand</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">No data</span>
        )}
      </div>
    </div>
  );
}

type SupplyStockAfterCellProps = CompactProps & {
  stock: number | null;
  stockAfter: number | null;
  qty: number | null;
};

export function SupplyStockAfterCell({
  stock,
  stockAfter,
  qty,
  compact = false,
  label,
}: SupplyStockAfterCellProps) {
  const tone: MetricTone =
    stockAfter == null ? "empty" : qty != null ? "computed" : "readonly";
  const delta = qty != null ? qty : null;

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-0.5" : "gap-1")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 items-center justify-end rounded-sm border px-1.5 transition-[border-color,background-color,box-shadow] duration-150",
          compact ? "h-7" : "h-8",
          METRIC_SHELL[tone],
        )}
        title={
          stock != null && stockAfter != null
            ? `Stock ${formatQty(stock)} → ${formatQty(stockAfter)} after receiving`
            : undefined
        }
      >
        <span
          className={cn(
            "font-mono tabular-nums",
            compact ? "text-xs" : "text-sm",
            stockAfter == null
              ? "text-muted-foreground/60"
              : tone === "computed"
                ? "font-semibold text-primary"
                : "text-foreground",
          )}
        >
          {stockAfter != null ? formatQty(stockAfter) : "—"}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 leading-none">
        {stock != null && delta != null ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <span className="font-mono tabular-nums">{formatQty(stock)}</span>
            <ArrowRight className="size-2.5 shrink-0 opacity-60" aria-hidden />
            <span className="rounded-sm bg-primary/10 px-1 py-px font-mono tabular-nums text-primary">
              +{formatQty(delta)}
            </span>
          </span>
        ) : stock != null ? (
          <span className="text-[10px] text-muted-foreground">
            On hand {formatQty(stock)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type SupplyCostCellProps = CompactProps & {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** Last or default cost from supplier link, for hint badge. */
  referenceCost?: number | null;
};

export function SupplyCostCell({
  value,
  onChange,
  disabled = false,
  referenceCost = null,
  compact = false,
  label,
}: SupplyCostCellProps) {
  const parsed = parseNonNeg(value);
  const hasText = value.trim().length > 0;
  const matchesRef =
    parsed != null &&
    referenceCost != null &&
    referenceCost > 0 &&
    moneyMatch(parsed, referenceCost);

  const tone: MetricTone = !hasText
    ? "empty"
    : parsed == null
      ? "invalid"
      : matchesRef
        ? "matched"
        : "active";

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-0.5" : "gap-1")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "relative flex min-w-0 items-center rounded-sm border transition-[border-color,background-color,box-shadow] duration-150",
          compact ? "h-7" : "h-8",
          METRIC_SHELL[tone],
        )}
      >
        <input
          className={cn(
            nsdInput,
            "h-full min-w-0 flex-1 border-0 bg-transparent px-1.5 shadow-none",
            "text-right font-mono tabular-nums",
            compact ? "text-xs" : "text-sm",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            matchesRef && "text-primary",
            tone === "invalid" && "text-amber-800 dark:text-amber-200",
          )}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          inputMode="decimal"
          placeholder="0.00"
          aria-label="Buying price per unit"
        />
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 leading-none">
        {tone === "invalid" ? (
          <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
            Invalid cost
          </span>
        ) : matchesRef ? (
          <span className="rounded-sm bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">
            Last cost {referenceCost!.toFixed(2)}
          </span>
        ) : referenceCost != null && referenceCost > 0 && !hasText ? (
          <span className="text-[10px] text-muted-foreground">
            Last {referenceCost.toFixed(2)}
          </span>
        ) : parsed != null ? (
          <span className="text-[10px] text-muted-foreground">Per unit</span>
        ) : null}
      </div>
    </div>
  );
}

type SupplyLineTotalCellProps = CompactProps & {
  total: number | null;
  qty: number | null;
  unitCost: number | null;
  isReady?: boolean;
};

export function SupplyLineTotalCell({
  total,
  qty,
  unitCost,
  isReady = false,
  compact = false,
  label,
}: SupplyLineTotalCellProps) {
  const tone: MetricTone =
    total == null ? "empty" : isReady ? "ready" : "computed";

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-0.5" : "gap-1")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 items-center justify-end rounded-sm border px-1.5 transition-[border-color,background-color,box-shadow] duration-150",
          compact ? "h-7" : "h-8",
          METRIC_SHELL[tone],
        )}
        title={
          qty != null && unitCost != null && total != null
            ? `${formatQty(qty)} × ${unitCost.toFixed(2)} = ${total.toFixed(2)}`
            : undefined
        }
      >
        <span
          className={cn(
            "font-mono tabular-nums",
            compact ? "text-xs" : "text-sm",
            total == null
              ? "text-muted-foreground/60"
              : "font-semibold text-foreground",
            isReady && "text-primary",
          )}
        >
          {total != null ? total.toFixed(2) : "—"}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 leading-none">
        {qty != null && unitCost != null && total != null ? (
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {formatQty(qty)} × {unitCost.toFixed(2)}
          </span>
        ) : isReady && total != null ? (
          <span className="rounded-sm bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">
            Payable
          </span>
        ) : null}
      </div>
    </div>
  );
}

function rowReferenceCost(
  link?: { lastCostPrice?: number | string | null; defaultCostPrice?: number | string | null },
): number | null {
  if (!link) {
    return null;
  }
  const last = link.lastCostPrice;
  if (last != null && String(last).trim() !== "") {
    const n = Number(last);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  const def = link.defaultCostPrice;
  if (def != null && String(def).trim() !== "") {
    const n = Number(def);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return null;
}

export function linkReorderLevel(
  link?: { reorderLevel?: number | string | null },
): number | null {
  const v = link?.reorderLevel;
  if (v == null || String(v).trim() === "") {
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export { rowReferenceCost, parsePositiveQty, parseNonNeg };

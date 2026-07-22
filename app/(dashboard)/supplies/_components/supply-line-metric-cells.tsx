"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";
import { ArrowRight, Package } from "lucide-react";

import { YmdDateInput } from "@/components/ymd-date-input";
import { setCatalogOnHandStock } from "@/lib/set-on-hand-stock";
import { cn } from "@/lib/utils";
import { addYmdDays } from "@/lib/ymd-date";

import { nsdInput } from "./new-supply-drawer-ui";
import {
  formatPackQtyHint,
  SupplyPackQtyModal,
  type SupplyPackQtyDefaults,
} from "./supply-pack-qty-modal";
import { supFormCellInput } from "../../suppliers/_components/supplier-ui-tokens";

function selectOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.select();
}

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
  invalid: "border-amber-500/40 bg-amber-500/[0.07]",
  active: "border-foreground/20 bg-background",
  ready: "border-primary/45 bg-primary/[0.07]",
  computed: "border-primary/40 bg-primary/[0.06]",
  matched: "border-primary/35 bg-primary/[0.05]",
  readonly: "border-border/50 bg-muted/25",
  low: "border-amber-500/40 bg-amber-500/[0.07]",
  out: "border-red-500/45 bg-red-500/[0.07]",
};

/** Spreadsheet cell fill — empty fields look typeable; filled stay calm. */
const METRIC_COMPACT_BG: Record<MetricTone, string> = {
  empty: "bg-muted/40",
  invalid: "bg-amber-500/[0.10]",
  active: "bg-background",
  ready: "bg-primary/[0.08]",
  computed: "bg-muted/25",
  matched: "bg-primary/[0.06]",
  readonly: "bg-muted/20",
  low: "bg-amber-500/[0.08]",
  out: "bg-red-500/[0.07]",
};

function metricShellClass(
  compact: boolean,
  touch: boolean,
  tone: MetricTone,
  extra?: string,
): string {
  if (compact && !touch) {
    return cn(
      "mx-0.5 my-0.5 flex min-w-0 items-center rounded-sm px-1",
      "h-7",
      "transition-[box-shadow,background-color,border-color] duration-100",
      tone === "empty"
        ? "border border-dashed border-border/80"
        : cn(
            "ring-1 ring-inset",
            tone === "invalid"
              ? "ring-amber-500/50"
              : tone === "ready"
                ? "ring-primary/35"
                : "ring-border/55",
          ),
      "focus-within:border-solid focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/40",
      METRIC_COMPACT_BG[tone],
      extra,
    );
  }
  return cn(
    "relative flex min-w-0 items-center border transition-[border-color,background-color] duration-100",
    metricHeight(compact, touch),
    METRIC_SHELL[tone],
    extra,
  );
}

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

function formatQtyInput(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10000) / 10000);
}

type CompactProps = {
  compact?: boolean;
  /** Mobile receiving: 44px+ fields, 16px type (avoids iOS zoom). */
  touch?: boolean;
  label?: string;
};

function metricHeight(compact: boolean, touch: boolean): string {
  if (touch) return "h-11";
  if (compact) return "h-7";
  return "h-8";
}

function metricText(compact: boolean, touch: boolean): string {
  if (touch) return "text-base";
  if (compact) return "text-xs";
  return "text-sm";
}

type SupplyQtyCellProps = CompactProps & {
  value: string;
  onChange?: (value: string) => void;
  /** Set buying price when pack modal includes amount spent. */
  onUnitCostChange?: (value: string) => void;
  disabled?: boolean;
  isReady?: boolean;
  /** Stock after receiving — shown under qty when compact (replaces separate After column). */
  stockAfter?: number | null;
  /** Jump focus to the next empty qty (receiving keyboard flow). */
  onEnterNext?: () => void;
  /** When set, Enter focuses cost on the same row instead of the next empty qty. */
  onEnterCost?: () => void;
  /** Prefill pack unit / size from supplier link or product packaging. */
  packDefaults?: SupplyPackQtyDefaults | null;
  /** Notify parent when pack modal opens so nested drawers don't dismiss. */
  onPackModalOpenChange?: (open: boolean) => void;
  /** Hide under-cell hints for a denser receiving grid. */
  quiet?: boolean;
};

export function SupplyQtyCell({
  value,
  onChange,
  onUnitCostChange,
  disabled = false,
  isReady = false,
  compact = false,
  touch = false,
  label,
  stockAfter = null,
  onEnterNext,
  onEnterCost,
  packDefaults = null,
  onPackModalOpenChange,
  quiet = false,
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

  const [packOpen, setPackOpen] = useState(false);
  const [packHint, setPackHint] = useState<string | null>(null);

  const setPackModalOpen = (open: boolean) => {
    setPackOpen(open);
    onPackModalOpenChange?.(open);
  };

  return (
    <div className={cn("flex min-w-0 flex-col", touch || !compact ? "gap-1" : "gap-0.5")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className={cn(metricShellClass(compact, touch, tone), "gap-0.5 pr-0.5")}>
        <input
          className={cn(
            compact && !touch ? supFormCellInput : nsdInput,
            "h-full min-w-0 flex-1 border-0 bg-transparent shadow-none",
            compact && !touch ? "px-1.5" : "px-1.5",
            compact && !touch ? "text-center" : "text-center",
            "font-mono tabular-nums",
            metricText(compact, touch),
            touch && "font-semibold tracking-tight",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            tone === "ready" && "font-semibold text-primary",
            tone === "invalid" && "text-amber-800 dark:text-amber-200",
          )}
          value={value}
          onChange={(e) => {
            setPackHint(null);
            onChange?.(e.target.value);
          }}
          onFocus={selectOnFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (onEnterCost) {
                onEnterCost();
                return;
              }
              onEnterNext?.();
            }
          }}
          disabled={disabled}
          inputMode="decimal"
          placeholder="Qty"
          aria-label="Quantity received"
          data-nsd-qty=""
        />
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-sm text-muted-foreground",
            "hover:bg-primary/10 hover:text-primary",
            "disabled:pointer-events-none disabled:opacity-40",
            touch ? "size-8" : compact ? "size-5" : "size-6",
          )}
          disabled={disabled}
          title="Enter by pack / tray"
          aria-label="Enter quantity by pack or tray"
          onClick={() => setPackModalOpen(true)}
        >
          <Package className={touch ? "size-3.5" : "size-3"} aria-hidden />
        </button>
      </div>
      {!quiet && !touch ? (
        <div className="flex min-h-[0.875rem] min-w-0 flex-wrap items-center gap-1 leading-none">
          {tone === "invalid" ? (
            <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
              Need qty
            </span>
          ) : (
            <>
              {packHint ? (
                <span
                  className="text-[10px] font-medium text-muted-foreground"
                  title={packHint}
                >
                  {packHint}
                </span>
              ) : null}
              {stockAfter != null && parsed != null ? (
                <span className="text-[10px] font-medium text-primary">
                  → {formatQty(stockAfter)}
                </span>
              ) : null}
            </>
          )}
        </div>
      ) : !quiet && packHint ? (
        <span className="text-[10px] font-medium text-muted-foreground">{packHint}</span>
      ) : null}

      <SupplyPackQtyModal
        open={packOpen}
        onOpenChange={setPackModalOpen}
        defaults={packDefaults}
        onApply={(result) => {
          setPackHint(formatPackQtyHint(result));
          onChange?.(formatQtyInput(result.totalQty));
          if (result.unitCost != null) {
            onUnitCostChange?.(result.unitCost.toFixed(2));
            onEnterNext?.();
          } else {
            onEnterCost?.();
          }
        }}
      />
    </div>
  );
}

type SupplyStockCellProps = CompactProps & {
  stock: number | null;
  reorderLevel?: number | null;
  /** Admin-only: allow typing a new on-hand qty. */
  canEdit?: boolean;
  itemId?: string | null;
  branchId?: string | null;
  /** Unit cost used when increasing stock. */
  unitCostHint?: number | null;
  disabled?: boolean;
  onStockChange?: (nextStock: number) => void;
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
  touch = false,
  label,
  canEdit = false,
  itemId = null,
  branchId = null,
  unitCostHint = null,
  disabled = false,
  onStockChange,
}: SupplyStockCellProps) {
  const tone = resolveStockTone(stock, reorderLevel);
  const [draft, setDraft] = useState(
    stock != null ? (Number.isInteger(stock) ? String(stock) : String(stock)) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baselineRef = useRef(stock);

  useEffect(() => {
    if (busy) {
      return;
    }
    baselineRef.current = stock;
    setDraft(
      stock != null
        ? Number.isInteger(stock)
          ? String(stock)
          : String(stock)
        : "",
    );
    setError(null);
  }, [stock, busy]);

  const editable =
    canEdit && Boolean(itemId?.trim()) && Boolean(branchId?.trim()) && !disabled;

  const commit = async () => {
    if (!editable || busy) {
      return;
    }
    const raw = draft.trim();
    if (!raw) {
      setDraft(
        stock != null
          ? Number.isInteger(stock)
            ? String(stock)
            : String(stock)
          : "",
      );
      return;
    }
    const target = Number(raw);
    if (!Number.isFinite(target) || target < 0) {
      setError("Enter 0 or a positive qty");
      setDraft(
        stock != null
          ? Number.isInteger(stock)
            ? String(stock)
            : String(stock)
          : "",
      );
      return;
    }
    const current = baselineRef.current ?? stock ?? 0;
    if (Math.abs(target - current) < 0.0001) {
      setError(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const nextDisplay = await setCatalogOnHandStock({
        itemId: itemId!.trim(),
        branchId: branchId!.trim(),
        targetDisplay: target,
        unitCost: unitCostHint ?? 0,
        notes: "Stock set from new supply",
      });
      baselineRef.current = nextDisplay;
      setDraft(
        Number.isInteger(nextDisplay) ? String(nextDisplay) : String(nextDisplay),
      );
      onStockChange?.(nextDisplay);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      setDraft(
        stock != null
          ? Number.isInteger(stock)
            ? String(stock)
            : String(stock)
          : "",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex min-w-0 flex-col", touch || !compact ? "gap-1" : "gap-0.5")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          metricShellClass(compact, touch, tone, editable && !compact ? "bg-background" : undefined),
        )}
        title={
          editable
            ? "Set on-hand stock (absolute total at this branch — not add)"
            : stock != null
              ? reorderLevel != null && reorderLevel > 0
                ? `On hand ${formatQty(stock)} · reorder at ${formatQty(reorderLevel)}`
                : `On hand ${formatQty(stock)}`
              : "Stock level unavailable for this line"
        }
      >
        {editable ? (
          <input
            className={cn(
              compact && !touch ? supFormCellInput : nsdInput,
              "h-full min-w-0 flex-1 border-0 bg-transparent shadow-none",
              "text-right font-mono tabular-nums",
              metricText(compact, touch),
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              tone === "out" && "font-semibold text-red-700 dark:text-red-300",
              tone === "low" && "font-semibold text-amber-800 dark:text-amber-200",
              busy && "opacity-60",
            )}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onFocus={selectOnFocus}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft(
                  stock != null
                    ? Number.isInteger(stock)
                      ? String(stock)
                      : String(stock)
                    : "",
                );
                setError(null);
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={busy || disabled}
            inputMode="decimal"
            aria-label="On-hand stock"
            data-nsd-stock=""
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-end px-1.5 font-mono tabular-nums",
              metricText(compact, touch),
              stock == null && "text-muted-foreground/60",
              tone === "out" && "font-semibold text-red-700 dark:text-red-300",
              tone === "low" && "font-semibold text-amber-800 dark:text-amber-200",
              tone === "readonly" && "text-foreground",
            )}
          >
            {stock != null ? formatQty(stock) : "—"}
          </span>
        )}
      </div>
      <div className="flex min-h-[0.875rem] min-w-0 flex-wrap items-center justify-end gap-1 leading-none">
        {error ? (
          <span className="text-[10px] font-medium text-destructive">{error}</span>
        ) : busy ? (
          <span className="text-[10px] text-muted-foreground">Saving…</span>
        ) : tone === "out" ? (
          <span className="text-[10px] font-medium text-red-700 dark:text-red-300">
            Out
          </span>
        ) : tone === "low" ? (
          <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
            Low
          </span>
        ) : null}
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
  touch = false,
  label,
}: SupplyStockAfterCellProps) {
  const tone: MetricTone =
    stockAfter == null ? "empty" : qty != null ? "computed" : "readonly";
  const delta = qty != null ? qty : null;

  return (
    <div className={cn("flex min-w-0 flex-col", touch || !compact ? "gap-1" : "gap-0.5")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={metricShellClass(compact, touch, tone, "justify-end")}
        title={
          stock != null && stockAfter != null
            ? `Stock ${formatQty(stock)} → ${formatQty(stockAfter)} after receiving`
            : undefined
        }
      >
        <span
          className={cn(
            "font-mono tabular-nums",
            metricText(compact, touch),
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
  /** Line total (qty × cost) — shown under cost when compact (replaces Total column). */
  lineTotal?: number | null;
  onEnterNext?: () => void;
  /** Hide under-cell totals for a denser receiving grid. */
  quiet?: boolean;
};

export function SupplyCostCell({
  value,
  onChange,
  disabled = false,
  referenceCost = null,
  lineTotal = null,
  compact = false,
  touch = false,
  label,
  onEnterNext,
  quiet = false,
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
    <div className={cn("flex min-w-0 flex-col", touch || !compact ? "gap-1" : "gap-0.5")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className={metricShellClass(compact, touch, tone)}>
        <input
          className={cn(
            compact && !touch ? supFormCellInput : nsdInput,
            "h-full min-w-0 flex-1 border-0 bg-transparent shadow-none",
            "text-right font-mono tabular-nums",
            metricText(compact, touch),
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            matchesRef && "text-primary",
            tone === "invalid" && "text-amber-800 dark:text-amber-200",
          )}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={selectOnFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnterNext?.();
            }
          }}
          disabled={disabled}
          inputMode="decimal"
          placeholder="—"
          aria-label="Buying price per unit"
          data-nsd-cost=""
        />
      </div>
      {!quiet && !touch ? (
        <div className="flex min-h-[0.875rem] min-w-0 flex-wrap items-center justify-end gap-1 leading-none">
          {tone === "invalid" ? (
            <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
              Invalid
            </span>
          ) : lineTotal != null ? (
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              Σ {lineTotal.toFixed(2)}
            </span>
          ) : null}
        </div>
      ) : null}
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
  touch = false,
  label,
}: SupplyLineTotalCellProps) {
  const tone: MetricTone =
    total == null ? "empty" : isReady ? "ready" : "computed";

  return (
    <div className={cn("flex min-w-0 flex-col", touch || !compact ? "gap-1" : "gap-0.5")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={metricShellClass(compact, touch, tone, "justify-end")}
        title={
          qty != null && unitCost != null && total != null
            ? `${formatQty(qty)} × ${unitCost.toFixed(2)} = ${total.toFixed(2)}`
            : undefined
        }
      >
        <span
          className={cn(
            "font-mono tabular-nums",
            metricText(compact, touch),
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
  link?: {
    lastCostPrice?: number | string | null;
    defaultCostPrice?: number | string | null;
    catalogBuyingPrice?: number | string | null;
  },
): number | null {
  if (!link) {
    return null;
  }
  for (const raw of [
    link.lastCostPrice,
    link.defaultCostPrice,
    link.catalogBuyingPrice,
  ]) {
    if (raw == null || String(raw).trim() === "") {
      continue;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
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

const SHELF_LIFE_DAY_CHIPS = [7, 14, 30, 90] as const;

type SupplyExpiryCellProps = CompactProps & {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** YYYY-MM-DD base for +N day chips (usually receive date). */
  baseYmd: string;
  onEnterNext?: () => void;
  /** Only show +Nd chips while focused (keeps the grid calm). */
  quiet?: boolean;
};

export function SupplyExpiryCell({
  value,
  onChange,
  disabled = false,
  baseYmd,
  compact = false,
  touch = false,
  label = "Expires",
  onEnterNext,
  quiet = false,
}: SupplyExpiryCellProps) {
  const showLabel = Boolean(label) && (touch || !compact);
  const [showChips, setShowChips] = useState(false);
  const chipsVisible = quiet
    ? showChips
    : touch || showChips || !value.trim();

  return (
    <div
      className={cn("flex min-w-0 flex-col", touch || !compact ? "gap-1" : "gap-0.5")}
      data-nsd-expiry=""
      onFocusCapture={() => setShowChips(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setShowChips(false);
        }
      }}
      onMouseEnter={() => setShowChips(true)}
      onMouseLeave={() => setShowChips(false)}
    >
      {showLabel ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <YmdDateInput
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        compact={compact && !touch}
        placeholder="Date"
        aria-label="Expiry date"
      />
      {chipsVisible ? (
        <div className="flex min-w-0 flex-wrap gap-0.5">
          {SHELF_LIFE_DAY_CHIPS.map((days) => (
            <button
              key={days}
              type="button"
              className={cn(
                "rounded-sm border border-border/70 bg-background px-1 py-px text-[9px] font-semibold tabular-nums text-muted-foreground",
                "hover:border-primary/40 hover:bg-primary/[0.06] hover:text-primary",
                "disabled:pointer-events-none disabled:opacity-50",
                touch && "px-1.5 py-0.5 text-[10px]",
              )}
              disabled={disabled}
              title={`${days} days from receive date`}
              onClick={() => {
                const base =
                  baseYmd.trim().length >= 10
                    ? baseYmd.trim().slice(0, 10)
                    : baseYmd;
                onChange(addYmdDays(base, days));
                onEnterNext?.();
              }}
            >
              +{days}d
            </button>
          ))}
        </div>
      ) : value.trim() ? (
        <div className="min-h-[0.875rem]" aria-hidden />
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
  Receipt,
  ChevronDown,
  ChevronUp,
  X,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShelfPriceLabel } from "@/lib/cashier-shelf-price";

export type GroceryCartLine = {
  key: string;
  /** Server grocery_draft_lines.id after sync. */
  serverLineId?: string;
  itemId: string;
  label: string;
  quantity: number;
  unitPrice: number;
  unitName: string;
};

type GroceryInvoiceCartProps = {
  lines: GroceryCartLine[];
  onUpdateLine: (
    key: string,
    field: "quantity" | "unitPrice",
    value: number,
  ) => void;
  onRemoveLine: (key: string) => void;
  onGenerate: () => void;
  onClearCart?: () => void;
  loading: boolean;
  subtotal: number;
  grandTotal: number;
  currency: string;
  branchName?: string;
  cashierName?: string;
  /** Counter # from persisted draft (shown when ui flag on). */
  counterNumber?: number | null;
  syncStatus?: "idle" | "syncing" | "error" | "conflict";
  online?: boolean;
  /** Bump this number to trigger the cart "added" pulse animation. */
  pulseSignal?: number;
  /** Most recently added line key — used for entry animation. */
  recentlyAddedKey?: string | null;
  /** Renders without the side panel chrome (used inside bottom sheet). */
  compact?: boolean;
  /** Optional close handler shown in compact (bottom sheet) variant. */
  onClose?: () => void;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Quantity Stepper ───────────────────────────────────────────────

function QuantityStepper({
  value,
  min = 1,
  onDecrease,
  onIncrease,
}: {
  value: number;
  min?: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="inline-flex select-none items-center rounded-lg border border-border bg-card p-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDecrease();
        }}
        disabled={value <= min}
        className={cn(
          "flex size-8 items-center justify-center rounded-md text-foreground transition-colors touch-manipulation",
          "hover:bg-muted active:scale-95",
          "disabled:opacity-30 disabled:hover:bg-transparent",
        )}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" strokeWidth={2.5} />
      </button>
      <span className="flex min-w-[2.25rem] items-center justify-center text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onIncrease();
        }}
        className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors touch-manipulation hover:bg-[var(--primary-hover)] active:scale-95"
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── Cart Line Item ─────────────────────────────────────────────────

function CartLineItem({
  line,
  currency,
  onUpdateLine,
  onRemoveLine,
  isLast,
  isRecentlyAdded,
}: {
  line: GroceryCartLine;
  currency: string;
  onUpdateLine: (
    key: string,
    field: "quantity" | "unitPrice",
    value: number,
  ) => void;
  onRemoveLine: (key: string) => void;
  isLast: boolean;
  isRecentlyAdded?: boolean;
}) {
  const lineTotal = round2(line.quantity * line.unitPrice);
  const priceLabel = formatShelfPriceLabel(line.unitPrice, currency);
  const totalLabel = formatShelfPriceLabel(lineTotal, currency);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 sm:px-5",
        !isLast && "border-b border-border",
        isRecentlyAdded && "bg-primary/[0.04]",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {line.label}
        </p>

        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
          {priceLabel ?? `${currency} ${line.unitPrice.toFixed(2)}`}
          {line.unitName ? ` · ${line.unitName}` : null}
        </p>

        <div className="mt-2">
          <QuantityStepper
            value={line.quantity}
            onDecrease={() =>
              onUpdateLine(line.key, "quantity", Math.max(1, line.quantity - 1))
            }
            onIncrease={() =>
              onUpdateLine(line.key, "quantity", line.quantity + 1)
            }
          />
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 pt-0.5">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {totalLabel ?? `${currency} ${lineTotal.toFixed(2)}`}
        </span>
        <button
          type="button"
          onClick={() => onRemoveLine(line.key)}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove item"
        >
          <Trash2 className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}

// ── Main Cart Component ────────────────────────────────────────────

export function GroceryInvoiceCart({
  lines,
  onUpdateLine,
  onRemoveLine,
  onGenerate,
  onClearCart,
  loading,
  subtotal,
  grandTotal,
  currency,
  branchName,
  cashierName,
  counterNumber,
  online,
  syncStatus,
  pulseSignal,
  recentlyAddedKey,
  compact,
  onClose,
}: GroceryInvoiceCartProps) {
  const isEmpty = lines.length === 0;
  const cartItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const [showTotalsBreakdown, setShowTotalsBreakdown] = useState(false);

  return (
    <div className={cn("relative flex h-full flex-col")}>
      {/* ── Header ── */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5",
          compact ? "pt-1 pb-3" : "py-3",
        )}
      >
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Receipt className="size-4" strokeWidth={2.25} />
          {!isEmpty && (
            <span className="absolute -right-1.5 -top-1.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold leading-none text-background tabular-nums">
              {cartItemCount}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">
              {counterNumber != null && counterNumber > 0
                ? `Counter #${counterNumber}`
                : "Current Sale"}
            </h2>
            {online === false && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <WifiOff className="size-2.5" />
                Offline
              </span>
            )}
            {syncStatus === "syncing" && online !== false && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <span className="size-2 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                Syncing
              </span>
            )}
            {syncStatus === "error" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                Sync error
              </span>
            )}
            {syncStatus === "conflict" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                Conflict
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {branchName ? branchName : "No branch selected"}
            {cashierName ? ` · ${cashierName}` : null}
          </p>
        </div>

        {!isEmpty && onClearCart && (
          <button
            type="button"
            onClick={onClearCart}
            className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            aria-label="Clear cart"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden md:inline">Clear</span>
          </button>
        )}

        {compact && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close cart"
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
        )}
      </div>

      {/* ── Line Items ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <ShoppingBasket className="mb-3 size-10 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground">Empty cart</p>
            <p className="mt-1 max-w-[18rem] text-xs text-muted-foreground">
              Tap products to add them, or scan a barcode.
            </p>
          </div>
        ) : (
          <div className="pb-2">
            {lines.map((line, i) => (
              <CartLineItem
                key={line.key}
                line={line}
                currency={currency}
                onUpdateLine={onUpdateLine}
                onRemoveLine={onRemoveLine}
                isLast={i === lines.length - 1}
                isRecentlyAdded={recentlyAddedKey === line.key}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: Totals + Generate ── */}
      {!isEmpty && (
        <div className="shrink-0 border-t border-border bg-background">
          <div className="px-4 pt-3 sm:px-5">
            <button
              type="button"
              onClick={() => setShowTotalsBreakdown(!showTotalsBreakdown)}
              className="flex w-full items-center justify-between py-1 text-xs text-muted-foreground hover:text-foreground"
              aria-expanded={showTotalsBreakdown}
            >
              <span className="font-medium">Summary</span>
              <span className="inline-flex items-center gap-1">
                <span className="tabular-nums">
                  {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
                </span>
                {showTotalsBreakdown ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </span>
            </button>

            {showTotalsBreakdown && (
              <div className="mt-2 space-y-2 pb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatShelfPriceLabel(subtotal, currency) ??
                      `${currency} ${subtotal.toFixed(2)}`}
                  </span>
                </div>
                {subtotal !== grandTotal && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium tabular-nums text-destructive">
                      −
                      {formatShelfPriceLabel(subtotal - grandTotal, currency) ??
                        `${currency} ${(subtotal - grandTotal).toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="h-px bg-border" />
              </div>
            )}
          </div>

          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-1 sm:px-5">
            <div className="mb-3 flex items-end justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {formatShelfPriceLabel(grandTotal, currency) ??
                  `${currency} ${grandTotal.toFixed(2)}`}
              </span>
            </div>

            {/* Generate Invoice */}
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading || isEmpty}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm",
                "transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Processing…
                </>
              ) : (
                <>
                  <Receipt className="size-4" strokeWidth={2.25} />
                  Generate Invoice
                  {cartItemCount > 0 ? (
                    <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-bold tabular-nums">
                      {cartItemCount}
                    </span>
                  ) : null}
                </>
              )}
            </button>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              Customer pays at the cashier
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

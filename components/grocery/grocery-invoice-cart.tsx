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
  Banknote,
  X,
  Wifi,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShelfPriceLabel } from "@/lib/cashier-shelf-price";

export type GroceryCartLine = {
  key: string;
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
  bumpKey,
}: {
  value: number;
  min?: number;
  onDecrease: () => void;
  onIncrease: () => void;
  bumpKey?: number;
}) {
  return (
    <div className="inline-flex select-none items-center rounded-2xl border border-border/40 bg-white/70 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDecrease();
        }}
        disabled={value <= min}
        className={cn(
          "flex size-9 items-center justify-center rounded-xl text-foreground transition-all duration-150 touch-manipulation",
          "hover:bg-muted/70 active:scale-90",
          "disabled:opacity-25 disabled:hover:bg-transparent",
        )}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>
      <span
        key={bumpKey ?? value}
        className="animate-shop-qty-pop flex min-w-[2.5rem] items-center justify-center text-[14px] font-bold tabular-nums text-foreground"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onIncrease();
        }}
        className="flex size-9 items-center justify-center rounded-xl text-foreground transition-all duration-150 touch-manipulation hover:bg-muted/70 active:scale-90"
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
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
        "group relative flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 sm:px-5",
        "hover:bg-foreground/[0.025] dark:hover:bg-white/[0.025]",
        !isLast && "border-b border-border/[0.06]",
        isRecentlyAdded && "animate-pos-line-in",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13.5px] font-semibold leading-[1.25] text-foreground">
          {line.label}
        </p>

        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          {priceLabel ?? `${currency} ${line.unitPrice.toFixed(2)}`}
          {line.unitName ? (
            <span className="text-muted-foreground/60">
              {" "}
              · {line.unitName}
            </span>
          ) : null}
        </p>

        <div className="mt-2.5">
          <QuantityStepper
            value={line.quantity}
            bumpKey={line.quantity}
            onDecrease={() =>
              onUpdateLine(line.key, "quantity", Math.max(1, line.quantity - 1))
            }
            onIncrease={() =>
              onUpdateLine(line.key, "quantity", line.quantity + 1)
            }
          />
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 pt-0.5">
        <span className="text-[15.5px] font-bold tabular-nums leading-none text-foreground">
          {totalLabel ?? `${currency} ${lineTotal.toFixed(2)}`}
        </span>
        <button
          type="button"
          onClick={() => onRemoveLine(line.key)}
          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground/40 transition-all duration-150 touch-manipulation hover:bg-destructive/10 hover:text-destructive active:scale-90"
          aria-label="Remove item"
        >
          <Trash2 className="size-3.5" />
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
  online,
  pulseSignal,
  recentlyAddedKey,
  compact,
  onClose,
}: GroceryInvoiceCartProps) {
  const isEmpty = lines.length === 0;
  const cartItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const [showTotalsBreakdown, setShowTotalsBreakdown] = useState(false);

  return (
    <div
      className={cn(
        "relative flex h-full flex-col",
        !compact &&
          "bg-[radial-gradient(120%_60%_at_50%_0%,hsl(var(--primary)/0.04),transparent_55%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background)/0.85)_100%)] dark:bg-[radial-gradient(120%_60%_at_50%_0%,hsl(var(--primary)/0.08),transparent_60%),linear-gradient(180deg,hsl(var(--background)/0.4)_0%,hsl(var(--background)/0.2)_100%)]",
      )}
    >
      {/* ── Header ── */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-border/[0.08] px-4 sm:px-5",
          compact ? "pt-1 pb-3" : "py-4",
        )}
      >
        <div
          key={pulseSignal}
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-primary/[0.14] to-primary/[0.06]",
            "ring-1 ring-primary/[0.12]",
            pulseSignal != null && "animate-pos-cart-pulse",
          )}
        >
          <ShoppingBasket className="size-[18px] text-primary" />
          {!isEmpty && (
            <span className="absolute -right-1.5 -top-1.5 flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-[0_2px_6px_rgba(0,0,0,0.18)] tabular-nums">
              {cartItemCount}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[15px] font-bold tracking-tight text-foreground">
              Current Sale
            </h2>
            {online === false && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <WifiOff className="size-2.5" />
                Off
              </span>
            )}
            {online === true && !compact && (
              <span className="hidden lg:inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Wifi className="size-2.5" />
                Live
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {branchName ? branchName : "No branch selected"}
            {cashierName ? (
              <span className="text-muted-foreground/60"> · {cashierName}</span>
            ) : null}
          </p>
        </div>

        {!isEmpty && onClearCart && (
          <button
            type="button"
            onClick={onClearCart}
            className="hidden sm:inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95"
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
            className="flex size-9 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-90"
            aria-label="Close cart"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ── Line Items ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center sm:py-20">
            <div className="relative mb-5">
              <div className="absolute inset-0 -m-2 rounded-[2.25rem] bg-primary/[0.04] blur-md" />
              <div className="relative flex size-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-muted/40 to-muted/10 ring-1 ring-border/40">
                <ShoppingBasket className="size-9 text-muted-foreground/30" />
              </div>
            </div>
            <p className="text-[15px] font-semibold text-foreground/80">
              Empty cart
            </p>
            <p className="mt-2 max-w-[19rem] text-[13px] leading-relaxed text-muted-foreground/70">
              Tap products to add them. Scan barcodes for instant entry.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary/[0.06] px-3 py-1.5 text-[11px] font-semibold text-primary/80 ring-1 ring-primary/[0.08]">
              <Sparkles className="size-3" />
              Ready when you are
            </div>
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
        <div
          className={cn(
            "shrink-0 border-t border-border/[0.08]",
            "bg-gradient-to-t from-white/95 via-white/80 to-white/40 backdrop-blur-xl",
            "dark:from-background/95 dark:via-background/80 dark:to-background/40",
            "supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:dark:bg-background/60",
          )}
        >
          {/* Order summary toggle */}
          <div className="px-4 pt-3 sm:px-5">
            <button
              type="button"
              onClick={() => setShowTotalsBreakdown(!showTotalsBreakdown)}
              className="flex w-full items-center justify-between rounded-xl py-1.5 text-[12px] transition-colors hover:bg-muted/30 active:scale-[0.99]"
              aria-expanded={showTotalsBreakdown}
            >
              <span className="font-semibold text-muted-foreground/80">
                Order Summary
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground/50">
                <span className="text-[11px] tabular-nums">
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
              <div className="mt-2 space-y-2 animate-in slide-in-from-top-1 fade-in duration-200">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatShelfPriceLabel(subtotal, currency) ??
                      `${currency} ${subtotal.toFixed(2)}`}
                  </span>
                </div>
                {subtotal !== grandTotal && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-semibold tabular-nums text-destructive">
                      −
                      {formatShelfPriceLabel(subtotal - grandTotal, currency) ??
                        `${currency} ${(subtotal - grandTotal).toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="h-px bg-border/[0.08]" />
              </div>
            )}
          </div>

          {/* Grand total + generate */}
          <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-5">
            <div className="mb-3 flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                  Total Due
                </span>
                <span className="mt-0.5 text-[11px] text-muted-foreground/60">
                  Tax included
                </span>
              </div>
              <span className="text-[26px] font-bold tabular-nums leading-none tracking-tight text-foreground">
                {formatShelfPriceLabel(grandTotal, currency) ??
                  `${currency} ${grandTotal.toFixed(2)}`}
              </span>
            </div>

            {/* Generate Invoice Button */}
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading || isEmpty}
              className={cn(
                "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-5 py-4 text-[14.5px] font-bold text-white",
                "bg-[linear-gradient(135deg,hsl(var(--primary))_0%,color-mix(in_oklch,hsl(var(--primary))_88%,#fff)_50%,hsl(var(--primary))_100%)]",
                "shadow-[0_10px_32px_-6px_hsl(var(--primary)/0.45),0_0_0_0_hsl(var(--primary)/0.4),inset_0_1px_0_hsl(0_0%_100%/0.18)]",
                "transition-all duration-300",
                "hover:shadow-[0_16px_40px_-6px_hsl(var(--primary)/0.55),0_0_0_5px_hsl(var(--primary)/0.12),inset_0_1px_0_hsl(0_0%_100%/0.22)]",
                "active:scale-[0.98] active:shadow-[0_4px_16px_hsl(var(--primary)/0.4)]",
                "touch-manipulation",
                loading && "pointer-events-none opacity-80",
                isEmpty && "pointer-events-none opacity-50",
                !loading && !isEmpty && "animate-pos-fab-breathe",
              )}
            >
              {/* Inner sheen */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Creating Invoice…</span>
                </>
              ) : (
                <>
                  <Receipt className="size-[18px] transition-transform duration-300 group-hover:-rotate-3" />
                  <span>Generate Invoice</span>
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/20 text-[11.5px] font-bold tabular-nums shadow-inner">
                    {cartItemCount}
                  </span>
                </>
              )}
            </button>

            {/* Payment hint */}
            <p className="mt-2.5 text-center text-[11px] text-muted-foreground/70">
              <Banknote className="mr-1 inline size-3 align-text-bottom" />
              Customer pays at the cashier
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

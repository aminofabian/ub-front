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
  ScanLine,
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
    <div className="inline-flex select-none items-center rounded-2xl border border-zinc-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-white/[0.04]">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDecrease();
        }}
        disabled={value <= min}
        className={cn(
          "flex size-9 items-center justify-center rounded-xl text-zinc-700 transition-all duration-150 touch-manipulation dark:text-zinc-200",
          "hover:bg-zinc-100 hover:text-zinc-900 active:scale-90 dark:hover:bg-white/[0.06]",
          "disabled:opacity-25 disabled:hover:bg-transparent",
        )}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </button>
      <span
        key={bumpKey ?? value}
        className="animate-shop-qty-pop flex min-w-[2.75rem] items-center justify-center text-[15px] font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onIncrease();
        }}
        className="flex size-9 items-center justify-center rounded-xl bg-primary text-white transition-all duration-150 touch-manipulation hover:bg-primary/90 active:scale-90 shadow-[0_2px_6px_-1px_rgba(40,167,69,0.35)]"
        aria-label="Increase quantity"
      >
        <Plus className="size-4" strokeWidth={2.5} />
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
        "hover:bg-zinc-900/[0.025] dark:hover:bg-white/[0.025]",
        !isLast && "border-b border-dashed border-zinc-200/80 dark:border-white/[0.06]",
        isRecentlyAdded && "animate-pos-line-in bg-primary/[0.05]",
      )}
    >
      {/* Line index ribbon */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full transition-colors",
          isRecentlyAdded ? "bg-primary" : "bg-transparent group-hover:bg-zinc-300 dark:group-hover:bg-white/15",
        )}
      />

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13.5px] font-bold leading-[1.3] text-zinc-900 dark:text-zinc-50">
          {line.label}
        </p>

        <p className="mt-1 text-[11px] font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">
          <span className="text-zinc-600 dark:text-zinc-300">
            {priceLabel ?? `${currency} ${line.unitPrice.toFixed(2)}`}
          </span>
          {line.unitName ? (
            <span className="text-zinc-400 dark:text-zinc-500">
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
        <span className="text-[16px] font-extrabold tabular-nums leading-none tracking-tight text-zinc-900 dark:text-zinc-50">
          {totalLabel ?? `${currency} ${lineTotal.toFixed(2)}`}
        </span>
        <button
          type="button"
          onClick={() => onRemoveLine(line.key)}
          className="flex size-9 items-center justify-center rounded-xl text-zinc-400 transition-all duration-150 touch-manipulation hover:bg-red-50 hover:text-red-600 active:scale-90 dark:text-zinc-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
    <div className={cn("relative flex h-full flex-col")}>
      {/* ── Header ── */}
      <div
        className={cn(
          "relative flex shrink-0 items-center gap-3 border-b border-zinc-200/80 px-4 sm:px-5 dark:border-white/[0.06]",
          compact ? "pt-1 pb-3.5" : "py-4",
        )}
      >
        {/* Receipt-style top edge dots (only when not compact) */}
        {!compact && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-px left-4 right-4 hidden h-px lg:block"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(15,23,42,0.18) 1px, transparent 1.2px)",
              backgroundSize: "8px 1px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "0 0",
            }}
          />
        )}

        <div
          key={pulseSignal}
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-[14px]",
            "bg-gradient-to-br from-primary via-emerald-600 to-emerald-700",
            "ring-1 ring-emerald-500/40 shadow-[0_4px_12px_-2px_rgba(40,167,69,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
            pulseSignal != null && "animate-pos-cart-pulse",
          )}
        >
          <Receipt className="size-[19px] text-white" strokeWidth={2.25} />
          {!isEmpty && (
            <span className="absolute -right-1.5 -top-1.5 flex min-w-[1.35rem] items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-extrabold leading-none text-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] ring-2 ring-white tabular-nums dark:bg-white dark:text-zinc-900 dark:ring-card">
              {cartItemCount}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="font-sans truncate text-[16px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Current Sale
            </h2>
            {online === false && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-800 ring-1 ring-amber-300/60 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-800/50">
                <WifiOff className="size-2.5" />
                Off
              </span>
            )}
            {online === true && !compact && (
              <span className="hidden lg:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50">
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500">
                  <span className="absolute inset-0 size-1.5 animate-ping rounded-full bg-emerald-500/70" />
                </span>
                Live
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] font-semibold text-zinc-600 dark:text-zinc-300">
            {branchName ? branchName : "No branch selected"}
            {cashierName ? (
              <span className="text-zinc-400 dark:text-zinc-500"> · {cashierName}</span>
            ) : null}
          </p>
        </div>

        {!isEmpty && onClearCart && (
          <button
            type="button"
            onClick={onClearCart}
            className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white px-2.5 py-1.5 text-[11px] font-bold text-zinc-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 dark:hover:border-red-900/40"
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
            className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 active:scale-90 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.1]"
            aria-label="Close cart"
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
        )}
      </div>

      {/* ── Line Items ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isEmpty ? (
          <div className="relative flex flex-col items-center justify-center px-8 py-16 text-center sm:py-20">
            {/* Decorative blob */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-4 left-1/2 size-48 -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl"
            />
            <div className="relative mb-5">
              <div className="absolute inset-0 -m-3 rounded-[2.5rem] bg-primary/[0.05] blur-md" />
              <div className="relative flex size-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-white via-zinc-50 to-zinc-100 ring-1 ring-zinc-200/80 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.15),inset_0_1px_0_rgba(255,255,255,0.85)] dark:from-white/[0.05] dark:via-white/[0.03] dark:to-white/[0.02] dark:ring-white/[0.08]">
                <ShoppingBasket className="size-10 text-zinc-300 dark:text-white/15" strokeWidth={1.5} />
              </div>
              {/* Floating tag */}
              <span className="absolute -right-2 -top-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-zinc-700 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.15)] ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/[0.08]">
                <ScanLine className="size-2.5" />
                Ready
              </span>
            </div>
            <p className="text-[16px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Empty cart
            </p>
            <p className="mt-2 max-w-[20rem] text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              Tap products to add them. Scan barcodes for instant entry.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/15 to-primary/5 px-3.5 py-1.5 text-[11px] font-bold text-primary ring-1 ring-primary/20 dark:from-primary/25 dark:to-primary/10">
              <Sparkles className="size-3" strokeWidth={2.5} />
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
            "relative shrink-0 border-t border-zinc-200/80 dark:border-white/[0.06]",
            "bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75",
            "dark:bg-background/85 dark:supports-[backdrop-filter]:bg-background/70",
          )}
        >
          {/* Receipt-style perforation at top of footer */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-px left-4 right-4 h-px"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(15,23,42,0.18) 1px, transparent 1.2px)",
              backgroundSize: "8px 1px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "0 0",
            }}
          />

          {/* Order summary toggle */}
          <div className="px-4 pt-3 sm:px-5">
            <button
              type="button"
              onClick={() => setShowTotalsBreakdown(!showTotalsBreakdown)}
              className="flex w-full items-center justify-between rounded-xl py-1.5 text-[12px] transition-colors hover:bg-zinc-100/50 active:scale-[0.99] dark:hover:bg-white/[0.04]"
              aria-expanded={showTotalsBreakdown}
            >
              <span className="font-bold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
                Order Summary
              </span>
              <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <span className="text-[11px] font-bold tabular-nums">
                  {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
                </span>
                {showTotalsBreakdown ? (
                  <ChevronUp className="size-3.5" strokeWidth={2.5} />
                ) : (
                  <ChevronDown className="size-3.5" strokeWidth={2.5} />
                )}
              </span>
            </button>

            {showTotalsBreakdown && (
              <div className="mt-2 space-y-2 animate-in slide-in-from-top-1 fade-in duration-200">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
                  <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatShelfPriceLabel(subtotal, currency) ??
                      `${currency} ${subtotal.toFixed(2)}`}
                  </span>
                </div>
                {subtotal !== grandTotal && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-zinc-600 dark:text-zinc-400">Discount</span>
                    <span className="font-bold tabular-nums text-red-600 dark:text-red-400">
                      −
                      {formatShelfPriceLabel(subtotal - grandTotal, currency) ??
                        `${currency} ${(subtotal - grandTotal).toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="h-px bg-zinc-200/80 dark:bg-white/[0.06]" />
              </div>
            )}
          </div>

          {/* Grand total + generate */}
          <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-5">
            <div className="mb-3 flex items-end justify-between rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:from-white/[0.04] dark:to-white/[0.02] dark:border-white/[0.08]">
              <div className="flex flex-col">
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                  Total Due
                </span>
                <span className="mt-1 text-[10.5px] font-medium text-zinc-500 dark:text-zinc-500">
                  Tax included
                </span>
              </div>
              <span className="text-[28px] font-extrabold tabular-nums leading-none tracking-tight text-zinc-900 dark:text-zinc-50">
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
                "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-5 py-4 text-[15px] font-extrabold text-white",
                "bg-[linear-gradient(135deg,hsl(var(--primary))_0%,color-mix(in_oklch,hsl(var(--primary))_88%,#fff)_50%,hsl(var(--primary))_100%)]",
                "shadow-[0_12px_36px_-8px_hsl(var(--primary)/0.5),0_0_0_0_hsl(var(--primary)/0.4),inset_0_1px_0_hsl(0_0%_100%/0.22)]",
                "transition-all duration-300",
                "hover:shadow-[0_18px_44px_-8px_hsl(var(--primary)/0.6),0_0_0_5px_hsl(var(--primary)/0.14),inset_0_1px_0_hsl(0_0%_100%/0.25)]",
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
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
              />
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Creating Invoice…</span>
                </>
              ) : (
                <>
                  <Receipt className="size-[18px] transition-transform duration-300 group-hover:-rotate-3" strokeWidth={2.25} />
                  <span>Generate Invoice</span>
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/25 text-[11.5px] font-extrabold tabular-nums shadow-inner">
                    {cartItemCount}
                  </span>
                </>
              )}
            </button>

            {/* Payment hint */}
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              <Banknote className="size-3" strokeWidth={2.25} />
              Customer pays at the cashier
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

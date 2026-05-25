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
  loading: boolean;
  subtotal: number;
  grandTotal: number;
  currency: string;
  branchName?: string;
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
    <div className="inline-flex items-center rounded-xl border border-border/50 bg-muted/[0.25] p-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDecrease();
        }}
        disabled={value <= min}
        className="flex size-8 items-center justify-center rounded-lg bg-white text-foreground transition-all duration-150 hover:bg-muted active:scale-90 disabled:opacity-30 dark:bg-white/[0.04]"
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="flex min-w-[2.25rem] items-center justify-center text-[13px] font-bold tabular-nums text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onIncrease();
        }}
        className="flex size-8 items-center justify-center rounded-lg bg-white text-foreground transition-all duration-150 hover:bg-muted active:scale-90 dark:bg-white/[0.04]"
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
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
}) {
  const lineTotal = round2(line.quantity * line.unitPrice);
  const priceLabel = formatShelfPriceLabel(line.unitPrice, currency);
  const totalLabel = formatShelfPriceLabel(lineTotal, currency);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 px-5 py-3.5 transition-colors duration-150",
        "hover:bg-muted/[0.25]",
        !isLast && "border-b border-border/[0.08]",
      )}
    >
      {/* Item info + controls */}
      <div className="min-w-0 flex-1">
        {/* Label */}
        <p className="text-[13px] font-semibold leading-[1.25] text-foreground line-clamp-1">
          {line.label}
        </p>

        {/* Unit price */}
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
          {priceLabel ?? `${currency} ${line.unitPrice.toFixed(2)}`}
          {line.unitName ? ` / ${line.unitName}` : ""}
        </p>

        {/* Quantity stepper */}
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

      {/* Line total + remove */}
      <div className="flex flex-col items-end gap-2.5 pt-0.5">
        <span className="text-[15px] font-bold tabular-nums leading-none text-foreground">
          {totalLabel ?? `${currency} ${lineTotal.toFixed(2)}`}
        </span>
        <button
          type="button"
          onClick={() => onRemoveLine(line.key)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-90"
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
  loading,
  subtotal,
  grandTotal,
  currency,
  branchName,
}: GroceryInvoiceCartProps) {
  const isEmpty = lines.length === 0;
  const cartItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const [showTotalsBreakdown, setShowTotalsBreakdown] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border/[0.08] px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-xl bg-primary/[0.08]">
          <ShoppingBasket className="size-[17px] text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-bold tracking-tight text-foreground">
            Current Sale
          </h2>
          {branchName && (
            <p className="text-[11px] text-muted-foreground truncate">
              {branchName}
            </p>
          )}
        </div>
        {!isEmpty && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* ── Line Items ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
            <div className="mb-5 flex size-20 items-center justify-center rounded-[2rem] bg-muted/[0.15]">
              <ShoppingBasket className="size-9 text-muted-foreground/20" />
            </div>
            <p className="text-[15px] font-semibold text-muted-foreground">
              Empty cart
            </p>
            <p className="mt-2 max-w-[18rem] text-[13px] leading-relaxed text-muted-foreground/60">
              Tap items on the left to add them to the current sale
            </p>
          </div>
        ) : (
          <div>
            {lines.map((line, i) => (
              <CartLineItem
                key={line.key}
                line={line}
                currency={currency}
                onUpdateLine={onUpdateLine}
                onRemoveLine={onRemoveLine}
                isLast={i === lines.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: Totals + Generate ── */}
      {!isEmpty && (
        <div className="shrink-0 border-t border-border/[0.08] bg-gradient-to-t from-muted/[0.08] to-transparent">
          {/* Collapsible totals breakdown */}
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={() => setShowTotalsBreakdown(!showTotalsBreakdown)}
              className="flex w-full items-center justify-between text-[12px]"
            >
              <span className="font-medium text-muted-foreground">
                Order Summary
              </span>
              <span className="flex items-center gap-0.5 text-muted-foreground/60 transition-transform duration-200">
                {showTotalsBreakdown ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </span>
            </button>

            {showTotalsBreakdown && (
              <div className="mt-3 space-y-2 animate-in slide-in-from-top-1 duration-150">
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
                <div className="border-t border-border/[0.08] pt-2" />
              </div>
            )}
          </div>

          {/* Grand total + generate */}
          <div className="px-5 pb-5 pt-3">
            <div className="flex items-end justify-between mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">
                Total Due
              </span>
              <span className="text-[22px] font-bold tabular-nums leading-none tracking-tight text-foreground">
                {formatShelfPriceLabel(grandTotal, currency) ??
                  `${currency} ${grandTotal.toFixed(2)}`}
              </span>
            </div>

            {/* Generate Invoice Button (tablet version — integrated in cart) */}
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading || isEmpty}
              className={cn(
                "group relative flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-[14px] font-bold text-white transition-all duration-300",
                "bg-gradient-to-r from-primary to-primary/90",
                "shadow-[0_4px_20px_rgba(0,0,0,0.15),0_0_0_0_hsl(var(--primary)/0.3)]",
                "hover:shadow-[0_8px_30px_rgba(0,0,0,0.2),0_0_0_4px_hsl(var(--primary)/0.12)]",
                "active:scale-[0.97] active:shadow-[0_2px_10px_rgba(0,0,0,0.15)]",
                loading && "opacity-70 pointer-events-none",
                isEmpty && "opacity-50 pointer-events-none",
              )}
            >
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Creating Invoice…</span>
                </>
              ) : (
                <>
                  <Receipt className="size-[18px] transition-transform duration-300 group-hover:rotate-[-3deg]" />
                  <span>Generate Invoice</span>
                  <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px] tabular-nums">
                    {cartItemCount}
                  </span>
                </>
              )}
            </button>

            {/* Payment hint */}
            <p className="mt-2.5 text-center text-[11px] text-muted-foreground/60">
              <Banknote className="inline size-3 mr-1 align-text-bottom" />
              Invoice will be paid at the cashier
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

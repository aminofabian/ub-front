"use client";

import { Minus, Plus, ShoppingBasket, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onUpdateLine: (key: string, field: "quantity" | "unitPrice", value: number) => void;
  onRemoveLine: (key: string) => void;
  onGenerate: () => void;
  loading: boolean;
  subtotal: number;
  grandTotal: number;
  currency: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function GroceryInvoiceCart({
  lines,
  onUpdateLine,
  onRemoveLine,
  onGenerate,
  loading,
  subtotal,
  grandTotal,
  currency,
}: GroceryInvoiceCartProps) {
  const isEmpty = lines.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <ShoppingBasket className="size-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Invoice Cart
        </h2>
        {!isEmpty && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {lines.length} item{lines.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <ShoppingBasket className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              No items added
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Browse items on the left to get started
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {lines.map((line) => {
              const lineTotal = round2(line.quantity * line.unitPrice);
              const priceLabel = formatShelfPriceLabel(line.unitPrice, currency);
              const totalLabel = formatShelfPriceLabel(lineTotal, currency);

              return (
                <li
                  key={line.key}
                  className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  {/* Item info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight text-foreground">
                      {line.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {line.quantity} × {priceLabel ?? `KES ${line.unitPrice.toFixed(2)}`}
                      {line.unitName ? ` / ${line.unitName}` : ""}
                    </p>
                    {/* Quantity controls */}
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLine(line.key, "quantity", Math.max(1, line.quantity - 1))
                        }
                        disabled={line.quantity <= 1}
                        className="flex size-7 items-center justify-center rounded-md border border-border/60 bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-30"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="flex min-w-[2rem] items-center justify-center text-sm font-semibold tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLine(line.key, "quantity", line.quantity + 1)
                        }
                        className="flex size-7 items-center justify-center rounded-md border border-border/60 bg-background text-foreground transition-colors hover:bg-muted"
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Line total + remove */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {totalLabel ?? `KES ${lineTotal.toFixed(2)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.key)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Totals + Generate */}
      {!isEmpty && (
        <div className="border-t border-border/50 bg-muted/20 px-4 py-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatShelfPriceLabel(subtotal, currency) ?? `KES ${subtotal.toFixed(2)}`}
              </span>
            </div>
            {subtotal !== grandTotal && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium tabular-nums text-destructive">
                  −{formatShelfPriceLabel(subtotal - grandTotal, currency) ?? `KES ${(subtotal - grandTotal).toFixed(2)}`}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border/40 pt-2 text-base">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {formatShelfPriceLabel(grandTotal, currency) ?? `KES ${grandTotal.toFixed(2)}`}
              </span>
            </div>
          </div>

          <Button
            onClick={onGenerate}
            disabled={loading || isEmpty}
            className="mt-4 w-full h-11 text-sm font-semibold gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating…
              </>
            ) : (
              <>
                <Receipt className="size-4" />
                Generate Invoice
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

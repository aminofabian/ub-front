"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { itemListThumbnailUrl, type ItemSummaryRecord } from "@/lib/api";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn } from "@/lib/utils";

import {
  CashierCurrencySuffix,
  CashierDottedLeader,
} from "./cashier-currency-inline";

type CartLineLike = {
  key: string;
  itemId: string;
  label: string;
  quantity: string;
  unitPrice: string;
  item: ItemSummaryRecord;
};

type CashierCartSidePanelProps = {
  currency: string;
  lines: CartLineLike[];
  grandTotal: number;
  pulse?: boolean;
  canCompleteSale: boolean;
  loading: boolean;
  branchSelected: boolean;
  removeLine: (key: string) => void;
  updateLine: (
    key: string,
    field: "quantity" | "unitPrice",
    value: string,
  ) => void;
  onCheckout: () => void;
};

function lineSubtotal(line: CartLineLike): number {
  const q = Number(line.quantity);
  const p = Number(line.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p < 0) return 0;
  return Math.round(q * p * 100) / 100;
}

export function CashierCartSidePanel({
  currency,
  lines,
  grandTotal,
  pulse = false,
  canCompleteSale,
  loading,
  branchSelected,
  removeLine,
  updateLine,
  onCheckout,
}: CashierCartSidePanelProps) {
  const itemCount = lines.reduce((sum, line) => {
    const q = Number(line.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);

  return (
    <aside
      className={cn(
        "hidden min-h-0 w-[min(100%,22rem)] shrink-0 flex-col lg:flex xl:w-[24rem]",
        "sticky top-[3.75rem] h-[calc(100dvh-4.5rem)]",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.02]",
          "dark:ring-white/[0.04]",
          pulse &&
            "ring-2 ring-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Current cart
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {lines.length === 0
                ? "Tap a product to add"
                : `${lines.length} line${lines.length === 1 ? "" : "s"} · ${itemCount} qty`}
            </p>
          </div>
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]">
            <ShoppingCart className="size-4" aria-hidden />
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
          {lines.length === 0 ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
              <ShoppingCart className="size-8 text-muted-foreground/35" />
              <p className="text-sm font-medium text-muted-foreground">
                Cart is empty
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                Search or scan a product. Tap a result to add 1 unit.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {lines.map((line) => {
                const thumb = posTileThumbUrl(
                  line.item.name,
                  itemListThumbnailUrl(line.item),
                );
                const qty = Number(line.quantity);
                const title = cashierItemPrimaryLabel(line.item);
                return (
                  <li
                    key={line.key}
                    className="flex items-center gap-2 px-1 py-2"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted/40">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-full object-contain p-0.5"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[11px] font-bold text-muted-foreground/50">
                          {title.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold leading-tight text-foreground">
                        {title}
                      </p>
                      <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {Number(line.unitPrice).toFixed(2)} ·{" "}
                        {lineSubtotal(line).toFixed(2)}
                      </p>
                    </div>
                    <div className="inline-flex shrink-0 items-center rounded-lg border border-border/60 bg-muted/15">
                      <button
                        type="button"
                        className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Decrease quantity"
                        onClick={() => {
                          const next = Math.max(
                            1,
                            (Number.isFinite(qty) ? qty : 1) - 1,
                          );
                          updateLine(line.key, "quantity", String(next));
                        }}
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums">
                        {Number.isFinite(qty) ? qty : line.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Increase quantity"
                        onClick={() => {
                          const next = (Number.isFinite(qty) ? qty : 0) + 1;
                          updateLine(line.key, "quantity", String(next));
                        }}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label={`Remove ${title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border/50 bg-background/90 px-4 py-3">
          <div className="mb-3 flex items-end gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total
            </span>
            <CashierDottedLeader />
            <span className="inline-flex items-baseline gap-1 text-lg font-bold tabular-nums text-[var(--pos-primary)]">
              <span>{grandTotal.toFixed(2)}</span>
              <CashierCurrencySuffix code={currency} />
            </span>
          </div>
          <Button
            type="button"
            className="h-11 w-full text-sm font-semibold"
            style={{
              backgroundColor: "var(--pos-primary)",
              color: "var(--pos-primary-ink)",
            }}
            disabled={
              loading || lines.length === 0 || !branchSelected || !canCompleteSale
            }
            onClick={onCheckout}
          >
            {loading ? "Recording…" : "Checkout / Pay"}
          </Button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Opens payment options (cash, M-Pesa, tab…)
          </p>
        </div>
      </div>
    </aside>
  );
}

"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ItemSummaryRecord } from "@/lib/api";
import {
  cashierItemPrimaryLabel,
  cashierItemTitleParts,
} from "@/lib/cashier-item-display";
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
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5">
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
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]">
            <ShoppingCart className="size-3.5" aria-hidden />
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1">
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
            <ul className="divide-y divide-border/35">
              {lines.map((line) => {
                const qty = Number(line.quantity);
                const full = cashierItemPrimaryLabel(line.item);
                const { primary, option } = cashierItemTitleParts(line.item);
                const sub = lineSubtotal(line);
                return (
                  <li
                    key={line.key}
                    className="flex items-center gap-1.5 px-1 py-1"
                  >
                    <div className="min-w-0 flex-1" title={full}>
                      <p className="truncate text-[12px] font-semibold leading-tight text-foreground">
                        {primary}
                        {option ? (
                          <span className="font-medium text-muted-foreground">
                            {" "}
                            · {option}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-px text-[10px] tabular-nums text-muted-foreground">
                        {Number(line.unitPrice).toFixed(2)} ×{" "}
                        {Number.isFinite(qty) ? qty : line.quantity}
                      </p>
                    </div>
                    <div className="inline-flex shrink-0 items-center rounded-md border border-border/60 bg-muted/10">
                      <button
                        type="button"
                        className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label={
                          qty <= 1 ? `Remove ${full}` : "Decrease quantity"
                        }
                        onClick={() => {
                          const cur = Number.isFinite(qty) ? qty : 1;
                          if (cur <= 1) {
                            removeLine(line.key);
                            return;
                          }
                          updateLine(line.key, "quantity", String(cur - 1));
                        }}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-[1.25rem] text-center text-xs font-semibold tabular-nums">
                        {Number.isFinite(qty) ? qty : line.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Increase quantity"
                        onClick={() => {
                          const next = (Number.isFinite(qty) ? qty : 0) + 1;
                          updateLine(line.key, "quantity", String(next));
                        }}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="w-[3.25rem] shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground">
                      {sub.toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border/50 bg-background/90 px-3 py-2.5">
          <div className="mb-2.5 flex items-end gap-2">
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
              loading || lines.length === 0 || !branchSelected || grandTotal <= 0
            }
            onClick={onCheckout}
          >
            {loading ? "Recording…" : "Checkout / Pay"}
          </Button>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            {!branchSelected
              ? "Pick a branch in the top nav to check out"
              : lines.length === 0 || grandTotal <= 0
                ? "Add items to enable checkout"
                : "− at 1 removes the line · Opens cash / M-Pesa / tab"}
          </p>
        </div>
      </div>
    </aside>
  );
}

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
  className?: string;
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
  className,
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
        "hidden min-h-0 w-[min(100%,22rem)] shrink-0 flex-col self-stretch lg:flex xl:w-[24rem]",
        className,
      )}
    >
      <div
        className={cn(
          "pos-market-receipt flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
          "dark:border-border/60",
          pulse && "animate-pos-cart-pulse ring-2 ring-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-3.5 py-3 dark:border-border/50">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Till slip
            </p>
            <h2 className="pos-market-section-label mt-0.5 text-xl leading-none text-foreground">
              Current cart
            </h2>
            <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
              {lines.length === 0
                ? "Awaiting first item"
                : `${lines.length} line${lines.length === 1 ? "" : "s"} · ${itemCount} qty`}
            </p>
          </div>
          <span className="inline-flex size-9 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] text-[var(--pos-primary)]">
            <ShoppingCart className="size-3.5" aria-hidden />
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
          {lines.length === 0 ? (
            <div className="flex h-full min-h-[8rem] flex-col justify-between px-3 py-4 sm:min-h-[14rem] sm:py-6">
              <div className="space-y-3 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] pb-4 dark:border-border/40">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-end gap-2 opacity-[0.28]"
                    aria-hidden
                  >
                    <span className="h-2.5 w-[42%] rounded-sm bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_35%,transparent)]" />
                    <CashierDottedLeader />
                    <span className="h-2.5 w-10 rounded-sm bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_25%,transparent)]" />
                  </div>
                ))}
              </div>
              <div className="pt-4 text-center">
                <p className="pos-market-section-label text-lg text-foreground/80">
                  Ready when you are
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Search, scan, or tap a shelf item — it lands here as a line.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-dashed divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:divide-border/40">
              {lines.map((line) => {
                const qty = Number(line.quantity);
                const full = cashierItemPrimaryLabel(line.item);
                const { primary, option } = cashierItemTitleParts(line.item);
                const sub = lineSubtotal(line);
                return (
                  <li
                    key={line.key}
                    className="animate-pos-line-in flex items-center gap-1.5 px-1.5 py-2"
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
                      <div className="mt-0.5 flex items-end gap-1.5 text-[10px] tabular-nums text-muted-foreground">
                        <span>
                          {Number(line.unitPrice).toFixed(2)} ×{" "}
                          {Number.isFinite(qty) ? qty : line.quantity}
                        </span>
                        <CashierDottedLeader />
                        <span className="shrink-0 font-semibold text-foreground">
                          {sub.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="inline-flex shrink-0 items-center rounded-md border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] dark:border-border/60 dark:bg-muted/20">
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center text-muted-foreground hover:text-foreground"
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
                      <span className="min-w-[1.35rem] text-center text-xs font-bold tabular-nums">
                        {Number.isFinite(qty) ? qty : line.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Increase quantity"
                        onClick={() => {
                          const next = (Number.isFinite(qty) ? qty : 0) + 1;
                          updateLine(line.key, "quantity", String(next));
                        }}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,transparent)] px-3.5 py-3 dark:border-border/50 dark:bg-muted/10">
          <div className="mb-3 flex items-end gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total
            </span>
            <CashierDottedLeader />
            <span
              key={grandTotal.toFixed(2)}
              className="pos-tile-line-total inline-flex items-baseline gap-1 text-2xl font-bold tabular-nums tracking-tight text-[var(--pos-primary)]"
            >
              <span>{grandTotal.toFixed(2)}</span>
              <CashierCurrencySuffix code={currency} />
            </span>
          </div>
          <Button
            type="button"
            className="h-12 w-full text-sm font-semibold tracking-wide"
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
          <p className="mt-2 text-center text-[10px] leading-snug text-muted-foreground">
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

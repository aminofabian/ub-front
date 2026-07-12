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
  allowPriceEdit?: boolean;
  removeLine: (key: string) => void;
  updateLine: (
    key: string,
    field: "quantity" | "unitPrice",
    value: string,
  ) => void;
  onCheckout: () => void;
  onEditPrice?: (key: string) => void;
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
  allowPriceEdit = false,
  removeLine,
  updateLine,
  onCheckout,
  onEditPrice,
}: CashierCartSidePanelProps) {
  const itemCount = lines.reduce((sum, line) => {
    const q = Number(line.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);

  return (
    <aside
      className={cn(
        "hidden h-full max-h-full min-h-0 w-[min(100%,22rem)] shrink-0 flex-col self-stretch overflow-hidden lg:flex xl:w-[24rem]",
        className,
      )}
    >
      <div
        className={cn(
          "pos-market-receipt flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
          "dark:border-border/40",
          pulse && "outline outline-1 outline-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)]",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-2 dark:border-border/40">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Till slip
            </p>
            <h2 className="pos-market-section-label mt-0.5 text-lg leading-none text-foreground">
              Current cart
            </h2>
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {lines.length === 0
                ? "No items yet"
                : `${lines.length} line${lines.length === 1 ? "" : "s"} · ${itemCount} qty`}
            </p>
          </div>
          <ShoppingCart className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-1">
          {lines.length === 0 ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center px-4 py-6 text-center">
              <ShoppingCart className="mb-3 size-5 text-muted-foreground/50" aria-hidden />
              <p className="pos-market-section-label text-base text-foreground/85">
                Cart is empty
              </p>
              <p className="mt-1 max-w-[14rem] text-[11px] leading-relaxed text-muted-foreground">
                Search, scan, or tap a shelf item to start a line.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] dark:divide-border/30">
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
                      </p>
                      {option ? (
                        <p className="truncate text-[11px] font-bold leading-tight text-foreground">
                          {option}
                        </p>
                      ) : null}
                      <div className="mt-0.5 flex items-end gap-1.5 text-[10px] tabular-nums text-muted-foreground">
                        {allowPriceEdit && onEditPrice ? (
                          <button
                            type="button"
                            className="shrink-0 font-medium text-foreground underline-offset-2 hover:underline"
                            onClick={() => onEditPrice(line.key)}
                            title="Edit unit price"
                          >
                            {Number(line.unitPrice).toFixed(2)}
                          </button>
                        ) : (
                          <span>{Number(line.unitPrice).toFixed(2)}</span>
                        )}
                        <span>
                          × {Number.isFinite(qty) ? qty : line.quantity}
                        </span>
                        <CashierDottedLeader />
                        <span className="shrink-0 font-semibold text-foreground">
                          {sub.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="inline-flex shrink-0 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] dark:border-border/40">
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

        <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-2.5 dark:border-border/40">
          <div className="mb-2 flex items-end gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total
            </span>
            <CashierDottedLeader />
            <span
              key={grandTotal.toFixed(2)}
              className="pos-tile-line-total inline-flex items-baseline gap-1 text-xl font-bold tabular-nums tracking-tight text-foreground"
            >
              <span>{grandTotal.toFixed(2)}</span>
              <CashierCurrencySuffix code={currency} />
            </span>
          </div>
          <Button
            type="button"
            className={cn(
              "h-12 w-full rounded-md text-[15px] font-semibold tracking-wide",
              "disabled:opacity-40",
            )}
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
          <p className="mt-1.5 text-center text-[10px] leading-snug text-muted-foreground">
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

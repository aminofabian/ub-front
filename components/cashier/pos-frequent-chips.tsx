"use client";

import type { TopProductRecord } from "@/lib/top-products";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

type PosFrequentChipsProps = {
  products: TopProductRecord[];
  loading?: boolean;
  title?: string;
  cartQtyByItem: Map<string, number>;
  justAddedId: string | null;
  onPick: (product: TopProductRecord) => void;
};

export function PosFrequentChips({
  products,
  loading = false,
  title = "Frequently sold",
  cartQtyByItem,
  justAddedId,
  onPick,
}: PosFrequentChipsProps) {
  if (loading && products.length === 0) {
    return (
      <section
        aria-label={title}
        className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pt-2 dark:border-border/40"
      >
        <h3 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section
        aria-label={title}
        className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pt-2 dark:border-border/40"
      >
        <h3 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
          {title}
        </h3>
        <p className="mt-2 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_50%,transparent)] px-3 py-4 text-center text-xs text-muted-foreground">
          No sales yet — frequent items will appear here after the first sale.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pt-2 dark:border-border/40"
    >
      <h3 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {products.map((product) => {
          const label =
            product.sku?.trim() ||
            cashierItemPrimaryLabel({
              id: product.id,
              name: product.name,
              sku: product.sku ?? "",
              variantName: product.variantName ?? undefined,
              brand: product.brand ?? undefined,
              size: product.size ?? undefined,
              variantOfItemId: product.variantOfItemId ?? undefined,
            });
          const qty = cartQtyByItem.get(product.id) ?? 0;
          const justAdded = justAddedId === product.id;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onPick(product)}
              title={product.name}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors",
                "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card text-foreground",
                "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                qty > 0 &&
                  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_20%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,var(--card))]",
                justAdded && "ring-2 ring-[var(--pos-primary)]/40",
              )}
            >
              <span className="truncate font-mono text-[11px] tracking-tight">
                {label}
              </span>
              {qty > 0 ? (
                <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
                  ×{qty}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

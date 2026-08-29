"use client";

import { useState } from "react";

import type { TopProductRecord } from "@/lib/top-products";
import { cashierItemTitleParts } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

/** First wave of chips — keep the idle shelf scannable. */
const FREQUENT_CHIP_LIMIT = 8;

type PosFrequentChipsProps = {
  products: TopProductRecord[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  cartQtyByItem: Map<string, number>;
  justAddedId: string | null;
  onPick: (product: TopProductRecord) => void;
};

function chipLabels(product: TopProductRecord): {
  primary: string;
  sku: string | null;
} {
  const row = {
    id: product.id,
    name: product.name,
    sku: product.sku ?? "",
    variantName: product.variantName ?? undefined,
    brand: product.brand ?? undefined,
    size: product.size ?? undefined,
    variantOfItemId: product.variantOfItemId ?? undefined,
    parentName: product.parentName ?? undefined,
  };
  const { primary, option } = cashierItemTitleParts(row);

  let display = primary;
  if (option) {
    const alreadyInName = primary.toLowerCase().includes(option.toLowerCase());
    if (!alreadyInName) {
      // Size / short variant → "Dry Hook #10". Longer options → "Name · option".
      const sizeLike =
        /^#?[\d./]+[a-zA-Z%]*$/.test(option.trim()) || option.trim().length <= 6;
      display = sizeLike
        ? `${primary} #${option.replace(/^#/, "")}`
        : `${primary} · ${option}`;
    }
  }

  const sku = product.sku?.trim() || null;
  if (sku && display.trim().toLowerCase() === sku.toLowerCase()) {
    return { primary: display, sku: null };
  }
  return { primary: display, sku };
}

export function PosFrequentChips({
  products,
  loading = false,
  title = "Frequently sold",
  subtitle = "Based on this cashier's recent sales",
  cartQtyByItem,
  justAddedId,
  onPick,
}: PosFrequentChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? products
    : products.slice(0, FREQUENT_CHIP_LIMIT);
  const hiddenCount = Math.max(0, products.length - FREQUENT_CHIP_LIMIT);

  if (loading && products.length === 0) {
    return (
      <section
        aria-label={title}
        className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pt-2 dark:border-border/40"
      >
        <Header title={title} subtitle={subtitle} />
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
        <Header title={title} subtitle={subtitle} />
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
      <Header title={title} subtitle={subtitle} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {visible.map((product) => {
          const { primary, sku } = chipLabels(product);
          const qty = cartQtyByItem.get(product.id) ?? 0;
          const justAdded = justAddedId === product.id;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onPick(product)}
              title={sku ? `${primary} · ${sku}` : primary}
              className={cn(
                "inline-flex min-w-[7.5rem] max-w-[11.5rem] flex-col items-start gap-0.5 border px-2.5 py-1.5 text-left transition-colors",
                "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card text-foreground",
                "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "active:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_50%,var(--card))]",
                qty > 0 &&
                  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_20%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,var(--card))]",
                justAdded && "ring-2 ring-[var(--pos-primary)]/40",
              )}
            >
              <span className="flex w-full items-start justify-between gap-1.5">
                <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-foreground">
                  {primary}
                </span>
                {qty > 0 ? (
                  <span className="shrink-0 tabular-nums text-[10px] font-semibold text-muted-foreground">
                    ×{qty}
                  </span>
                ) : null}
              </span>
              {sku ? (
                <span className="w-full truncate font-mono text-[10px] leading-tight tracking-tight text-muted-foreground">
                  {sku}
                </span>
              ) : null}
            </button>
          );
        })}
        {!expanded && hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cn(
              "inline-flex min-h-[2.75rem] min-w-[5.5rem] items-center justify-center border border-dashed px-2.5 py-1.5 text-xs font-semibold transition-colors",
              "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground",
              "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)] hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label={`Show ${hiddenCount} more frequent items`}
          >
            + More
          </button>
        ) : null}
        {expanded && hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className={cn(
              "inline-flex min-h-[2.75rem] min-w-[5.5rem] items-center justify-center border border-dashed px-2.5 py-1.5 text-xs font-semibold transition-colors",
              "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground",
              "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)] hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            Show less
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-w-0">
      <h3 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

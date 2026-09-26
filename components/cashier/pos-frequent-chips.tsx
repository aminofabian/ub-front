"use client";

import type { TopProductRecord } from "@/lib/top-products";
import { cashierItemTitleParts } from "@/lib/cashier-item-display";
import { kioskPlaceholderWashClass } from "@/components/cashier/kiosk-listing-styles";
import { splitShelfPriceDisplay } from "@/lib/cashier-shelf-price";
import { cn } from "@/lib/utils";

/** Leaders only — a ranked wall of 24 is noise on a till. */
const HOT_RANK_LIMIT = 3;

type PosFrequentChipsProps = {
  products: TopProductRecord[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  /** Item id → shelf display label (`199.00 KES`), same map as catalog tiles. */
  shelfPrices: Record<string, string>;
  online?: boolean;
  priceLoadingLabel?: string;
  priceEmptyLabel?: string;
  cartQtyByItem: Map<string, number>;
  justAddedId: string | null;
  onPick: (product: TopProductRecord) => void;
};

function chipLabel(product: TopProductRecord): string {
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
      const sizeLike =
        /^#?[\d./]+[a-zA-Z%]*$/.test(option.trim()) || option.trim().length <= 6;
      display = sizeLike
        ? `${primary} #${option.replace(/^#/, "")}`
        : `${primary} · ${option}`;
    }
  }
  return display;
}

function chipShelfLine(
  online: boolean,
  prices: Record<string, string>,
  id: string,
  loadingLabel: string,
  emptyLabel: string,
): string {
  if (!online) return emptyLabel;
  if (!(id in prices)) return loadingLabel;
  return prices[id] ? prices[id] : emptyLabel;
}

function markLetter(label: string): string {
  const ch = label.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

export function PosFrequentChips({
  products,
  loading = false,
  title = "Frequently sold",
  subtitle = "Tap to add · shelf prices",
  shelfPrices,
  online = true,
  priceLoadingLabel = "…",
  priceEmptyLabel = "—",
  cartQtyByItem,
  justAddedId,
  onPick,
}: PosFrequentChipsProps) {
  if (loading && products.length === 0) {
    return (
      <section
        aria-label={title}
        className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pt-3 dark:border-border/40"
      >
        <Header title={title} subtitle={subtitle} count={null} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="flex h-[4.25rem] gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] p-2 dark:bg-card"
            >
              <span className="size-9 shrink-0 animate-pulse bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]" />
              <span className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 py-0.5">
                <span className="h-3 w-[85%] animate-pulse bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]" />
                <span className="h-3 w-12 animate-pulse bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]" />
              </span>
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section
        aria-label={title}
        className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pt-3 dark:border-border/40"
      >
        <Header title={title} subtitle={subtitle} count={null} />
        <p className="mt-3 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_50%,transparent)] px-3 py-5 text-center text-xs leading-relaxed text-muted-foreground">
          No sales yet — frequent items will appear here after the first sale.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pt-3 dark:border-border/40"
    >
      <Header title={title} subtitle={subtitle} count={products.length} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product, index) => {
          const label = chipLabel(product);
          const qty = cartQtyByItem.get(product.id) ?? 0;
          const justAdded = justAddedId === product.id;
          const shelfLine = chipShelfLine(
            online,
            shelfPrices,
            product.id,
            priceLoadingLabel,
            priceEmptyLabel,
          );
          const { amount, code } = splitShelfPriceDisplay(shelfLine);
          const rank = index + 1;
          const showRank = rank <= HOT_RANK_LIMIT;
          const letter = markLetter(label);
          const inCart = qty > 0;

          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onPick(product)}
              title={
                amount
                  ? `${label} · ${amount}${code ? ` ${code}` : ""}`
                  : label
              }
              aria-label={
                inCart
                  ? `${label}, ${qty} in cart. Tap to add another.`
                  : amount
                    ? `Add ${label}, ${amount}${code ? ` ${code}` : ""}`
                    : `Add ${label}`
              }
              className={cn(
                "group relative flex min-h-[4.25rem] items-stretch gap-2 overflow-hidden text-left",
                "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
                "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] dark:bg-card",
                "transition-[border-color,background-color,transform] duration-150",
                "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] hover:bg-card",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary)]",
                "active:scale-[0.985] active:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,var(--card))]",
                inCart &&
                  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_45%,var(--card))]",
                justAdded &&
                  "ring-2 ring-inset ring-[var(--pos-primary)]/50",
              )}
            >
              {/* Same 3px edge cue as shelf tiles — ink when in cart, teal on hover */}
              <span
                className={cn(
                  "pointer-events-none absolute left-0 top-0 z-[1] h-full w-[3px] transition-opacity duration-150",
                  inCart
                    ? "bg-[var(--pos-ink,#1c1915)] opacity-100"
                    : "bg-[var(--pos-primary)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
                aria-hidden
              />

              <span
                className={cn(
                  "relative m-1.5 flex size-9 shrink-0 items-center justify-center bg-gradient-to-br",
                  "pos-market-section-label text-[1.05rem] leading-none tracking-tight",
                  kioskPlaceholderWashClass(label),
                )}
                aria-hidden
              >
                {letter}
              </span>

              <span className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-2 pr-2">
                <span className="flex items-start gap-1.5">
                  <span className="min-w-0 flex-1 line-clamp-2 text-[12px] font-semibold leading-snug tracking-tight text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                    {label}
                  </span>
                  {inCart ? (
                    <span
                      key={qty}
                      className="pos-tile-qty-badge shrink-0 inline-flex h-5 min-w-5 items-center justify-center bg-[var(--pos-ink,#1c1915)] px-1 text-[10px] font-semibold tabular-nums text-[#f7f3eb] dark:bg-neutral-950 dark:text-white"
                    >
                      ×{qty > 99 ? "99+" : qty}
                    </span>
                  ) : null}
                </span>

                <span className="flex min-w-0 items-baseline gap-1.5">
                  {showRank ? (
                    <span
                      className="shrink-0 text-[10px] font-semibold tabular-nums tracking-[0.02em] text-muted-foreground"
                      title={`Number ${rank} seller here`}
                    >
                      #{rank}
                    </span>
                  ) : null}
                  {amount ? (
                    <span className="inline-flex min-w-0 max-w-full items-baseline gap-0.5 truncate font-semibold tabular-nums text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)] dark:text-foreground">
                      <span className="text-[13px] leading-none tracking-tight">
                        {amount}
                      </span>
                      {code ? (
                        <span className="text-[8px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {code}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {shelfLine}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Header({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number | null;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h3 className="pos-market-section-label text-[1.05rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground sm:text-[1.15rem]">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {count != null && count > 0 ? (
        <span className="shrink-0 pb-0.5 font-mono text-[10px] tabular-nums tracking-[0.06em] text-muted-foreground">
          {count}
        </span>
      ) : null}
    </div>
  );
}

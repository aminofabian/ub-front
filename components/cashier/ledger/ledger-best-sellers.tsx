"use client";

import type { TopProductRecord } from "@/lib/top-products";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import { splitShelfPriceDisplay } from "@/lib/cashier-shelf-price";
import { cn } from "@/lib/utils";

type LedgerBestSellersProps = {
  products: TopProductRecord[];
  loading: boolean;
  title: string;
  shelfPrices: Record<string, string>;
  cartQtyByItem: Map<string, number>;
  disabled?: boolean;
  onPick: (product: TopProductRecord) => void;
};

function productLabel(product: TopProductRecord): string {
  return cashierItemPrimaryLabel({
    id: product.id,
    name: product.name,
    sku: product.sku ?? "",
    variantName: product.variantName ?? undefined,
    brand: product.brand ?? undefined,
    size: product.size ?? undefined,
    variantOfItemId: product.variantOfItemId ?? undefined,
  });
}

export function LedgerBestSellers({
  products,
  loading,
  title,
  shelfPrices,
  cartQtyByItem,
  disabled = false,
  onPick,
}: LedgerBestSellersProps) {
  if (!loading && products.length === 0) return null;

  return (
    <section aria-label={title} className="shrink-0">
      <div className="flex items-center gap-2">
        <p className="shrink-0 text-[11px] font-medium text-zinc-500">
          Best sellers
        </p>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {loading && products.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="h-8 w-28 shrink-0 animate-pulse rounded-md bg-zinc-200"
                />
              ))
            : products.map((product) => {
                const qty = cartQtyByItem.get(product.id) ?? 0;
                const shelfLine = shelfPrices[product.id] ?? "";
                const { amount, code } = splitShelfPriceDisplay(shelfLine);
                const price = amount || shelfLine;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(product)}
                    title={productLabel(product)}
                    className={cn(
                      "flex h-8 max-w-[11rem] shrink-0 items-center gap-1.5 rounded-md border px-2 text-left",
                      "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary)]",
                      "active:scale-[0.99] disabled:opacity-40",
                      qty > 0 &&
                        "border-[color-mix(in_srgb,var(--pos-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,white)]",
                    )}
                  >
                    <span className="min-w-0 truncate text-[12px] font-medium text-zinc-900">
                      {productLabel(product)}
                    </span>
                    {price ? (
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500">
                        {amount || price}
                        {code ? (
                          <span className="ml-0.5 text-[9px] tracking-wide">
                            {code}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    {qty > 0 ? (
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-zinc-700">
                        ×{qty}
                      </span>
                    ) : null}
                  </button>
                );
              })}
        </div>
      </div>
    </section>
  );
}

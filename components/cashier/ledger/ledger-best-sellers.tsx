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
  return (
    <section
      aria-label={title}
      className="flex shrink-0 flex-col border border-zinc-300 bg-white"
    >
      <div className="flex items-baseline justify-between gap-2 border-b border-zinc-200 px-2 py-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
          {title}
        </h3>
        {products.length > 0 ? (
          <span className="text-[10px] tabular-nums text-zinc-400">
            {products.length}
          </span>
        ) : null}
      </div>
      <div className="max-h-[28vh] overflow-auto p-1.5">
        {loading && products.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-zinc-500">Loading top sellers…</p>
        ) : products.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-zinc-500">
            No sales yet. Top sellers will appear here after the first sale.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1 xl:grid-cols-3">
            {products.map((product) => {
              const qty = cartQtyByItem.get(product.id) ?? 0;
              const shelfLine = shelfPrices[product.id] ?? "";
              const { amount, code } = splitShelfPriceDisplay(shelfLine);
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(product)}
                  className={cn(
                    "flex min-h-8 flex-col items-start gap-0.5 px-2 py-1.5 text-left",
                    "border border-zinc-200 bg-zinc-50",
                    "hover:bg-white hover:border-zinc-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary)]",
                    "active:scale-[0.99] disabled:opacity-40",
                    qty > 0 &&
                      "border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,white)]",
                  )}
                >
                  <span className="flex w-full items-start justify-between gap-1.5">
                    <span className="min-w-0 whitespace-normal break-words text-[12px] font-medium leading-snug text-zinc-900">
                      {productLabel(product)}
                    </span>
                    {qty > 0 ? (
                      <span className="shrink-0 tabular-nums text-[10px] font-semibold text-zinc-600">
                        ×{qty}
                      </span>
                    ) : null}
                  </span>
                  {amount ? (
                    <span className="font-mono text-[12px] font-semibold tabular-nums leading-none text-zinc-800">
                      {amount}
                      {code ? (
                        <span className="ml-1 text-[10px] font-medium tracking-wide text-zinc-500">
                          {code}
                        </span>
                      ) : null}
                    </span>
                  ) : shelfLine ? (
                    <span className="font-mono text-[12px] font-semibold tabular-nums leading-none text-zinc-800">
                      {shelfLine}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

import Link from "next/link";
import { Check } from "lucide-react";

import { shopItemPathFromCard } from "@/lib/shop-item-url";
import type {
  PublicCatalogItemDetail,
  PublicCatalogVariant,
} from "@/lib/public-storefront";
import {
  formatDisplayPrice,
  formatStoreQty,
  hasCatalogPrice,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

function variantLabel(v: PublicCatalogVariant): string {
  return v.variantName?.trim()
    ? v.variantName.trim()
    : v.name.trim();
}

/** Current PDP row plus sibling variants (deduped, selected first). */
export function mergeVariantOptions(
  item: PublicCatalogItemDetail,
): PublicCatalogVariant[] {
  const current: PublicCatalogVariant = {
    id: item.id,
    sku: item.sku,
    name: item.name,
    variantName: item.variantName,
    imageUrl: item.images[0]?.url ?? null,
    price: item.price,
    qtyOnHand: item.qtyOnHand,
  };
  const byId = new Map<string, PublicCatalogVariant>();
  byId.set(current.id, current);
  for (const v of item.variants) {
    byId.set(v.id, v);
  }
  const rows = Array.from(byId.values());
  rows.sort((a, b) => {
    if (a.id === item.id) return -1;
    if (b.id === item.id) return 1;
    return variantLabel(a).localeCompare(variantLabel(b));
  });
  return rows;
}

export function ShopItemVariantPicker({
  item,
  className,
}: {
  item: PublicCatalogItemDetail;
  className?: string;
}) {
  const options = mergeVariantOptions(item);
  if (options.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn("space-y-3", className)}
      role="group"
      aria-label="Product options"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Choose option
        </p>
        <span className="text-xs font-medium text-muted-foreground">
          {options.length} available
        </span>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {options.map((v) => {
          const selected = v.id === item.id;
          const label = variantLabel(v);
          const title = v.variantName
            ? `${v.name} · ${v.variantName}`
            : v.name;
          const priceLabel = hasCatalogPrice(v.price)
            ? formatDisplayPrice(item.currency, v.price)
            : null;
          const stockLabel = formatStoreQty(v.qtyOnHand);
          const outOfStock =
            v.qtyOnHand != null && Number.isFinite(v.qtyOnHand) && v.qtyOnHand <= 0;

          return (
            <li key={v.id}>
              <Link
                href={shopItemPathFromCard({ sku: v.sku })}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.25rem] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow,transform] active:scale-[0.99]",
                  selected
                    ? "border-primary bg-primary/[0.07] shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)] ring-2 ring-primary/20"
                    : "border-border/80 bg-card hover:border-primary/45 hover:bg-muted/30",
                  outOfStock && !selected && "opacity-75",
                )}
              >
                <span className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/80 bg-background",
                    )}
                    aria-hidden
                  >
                    {selected ? <Check className="size-3 stroke-[3]" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-snug text-foreground">
                      {label}
                    </span>
                    {stockLabel ? (
                      <span
                        className={cn(
                          "mt-0.5 block text-xs font-medium tabular-nums",
                          outOfStock
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {stockLabel}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  {priceLabel ? (
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {priceLabel}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      Price on request
                    </span>
                  )}
                </span>
                <span className="sr-only">{title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { Button } from "@/components/ui/button";
import { shopItemPathFromCard } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import {
  formatDisplayPrice,
  formatStoreQty,
  hasCatalogPrice,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

const CARD_SHELL =
  "group relative flex h-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-[0_1px_0_rgba(0,0,0,0.03),0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] duration-200 hover:border-border/80 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)]";

const IMAGE_WELL =
  "relative block aspect-[5/6] w-full overflow-hidden border-b border-border/40 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--muted)_55%,transparent)_0%,color-mix(in_srgb,var(--muted)_28%,transparent)_100%)]";

function stockBadge(qty: number | null | undefined): {
  label: string;
  className: string;
  show: boolean;
} {
  if (qty == null || !Number.isFinite(qty))
    return { label: "", className: "", show: false };
  if (qty <= 0)
    return {
      label: "Out of stock",
      className:
        "border-destructive/20 bg-destructive/8 text-destructive",
      show: true,
    };
  if (qty <= 5)
    return {
      label: "Low stock",
      className: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200",
      show: true,
    };
  return { label: "", className: "", show: false };
}

function ProductImagePlaceholder({ name }: { name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="flex h-full items-center justify-center">
      <span
        className="flex size-12 items-center justify-center rounded-md border border-border/50 bg-background/80 text-lg font-semibold tracking-tight text-muted-foreground/35 shadow-sm"
        aria-hidden
      >
        {initial}
      </span>
    </div>
  );
}

export default function ShopProductGrid({
  items,
  currency,
  filtered,
  clearHref,
  slug,
  accentHex,
}: {
  items: PublicCatalogItemCard[];
  currency: string;
  filtered?: boolean;
  clearHref?: string;
  slug?: string;
  accentHex?: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground/50">
          <PackageSearch className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">No products found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered
              ? "Try adjusting your search or browse all products."
              : "Check back soon for new arrivals."}
          </p>
        </div>
        {filtered && clearHref ? (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href={clearHref}>View all products</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-3.5 xl:grid-cols-5">
      {items.map((item, index) => {
        const title = item.variantName
          ? `${item.name} · ${item.variantName}`
          : item.name;
        const hasPrice = hasCatalogPrice(item.price);
        const priceLabel = hasPrice
          ? formatDisplayPrice(currency, item.price)
          : null;
        const stockLabel = formatStoreQty(item.qtyOnHand);
        const badge = stockBadge(item.qtyOnHand);
        const isOutOfStock = item.qtyOnHand != null && item.qtyOnHand <= 0;

        return (
          <li
            key={item.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
          >
            <article className={cn(CARD_SHELL, isOutOfStock && "opacity-60")}>
              <Link href={shopItemPathFromCard(item)} className={IMAGE_WELL} aria-label={title}>
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-contain p-3 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <ProductImagePlaceholder name={item.name} />
                )}

                {badge.show ? (
                  <span
                    className={cn(
                      "absolute left-2 top-2 z-10 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide backdrop-blur-[2px]",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : null}
              </Link>

              <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
                <Link
                  href={shopItemPathFromCard(item)}
                  className="line-clamp-2 min-h-[2.35rem] text-[11px] font-medium leading-[1.35] text-foreground/90 transition-colors hover:text-foreground sm:min-h-[2.5rem] sm:text-xs"
                >
                  {title}
                </Link>

                <div className="mt-1.5 flex items-baseline justify-between gap-2 border-t border-border/30 pt-1.5">
                  {priceLabel ? (
                    <p className="text-sm font-semibold tabular-nums tracking-tight text-foreground">
                      {priceLabel}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-primary">
                      View options
                    </p>
                  )}
                  {stockLabel ? (
                    <span className="shrink-0 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                      {stockLabel}
                    </span>
                  ) : null}
                </div>

                {slug && !isOutOfStock && hasPrice ? (
                  <div className="mt-2">
                    <ShopQuickAddButton
                      slug={slug}
                      itemId={item.id}
                      ariaLabel={`Add ${title} to basket`}
                      accentHex={accentHex}
                      size="sm"
                      variant="stepper"
                      maxQty={item.qtyOnHand}
                      className="w-full"
                    />
                  </div>
                ) : isOutOfStock ? (
                  <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground/60">
                    Unavailable
                  </p>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

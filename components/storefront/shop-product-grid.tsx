"use client";

import { PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { Button } from "@/components/ui/button";
import { shopItemPathFromCard } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import {
  catalogStockStatus,
  formatCatalogVariantSubtitle,
  formatDisplayPrice,
  hasCatalogPrice,
  isStorefrontInStoreOnly,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

const CARD_SHELL =
  "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-4px_rgba(0,0,0,0.08)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-border hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_-6px_rgba(0,0,0,0.12)]";

const IMAGE_WELL =
  "relative block aspect-square w-full overflow-hidden border-b border-border/35 bg-white dark:bg-[oklch(0.99_0_0)]";

function stockBadge(qty: number | null | undefined): {
  label: string;
  className: string;
  show: boolean;
} {
  const status = catalogStockStatus(qty);
  if (!status || status === "in_stock") {
    return { label: "", className: "", show: false };
  }
  if (status === "out_of_stock") {
    return {
      label: "Out of stock",
      className:
        "border-destructive/30 bg-destructive text-destructive-foreground",
      show: true,
    };
  }
  return {
    label: "Low stock",
    className:
      "border-amber-700/50 bg-amber-500 text-amber-950 shadow-sm dark:border-amber-400/40 dark:bg-amber-400 dark:text-amber-950",
    show: true,
  };
}

function ProductImagePlaceholder({ name }: { name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,oklch(0.97_0.002_90)_0%,oklch(0.94_0.004_90)_100%)]">
      <span
        className="flex size-12 items-center justify-center rounded-lg border border-border/40 bg-white text-lg font-semibold tracking-tight text-muted-foreground/40 shadow-sm"
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
  newFromIndex,
}: {
  items: PublicCatalogItemCard[];
  currency: string;
  filtered?: boolean;
  clearHref?: string;
  slug?: string;
  /** @deprecated Grid add buttons use theme primary for consistency. */
  accentHex?: string | null;
  newFromIndex?: number;
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

  const animateFrom = newFromIndex ?? 0;

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-3.5 xl:grid-cols-5">
      {items.map((item, index) => {
        const isNew = index >= animateFrom;
        const variantSubtitle = formatCatalogVariantSubtitle(item.variantName);
        const title = item.name;
        const ariaTitle = variantSubtitle ? `${title} — ${variantSubtitle}` : title;
        const hasPrice = hasCatalogPrice(item.price);
        const priceLabel = hasPrice
          ? formatDisplayPrice(currency, item.price)
          : null;
        const badge = stockBadge(item.qtyOnHand);
        const isOutOfStock = catalogStockStatus(item.qtyOnHand) === "out_of_stock";
        const inStoreOnly = isStorefrontInStoreOnly(item.onlinePurchaseMode);

        return (
          <li
            key={item.id}
            className={cn(isNew && "animate-fade-in-up")}
            style={
              isNew
                ? {
                    animationDelay: `${Math.min((index - animateFrom) * 40, 600)}ms`,
                  }
                : undefined
            }
          >
            <article className={cn(CARD_SHELL, isOutOfStock && "opacity-65")}>
              <Link href={shopItemPathFromCard(item)} className={IMAGE_WELL} aria-label={ariaTitle}>
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <ProductImagePlaceholder name={item.name} />
                )}

                {badge.show ? (
                  <span
                    className={cn(
                      "absolute left-2 top-2 z-10 rounded-md border px-1.5 py-0.5 text-[9px] font-bold leading-none tracking-wide",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : inStoreOnly ? (
                  <span className="absolute left-2 top-2 z-10 rounded-md border border-sky-600/35 bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold leading-none tracking-wide text-white shadow-sm">
                    In store
                  </span>
                ) : null}
              </Link>

              <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
                <div className="flex min-h-[3.1rem] flex-col justify-start sm:min-h-[3.25rem]">
                  <Link
                    href={shopItemPathFromCard(item)}
                    className="line-clamp-1 text-[11px] font-semibold leading-snug text-foreground transition-colors hover:text-primary sm:text-xs"
                    title={title}
                  >
                    {title}
                  </Link>
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-1 text-[10px] leading-snug text-muted-foreground sm:text-[11px]",
                      !variantSubtitle && "invisible",
                    )}
                    title={variantSubtitle ?? undefined}
                  >
                    {variantSubtitle ?? "\u00a0"}
                  </p>
                </div>

                <div className="mt-auto border-t border-border/30 pt-1.5">
                  {priceLabel ? (
                    <p className="text-sm font-semibold tabular-nums tracking-tight text-foreground">
                      {priceLabel}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-primary">
                      View options
                    </p>
                  )}
                </div>

                {slug && !isOutOfStock && hasPrice && !inStoreOnly ? (
                  <div className="mt-2">
                    <ShopQuickAddButton
                      slug={slug}
                      itemId={item.id}
                      ariaLabel={`Add ${ariaTitle} to basket`}
                      size="sm"
                      variant="stepper"
                      maxQty={item.qtyOnHand}
                      className="w-full"
                    />
                  </div>
                ) : isOutOfStock ? (
                  <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground/70">
                    Unavailable
                  </p>
                ) : inStoreOnly ? (
                  <p className="mt-2 text-center text-[10px] font-medium text-sky-800/80 dark:text-sky-300/90">
                    Available in store only
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

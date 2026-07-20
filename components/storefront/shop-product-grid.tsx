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
  "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_6px_18px_-8px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_2px_6px_rgba(0,0,0,0.04),0_14px_28px_-10px_rgba(0,0,0,0.14)]";

const IMAGE_WELL =
  "relative block aspect-square w-full overflow-hidden bg-[linear-gradient(165deg,oklch(0.975_0.003_95)_0%,oklch(0.955_0.005_95)_100%)] dark:bg-[linear-gradient(165deg,oklch(0.22_0.01_95)_0%,oklch(0.18_0.01_95)_100%)]";

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
        "border-destructive/25 bg-destructive/95 text-destructive-foreground shadow-sm",
      show: true,
    };
  }
  return {
    label: "Low stock",
    className:
      "border-amber-600/20 bg-amber-50 text-amber-900 shadow-sm dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-100",
    show: true,
  };
}

function ProductImagePlaceholder({ name }: { name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="flex h-full items-center justify-center">
      <span
        className="flex size-11 items-center justify-center rounded-lg border border-border/50 bg-background/80 text-base font-semibold tracking-tight text-muted-foreground/35 shadow-sm backdrop-blur-sm"
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
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
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
            <article className={cn(CARD_SHELL, isOutOfStock && "opacity-60")}>
              <Link href={shopItemPathFromCard(item)} className={IMAGE_WELL} aria-label={ariaTitle}>
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-contain p-3.5 transition-transform duration-300 ease-out group-hover:scale-[1.03] sm:p-4"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <ProductImagePlaceholder name={item.name} />
                )}

                {badge.show ? (
                  <span
                    className={cn(
                      "absolute left-2 top-2 z-10 rounded-md border px-1.5 py-1 text-[9px] font-semibold leading-none tracking-wide backdrop-blur-[2px]",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : inStoreOnly ? (
                  <span className="absolute left-2 top-2 z-10 rounded-md border border-sky-700/20 bg-sky-50 px-1.5 py-1 text-[9px] font-semibold leading-none tracking-wide text-sky-900 shadow-sm backdrop-blur-[2px] dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-100">
                    In store
                  </span>
                ) : null}
              </Link>

              <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-2.5 pb-2.5 pt-2.5 sm:px-3 sm:pb-3 sm:pt-3">
                <div className="flex min-h-[2.85rem] flex-col justify-start gap-0.5 sm:min-h-[3rem]">
                  <Link
                    href={shopItemPathFromCard(item)}
                    className="line-clamp-2 text-[12px] font-semibold leading-[1.35] tracking-tight text-foreground transition-colors hover:text-primary sm:text-[13px]"
                    title={title}
                  >
                    {title}
                  </Link>
                  <p
                    className={cn(
                      "line-clamp-1 text-[10px] leading-snug text-muted-foreground/85 sm:text-[11px]",
                      !variantSubtitle && "invisible",
                    )}
                    title={variantSubtitle ?? undefined}
                  >
                    {variantSubtitle ?? "\u00a0"}
                  </p>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  {priceLabel ? (
                    <p className="text-[15px] font-bold tabular-nums tracking-tight text-foreground sm:text-base">
                      {priceLabel}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-primary">
                      View options
                    </p>
                  )}

                  {slug && !isOutOfStock && hasPrice && !inStoreOnly ? (
                    <ShopQuickAddButton
                      slug={slug}
                      itemId={item.id}
                      ariaLabel={`Add ${ariaTitle} to basket`}
                      size="sm"
                      variant="stepper"
                      maxQty={item.qtyOnHand}
                      className="w-full"
                    />
                  ) : isOutOfStock ? (
                    <p className="py-1.5 text-center text-[10px] font-medium text-muted-foreground/70">
                      Unavailable
                    </p>
                  ) : inStoreOnly ? (
                    <p className="py-1.5 text-center text-[10px] font-medium text-sky-800/80 dark:text-sky-300/90">
                      Available in store only
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

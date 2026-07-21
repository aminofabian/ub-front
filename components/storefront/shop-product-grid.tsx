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
  "relative block aspect-[4/3] w-full overflow-hidden bg-[linear-gradient(165deg,oklch(0.975_0.003_95)_0%,oklch(0.955_0.005_95)_100%)] dark:bg-[linear-gradient(165deg,oklch(0.22_0.01_95)_0%,oklch(0.18_0.01_95)_100%)]";

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
                    className="object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-[1.03] sm:p-2"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <ProductImagePlaceholder name={item.name} />
                )}

                {badge.show ? (
                  <span
                    className={cn(
                      "absolute left-1.5 top-1.5 z-10 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.08em] backdrop-blur-[2px]",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : inStoreOnly ? (
                  <span className="absolute left-1.5 top-1.5 z-10 rounded-md border border-sky-700/20 bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.08em] text-sky-900 shadow-sm backdrop-blur-[2px] dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-100">
                    In store
                  </span>
                ) : null}
              </Link>

              <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
                <div className="flex min-h-[3.25rem] flex-col gap-0.5 sm:min-h-[3.4rem]">
                  <Link
                    href={shopItemPathFromCard(item)}
                    className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug tracking-tight text-foreground transition-colors hover:text-primary"
                    title={title}
                  >
                    {title}
                  </Link>
                  <p
                    className={cn(
                      "line-clamp-1 text-[11px] leading-snug text-muted-foreground",
                      !variantSubtitle && "invisible",
                    )}
                    title={variantSubtitle ?? undefined}
                  >
                    {variantSubtitle ?? "\u00a0"}
                  </p>
                </div>

                <div className="mt-auto flex flex-col gap-2 border-t border-border/40 pt-2">
                  {priceLabel ? (
                    <p className="text-[13px] font-semibold tabular-nums tracking-tight text-foreground">
                      {priceLabel}
                    </p>
                  ) : (
                    <p className="invisible text-[13px] font-semibold" aria-hidden>
                      —
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
                  ) : !hasPrice ? (
                    <Link
                      href={shopItemPathFromCard(item)}
                      className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary/8 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/12"
                    >
                      View options
                    </Link>
                  ) : (
                    <div className="h-8" aria-hidden />
                  )}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

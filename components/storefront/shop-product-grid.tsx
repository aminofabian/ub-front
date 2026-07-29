"use client";

import { PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { Button } from "@/components/ui/button";
import {
  cartLineQuantity,
  findCartLine,
  useShopCartOptional,
} from "@/hooks/use-shop-cart";
import { joinProductNameParts } from "@/lib/catalog-display";
import { shopItemPathFromCard } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import {
  catalogStockStatus,
  formatCartQty,
  formatCatalogVariantSubtitle,
  formatDisplayPrice,
  hasCatalogPrice,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

const CARD_SHELL =
  "group relative flex h-full flex-col overflow-hidden rounded-[3px] border border-[var(--storefront-card-border,#e2e5e2)] bg-[var(--storefront-paper-elevated,#fff)] shadow-[0_1px_2px_rgba(20,24,22,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-[var(--storefront-card-border-hover,#c8cdc8)] hover:shadow-[0_2px_10px_-4px_rgba(20,24,22,0.1)]";

const IMAGE_WELL =
  "relative block aspect-square w-full overflow-hidden bg-[linear-gradient(180deg,#fafbfa_0%,#f3f5f3_100%)]";

function isOutOfStockItem(item: PublicCatalogItemCard): boolean {
  return catalogStockStatus(item.qtyOnHand) === "out_of_stock";
}

function ProductImagePlaceholder({ name }: { name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="flex h-full items-center justify-center">
      <span
        className="flex size-10 items-center justify-center border border-[var(--storefront-card-border,#e2e5e2)] bg-white text-sm font-semibold tracking-tight text-[var(--storefront-ink-quiet,#8a928c)]"
        aria-hidden
      >
        {initial}
      </span>
    </div>
  );
}

function InCartQtyBadge({ itemId }: { itemId: string }) {
  const cartCtx = useShopCartOptional();
  const cartLine = findCartLine(cartCtx?.cart ?? null, itemId);
  const qty = cartLine ? cartLineQuantity(cartLine.quantity) : 0;
  if (qty <= 0) return null;
  const label = formatCartQty(qty);
  return (
    <span
      className="absolute left-0 top-0 z-20 flex min-w-6 items-center justify-center bg-primary px-1 text-[11px] font-bold tabular-nums leading-none text-primary-foreground shadow-sm"
      aria-label={`${label} in cart`}
    >
      {qty > 99 ? "99+" : label}
    </span>
  );
}

function productTitle(
  name: string,
  variantSubtitle: string | null,
): string {
  return joinProductNameParts(name, variantSubtitle);
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
  const visibleItems = useMemo(
    () => items.filter((item) => !isOutOfStockItem(item)),
    [items],
  );

  if (visibleItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex size-14 items-center justify-center border border-[var(--storefront-card-border,#e2e5e2)] bg-[var(--storefront-paper-elevated,#fff)] text-[var(--storefront-ink-quiet,#8a928c)]">
          <PackageSearch className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-base font-semibold text-[var(--storefront-ink,#141816)]">
            No products found
          </p>
          <p className="mt-1 text-sm text-[var(--storefront-ink-muted,#5c6560)]">
            {filtered
              ? "Try adjusting your search or browse all products."
              : "Check back soon for new arrivals."}
          </p>
        </div>
        {filtered && clearHref ? (
          <Button asChild variant="outline" size="sm" className="mt-2 rounded-[3px]">
            <Link href={clearHref}>View all products</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const animateFrom = newFromIndex ?? 0;

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4 lg:gap-3 xl:grid-cols-5">
      {visibleItems.map((item, index) => {
        const isNew = index >= animateFrom;
        const variantSubtitle = formatCatalogVariantSubtitle(item.variantName);
        const title = productTitle(item.name, variantSubtitle);
        const ariaTitle = title;
        const hasPrice = hasCatalogPrice(item.price);
        const priceLabel = hasPrice
          ? formatDisplayPrice(currency, item.price)
          : null;

        return (
          <li
            key={item.id}
            className={cn(isNew && "animate-fade-in-up")}
            style={
              isNew
                ? {
                    animationDelay: `${Math.min((index - animateFrom) * 35, 520)}ms`,
                  }
                : undefined
            }
          >
            <article className={CARD_SHELL}>
              <Link href={shopItemPathFromCard(item)} className={IMAGE_WELL} aria-label={ariaTitle}>
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-contain p-3 transition-transform duration-300 ease-out group-hover:scale-[1.04] sm:p-3.5"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <ProductImagePlaceholder name={item.name} />
                )}

                {slug && hasPrice ? (
                  <InCartQtyBadge itemId={item.id} />
                ) : null}
              </Link>

              <div className="flex min-h-0 flex-1 flex-col gap-2 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
                <Link
                  href={shopItemPathFromCard(item)}
                  className="text-[13px] font-medium leading-snug tracking-tight text-[var(--storefront-ink,#141816)] transition-colors hover:text-primary"
                  title={title}
                >
                  {title}
                </Link>

                <div className="mt-auto flex items-center justify-between gap-2">
                  {priceLabel ? (
                    <p className="shrink-0 text-[13px] font-bold tabular-nums tracking-tight text-[var(--storefront-ink,#141816)]">
                      {priceLabel}
                    </p>
                  ) : (
                    <p className="invisible shrink-0 text-[13px] font-bold" aria-hidden>
                      —
                    </p>
                  )}

                  {slug && hasPrice ? (
                    <ShopQuickAddButton
                      slug={slug}
                      itemId={item.id}
                      ariaLabel={`Add ${ariaTitle} to basket`}
                      variant="card"
                      maxQty={item.qtyOnHand}
                    />
                  ) : !hasPrice ? (
                    <Link
                      href={shopItemPathFromCard(item)}
                      className="inline-flex h-7 shrink-0 items-center justify-center border border-[var(--storefront-card-border,#e2e5e2)] px-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--storefront-ink-muted,#5c6560)] transition-colors hover:border-[var(--storefront-card-border-hover,#c8cdc8)] hover:text-[var(--storefront-ink,#141816)]"
                    >
                      Options
                    </Link>
                  ) : (
                    <div className="h-7 w-16" aria-hidden />
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

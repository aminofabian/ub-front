"use client";

import { PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { Button } from "@/components/ui/button";
import {
  cartLineQuantity,
  findCartLine,
  useShopCartOptional,
} from "@/hooks/use-shop-cart";
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
  "group relative flex h-full flex-col overflow-hidden rounded-[2px] border border-[#e5e5e5] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] duration-150 hover:border-[#d4d4d4] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]";

const IMAGE_WELL =
  "relative block aspect-square w-full overflow-hidden bg-white";

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
      className: "bg-destructive text-destructive-foreground",
      show: true,
    };
  }
  return {
    label: "Low stock",
    className: "bg-amber-500 text-white",
    show: true,
  };
}

function ProductImagePlaceholder({ name }: { name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="flex h-full items-center justify-center">
      <span
        className="flex size-10 items-center justify-center border border-[#e5e5e5] bg-[#fafafa] text-sm font-semibold tracking-tight text-muted-foreground/40"
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
  return (
    <span
      className="absolute left-0 top-0 z-20 flex size-6 items-center justify-center bg-[#1a7a5c] text-[11px] font-bold tabular-nums leading-none text-white"
      aria-label={`${qty} in cart`}
    >
      {qty > 99 ? "99+" : qty}
    </span>
  );
}

function productTitle(
  name: string,
  variantSubtitle: string | null,
): string {
  if (!variantSubtitle) return name;
  return `${name} · ${variantSubtitle}`;
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
        <div className="flex size-14 items-center justify-center border border-[#e5e5e5] bg-[#fafafa] text-muted-foreground/50">
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
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-3 xl:grid-cols-5">
      {items.map((item, index) => {
        const isNew = index >= animateFrom;
        const variantSubtitle = formatCatalogVariantSubtitle(item.variantName);
        const title = productTitle(item.name, variantSubtitle);
        const ariaTitle = variantSubtitle
          ? `${item.name} — ${variantSubtitle}`
          : item.name;
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
                    className="object-contain p-3 sm:p-4"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <ProductImagePlaceholder name={item.name} />
                )}

                {slug && !isOutOfStock && hasPrice && !inStoreOnly ? (
                  <InCartQtyBadge itemId={item.id} />
                ) : null}

                {badge.show ? (
                  <span
                    className={cn(
                      "absolute right-0 top-0 z-10 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.06em]",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : inStoreOnly ? (
                  <span className="absolute right-0 top-0 z-10 bg-sky-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.06em] text-white">
                    In store
                  </span>
                ) : null}
              </Link>

              <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-2.5 pb-2.5 pt-1.5 sm:px-3 sm:pb-3 sm:pt-2">
                <Link
                  href={shopItemPathFromCard(item)}
                  className="line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-snug tracking-tight text-[#1a1a1a] transition-colors hover:text-primary"
                  title={title}
                >
                  {title}
                </Link>

                <div className="mt-auto flex items-center justify-between gap-2">
                  {priceLabel ? (
                    <p className="shrink-0 text-[13px] font-bold tabular-nums tracking-tight text-[#1a1a1a]">
                      {priceLabel}
                    </p>
                  ) : (
                    <p className="invisible shrink-0 text-[13px] font-bold" aria-hidden>
                      —
                    </p>
                  )}

                  {slug && !isOutOfStock && hasPrice && !inStoreOnly ? (
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
                      className="inline-flex h-7 shrink-0 items-center justify-center border border-[#d4d4d4] px-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#525252] transition-colors hover:border-[#a3a3a3] hover:text-[#1a1a1a]"
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

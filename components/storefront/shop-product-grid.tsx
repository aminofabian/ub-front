"use client";

import { PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { Button } from "@/components/ui/button";
import { shopItemPathFromCard } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { formatDisplayPrice, formatStoreQty } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

function stockBadge(qty: number | null | undefined): {
  label: string;
  tone: string;
  show: boolean;
} {
  if (qty == null || !Number.isFinite(qty))
    return { label: "", tone: "", show: false };
  if (qty <= 0)
    return {
      label: "Out of stock",
      tone: "text-red-600 bg-red-50",
      show: true,
    };
  if (qty <= 5)
    return {
      label: "Low stock",
      tone: "text-amber-600 bg-amber-50",
      show: true,
    };
  return { label: "", tone: "", show: false };
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/50">
          <PackageSearch className="h-8 w-8" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            No products found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered
              ? "Try adjusting your search or browse all products."
              : "Check back soon for new arrivals."}
          </p>
        </div>
        {filtered && clearHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-2 rounded-full"
          >
            <Link href={clearHref}>View all products</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item, index) => {
        const title = item.variantName
          ? `${item.name} · ${item.variantName}`
          : item.name;
        const priceLabel = formatDisplayPrice(currency, item.price);
        const stockLabel = formatStoreQty(item.qtyOnHand);
        const badge = stockBadge(item.qtyOnHand);
        const isOutOfStock = item.qtyOnHand != null && item.qtyOnHand <= 0;

        return (
          <li
            key={item.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
          >
            <article
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/30 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-border/60 hover:shadow-lg",
                isOutOfStock && "opacity-55",
              )}
            >
              {/* Image */}
              <Link
                href={shopItemPathFromCard(item)}
                className="relative block aspect-square w-full overflow-hidden bg-muted/30"
                aria-label={title}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={title}
                    fill
                    className="object-contain p-4 transition-transform duration-400 group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted/20">
                    <span className="text-4xl font-bold text-muted-foreground/15 select-none">
                      {item.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Stock badge */}
                {badge.show ? (
                  <span
                    className={cn(
                      "absolute left-2 top-2 z-10 rounded-lg px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
                      badge.tone,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : null}

              </Link>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-2 p-3">
                <Link
                  href={shopItemPathFromCard(item)}
                  className="line-clamp-2 text-[13px] font-medium leading-[1.35] text-foreground/85 transition-colors hover:text-foreground"
                >
                  {title}
                </Link>

                <div className="mt-auto space-y-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-bold tabular-nums tracking-tight text-foreground">
                      {priceLabel}
                    </span>
                    {stockLabel ? (
                      <span className="text-[10px] font-medium tabular-nums text-muted-foreground/60">
                        {stockLabel}
                      </span>
                    ) : null}
                  </div>

                  {slug && !isOutOfStock ? (
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

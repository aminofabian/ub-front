"use client";

import { PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { Button } from "@/components/ui/button";
import { shopItemPath } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { formatDisplayPrice, formatStoreQty } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

function stockStatus(qty: number | null | undefined): {
  label: string;
  dot: string;
  muted: boolean;
} {
  if (qty == null || !Number.isFinite(qty)) {
    return { label: "", dot: "", muted: false };
  }
  if (qty <= 0) {
    return { label: "Out of stock", dot: "bg-red-500", muted: true };
  }
  if (qty <= 10) {
    return { label: "Low stock", dot: "bg-amber-500", muted: false };
  }
  return { label: "In stock", dot: "bg-emerald-500", muted: false };
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
      <div className="rounded-3xl border border-dashed border-border/60 bg-gradient-to-b from-muted/30 to-muted/10 px-6 py-20 text-center shadow-inner sm:px-10">
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-card text-muted-foreground/60 shadow-sm ring-1 ring-border/50">
            <PackageSearch className="h-10 w-10" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold tracking-tight text-foreground">
              No products here yet
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {filtered
                ? "Nothing matches your search or category. Try different keywords or browse all products."
                : "This catalog is empty for now. Check back soon for new arrivals."}
            </p>
          </div>
          {filtered && clearHref ? (
            <Button asChild variant="default" className="mt-2 rounded-full px-8">
              <Link href={clearHref}>View all products</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item, index) => {
        const title = item.variantName
          ? `${item.name} · ${item.variantName}`
          : item.name;
        const priceLabel = formatDisplayPrice(currency, item.price);
        const stockLabel = formatStoreQty(item.qtyOnHand);
        const stock = stockStatus(item.qtyOnHand);
        const isOutOfStock = item.qtyOnHand != null && item.qtyOnHand <= 0;

        return (
          <li
            key={item.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
          >
            <article
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl",
                isOutOfStock && "opacity-75 grayscale-[0.3]"
              )}
            >
              {/* Image */}
              <Link
                href={shopItemPath(item.id)}
                className="relative block aspect-[3/4] w-full overflow-hidden bg-neutral-50"
                aria-label={title}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={title}
                    fill
                    className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 bg-neutral-50">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-3xl font-bold tracking-tight text-neutral-300">
                      {item.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/[0.03]" />

                {/* Stock badge */}
                {stock.dot ? (
                  <div className="absolute left-3 top-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
                      <span className={cn("h-1.5 w-1.5 rounded-full", stock.dot)} />
                      {stock.label}
                    </span>
                  </div>
                ) : null}

                {/* Floating quick-add (visible on hover) */}
                {slug && !isOutOfStock ? (
                  <div className="absolute bottom-3 right-3 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                    <ShopQuickAddButton
                      slug={slug}
                      itemId={item.id}
                      ariaLabel={`Add ${title} to basket`}
                      accentHex={accentHex}
                    />
                  </div>
                ) : null}
              </Link>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-3">
                <Link
                  href={shopItemPath(item.id)}
                  className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug text-foreground/90 transition-colors hover:text-foreground"
                >
                  {title}
                </Link>

                {/* Price stack */}
                <div className="mt-auto space-y-1.5">
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold tabular-nums tracking-tight text-foreground">
                        {priceLabel}
                      </span>
                    </div>

                    {/* Mobile add button */}
                    {slug && !isOutOfStock ? (
                      <div className="sm:hidden">
                        <ShopQuickAddButton
                          slug={slug}
                          itemId={item.id}
                          ariaLabel={`Add ${title} to basket`}
                          accentHex={accentHex}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Stock row */}
                  <div className="flex items-center justify-between gap-2">
                    {stockLabel ? (
                      <p className="text-[11px] font-medium tabular-nums text-muted-foreground/70">
                        {stockLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

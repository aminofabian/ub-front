"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { useStorefrontCatalogSync } from "@/hooks/use-storefront-catalog-sync";
import { shopItemPathFromCard } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { formatDisplayPrice, formatStoreQty } from "@/lib/public-storefront";

export function ShopSidebarTopPicksLive({
  picks: initialPicks,
  currency,
  slug,
  accent,
}: {
  picks: PublicCatalogItemCard[];
  currency: string;
  slug: string;
  accent: string | null;
}) {
  const [picks, setPicks] = useState(initialPicks);

  useStorefrontCatalogSync({
    slug,
    items: picks,
    setItems: setPicks,
  });

  if (picks.length === 0) {
    return null;
  }

  return (
    <aside className="rounded-xl border border-border/40 bg-card p-4">
      <p className="text-xs font-semibold text-foreground">Top Picks</p>
      <ul className="mt-2.5 divide-y divide-border/30">
        {picks.map((item) => {
          const title = item.variantName
            ? `${item.name} ${item.variantName}`
            : item.name;
          const price = formatDisplayPrice(currency, item.price);
          const stock = formatStoreQty(item.qtyOnHand);

          return (
            <li key={item.id} className="flex items-center gap-2.5 py-2">
              <Link
                href={shopItemPathFromCard(item)}
                className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted/40"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-contain p-1"
                    unoptimized
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground/50">
                    {item.name.slice(0, 1)}
                  </span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={shopItemPathFromCard(item)}
                  className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground/85 hover:underline"
                >
                  {title}
                </Link>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[13px] font-bold tabular-nums text-foreground">
                    {price}
                  </span>
                  {stock ? (
                    <span className="text-[10px] text-muted-foreground/50">
                      {stock}
                    </span>
                  ) : null}
                </div>
              </div>
              <ShopQuickAddButton
                slug={slug}
                itemId={item.id}
                ariaLabel={`Add ${title} to basket`}
                accentHex={accent}
                size="sm"
                variant="icon"
              />
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

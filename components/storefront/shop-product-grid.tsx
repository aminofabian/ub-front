import Image from "next/image";
import Link from "next/link";

import { shopItemPath } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { formatDisplayPrice } from "@/lib/public-storefront";

export default function ShopProductGrid({
  items,
  currency,
}: {
  items: PublicCatalogItemCard[];
  currency: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products match your filters. Try another category or clear search.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const title = item.variantName ? `${item.name} · ${item.variantName}` : item.name;
        const priceLabel = formatDisplayPrice(currency, item.price);

        return (
          <li key={item.id}>
            <Link
              href={shopItemPath(item.id)}
              className="group block overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="relative aspect-square w-full bg-muted">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={title}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl font-medium text-muted-foreground/60">
                    {item.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
                <p className="text-sm font-semibold tabular-nums text-primary">{priceLabel}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

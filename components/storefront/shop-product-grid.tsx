import { PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { Button } from "@/components/ui/button";
import { shopItemPath } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { formatDisplayPrice } from "@/lib/public-storefront";

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
  /** True when URL has search or category filter. */
  filtered?: boolean;
  /** Link for "View all" when empty while filtered. */
  clearHref?: string;
  slug?: string;
  accentHex?: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-muted/40 to-muted/15 px-6 py-16 text-center shadow-inner sm:px-10">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm ring-1 ring-border/60">
            <PackageSearch className="h-8 w-8" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold tracking-tight text-foreground">No products here yet</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {filtered
                ? "Nothing matches your search or category. Try different keywords or browse all products."
                : "This catalog is empty for now. Check back soon for new arrivals."}
            </p>
          </div>
          {filtered && clearHref ? (
            <Button asChild variant="default" className="mt-2 rounded-full px-6">
              <Link href={clearHref}>View all products</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => {
        const title = item.variantName ? `${item.name} · ${item.variantName}` : item.name;
        const priceLabel = formatDisplayPrice(currency, item.price);

        return (
          <li key={item.id}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md">
              <Link
                href={shopItemPath(item.id)}
                className="relative block aspect-[4/5] w-full overflow-hidden bg-muted/40"
                aria-label={title}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={title}
                    fill
                    className="object-contain p-3 transition duration-500 ease-out group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted/40 text-2xl font-semibold tracking-tight text-muted-foreground/50">
                    {item.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2">
                <Link
                  href={shopItemPath(item.id)}
                  className="line-clamp-2 min-h-[2.4rem] text-[13px] font-medium leading-snug text-foreground hover:underline"
                >
                  {title}
                </Link>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="text-sm font-bold tabular-nums tracking-tight text-foreground">
                    {priceLabel}
                  </span>
                  {slug ? (
                    <ShopQuickAddButton
                      slug={slug}
                      itemId={item.id}
                      ariaLabel={`Add ${title} to basket`}
                      accentHex={accentHex}
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

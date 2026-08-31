"use client";

import { useEffect, useMemo, useState } from "react";

import ShopProductGrid from "@/components/storefront/shop-product-grid";
import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import { useStorefrontCatalogSync } from "@/hooks/use-storefront-catalog-sync";
import { APP_ROUTES } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

const PAGE_SIZE = 48;

type CatalogSort = "default" | "name_asc" | "price_asc" | "price_desc";

function sortCatalogItems(
  items: PublicCatalogItemCard[],
  sort: CatalogSort,
): PublicCatalogItemCard[] {
  if (sort === "default") return items;
  const copy = [...items];
  switch (sort) {
    case "name_asc":
      return copy.sort((a, b) => {
        const left = `${a.name} ${a.variantName ?? ""}`.trim();
        const right = `${b.name} ${b.variantName ?? ""}`.trim();
        return left.localeCompare(right);
      });
    case "price_asc":
      return copy.sort((a, b) => {
        const left = a.price ?? Number.POSITIVE_INFINITY;
        const right = b.price ?? Number.POSITIVE_INFINITY;
        return left - right;
      });
    case "price_desc":
      return copy.sort((a, b) => {
        const left = a.price ?? Number.NEGATIVE_INFINITY;
        const right = b.price ?? Number.NEGATIVE_INFINITY;
        return right - left;
      });
    default:
      return items;
  }
}

export default function ShopCatalogWithMore({
  slug,
  currency,
  initialItems,
  initialNextCursor,
  initialTotalCount,
  q,
  categoryId,
  typeId,
  departmentId,
  categoryHeading,
  categoryPathSlug: _categoryPathSlug,
  accentHex,
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  initialTotalCount?: number;
  q?: string;
  categoryId?: string;
  typeId?: string;
  /** @deprecated Use {@link typeId}. */
  departmentId?: string;
  categoryHeading?: string;
  categoryPathSlug?: string;
  accentHex?: string | null;
}) {
  const resolvedTypeId = typeId?.trim() || departmentId?.trim() || undefined;
  const [totalCount] = useState(initialTotalCount ?? initialItems.length);
  const [sort, setSort] = useState<CatalogSort>("default");

  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
    limit: PAGE_SIZE,
    query: { q, categoryId, departmentId: resolvedTypeId },
  });

  const sortedItems = useMemo(
    () => sortCatalogItems(pages.items, sort),
    [pages.items, sort],
  );

  useEffect(() => {
    setSort("default");
  }, [q, categoryId, resolvedTypeId]);

  useStorefrontCatalogSync({
    slug,
    q,
    categoryId,
    departmentId: resolvedTypeId,
    items: pages.items,
    setItems: pages.setItems,
  });

  const filtered = Boolean(q?.trim() || categoryId?.trim() || resolvedTypeId);
  const atEnd = !pages.hasMore && pages.items.length > 0;

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--storefront-rule)] pb-2">
        {categoryHeading || filtered ? (
          <h2 className="storefront-section-title min-w-0 flex-1">
            {categoryHeading
              ? categoryHeading
              : q?.trim()
                ? `Results for “${q.trim()}”`
                : "Filtered results"}
          </h2>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden />
        )}
        <div className="flex shrink-0 items-center gap-2.5">
          <label className="sr-only" htmlFor="shop-catalog-sort">
            Sort products
          </label>
          <select
            id="shop-catalog-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as CatalogSort)}
            className="h-8 rounded-[3px] border border-[var(--storefront-card-border)] bg-[var(--storefront-paper-elevated)] px-2.5 text-[11px] font-medium text-[var(--storefront-ink)] outline-none transition-colors hover:border-[var(--storefront-card-border-hover)] focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <option value="default">Featured</option>
            <option value="name_asc">Name A–Z</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <span className="text-[11px] font-medium tabular-nums text-[var(--storefront-ink-quiet)]">
            {totalCount > pages.items.length
              ? `${pages.items.length} of ${totalCount}`
              : `${pages.items.length} ${pages.items.length === 1 ? "item" : "items"}`}
          </span>
        </div>
      </div>

      <ShopProductGrid
        items={sortedItems}
        currency={currency}
        filtered={filtered}
        clearHref={APP_ROUTES.shop}
        slug={slug}
        accentHex={accentHex}
        newFromIndex={pages.newFromIndex}
      />

      <StorefrontCatalogSentinel
        sentinelRef={pages.sentinelRef}
        hasMore={pages.hasMore}
        loading={pages.loading}
        error={pages.error}
        willAutoRetry={pages.willAutoRetry}
        exhausted={atEnd}
        onRetry={pages.retry}
        onRequestMore={() => void pages.loadMore()}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { ClimaxFloorCard } from "@/components/storefront/templates/store/climax-floor-card";
import {
  ClimaxFloorAisles,
  climaxFloorAisleTree,
} from "@/components/storefront/templates/store/climax-floor-aisles";
import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import { APP_ROUTES } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCategory,
} from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

type SortKey = "latest" | "price-asc" | "price-desc";

function sortItems(
  items: PublicCatalogItemCard[],
  sort: SortKey,
): PublicCatalogItemCard[] {
  if (sort === "latest") return items;
  const copy = [...items];
  copy.sort((a, b) => {
    const ap = a.price ?? Number.POSITIVE_INFINITY;
    const bp = b.price ?? Number.POSITIVE_INFINITY;
    return sort === "price-asc" ? ap - bp : bp - ap;
  });
  return copy;
}

export function ClimaxFloorCatalog({
  slug,
  currency,
  heading,
  initialItems,
  initialNextCursor,
  totalCount,
  q,
  typeId,
  categoryId,
  categories,
  categoryPathSlug,
}: {
  slug: string;
  currency: string;
  heading: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  totalCount?: number;
  q?: string;
  typeId?: string;
  categoryId?: string;
  categories: PublicCategory[];
  categoryPathSlug?: string;
}) {
  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
    query: { q, typeId, categoryId },
  });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>("latest");
  const items = useMemo(
    () => sortItems(pages.items, sort),
    [pages.items, sort],
  );
  const countLabel =
    totalCount != null
      ? `${totalCount} on the floor`
      : items.length === 0
        ? "Nothing here yet"
        : `${items.length} on the floor`;

  const aisleProps = {
    categories,
    categoryId,
    categoryPathSlug,
    q,
  };

  return (
    <div className={styles.shop}>
      <aside className={styles.sidebar} aria-label="Aisles">
        <ClimaxFloorAisles {...aisleProps} />
      </aside>

      <section id="catalog" className={styles.main}>
        <div className={styles.shopHead}>
          <h1 className={styles.shopTitle}>{heading}</h1>
          <div className={styles.toolbar}>
            <span>{countLabel}</span>
            <div className={styles.viewToggle} role="group" aria-label="View">
              <button
                type="button"
                className={styles.viewBtn}
                data-on={view === "grid" ? "true" : undefined}
                aria-label="Grid view"
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={15} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className={styles.viewBtn}
                data-on={view === "list" ? "true" : undefined}
                aria-label="List view"
                onClick={() => setView("list")}
              >
                <List size={15} strokeWidth={1.8} />
              </button>
            </div>
            <label className={styles.srOnly} htmlFor="cf-sort">
              Sort
            </label>
            <select
              id="cf-sort"
              className={styles.sort}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="latest">Latest</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </select>
          </div>
        </div>

        <div className={styles.mobileAisles} aria-label="Aisles">
          <Link
            href={APP_ROUTES.shop}
            className={cn(
              styles.catLink,
              !categoryId && !categoryPathSlug && styles.catLinkActive,
            )}
            scroll={false}
          >
            All
          </Link>
          {climaxFloorAisleTree(categories).map(({ cat }) => {
            const slugSeg = storefrontCategoryPathSlug(cat);
            const active =
              categoryId === cat.id || categoryPathSlug === slugSeg;
            return (
              <Link
                key={cat.id}
                href={shopListPath({
                  categoryPathSlug: slugSeg,
                  q: q || undefined,
                })}
                className={cn(styles.catLink, active && styles.catLinkActive)}
                scroll={false}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            Nothing in this aisle yet. Try another category or search.
          </div>
        ) : (
          <div className={styles.grid} data-view={view}>
            {items.map((item) => (
              <ClimaxFloorCard key={item.id} item={item} currency={currency} />
            ))}
          </div>
        )}

        <StorefrontCatalogSentinel
          sentinelRef={pages.sentinelRef}
          hasMore={pages.hasMore}
          loading={pages.loading}
          error={pages.error}
          willAutoRetry={pages.willAutoRetry}
          exhausted={!pages.hasMore && items.length > 0}
          onRetry={pages.retry}
          onRequestMore={() => void pages.loadMore()}
        />
      </section>
    </div>
  );
}

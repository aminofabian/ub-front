"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutGrid, List, Menu } from "lucide-react";

import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { ClimaxFloorCard } from "@/components/storefront/templates/store/climax-floor-card";
import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type {
  PublicCatalogItemCard,
  PublicCategory,
} from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";

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
  const items = pages.items;
  const [view, setView] = useState<"grid" | "list">("grid");
  const start = items.length === 0 ? 0 : 1;
  const end = items.length;
  const countLabel =
    totalCount != null
      ? `Showing ${start}–${end} of ${totalCount} results`
      : items.length === 0
        ? "No products yet"
        : `Showing ${start}–${end} results`;

  const roots = categories.filter((c) => !c.parentId);

  return (
    <div className={styles.shop}>
      <aside className={styles.sidebar} aria-label="Categories">
        <div className={styles.catHead}>
          <Menu size={16} strokeWidth={2} />
          Categories
        </div>
        <ul className={styles.catList}>
          {roots.length === 0 ? (
            <li>
              <span className={styles.catLink}>All products</span>
            </li>
          ) : (
            roots.map((cat) => {
              const slugSeg = storefrontCategoryPathSlug(cat);
              const active =
                categoryId === cat.id || categoryPathSlug === slugSeg;
              return (
                <li key={cat.id}>
                  <Link
                    href={shopListPath({
                      categoryPathSlug: slugSeg,
                      q: q || undefined,
                    })}
                    className={
                      active ? `${styles.catLink} ${styles.catLinkActive}` : styles.catLink
                    }
                    scroll={false}
                  >
                    {cat.name}
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section id="catalog" className={styles.main}>
        <h1 className={styles.shopTitle}>{heading}</h1>
        <div className={styles.toolbar}>
          <span>{countLabel}</span>
          <span className={styles.toolbarGrow} />
          <div className={styles.viewToggle} role="group" aria-label="View">
            <button
              type="button"
              className={styles.viewBtn}
              data-on={view === "grid" ? "true" : undefined}
              aria-label="Grid view"
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={styles.viewBtn}
              data-on={view === "list" ? "true" : undefined}
              aria-label="List view"
              onClick={() => setView("list")}
            >
              <List size={16} />
            </button>
          </div>
          <label className={styles.srOnly} htmlFor="cf-sort">
            Sort
          </label>
          <select id="cf-sort" className={styles.sort} defaultValue="latest">
            <option value="latest">Sort by latest</option>
            <option value="price-asc">Sort by price: low to high</option>
            <option value="price-desc">Sort by price: high to low</option>
          </select>
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

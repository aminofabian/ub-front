"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { ZetuCard } from "@/components/storefront/templates/store/zetu-card";
import styles from "@/components/storefront/templates/store/zetu.module.css";
import {
  zetuDiscount,
  zetuMaxDiscount,
} from "@/components/storefront/templates/store/zetu-pricing";
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

function priceBands(items: PublicCatalogItemCard[]): number[] {
  const prices = items
    .map((i) => i.price)
    .filter((p): p is number => p != null && Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);
  if (prices.length < 3) return [];
  const at = (fraction: number) =>
    Math.ceil(prices[Math.floor((prices.length - 1) * fraction)]! / 500) * 500;
  const low = at(0.34);
  const mid = at(0.67);
  return Array.from(new Set([low, mid])).filter((n) => n > 0);
}

export function ZetuCatalog({
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
  intro,
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
  intro?: string | null;
}) {
  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
    query: { q, typeId, categoryId },
  });
  const [sort, setSort] = useState<SortKey>("latest");
  const [onSale, setOnSale] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sideQuery, setSideQuery] = useState("");

  const bands = useMemo(() => priceBands(pages.items), [pages.items]);
  const saleCount = useMemo(
    () => pages.items.filter((item) => zetuDiscount(item)).length,
    [pages.items],
  );
  const topDiscount = useMemo(() => zetuMaxDiscount(pages.items), [pages.items]);
  const topCategories = useMemo(
    () => categories.filter((cat) => !cat.parentId).slice(0, 10),
    [categories],
  );

  const items = useMemo(() => {
    const needle = sideQuery.trim().toLowerCase();
    return sortItems(
      pages.items.filter((item) => {
        if (onSale && !zetuDiscount(item)) return false;
        if (maxPrice != null && (item.price == null || item.price > maxPrice)) {
          return false;
        }
        if (!needle) return true;
        return [item.name, item.variantName, item.sku]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle));
      }),
      sort,
    );
  }, [pages.items, onSale, maxPrice, sideQuery, sort]);

  const countLabel =
    totalCount != null && totalCount > items.length
      ? `Showing ${items.length} of ${totalCount}`
      : `${items.length} ${items.length === 1 ? "piece" : "pieces"}`;

  const introCopy =
    intro?.trim() ||
    (q?.trim()
      ? `Results for “${q.trim()}”.`
      : "Build a wardrobe that moves from Saturday night out to everyday essentials. New drops land every week.");

  return (
    <div id="catalog" className={styles.catalog}>
      <div className={styles.catalogShell}>
        <aside
          id="zt-filters"
          className={styles.catalogSide}
          aria-label="Filters"
        >
          <div className={styles.sideBlock}>
            <div className={styles.sideSearch}>
              <Search size={14} strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={sideQuery}
                onChange={(e) => setSideQuery(e.target.value)}
                placeholder="Search this collection…"
                aria-label="Search this collection"
              />
            </div>
          </div>

          <div className={styles.sideBlock}>
            <p className={styles.sideTitle}>Category</p>
            <div className={styles.sideLinks}>
              <Link
                href={APP_ROUTES.shop}
                className={cn(
                  styles.sideLink,
                  !categoryId && !categoryPathSlug && styles.sideLinkActive,
                )}
              >
                All products
                {totalCount != null ? (
                  <span className={styles.sideCount}>{totalCount}</span>
                ) : null}
              </Link>
              {topCategories.map((cat) => {
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
                    className={cn(
                      styles.sideLink,
                      active && styles.sideLinkActive,
                    )}
                  >
                    {cat.name}
                    {cat.itemCount != null ? (
                      <span className={styles.sideCount}>{cat.itemCount}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className={styles.sideBlock}>
            <p className={styles.sideTitle}>Sort by</p>
            <label className={styles.srOnly} htmlFor="zt-sort-side">
              Sort products
            </label>
            <select
              id="zt-sort-side"
              className={styles.sort}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="latest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>

          <div className={styles.sideBlock}>
            <p className={styles.sideTitle}>Offers</p>
            <label className={styles.sideCheck}>
              <input
                type="checkbox"
                checked={onSale}
                onChange={(e) => setOnSale(e.target.checked)}
              />
              On sale only
              {saleCount > 0 ? (
                <span className={styles.sideCount}>({saleCount})</span>
              ) : null}
            </label>
            {topDiscount > 0 ? (
              <p className={styles.sideCount} style={{ marginTop: "0.35rem" }}>
                Up to {topDiscount}% off right now
              </p>
            ) : null}
          </div>

          {bands.length > 0 ? (
            <div className={styles.sideBlock}>
              <p className={styles.sideTitle}>Price</p>
              <div className={styles.sideChips}>
                <button
                  type="button"
                  className={cn(
                    styles.sideChip,
                    maxPrice == null && styles.sideChipActive,
                  )}
                  onClick={() => setMaxPrice(null)}
                >
                  All
                </button>
                {bands.map((band) => (
                  <button
                    key={band}
                    type="button"
                    className={cn(
                      styles.sideChip,
                      maxPrice === band && styles.sideChipActive,
                    )}
                    onClick={() => setMaxPrice(band)}
                  >
                    Under {band.toLocaleString("en-KE")}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <section className={styles.catalogMain}>
          <p className={styles.catalogIntro}>{introCopy}</p>

          <div className={styles.mobileChips} aria-label="Categories">
            <Link
              href={APP_ROUTES.shop}
              className={cn(
                styles.chip,
                !categoryId && !categoryPathSlug && styles.chipActive,
              )}
            >
              All
            </Link>
            {topCategories.map((cat) => {
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
                  className={cn(styles.chip, active && styles.chipActive)}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          <div className={styles.catalogHead}>
            <div>
              <h1 className={styles.catalogTitle}>{heading}</h1>
              <p className={styles.catalogMeta}>{countLabel}</p>
            </div>
            <div className={styles.catalogToolbar}>
              <SlidersHorizontal size={14} strokeWidth={2} aria-hidden />
              <label className={styles.srOnly} htmlFor="zt-sort">
                Sort products
              </label>
              <select
                id="zt-sort"
                className={styles.sort}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="latest">Newest</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
              </select>
            </div>
          </div>

          {items.length === 0 ? (
            <div className={styles.empty}>
              Nothing matches this cut. Clear the filters or try another
              collection.
            </div>
          ) : (
            <div className={styles.catalogGrid}>
              {items.map((item) => (
                <ZetuCard key={item.id} item={item} currency={currency} />
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
    </div>
  );
}

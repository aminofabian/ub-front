"use client";

import Link from "next/link";

import { BeautyEditCard } from "@/components/storefront/templates/store/beauty-edit-card";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import { APP_ROUTES } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

export function BeautyEditCatalog({
  slug,
  currency,
  initialItems,
  initialNextCursor,
  heading,
  filtered,
  query,
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  /** Category or search heading when the shopper has narrowed the catalog. */
  heading?: string | null;
  filtered?: boolean;
  /** Raw shopper search term, used for empty-state copy. */
  query?: string | null;
}) {
  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
  });
  const items = pages.items;
  // Count what is actually in this grid — Bestsellers above already shows part
  // of the collection, so the shop total would read as missing pieces.
  const count = items.length;

  return (
    <section id="catalog" className={styles.catalog} aria-labelledby="be-catalog-title">
      <div className={cn(styles.sectionHead, styles.catalogHead)}>
        <div className={styles.sectionHeadCopy}>
          <h2 id="be-catalog-title" className={styles.sectionTitle}>
            {heading?.trim() || "The edit"}
          </h2>
          <p className={styles.sectionDek}>
            {filtered ? "Filtered selection" : "More from the collection"}
          </p>
        </div>
        <div className={styles.sectionHeadAside}>
          {filtered ? (
            <Link href={APP_ROUTES.shop} className={styles.sectionLink}>
              Clear
            </Link>
          ) : null}
          <span className={styles.sectionMeta}>
            {count} {count === 1 ? "piece" : "pieces"}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>
            {query?.trim()
              ? `Nothing for “${query.trim()}”`
              : heading?.trim()
                ? `Nothing in ${heading.trim()} yet`
                : "The edit is being prepared"}
          </p>
          <p className={styles.emptyCopy}>
            {filtered
              ? "Try a different word, or browse everything the shop has in stock."
              : "New pieces land here first. Check back soon — or message us on WhatsApp for what's available now."}
          </p>
          {filtered ? (
            <Link href={APP_ROUTES.shop} className={styles.emptyCta}>
              Shop everything
            </Link>
          ) : null}
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <BeautyEditCard key={item.id} item={item} currency={currency} />
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
  );
}

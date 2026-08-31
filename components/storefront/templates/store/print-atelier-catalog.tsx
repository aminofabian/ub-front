"use client";

import { PrintAtelierCard } from "@/components/storefront/templates/store/print-atelier-card";
import styles from "@/components/storefront/templates/store/print-atelier.module.css";
import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export function PrintAtelierCatalog({
  slug,
  currency,
  initialItems,
  initialNextCursor,
  totalCount,
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  totalCount?: number;
}) {
  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
  });
  const items = pages.items;

  const countLabel =
    totalCount != null ? `${totalCount} products` : `${items.length} products`;

  return (
    <section id="catalog" className={styles.catalogSection}>
      <div className={styles.catalogHead}>
        <h2 className={styles.catalogTitle}>Complete collection</h2>
        <span className={styles.catalogMeta}>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>New pieces arriving soon.</div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <PrintAtelierCard key={item.id} item={item} currency={currency} />
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

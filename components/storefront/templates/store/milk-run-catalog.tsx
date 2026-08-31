"use client";

import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { MilkRunCard } from "@/components/storefront/templates/store/milk-run-card";
import styles from "@/components/storefront/templates/store/milk-run.module.css";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export function MilkRunCatalog({
  slug,
  currency,
  initialItems,
  initialNextCursor,
  totalCount,
  featuredIds,
  whatsappDigits,
  storeName,
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  totalCount?: number;
  featuredIds: string[];
  whatsappDigits: string | null;
  storeName: string;
}) {
  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
  });
  const items = pages.items;
  const featured = new Set(featuredIds);

  const countLabel =
    totalCount != null ? `${totalCount} items` : `${items.length} items`;

  return (
    <section id="menu">
      <div className={styles.sectionHead}>
        <h2>On the shelf</h2>
        <span>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>Nothing listed yet — check back soon.</div>
      ) : (
        <div className={styles.grid}>
          {items.map((item, index) => (
            <MilkRunCard
              key={item.id}
              item={item}
              index={index}
              currency={currency}
              featured={featured.has(item.id)}
              whatsappDigits={whatsappDigits}
              storeName={storeName}
            />
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

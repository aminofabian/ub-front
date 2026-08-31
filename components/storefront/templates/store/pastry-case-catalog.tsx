"use client";

import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { PastryCaseCard } from "@/components/storefront/templates/store/pastry-case-card";
import styles from "@/components/storefront/templates/store/pastry-case.module.css";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export function PastryCaseCatalog({
  slug,
  currency,
  heading,
  initialItems,
  initialNextCursor,
  totalCount,
  q,
  typeId,
  categoryId,
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
}) {
  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
    query: { q, typeId, categoryId },
  });
  const items = pages.items;

  const countLabel =
    totalCount != null ? `${totalCount} in the case` : `${items.length} in the case`;

  return (
    <section id="catalog" className={styles.catalogSection}>
      <div className={styles.catalogHead}>
        <h2 className={styles.catalogTitle}>{heading}</h2>
        <span className={styles.catalogMeta}>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          Nothing in this tray yet. Ask on WhatsApp for what we can bake next.
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <PastryCaseCard key={item.id} item={item} currency={currency} />
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

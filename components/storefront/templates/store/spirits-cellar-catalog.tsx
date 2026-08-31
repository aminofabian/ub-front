"use client";

import { SpiritsCellarCard } from "@/components/storefront/templates/store/spirits-cellar-card";
import styles from "@/components/storefront/templates/store/spirits-cellar.module.css";
import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export function SpiritsCellarCatalog({
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
    totalCount != null
      ? `${totalCount} sealed in vault`
      : `${items.length} sealed in vault`;

  return (
    <section id="vault-catalog">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Deeper shelves</h2>
        <span className={styles.sectionMeta}>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          The vault is quiet — new essences arriving soon.
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <SpiritsCellarCard key={item.id} item={item} currency={currency} />
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

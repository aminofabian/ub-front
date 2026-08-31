"use client";

import { ButcherBoardCard } from "@/components/storefront/templates/store/butcher-board-card";
import styles from "@/components/storefront/templates/store/butcher-board.module.css";
import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export function ButcherBoardCatalog({
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
    totalCount != null ? `${totalCount} on the board` : `${items.length} on the board`;

  return (
    <section id="board">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Now showing</h2>
        <span>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>Nothing on the board yet — check back soon.</div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <ButcherBoardCard key={item.id} item={item} currency={currency} />
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

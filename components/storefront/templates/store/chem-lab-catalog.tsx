"use client";

import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { ChemLabCard } from "@/components/storefront/templates/store/chem-lab-card";
import { useChemLabCopy } from "@/components/storefront/templates/store/chem-lab-mode";
import styles from "@/components/storefront/templates/store/chem-lab.module.css";
import { StorefrontInlineText } from "@/components/storefront/storefront-inline-text";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export function ChemLabCatalog({
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
  const copy = useChemLabCopy();
  const inventoryTitle = copy?.inventory || "Inventory";
  const emptyLabel =
    copy?.empty || "Nothing here yet — new items arriving soon.";

  const countLabel =
    totalCount != null
      ? `${totalCount} in inventory`
      : `${items.length} in inventory`;

  return (
    <section id="inventory" className={styles.ledger}>
      <div className={styles.sectionHead}>
        <StorefrontInlineText
          as="h2"
          className={styles.sectionTitle}
          value={inventoryTitle}
          placeholder="Inventory"
          onCommit={(next) => copy?.commitInventory(next)}
        >
          <h2 className={styles.sectionTitle}>{inventoryTitle}</h2>
        </StorefrontInlineText>
        <span className={styles.sectionMeta}>{countLabel}</span>
      </div>
      <div className={styles.sectionRule} aria-hidden />

      {items.length === 0 ? (
        <div className={styles.empty}>{emptyLabel}</div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <ChemLabCard key={item.id} item={item} currency={currency} />
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

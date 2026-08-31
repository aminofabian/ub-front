"use client";

import Link from "next/link";

import { BlankDropCard } from "@/components/storefront/templates/store/blank-drop-card";
import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export function BlankDropCatalog({
  slug,
  currency,
  initialItems,
  initialNextCursor,
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

  if (items.length === 0) {
    return <div className={styles.empty}>No products</div>;
  }

  return (
    <>
      <div className={styles.grid}>
        {items.map((item) => (
          <BlankDropCard key={item.id} item={item} currency={currency} />
        ))}
      </div>
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
      <footer className={styles.footer}>
        <Link href="#top">Contact</Link>
        <span>Terms</span>
        <span>Privacy</span>
        <Link href="/shop/account">Order status</Link>
      </footer>
    </>
  );
}

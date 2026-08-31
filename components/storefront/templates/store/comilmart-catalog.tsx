"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { ComilmartCard } from "@/components/storefront/templates/store/comilmart-card";
import styles from "@/components/storefront/templates/store/comilmart.module.css";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

function ScrollRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync, children]);

  const nudge = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <div className={cn(styles.scrollWrap, className)}>
      <button
        type="button"
        className={styles.scrollBtn}
        aria-label="Scroll left"
        disabled={!canLeft}
        onClick={() => nudge(-1)}
      >
        ‹
      </button>
      <div ref={ref} className={styles.scrollRow}>
        {children}
      </div>
      <button
        type="button"
        className={styles.scrollBtn}
        aria-label="Scroll right"
        disabled={!canRight}
        onClick={() => nudge(1)}
      >
        ›
      </button>
    </div>
  );
}

export function ComilmartCatalog({
  slug,
  currency,
  heading,
  initialItems,
  initialNextCursor,
  totalCount,
  q,
  typeId,
  categoryId,
  horizontal,
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
  horizontal?: boolean;
}) {
  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
    query: { q, typeId, categoryId },
  });
  const items = pages.items;

  const countLabel =
    totalCount != null
      ? `${totalCount} products`
      : `${items.length} products`;

  const cards = items.map((item) => (
    <ComilmartCard
      key={item.id}
      item={item}
      currency={currency}
      compact={horizontal}
    />
  ));

  return (
    <section id="catalog" className={styles.catalogSection}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{heading}</h2>
        <span className={styles.sectionMeta}>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          No products listed yet. Check back soon or message the shop.
        </div>
      ) : horizontal ? (
        <ScrollRow>{cards}</ScrollRow>
      ) : (
        <div className={styles.grid}>{cards}</div>
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

export function ComilmartProductRail({
  title,
  items,
  currency,
  viewAllHref,
}: {
  title: string;
  items: PublicCatalogItemCard[];
  currency: string;
  viewAllHref?: string;
}) {
  if (!items.length) return null;

  return (
    <section className={styles.railSection}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {viewAllHref ? (
          <Link href={viewAllHref} className={styles.viewAll}>
            View all →
          </Link>
        ) : null}
      </div>
      <ScrollRow>
        {items.map((item) => (
          <ComilmartCard key={item.id} item={item} currency={currency} compact />
        ))}
      </ScrollRow>
    </section>
  );
}

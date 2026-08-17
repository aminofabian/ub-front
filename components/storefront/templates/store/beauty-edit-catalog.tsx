"use client";

import { useCallback, useState } from "react";

import { BeautyEditCard } from "@/components/storefront/templates/store/beauty-edit-card";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
import { apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";

export function BeautyEditCatalog({
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
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const url = new URL(
        apiUrl(
          `/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/items`,
        ),
        typeof window !== "undefined" ? window.location.origin : undefined,
      );
      url.searchParams.set("limit", "24");
      url.searchParams.set("cursor", cursor);
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = (await res.json()) as PublicCatalogListPayload;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...payload.items.filter((i) => !seen.has(i.id))];
      });
      setCursor(payload.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, slug]);

  const countLabel =
    totalCount != null ? `${totalCount} products` : `${items.length} products`;

  return (
    <section id="catalog" className={styles.catalogSection}>
      <div className={styles.catalogHead}>
        <h2 className={styles.catalogTitle}>All Products</h2>
        <span className={styles.catalogMeta}>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>New arrivals coming soon.</div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <BeautyEditCard key={item.id} item={item} currency={currency} />
          ))}
        </div>
      )}

      {cursor ? (
        <div className={styles.loadMore}>
          <button
            type="button"
            className={styles.loadMoreBtn}
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

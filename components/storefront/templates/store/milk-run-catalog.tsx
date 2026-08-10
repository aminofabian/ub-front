"use client";

import { useCallback, useState } from "react";

import { MilkRunCard } from "@/components/storefront/templates/store/milk-run-card";
import styles from "@/components/storefront/templates/store/milk-run.module.css";
import { apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";

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
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const featured = new Set(featuredIds);

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

      {cursor ? (
        <div className={styles.loadMore}>
          <button
            type="button"
            className={styles.loadMoreBtn}
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading ? "Loading…" : "Load more →"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

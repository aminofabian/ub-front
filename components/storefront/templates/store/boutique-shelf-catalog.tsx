"use client";

import { useCallback, useState } from "react";

import { BoutiqueShelfCard } from "@/components/storefront/templates/store/boutique-shelf-card";
import styles from "@/components/storefront/templates/store/boutique-shelf.module.css";
import { apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";

export function BoutiqueShelfCatalog({
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
    totalCount != null
      ? `${totalCount} on the shelf`
      : `${items.length} on the shelf`;

  return (
    <section id="shelf">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>The shelf</h2>
        <span className={styles.sectionMeta}>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          The alcove is being restocked — check back soon.
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <BoutiqueShelfCard key={item.id} item={item} currency={currency} />
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
            {loading ? "Unwrapping…" : "More from the shelf"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

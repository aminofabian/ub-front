"use client";

import { useCallback, useState } from "react";

import { PastryCaseCard } from "@/components/storefront/templates/store/pastry-case-card";
import styles from "@/components/storefront/templates/store/pastry-case.module.css";
import { apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";

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
      if (q?.trim()) url.searchParams.set("q", q.trim());
      if (typeId?.trim()) url.searchParams.set("typeId", typeId.trim());
      if (categoryId?.trim()) url.searchParams.set("categoryId", categoryId.trim());
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
  }, [categoryId, cursor, loading, q, slug, typeId]);

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

      {cursor ? (
        <div className={styles.loadMore}>
          <button
            type="button"
            className={styles.loadMoreBtn}
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading ? "Loading…" : "See more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

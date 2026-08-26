"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { BlankDropCard } from "@/components/storefront/templates/store/blank-drop-card";
import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import { apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";

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
      {cursor ? (
        <div className={styles.loadMore}>
          <button
            type="button"
            className={styles.loadMoreBtn}
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading ? "Loading" : "View more"}
          </button>
        </div>
      ) : null}
      <footer className={styles.footer}>
        <Link href="#top">Contact</Link>
        <span>Terms</span>
        <span>Privacy</span>
        <Link href="/shop/account">Order status</Link>
      </footer>
    </>
  );
}

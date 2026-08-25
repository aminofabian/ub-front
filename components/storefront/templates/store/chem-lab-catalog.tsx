"use client";

import { useCallback, useState } from "react";

import { ChemLabCard } from "@/components/storefront/templates/store/chem-lab-card";
import { useChemLabCopy } from "@/components/storefront/templates/store/chem-lab-mode";
import styles from "@/components/storefront/templates/store/chem-lab.module.css";
import { StorefrontInlineText } from "@/components/storefront/storefront-inline-text";
import { apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";

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
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const copy = useChemLabCopy();
  const inventoryTitle = copy?.inventory || "Inventory";
  const emptyLabel =
    copy?.empty || "Nothing here yet — new items arriving soon.";
  const loadMoreLabel = copy?.loadMore || "Load more";
  const loadingLabel = copy?.loading || "Loading…";

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

      {cursor ? (
        <div className={styles.loadMore}>
          <button
            type="button"
            className={styles.loadMoreBtn}
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading ? loadingLabel : loadMoreLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

import styles from "@/components/storefront/templates/store/tint-lab.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
  type PublicCatalogListPayload,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";

const BLOB_COLORS = [
  "#F2C9BF",
  "#F0DCB8",
  "#D9C2CF",
  "#C4D9D3",
  "#EEDAE0",
  "#F2C9BF",
];

function TintAddButton({ item }: { item: PublicCatalogItemCard }) {
  const cart = useShopCart();
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const existing =
        cart.cart?.lines.find((l) => l.itemId === item.id)?.quantity ?? 0;
      await cart.setLineQty(item.id, existing + 1);
      cart.notifyAdded(item.id);
      cart.openDrawer();
    } catch {
      /* cart UI surfaces failures */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.add}
      disabled={busy}
      onClick={() => void onAdd()}
    >
      {busy ? "…" : "Add"}
    </button>
  );
}

export function TintLabCatalog({
  slug,
  currency,
  initialItems,
  initialNextCursor,
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
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

  return (
    <section className={styles.section} id="edit">
      <div className={styles.sectionHead}>
        <h2>The Edit</h2>
        <div className={styles.sectionSub}>
          Formulas chosen for how they wear through a full day — not just how
          they swatch.
        </div>
      </div>
      <div className={styles.grid}>
        {items.map((item, index) => {
          const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
          const shade =
            item.sku?.trim().toUpperCase() ||
            `Shade ${String(index + 1).padStart(2, "0")}`;
          const desc =
            item.variantName?.trim() ||
            item.unitType?.trim() ||
            "In stock · ready to ship";
          return (
            <article key={item.id} className={styles.card}>
              <Link href={href} className={styles.cardVisual}>
                <span
                  className={styles.cardBlob}
                  style={{
                    background: BLOB_COLORS[index % BLOB_COLORS.length],
                  }}
                  aria-hidden
                />
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={240}
                    height={320}
                    unoptimized
                  />
                ) : (
                  <span className={styles.cardPlaceholder} aria-hidden />
                )}
              </Link>
              <div className={styles.cardShade}>{shade}</div>
              <Link href={href} className={styles.cardName}>
                <h3>{item.name}</h3>
              </Link>
              <p className={styles.cardDesc}>{desc}</p>
              <div className={styles.cardFoot}>
                <span className={styles.price}>
                  {item.price != null
                    ? formatDisplayPrice(currency, item.price)
                    : "—"}
                </span>
                <TintAddButton item={item} />
              </div>
            </article>
          );
        })}
      </div>
      {cursor ? (
        <div className={styles.loadMore}>
          <button
            type="button"
            className={styles.btn}
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

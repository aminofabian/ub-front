"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

import styles from "@/components/storefront/templates/store/oxide.module.css";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
  type PublicCatalogListPayload,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { cn } from "@/lib/utils";

function itemCode(item: PublicCatalogItemCard, index: number): string {
  const sku = item.sku?.trim();
  if (sku) return sku.slice(0, 12).toUpperCase();
  return `OX-${String(index + 1).padStart(3, "0")}`;
}

function OxideAddButton({ item }: { item: PublicCatalogItemCard }) {
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
      /* drawer / cart UI surfaces failures */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.itemAdd}
      disabled={busy}
      onClick={() => void onAdd()}
    >
      {busy ? "…" : "Add to cart"}
    </button>
  );
}

function OxideItemVisual({
  item,
  href,
}: {
  item: PublicCatalogItemCard;
  href: string;
}) {
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  return (
    <StorefrontProductImageShell
      href={href}
      className={cn(styles.itemVisual, "relative")}
      itemId={item.id}
      itemName={item.name}
      ariaLabel={item.name}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={item.name}
          width={480}
          height={480}
          className="object-cover"
          unoptimized
        />
      ) : (
        <span className={styles.itemPlaceholder} aria-hidden />
      )}
    </StorefrontProductImageShell>
  );
}

export function OxideCatalog({
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
        apiUrl(`/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/items`),
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
        const next = payload.items.filter((i) => !seen.has(i.id));
        return [...prev, ...next];
      });
      setCursor(payload.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, slug]);

  const countLabel =
    totalCount != null
      ? `${String(totalCount).padStart(2, "0")} ITEMS`
      : `${String(items.length).padStart(2, "0")} ITEMS`;

  return (
    <section className={styles.section} id="catalog">
      <div className={styles.sectionHead}>
        <h2>The Archive</h2>
        <div className={styles.sectionIndex}>{countLabel}</div>
      </div>
      <div className={styles.catalog}>
        {items.map((item, index) => {
          const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
          const meta = [item.variantName?.trim(), item.unitType?.trim()]
            .filter(Boolean)
            .join(" · ");
          return (
            <article key={item.id} className={styles.item}>
              <div className={styles.itemCode}>
                <span>{itemCode(item, index)}</span>
                <span>SKU</span>
              </div>
              <OxideItemVisual item={item} href={href} />
              <Link href={href} className={styles.itemName}>
                {item.name}
              </Link>
              <p className={styles.itemMeta}>{meta || "In stock"}</p>
              <div className={styles.itemFooter}>
                <span className={styles.itemPrice}>
                  {item.price != null
                    ? formatDisplayPrice(currency, item.price)
                    : "—"}
                </span>
                <OxideAddButton item={item} />
              </div>
            </article>
          );
        })}
      </div>
      {cursor ? (
        <div className={styles.loadMore}>
          <button
            type="button"
            className={styles.btnPrimary}
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

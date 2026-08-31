"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/oxide.module.css";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { useShopCart } from "@/hooks/use-shop-cart";
import { StorefrontCatalogSentinel } from "@/components/storefront/storefront-catalog-sentinel";
import { useStorefrontCatalogPages } from "@/hooks/use-storefront-catalog-pages";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
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
  const pages = useStorefrontCatalogPages({
    slug,
    initialItems,
    initialNextCursor,
  });
  const items = pages.items;

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

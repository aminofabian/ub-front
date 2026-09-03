"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { cn } from "@/lib/utils";

function hasSale(item: PublicCatalogItemCard): boolean {
  return (
    item.regularPrice != null &&
    item.price != null &&
    item.regularPrice > item.price
  );
}

export function ClimaxFloorAddButton({
  item,
  className,
}: {
  item: PublicCatalogItemCard;
  className?: string;
}) {
  const cart = useShopCart();
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    if (busy || item.price == null) return;
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

  if (item.price == null) return null;

  return (
    <button
      type="button"
      className={cn(styles.addBtn, className)}
      disabled={busy}
      onClick={() => void onAdd()}
    >
      {busy ? "Adding…" : "Add to cart"}
    </button>
  );
}

export function ClimaxFloorCard({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  const sale = hasSale(item);

  return (
    <article className={styles.card}>
      <div className={styles.cardMeta}>
        {item.variantName ? (
          <span className={styles.cardCat}>{item.variantName}</span>
        ) : null}
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
      </div>
      <StorefrontProductImageShell
        href={href}
        className={cn(styles.cardVisual, "relative")}
        itemId={item.id}
        itemName={item.name}
        ariaLabel={item.name}
      >
        {sale ? <span className={styles.sale}>Sale!</span> : null}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 1100px) 22vw, (min-width: 560px) 45vw, 100vw"
            unoptimized
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span className={styles.visualPlaceholder} aria-hidden />
        )}
      </StorefrontProductImageShell>
      <div className={styles.cardBody}>
        <div className={styles.priceRow}>
          {sale ? (
            <span className={styles.was}>
              {formatDisplayPrice(currency, item.regularPrice ?? null)}
            </span>
          ) : null}
          <span className={styles.price}>
            {formatDisplayPrice(currency, item.price)}
          </span>
        </div>
        <ClimaxFloorAddButton item={item} />
      </div>
    </article>
  );
}

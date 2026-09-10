"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/daily-gazette.module.css";
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

export function DailyGazetteAddButton({
  item,
  className,
}: {
  item: PublicCatalogItemCard;
  className?: string;
}) {
  const cart = useShopCart();
  const [busy, setBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const onAdd = async () => {
    if (busy || item.price == null) return;
    setBusy(true);
    try {
      const existing =
        cart.cart?.lines.find((l) => l.itemId === item.id)?.quantity ?? 0;
      await cart.setLineQty(item.id, existing + 1);
      cart.notifyAdded(item.id);
      setJustAdded(true);
      window.setTimeout(() => {
        setJustAdded(false);
        cart.openDrawer();
      }, 640);
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
      className={cn(styles.addBtn, justAdded && styles.addBtnAdded, className)}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onAdd();
      }}
    >
      {busy ? "Adding" : justAdded ? "Added" : "Add to cart"}
    </button>
  );
}

export function DailyGazetteCard({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  const sale = hasSale(item);
  const price = formatDisplayPrice(currency, item.price);
  const regular = sale
    ? formatDisplayPrice(currency, item.regularPrice ?? null)
    : null;

  return (
    <article className={styles.card}>
      <Link href={href} className={styles.cardName}>
        {item.name}
      </Link>
      <StorefrontProductImageShell
        href={href}
        className={cn(styles.cardVisual, "relative")}
        itemId={item.id}
        itemName={item.name}
        ariaLabel={item.name}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 820px) 30vw, (min-width: 560px) 45vw, 90vw"
            unoptimized
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span className={styles.visualPlaceholder} aria-hidden />
        )}
      </StorefrontProductImageShell>
      <p className={styles.from}>From</p>
      <p className={styles.price}>{price}</p>
      {regular ? <span className={styles.compare}>{regular}</span> : null}
      <DailyGazetteAddButton item={item} />
    </article>
  );
}

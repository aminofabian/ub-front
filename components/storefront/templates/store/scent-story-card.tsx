"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/scent-story.module.css";
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

function priceLabel(item: PublicCatalogItemCard, currency: string): string {
  const price =
    item.price != null ? formatDisplayPrice(currency, item.price) : "—";
  const unit = item.unitType?.trim();
  return unit ? `${price} / ${unit}` : price;
}

export function ScentStoryAddButton({
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
      {busy ? "…" : "Add to bag"}
    </button>
  );
}

export function ScentStoryCard({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);

  return (
    <article className={styles.card}>
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
            sizes="(min-width: 1100px) 25vw, (min-width: 800px) 33vw, 50vw"
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.visualPlaceholder} aria-hidden />
        )}
        <span className={styles.cardHover}>
          <ScentStoryAddButton item={item} />
        </span>
      </StorefrontProductImageShell>
      <div className={styles.cardInfo}>
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        <span className={styles.cardPrice}>{priceLabel(item, currency)}</span>
      </div>
    </article>
  );
}

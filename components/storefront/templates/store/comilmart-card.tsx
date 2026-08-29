"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent } from "react";

import styles from "@/components/storefront/templates/store/comilmart.module.css";
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

export function ComilmartAddButton({
  item,
  className,
  compact,
}: {
  item: PublicCatalogItemCard;
  className?: string;
  compact?: boolean;
}) {
  const cart = useShopCart();
  const [busy, setBusy] = useState(false);

  const onAdd = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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
      className={cn(
        compact ? styles.cardAddCompact : styles.cardAdd,
        className,
      )}
      disabled={busy}
      onClick={(e) => void onAdd(e)}
    >
      {busy ? "…" : "Add to cart"}
    </button>
  );
}

export function ComilmartCard({
  item,
  currency,
  compact,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  compact?: boolean;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);

  return (
    <article className={cn(styles.card, compact && styles.cardCompact)}>
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
            sizes={compact ? "180px" : "(min-width: 760px) 220px, 45vw"}
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.visualPlaceholder} aria-hidden />
        )}
      </StorefrontProductImageShell>
      <div className={styles.cardBody}>
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        <div className={styles.cardPriceRow}>
          <span className={styles.cardPrice}>{priceLabel(item, currency)}</span>
        </div>
        <ComilmartAddButton item={item} compact={compact} />
      </div>
    </article>
  );
}

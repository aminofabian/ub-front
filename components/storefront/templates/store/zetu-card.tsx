"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { useState } from "react";

import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import styles from "@/components/storefront/templates/store/zetu.module.css";
import { zetuDiscount } from "@/components/storefront/templates/store/zetu-pricing";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { cn } from "@/lib/utils";

export function ZetuAddButton({
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
      /* cart panel surfaces the failure */
    } finally {
      setBusy(false);
    }
  };

  if (item.price == null) return null;

  const soldOut =
    item.qtyOnHand != null &&
    Number.isFinite(item.qtyOnHand) &&
    item.qtyOnHand <= 0;

  if (soldOut) {
    return (
      <span
        className={cn(styles.cardAdd, className)}
        aria-label={`${item.name} is sold out`}
        title="Sold out"
      >
        ×
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cn(styles.cardAdd, className)}
      disabled={busy}
      onClick={() => void onAdd()}
      aria-label={`Add ${item.name} to bag`}
    >
      {busy ? <span aria-hidden>…</span> : <Plus size={16} strokeWidth={2.6} aria-hidden />}
    </button>
  );
}

export function ZetuCard({
  item,
  currency,
  brandFallback,
  className,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  brandFallback?: string | null;
  className?: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  const discount = zetuDiscount(item);
  const brand = item.variantName?.trim() || brandFallback?.trim() || null;
  const soldOut =
    item.qtyOnHand != null && Number.isFinite(item.qtyOnHand) && item.qtyOnHand <= 0;

  return (
    <article className={cn(styles.card, className)}>
      <StorefrontProductImageShell
        href={href}
        className={styles.cardVisual}
        itemId={item.id}
        itemName={item.name}
        ariaLabel={item.name}
      >
        {discount ? (
          <span className={styles.cardBadge}>-{discount.percent}%</span>
        ) : null}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 1180px) 20vw, (min-width: 900px) 22vw, (min-width: 560px) 30vw, 46vw"
            unoptimized
            className={styles.cardImage}
          />
        ) : (
          <span className={styles.visualPlaceholder} aria-hidden />
        )}
        {soldOut ? <span className={styles.cardSoldOut}>Sold out</span> : null}
        <span className={styles.cardOpen} aria-hidden>
          <ArrowUpRight size={14} strokeWidth={2.2} />
        </span>
      </StorefrontProductImageShell>

      <div className={styles.cardBody}>
        {brand ? <span className={styles.cardBrand}>{brand}</span> : null}
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        <div className={styles.cardFoot}>
          <div className={styles.cardPriceRow}>
            <span className={styles.cardPrice}>
              {item.price != null
                ? formatDisplayPrice(currency, item.price)
                : "Ask us"}
            </span>
            {discount ? (
              <span className={styles.cardCompare}>
                {formatDisplayPrice(currency, item.regularPrice ?? null)}
              </span>
            ) : null}
          </div>
          <ZetuAddButton item={item} />
        </div>
      </div>
    </article>
  );
}

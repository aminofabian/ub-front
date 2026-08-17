"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
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

export function BeautyEditAddButton({
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

export function BeautyEditCard({
  item,
  currency,
  compact,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  compact?: boolean;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;

  return (
    <article className={cn(styles.card, compact && styles.cardCompact)}>
      <Link href={href} className={styles.cardVisual}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes={compact ? "280px" : "(min-width: 900px) 25vw, 50vw"}
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.visualPlaceholder} aria-hidden />
        )}
        <span className={styles.cardHover}>
          <BeautyEditAddButton item={item} />
        </span>
      </Link>
      <div className={styles.cardInfo}>
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        <span className={styles.cardPrice}>{priceLabel(item, currency)}</span>
      </div>
    </article>
  );
}

export function BeautyEditHeroPanel({
  item,
  currency,
  headline,
  cta,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  headline: string;
  cta: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;

  return (
    <Link href={href} className={styles.heroPanel}>
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="(min-width: 900px) 33vw, 100vw"
          unoptimized
          priority
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span className={styles.heroPanelFallback} aria-hidden />
      )}
      <span className={styles.heroShade} aria-hidden />
      <span className={styles.heroPanelCopy}>
        <span className={styles.heroPanelTitle}>{headline}</span>
        <span className={styles.heroPanelCta}>{cta}</span>
      </span>
      <span className={styles.srOnly}>{item.name} · {priceLabel(item, currency)}</span>
    </Link>
  );
}

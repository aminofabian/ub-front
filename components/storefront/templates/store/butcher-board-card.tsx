"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/butcher-board.module.css";
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

function Star() {
  return (
    <svg viewBox="0 0 24 24" className={styles.star} aria-hidden>
      <path d="M12 2.2 14.7 9h7.3l-5.9 4.3 2.3 7.1L12 16.6 5.6 20.4 7.9 13.3 2 9h7.3L12 2.2Z" />
    </svg>
  );
}

export function ButcherBoardAddButton({
  item,
  size = "default",
}: {
  item: PublicCatalogItemCard;
  size?: "default" | "small";
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
      className={size === "small" ? styles.addBtnSmall : styles.addBtn}
      disabled={busy}
      onClick={() => void onAdd()}
    >
      <Star />
      {busy ? "…" : "Add"}
    </button>
  );
}

export function ButcherBoardVignette({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";

  return (
    <article className={styles.vignette}>
      <Link href={href} className={styles.vignetteVisual}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="180px"
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.heroPlaceholder} aria-hidden />
        )}
      </Link>
      <div className={styles.vignetteBody}>
        <Link href={href} className={styles.vignetteName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.cardMeta}>{meta}</p> : null}
        <div className={styles.vignetteActions}>
          <span className={styles.vignettePrice}>
            {priceLabel(item, currency)}
          </span>
          <ButcherBoardAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function ButcherBoardCard({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";

  return (
    <article className={styles.card}>
      <Link href={href} className={styles.cardVisual}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 900px) 30vw, 50vw"
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.heroPlaceholder} aria-hidden />
        )}
      </Link>
      <div className={styles.cardInfo}>
        <Link href={href} className={cn(styles.cardName)}>
          {item.name}
        </Link>
        {meta ? <p className={styles.cardMeta}>{meta}</p> : null}
        <div className={styles.cardFoot}>
          <span className={styles.vignettePrice}>
            {priceLabel(item, currency)}
          </span>
          <ButcherBoardAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function ButcherBoardHero({
  item,
  currency,
  headline,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  headline: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";

  return (
    <article className={cn(styles.hero, styles.heroGlow)}>
      <Link href={href} className={styles.heroClip}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 900px) 60vw, 100vw"
            unoptimized
            priority
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.heroPlaceholder} aria-hidden />
        )}
        <span className={styles.heroShade} aria-hidden />
      </Link>
      <div className={styles.heroCopy}>
        <h1 className={styles.heroHeadline}>{headline}</h1>
        <p className={styles.heroProduct}>{item.name}</p>
        <p className={styles.heroMeta}>
          {priceLabel(item, currency)}
          {meta ? ` · ${meta}` : ""}
        </p>
        <ButcherBoardAddButton item={item} />
      </div>
    </article>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/boutique-shelf.module.css";
import { StorefrontNativeHeroHeadline } from "@/components/storefront/storefront-native-hero-copy";
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

export function BoutiqueShelfAddButton({
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
      {busy ? "…" : "Add to tray"}
    </button>
  );
}

function BoxVisual({
  item,
  href,
  sizes,
  priority,
  variant = "default",
}: {
  item: PublicCatalogItemCard;
  href: string;
  sizes: string;
  priority?: boolean;
  variant?: "default" | "slot";
}) {
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  return (
    <StorefrontProductImageShell
      href={href}
      className={cn(
        styles.boxVisual,
        variant === "slot" && styles.boxVisualSlot,
        "relative",
      )}
      itemId={item.id}
      itemName={item.name}
      ariaLabel={item.name}
    >
      <span className={styles.tissueCorner} aria-hidden />
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={item.name}
          fill
          sizes={sizes}
          unoptimized
          priority={priority}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span className={styles.visualPlaceholder} aria-hidden />
      )}
    </StorefrontProductImageShell>
  );
}

export function BoutiqueShelfSlot({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";

  return (
    <article className={styles.slot}>
      <BoxVisual item={item} href={href} sizes="180px" variant="slot" />
      <div className={styles.slotBody}>
        <Link href={href} className={styles.slotName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
        <div className={styles.slotFoot}>
          <span className={styles.priceTag}>{priceLabel(item, currency)}</span>
          <BoutiqueShelfAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function BoutiqueShelfCard({
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
      <BoxVisual item={item} href={href} sizes="(min-width: 900px) 30vw, 50vw" />
      <div className={styles.cardBody}>
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
        <div className={styles.cardFoot}>
          <span className={styles.priceTag}>{priceLabel(item, currency)}</span>
          <BoutiqueShelfAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function BoutiqueShelfHero({
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
    <article className={styles.alcove}>
      <span className={styles.spotlight} aria-hidden />
      <div className={styles.alcoveInner}>
        <p className={styles.alcoveEyebrow}>Staff pick · alcove display</p>
        <StorefrontNativeHeroHeadline
          value={headline}
          className={styles.alcoveHeadline}
        />
        <BoxVisual
          item={item}
          href={href}
          sizes="(min-width: 900px) 55vw, 100vw"
          priority
        />
        <div className={styles.alcoveCopy}>
          <Link href={href} className={styles.alcoveName}>
            {item.name}
          </Link>
          {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
          <div className={styles.alcoveFoot}>
            <span className={styles.priceTagLarge}>{priceLabel(item, currency)}</span>
            <BoutiqueShelfAddButton item={item} />
          </div>
        </div>
      </div>
    </article>
  );
}

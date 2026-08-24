"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/carbon-desk.module.css";
import { StorefrontProductPhotoButton } from "@/components/storefront/storefront-product-photo-button";
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

export function CarbonDeskAddButton({
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
      {busy ? "…" : "Issue slip"}
    </button>
  );
}

function FormVisual({
  item,
  href,
  sizes,
  priority,
}: {
  item: PublicCatalogItemCard;
  href: string;
  sizes: string;
  priority?: boolean;
}) {
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  return (
    <Link href={href} className={cn(styles.formPhoto, "relative")}>
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
        <span className={styles.photoPlaceholder} aria-hidden />
      )}
      <StorefrontProductPhotoButton itemId={item.id} itemName={item.name} />
    </Link>
  );
}

export function CarbonDeskSlip({
  item,
  currency,
  tilt,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  tilt?: "left" | "right" | "none";
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";

  return (
    <article
      className={cn(
        styles.slip,
        tilt === "left" && styles.slipLeft,
        tilt === "right" && styles.slipRight,
      )}
    >
      <span className={styles.slipCarbon} aria-hidden />
      <div className={styles.slipInner}>
        <FormVisual item={item} href={href} sizes="160px" />
        <div className={styles.slipBody}>
          <Link href={href} className={styles.slipName}>
            {item.name}
          </Link>
          {meta ? <p className={styles.formMeta}>{meta}</p> : null}
          <div className={styles.slipFoot}>
            <span className={styles.stamp}>{priceLabel(item, currency)}</span>
            <CarbonDeskAddButton item={item} size="small" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CarbonDeskCard({
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
      <span className={styles.cardCarbon} aria-hidden />
      <div className={styles.cardInner}>
        <FormVisual item={item} href={href} sizes="(min-width: 900px) 30vw, 50vw" />
        <div className={styles.cardBody}>
          <Link href={href} className={styles.cardName}>
            {item.name}
          </Link>
          {meta ? <p className={styles.formMeta}>{meta}</p> : null}
          <div className={styles.cardFoot}>
            <span className={styles.stamp}>{priceLabel(item, currency)}</span>
            <CarbonDeskAddButton item={item} size="small" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CarbonDeskHero({
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
    <article className={styles.hero}>
      <span className={styles.heroCarbon} aria-hidden />
      <div className={styles.heroInner}>
        <div className={styles.heroHead}>
          <span className={styles.formLabel}>Duplicate · counter copy</span>
          <h1 className={styles.heroHeadline}>{headline}</h1>
        </div>
        <FormVisual
          item={item}
          href={href}
          sizes="(min-width: 900px) 55vw, 100vw"
          priority
        />
        <div className={styles.heroFields}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldKey}>Item</span>
            <Link href={href} className={styles.fieldVal}>
              {item.name}
            </Link>
          </div>
          {meta ? (
            <div className={styles.fieldRow}>
              <span className={styles.fieldKey}>Spec</span>
              <span className={styles.fieldValPlain}>{meta}</span>
            </div>
          ) : null}
          <div className={styles.fieldRow}>
            <span className={styles.fieldKey}>Amount</span>
            <span className={styles.stampLarge}>{priceLabel(item, currency)}</span>
          </div>
          <CarbonDeskAddButton item={item} />
        </div>
        <span className={styles.watermark} aria-hidden>
          DUPLICATE
        </span>
      </div>
    </article>
  );
}

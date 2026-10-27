"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
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

/** "each" is noise on clothing; real units (kg, pair) still earn their suffix. */
const SILENT_UNITS = new Set(["each", "unit", "units", "pcs", "piece"]);

function unitSuffix(item: PublicCatalogItemCard): string {
  const unit = item.unitType?.trim();
  if (!unit || SILENT_UNITS.has(unit.toLowerCase())) return "";
  return ` / ${unit}`;
}

function priceLabel(item: PublicCatalogItemCard, currency: string): string {
  const price =
    item.price != null ? formatDisplayPrice(currency, item.price) : "—";
  return `${price}${unitSuffix(item)}`;
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
      aria-label={`Add ${item.name} to bag`}
    >
      <span aria-hidden className={styles.addBtnPlus}>
        +
      </span>
      <span className={styles.addBtnLabel}>{busy ? "Adding…" : "Add to bag"}</span>
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
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  const hasDiscount =
    item.regularPrice != null && item.price != null && item.regularPrice > item.price;

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
            sizes={
              compact
                ? "(min-width: 960px) 25vw, (min-width: 640px) 34vw, 62vw"
                : "(min-width: 1100px) 33vw, (min-width: 600px) 50vw, 50vw"
            }
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.visualPlaceholder} aria-hidden />
        )}
        <span className={styles.cardAdd}>
          <BeautyEditAddButton item={item} />
        </span>
        {hasDiscount ? <span className={styles.cardFlag}>Sale</span> : null}
      </StorefrontProductImageShell>

      <div className={styles.cardInfo}>
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        <span className={styles.cardPriceRow}>
          <span className={styles.cardPrice}>{priceLabel(item, currency)}</span>
          {hasDiscount ? (
            <span className={styles.cardCompare}>
              {formatDisplayPrice(currency, item.regularPrice ?? null)}
            </span>
          ) : null}
        </span>
      </div>
    </article>
  );
}

export function BeautyEditHeroPanel({
  item,
  currency,
  headline,
  cta,
  index = 0,
  featured = false,
  editableHeadline = false,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  headline: string;
  cta: string;
  index?: number;
  featured?: boolean;
  editableHeadline?: boolean;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);

  return (
    <StorefrontProductImageShell
      href={href}
      className={cn(
        styles.heroPanel,
        featured && styles.heroPanelFeatured,
        styles[`heroTone${index}` as keyof typeof styles],
        "relative",
      )}
      itemId={item.id}
      itemName={item.name}
      ariaLabel={`${item.name} · ${priceLabel(item, currency)}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={item.name}
          fill
          sizes={featured ? "(min-width: 900px) 58vw, 100vw" : "(min-width: 900px) 42vw, 100vw"}
          unoptimized
          priority
          className={styles.heroImg}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span className={styles.heroPanelFallback} aria-hidden />
      )}
      <span className={styles.heroGrain} aria-hidden />
      <span className={styles.heroShade} />
      <span className={styles.heroPanelCopy}>
        {editableHeadline ? (
          <StorefrontNativeHeroHeadline
            as="span"
            value={headline}
            className={styles.heroPanelTitle}
          />
        ) : (
          <span className={styles.heroPanelTitle}>{headline}</span>
        )}
        <span className={styles.heroPanelCta}>
          {cta}
          <span className={styles.heroCtaRule} aria-hidden />
        </span>
      </span>
      <span className={styles.srOnly}>
        {item.name} · {priceLabel(item, currency)}
      </span>
    </StorefrontProductImageShell>
  );
}

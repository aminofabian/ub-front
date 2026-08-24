"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/chem-lab.module.css";
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

function skuHint(item: PublicCatalogItemCard): string {
  if (item.sku?.trim()) return item.sku.trim().slice(0, 12).toUpperCase();
  return `RX-${item.id.slice(0, 6).toUpperCase()}`;
}

export function ChemLabAddButton({
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
      {busy ? "…" : "Dispense"}
    </button>
  );
}

function BottleVisual({
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
  variant?: "default" | "vial";
}) {
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  return (
    <StorefrontProductImageShell
      href={href}
      className={cn(
        styles.bottleVisual,
        variant === "vial" && styles.bottleVial,
        "relative",
      )}
      itemId={item.id}
      itemName={item.name}
      ariaLabel={item.name}
    >
      <span className={styles.glassSheen} aria-hidden />
      <span className={styles.bottleLabel} aria-hidden />
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

export function ChemLabVial({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const meta = item.variantName?.trim() || "";

  return (
    <article className={styles.vial}>
      <BottleVisual item={item} href={href} sizes="160px" variant="vial" />
      <div className={styles.vialBody}>
        <span className={styles.compoundCode}>{skuHint(item)}</span>
        <Link href={href} className={styles.vialName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
        <div className={styles.vialFoot}>
          <span className={styles.priceTag}>{priceLabel(item, currency)}</span>
          <ChemLabAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function ChemLabCard({
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
      <BottleVisual item={item} href={href} sizes="(min-width: 900px) 30vw, 50vw" />
      <div className={styles.cardBody}>
        <span className={styles.compoundCode}>{skuHint(item)}</span>
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
        <div className={styles.cardFoot}>
          <span className={styles.priceTag}>{priceLabel(item, currency)}</span>
          <ChemLabAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function ChemLabHero({
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
    <article className={styles.flask}>
      <span className={styles.moleculeDecor} aria-hidden />
      <div className={styles.flaskInner}>
        <div className={styles.flaskHead}>
          <span className={styles.flaskBadge}>Primary reagent · bench A1</span>
          <StorefrontNativeHeroHeadline
            value={headline}
            className={styles.flaskHeadline}
          />
        </div>
        <BottleVisual
          item={item}
          href={href}
          sizes="(min-width: 900px) 55vw, 100vw"
          priority
        />
        <div className={styles.flaskSpec}>
          <div className={styles.specRow}>
            <span className={styles.specKey}>Compound</span>
            <Link href={href} className={styles.specVal}>
              {item.name}
            </Link>
          </div>
          <div className={styles.specRow}>
            <span className={styles.specKey}>Catalog</span>
            <span className={styles.specValPlain}>{skuHint(item)}</span>
          </div>
          {meta ? (
            <div className={styles.specRow}>
              <span className={styles.specKey}>Grade</span>
              <span className={styles.specValPlain}>{meta}</span>
            </div>
          ) : null}
          <div className={styles.specRow}>
            <span className={styles.specKey}>Yield</span>
            <span className={styles.priceTagLarge}>{priceLabel(item, currency)}</span>
          </div>
          <ChemLabAddButton item={item} />
        </div>
      </div>
    </article>
  );
}

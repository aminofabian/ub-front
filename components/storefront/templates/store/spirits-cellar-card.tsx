"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/spirits-cellar.module.css";
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

function vaultTag(item: PublicCatalogItemCard): string {
  if (item.sku?.trim()) return item.sku.trim().slice(0, 10).toUpperCase();
  return `V-${item.id.slice(0, 5).toUpperCase()}`;
}

export function SpiritsCellarAddButton({
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
      {busy ? "…" : "Break seal"}
    </button>
  );
}

function NicheVisual({
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
    <Link
      href={href}
      className={cn(
        styles.nicheVisual,
        variant === "slot" && styles.nicheSlotVisual,
        "relative",
      )}
    >
      <span className={styles.archTop} aria-hidden />
      <span className={styles.candleGlow} aria-hidden />
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
      <span className={styles.waxSeal} aria-hidden />
      <StorefrontProductPhotoButton itemId={item.id} itemName={item.name} />
    </Link>
  );
}

export function SpiritsCellarSlot({
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
      <NicheVisual item={item} href={href} sizes="160px" variant="slot" />
      <div className={styles.slotBody}>
        <span className={styles.vaultTag}>{vaultTag(item)}</span>
        <Link href={href} className={styles.slotName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
        <div className={styles.slotFoot}>
          <span className={styles.priceTag}>{priceLabel(item, currency)}</span>
          <SpiritsCellarAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function SpiritsCellarCard({
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
      <NicheVisual item={item} href={href} sizes="(min-width: 900px) 30vw, 50vw" />
      <div className={styles.cardBody}>
        <span className={styles.vaultTag}>{vaultTag(item)}</span>
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        {meta ? <p className={styles.itemMeta}>{meta}</p> : null}
        <div className={styles.cardFoot}>
          <span className={styles.priceTag}>{priceLabel(item, currency)}</span>
          <SpiritsCellarAddButton item={item} size="small" />
        </div>
      </div>
    </article>
  );
}

export function SpiritsCellarHero({
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
    <article className={styles.vault}>
      <span className={styles.sconceLeft} aria-hidden />
      <span className={styles.sconceRight} aria-hidden />
      <div className={styles.vaultInner}>
        <div className={styles.vaultHead}>
          <span className={styles.vaultBadge}>Grand niche · row A</span>
          <h1 className={styles.vaultHeadline}>{headline}</h1>
        </div>
        <NicheVisual
          item={item}
          href={href}
          sizes="(min-width: 900px) 55vw, 100vw"
          priority
        />
        <div className={styles.vaultLedger}>
          <div className={styles.ledgerRow}>
            <span className={styles.ledgerKey}>Essence</span>
            <Link href={href} className={styles.ledgerVal}>
              {item.name}
            </Link>
          </div>
          <div className={styles.ledgerRow}>
            <span className={styles.ledgerKey}>Vault mark</span>
            <span className={styles.ledgerValPlain}>{vaultTag(item)}</span>
          </div>
          {meta ? (
            <div className={styles.ledgerRow}>
              <span className={styles.ledgerKey}>Vintage</span>
              <span className={styles.ledgerValPlain}>{meta}</span>
            </div>
          ) : null}
          <div className={styles.ledgerRow}>
            <span className={styles.ledgerKey}>Toll</span>
            <span className={styles.priceTagLarge}>{priceLabel(item, currency)}</span>
          </div>
          <SpiritsCellarAddButton item={item} />
        </div>
      </div>
    </article>
  );
}

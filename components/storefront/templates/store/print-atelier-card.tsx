"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import styles from "@/components/storefront/templates/store/print-atelier.module.css";
import { triggerPrintAtelierFly } from "@/components/storefront/templates/store/print-atelier-fly";
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

const SWATCH_PALETTE = [
  "#c45c4a",
  "#1c1a16",
  "#f4f3ef",
  "#2b4a8c",
  "#9aaf7c",
  "#e8b4c4",
] as const;

function priceBits(item: PublicCatalogItemCard, currency: string) {
  const price =
    item.price != null ? formatDisplayPrice(currency, item.price) : "—";
  const hasDiscount =
    item.regularPrice != null &&
    item.price != null &&
    item.regularPrice > item.price;
  const regular = hasDiscount
    ? formatDisplayPrice(currency, item.regularPrice ?? null)
    : null;
  return { price, regular, onSale: hasDiscount || Boolean(item.discountName) };
}

export function PrintAtelierAddButton({
  item,
  imageUrl,
  className,
}: {
  item: PublicCatalogItemCard;
  imageUrl?: string | null;
  className?: string;
}) {
  const cart = useShopCart();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const onAdd = async () => {
    if (busy || item.price == null) return;
    setBusy(true);
    try {
      const existing =
        cart.cart?.lines.find((l) => l.itemId === item.id)?.quantity ?? 0;
      await cart.setLineQty(item.id, existing + 1);
      triggerPrintAtelierFly(btnRef.current, imageUrl, item.name);
      cart.notifyAdded(item.id);
      setJustAdded(true);
      window.setTimeout(() => {
        setJustAdded(false);
        cart.openDrawer();
      }, 780);
    } catch {
      /* cart UI surfaces failures */
    } finally {
      setBusy(false);
    }
  };

  if (item.price == null) return null;

  return (
    <button
      ref={btnRef}
      type="button"
      className={cn(styles.addBtn, justAdded && styles.addBtnAdded, className)}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onAdd();
      }}
    >
      {busy ? "…" : justAdded ? "Added" : "Add"}
    </button>
  );
}

export function PrintAtelierCard({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  const { price, regular, onSale } = priceBits(item, currency);
  const swatch = SWATCH_PALETTE[Math.abs(hashId(item.id)) % SWATCH_PALETTE.length];

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
            sizes="(min-width: 1100px) 25vw, (min-width: 720px) 33vw, 50vw"
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.visualPlaceholder} aria-hidden />
        )}
        {onSale ? <span className={styles.saleBadge}>Sale</span> : null}
        <span className={styles.cardHover}>
          <PrintAtelierAddButton item={item} imageUrl={imageUrl} />
        </span>
      </StorefrontProductImageShell>
      <div className={styles.cardInfo}>
        <Link href={href} className={styles.cardName}>
          {item.name}
        </Link>
        <div className={styles.cardPrice}>
          <span>{price}</span>
          {regular ? <span className={styles.cardCompare}>{regular}</span> : null}
        </div>
        <div className={styles.swatches} aria-hidden>
          <span
            className={styles.swatch}
            style={{ ["--swatch" as string]: swatch }}
          />
        </div>
      </div>
    </article>
  );
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

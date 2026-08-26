"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type MouseEvent } from "react";

import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { cartLineQuantity, useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { cn } from "@/lib/utils";

function BlankDropPlusAdd({
  item,
}: {
  item: PublicCatalogItemCard;
}) {
  const cart = useShopCart();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const lock = useRef(false);

  const inBag =
    cart.cart?.lines.find((l) => l.itemId === item.id) ?? null;
  const qty = inBag ? cartLineQuantity(inBag.quantity) : 0;

  const onAdd = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || lock.current || item.price == null) return;
    lock.current = true;
    setBusy(true);
    try {
      await cart.setLineQty(item.id, qty + 1);
      cart.notifyAdded(item.id);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 700);
    } catch {
      /* cart surfaces errors */
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  if (item.price == null) return null;

  return (
    <button
      type="button"
      className={cn(
        styles.cardPlus,
        flash && styles.cardPlusFlash,
        qty > 0 && styles.cardPlusActive,
      )}
      disabled={busy}
      aria-label={qty > 0 ? `Add another · ${qty} in bag` : `Add ${item.name} to bag`}
      onClick={(e) => void onAdd(e)}
    >
      <span className={styles.cardPlusMark} aria-hidden>
        {flash ? "✓" : "+"}
      </span>
      {qty > 0 && !flash ? (
        <span className={styles.cardPlusQty}>{Math.min(qty, 99)}</span>
      ) : null}
    </button>
  );
}

export function BlankDropCard({
  item,
  currency,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  /** @deprecated Price is always shown; kept for call-site compat. */
  showPrice?: boolean;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  const price =
    item.price != null ? formatDisplayPrice(currency, item.price) : null;

  return (
    <article className={styles.card}>
      <div className={styles.cardStage}>
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
              sizes="(min-width: 1200px) 16vw, (min-width: 960px) 25vw, 50vw"
              unoptimized
              style={{ objectFit: "contain" }}
            />
          ) : (
            <span className={styles.placeholder} aria-hidden />
          )}
        </StorefrontProductImageShell>
        <BlankDropPlusAdd item={item} />
      </div>

      <div className={styles.cardMeta}>
        {price ? (
          <Link href={href} className={styles.cardPrice}>
            {price}
          </Link>
        ) : (
          <Link href={href} className={styles.cardPriceMuted}>
            View
          </Link>
        )}
      </div>
    </article>
  );
}

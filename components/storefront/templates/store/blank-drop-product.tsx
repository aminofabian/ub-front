"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  mergeVariantOptions,
  ShopItemVariantPicker,
} from "@/components/storefront/shop-item-variant-picker";
import { blankDropCode } from "@/components/storefront/templates/store/blank-drop-code";
import { blankDropFontVariables } from "@/components/storefront/templates/store/blank-drop-fonts";
import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  hasCatalogPrice,
  type PublicCatalogItemDetail,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

/**
 * Blank drop PDP — code-first, contain gallery, black ADD TO BAG.
 * Craft bar: yeezy.com product surface (sparse modal grammar as a full page).
 */
export function BlankDropProduct({
  slug,
  item,
}: {
  slug: string;
  item: PublicCatalogItemDetail;
}) {
  void slug;
  const cart = useShopCart();
  const [activeIdx, setActiveIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const images = item.images.length > 0 ? item.images : [];
  const active = images[activeIdx] ?? images[0] ?? null;
  const displayUrl = useStorefrontDisplayImage(item.id, active?.url ?? null);
  const variantOptions = mergeVariantOptions(item);
  const hasMultipleOptions = variantOptions.length > 1;
  const showPrice = hasCatalogPrice(item.price);
  const hasDiscount =
    item.regularPrice != null &&
    item.price != null &&
    item.regularPrice > item.price;
  const code = blankDropCode(item);
  const descLines = useMemo(
    () =>
      item.description
        ? item.description
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 6)
        : [],
    [item.description],
  );

  const onAdd = async () => {
    if (busy || !showPrice) return;
    setBusy(true);
    try {
      const existing =
        cart.cart?.lines.find((l) => l.itemId === item.id)?.quantity ?? 0;
      await cart.setLineQty(item.id, existing + 1);
      cart.notifyAdded(item.id);
      cart.openDrawer();
    } catch {
      /* cart surfaces errors */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(styles.root, styles.body, blankDropFontVariables, styles.pdp)}
      data-store-theme-id="blank-drop"
    >
      <div className={styles.pdpWrap}>
        <div className={styles.pdpTop}>
          <Link href={APP_ROUTES.shop} className={styles.pdpBack}>
            Close
          </Link>
        </div>

        <div className={styles.pdpGrid}>
          <section className={styles.pdpGallery}>
            <StorefrontProductImageShell
              className={cn(styles.pdpHero, "relative")}
              itemId={item.id}
              itemName={item.name}
              ariaLabel={item.name}
            >
              {displayUrl ? (
                <Image
                  src={displayUrl}
                  alt={active?.altText?.trim() || item.name}
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 900px) 55vw, 100vw"
                  style={{ objectFit: "contain" }}
                  data-product-image=""
                />
              ) : (
                <span className={styles.placeholder} aria-hidden />
              )}
            </StorefrontProductImageShell>

            {images.length > 1 ? (
              <div className={styles.pdpThumbs}>
                {images.slice(0, 8).map((img, idx) => (
                  <button
                    key={`${img.url}-${idx}`}
                    type="button"
                    className={cn(
                      styles.pdpThumb,
                      idx === activeIdx && styles.pdpThumbActive,
                    )}
                    onClick={() => setActiveIdx(idx)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      unoptimized
                      sizes="72px"
                      style={{ objectFit: "contain" }}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className={styles.pdpInfo}>
            <h1 className={styles.pdpCode}>{code}</h1>

            {showPrice ? (
              <p className={styles.pdpPrice}>
                {formatDisplayPrice(item.currency, item.price)}
                {hasDiscount ? (
                  <span className={styles.pdpCompare}>
                    {formatDisplayPrice(item.currency, item.regularPrice ?? null)}
                  </span>
                ) : null}
              </p>
            ) : null}

            {hasMultipleOptions ? (
              <div className={styles.pdpVariants}>
                <p className={styles.pdpVariantLabel}>Select</p>
                <ShopItemVariantPicker item={item} />
              </div>
            ) : item.variantName ? (
              <p className={styles.pdpName}>{item.variantName}</p>
            ) : null}

            {showPrice ? (
              <button
                type="button"
                className={styles.pdpAdd}
                disabled={busy}
                onClick={() => void onAdd()}
              >
                {busy ? "Adding…" : "Add to bag"}
              </button>
            ) : (
              <div className={styles.pdpUnavailable}>
                {hasMultipleOptions ? "Select an option" : "Unavailable online"}
              </div>
            )}

            {descLines.length > 0 ? (
              <div className={styles.pdpDesc}>
                {descLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

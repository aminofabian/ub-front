"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import ShopAddToCart from "@/components/storefront/shop-add-to-cart";
import { ShopItemLivePrice } from "@/components/storefront/shop-item-live-price";
import {
  mergeVariantOptions,
  ShopItemVariantPicker,
} from "@/components/storefront/shop-item-variant-picker";
import { beautyEditFontVariables } from "@/components/storefront/templates/store/beauty-edit-fonts";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  formatStoreQty,
  hasCatalogPrice,
  isStorefrontWeighedItem,
  type PublicCatalogItemDetail,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

/**
 * Beyond PDP — magazine product page: serif title, sharp gallery, ink CTA.
 */
export function BeautyEditProduct({
  slug,
  item,
}: {
  slug: string;
  item: PublicCatalogItemDetail;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const images = item.images.length > 0 ? item.images : [];
  const active = images[activeIdx] ?? images[0] ?? null;
  const displayUrl = useStorefrontDisplayImage(item.id, active?.url ?? null);
  const variantOptions = mergeVariantOptions(item);
  const hasMultipleOptions = variantOptions.length > 1;
  const weighed = isStorefrontWeighedItem(item);
  const showPrice = hasCatalogPrice(item.price);
  const hasDiscount =
    item.regularPrice != null &&
    item.price != null &&
    item.regularPrice > item.price;
  const stockLabel = formatStoreQty(item.qtyOnHand);
  const featureLines = useMemo(
    () =>
      item.description
        ? item.description
            .split(/\r?\n|[•·]/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 10)
        : [],
    [item.description],
  );

  return (
    <div
      className={cn(
        styles.root,
        styles.body,
        styles.home,
        beautyEditFontVariables,
        styles.pdp,
      )}
      data-store-theme-id="beauty-edit"
    >
      <div className={styles.pdpWrap}>
        <Link href={APP_ROUTES.shop} className={styles.pdpBack}>
          ← Back to the edit
        </Link>

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
                  sizes="(min-width: 900px) 52vw, 100vw"
                  style={{ objectFit: "cover" }}
                  data-product-image=""
                />
              ) : (
                <span className={styles.visualPlaceholder} aria-hidden />
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
                      sizes="80px"
                      style={{ objectFit: "cover" }}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className={styles.pdpInfo}>
            <h1 className={styles.pdpTitle}>{item.name}</h1>
            {item.variantName && !hasMultipleOptions ? (
              <p className={styles.pdpVariant}>{item.variantName}</p>
            ) : null}

            {showPrice ? (
              <div className={styles.pdpPriceRow}>
                <ShopItemLivePrice
                  slug={slug}
                  itemId={item.id}
                  currency={item.currency}
                  initialPrice={item.price}
                  className={styles.pdpPrice}
                />
                {hasDiscount ? (
                  <span className={styles.pdpCompare}>
                    {formatDisplayPrice(item.currency, item.regularPrice ?? null)}
                  </span>
                ) : null}
                {stockLabel ? (
                  <span className={styles.pdpStock}>{stockLabel}</span>
                ) : null}
              </div>
            ) : null}

            {hasMultipleOptions ? (
              <ShopItemVariantPicker item={item} className={styles.pdpVariants} />
            ) : null}

            {showPrice ? (
              <ShopAddToCart
                slug={slug}
                itemId={item.id}
                weighed={weighed}
                unitType={item.unitType}
                maxQty={item.qtyOnHand}
                className={styles.pdpCart}
              />
            ) : (
              <div className={styles.pdpUnavailable}>
                {hasMultipleOptions
                  ? "Pick a priced option above to add this piece to your bag."
                  : "This piece is not available for online checkout yet. Message us on WhatsApp for availability."}
              </div>
            )}

            {featureLines.length > 0 ? (
              <div className={styles.pdpDetails}>
                <h2 className={styles.pdpDetailsTitle}>Details</h2>
                <ul className={styles.pdpDetailsList}>
                  {featureLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={styles.pdpTrust}>
              <span>Pay with M-Pesa</span>
              <span>Pick up in store</span>
              <span>Local delivery</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

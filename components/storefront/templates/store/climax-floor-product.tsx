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
import { climaxFloorFontVariables } from "@/components/storefront/templates/store/climax-floor-fonts";
import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  hasCatalogPrice,
  isStorefrontWeighedItem,
  type PublicCatalogItemDetail,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

export function ClimaxFloorProduct({
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
  const featureLines = useMemo(
    () =>
      item.description
        ? item.description
            .split(/\r?\n|[•·]/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 12)
        : [],
    [item.description],
  );

  return (
    <div
      className={cn(styles.root, styles.body, climaxFloorFontVariables)}
      data-store-theme-id="climax-floor"
    >
      <div className={styles.pdp}>
        <Link href={APP_ROUTES.shop} className={styles.pdpBack}>
          Back to shop
        </Link>

        <div className={styles.pdpGrid}>
          <section>
            <StorefrontProductImageShell
              className={cn(styles.pdpHero, "relative")}
              itemId={item.id}
              itemName={item.name}
              ariaLabel={item.name}
            >
              {hasDiscount ? <span className={styles.sale}>Sale!</span> : null}
              {displayUrl ? (
                <Image
                  src={displayUrl}
                  alt={active?.altText?.trim() || item.name}
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 900px) 50vw, 100vw"
                  style={{ objectFit: "contain" }}
                  data-product-image=""
                />
              ) : (
                <span className={styles.visualPlaceholder} aria-hidden />
              )}
            </StorefrontProductImageShell>

            {images.length > 1 ? (
              <div className={styles.pdpThumbs}>
                {images.slice(0, 6).map((img, idx) => (
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

          <section>
            <h1 className={styles.pdpTitle}>{item.name}</h1>
            {showPrice ? (
              <div className={styles.pdpPriceRow}>
                {hasDiscount ? (
                  <span className={styles.pdpCompare}>
                    {formatDisplayPrice(item.currency, item.regularPrice ?? null)}
                  </span>
                ) : null}
                <ShopItemLivePrice
                  slug={slug}
                  itemId={item.id}
                  currency={item.currency}
                  initialPrice={item.price}
                  className={styles.pdpPrice}
                />
              </div>
            ) : null}

            {hasMultipleOptions ? (
              <ShopItemVariantPicker item={item} />
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
                  ? "Pick a priced option above to add this to your cart."
                  : "Ask on WhatsApp and we will confirm stock for you."}
              </div>
            )}

            {featureLines.length > 0 ? (
              <div className={styles.pdpFeatures}>
                {featureLines.map((line) => (
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

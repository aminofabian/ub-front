"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";

import { zetuFontVariables } from "@/app/fonts/zetu";
import { ShopItemLivePrice } from "@/components/storefront/shop-item-live-price";
import { mergeVariantOptions } from "@/components/storefront/shop-item-variant-picker";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { ZetuCard } from "@/components/storefront/templates/store/zetu-card";
import { zetuDiscount } from "@/components/storefront/templates/store/zetu-pricing";
import styles from "@/components/storefront/templates/store/zetu.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  formatStoreQty,
  hasCatalogPrice,
  isStorefrontWeighedItem,
  type PublicCatalogItemCard,
  type PublicCatalogItemDetail,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { cn } from "@/lib/utils";

function variantLabel(variant: {
  variantName: string | null;
  name: string;
}): string {
  return variant.variantName?.trim() || variant.name.trim();
}

export function ZetuProduct({
  slug,
  item,
  relatedItems = [],
}: {
  slug: string;
  item: PublicCatalogItemDetail;
  relatedItems?: PublicCatalogItemCard[];
}) {
  const cart = useShopCart();
  const [activeIdx, setActiveIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const images = item.images.length > 0 ? item.images : [];
  const active = images[activeIdx] ?? images[0] ?? null;
  const displayUrl = useStorefrontDisplayImage(item.id, active?.url ?? null);
  const variants = mergeVariantOptions(item);
  const hasOptions = variants.length > 1;
  const weighed = isStorefrontWeighedItem(item);
  const showPrice = hasCatalogPrice(item.price);
  const discount = zetuDiscount(item);
  const soldOut =
    item.qtyOnHand != null && Number.isFinite(item.qtyOnHand) && item.qtyOnHand <= 0;
  const maxQty =
    item.qtyOnHand != null && Number.isFinite(item.qtyOnHand) && item.qtyOnHand > 0
      ? item.qtyOnHand
      : null;
  const stockLabel = formatStoreQty(item.qtyOnHand);
  const featureLines = useMemo(
    () =>
      item.description
        ? item.description
            .split(/\r?\n|[•·]/)
            .map((line) => line.trim())
            .filter(Boolean)
        : [],
    [item.description],
  );


  const setQuantity = (next: number) => {
    const cap = maxQty ?? 99;
    const value = Math.max(1, Math.min(cap, Math.floor(next)));
    setQty(value);
  };

  async function add(goToCheckout: boolean) {
    if (!showPrice || soldOut || busy) return;
    setBusy(true);
    setError(null);
    try {
      const existing =
        cart.cart?.lines.find((line) => line.itemId === item.id)?.quantity ?? 0;
      await cart.setLineQty(item.id, existing + (weighed ? 1 : qty));
      cart.notifyAdded(item.id);
      if (goToCheckout) {
        cart.openCheckout();
      } else {
        cart.openDrawer();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this piece.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(styles.root, styles.body, zetuFontVariables, styles.pdp)}
      data-store-theme-id="zetu"
    >
      <div className={styles.pdpWrap}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={APP_ROUTES.shop}>Home</Link>
          <span className={styles.breadcrumbSep} aria-hidden>
            /
          </span>
          <Link href={APP_ROUTES.shop}>Shop</Link>
          <span className={styles.breadcrumbSep} aria-hidden>
            /
          </span>
          <span className={styles.breadcrumbNow} aria-current="page">
            {item.name}
          </span>
        </nav>

        <div className={styles.pdpGrid}>
          <section
            className={cn(
              styles.pdpGallery,
              images.length <= 1 && styles.pdpGalleryEmpty,
            )}
            aria-label="Product images"
          >
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
                    aria-label={`View image ${idx + 1} of ${images.length}`}
                    aria-current={idx === activeIdx ? "true" : undefined}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      unoptimized
                      sizes="62px"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <span aria-hidden />
            )}

            <StorefrontProductImageShell
              className={styles.pdpHero}
              itemId={item.id}
              itemName={item.name}
              ariaLabel={item.name}
            >
              {discount ? (
                <span className={styles.pdpBadge}>-{discount.percent}%</span>
              ) : null}
              {displayUrl ? (
                <Image
                  src={displayUrl}
                  alt={active?.altText?.trim() || item.name}
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 900px) 48vw, 100vw"
                />
              ) : (
                <span className={styles.visualPlaceholder} aria-hidden />
              )}
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    className={cn(styles.pdpArrow, styles.pdpArrowPrev)}
                    onClick={() =>
                      setActiveIdx((idx) =>
                        idx === 0 ? images.length - 1 : idx - 1,
                      )
                    }
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={17} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={cn(styles.pdpArrow, styles.pdpArrowNext)}
                    onClick={() =>
                      setActiveIdx((idx) =>
                        idx === images.length - 1 ? 0 : idx + 1,
                      )
                    }
                    aria-label="Next image"
                  >
                    <ChevronRight size={17} aria-hidden />
                  </button>
                  <span className={styles.pdpCounter}>
                    {activeIdx + 1}/{images.length}
                  </span>
                </>
              ) : null}
            </StorefrontProductImageShell>
          </section>

          <section className={styles.pdpInfo}>
            <span className={styles.pdpBrand}>
              {item.discountName?.trim() || "Featured"}
            </span>
            <h1 className={styles.pdpTitle}>{item.name}</h1>
            <div className={styles.pdpMeta}>
              {item.sku ? <span>SKU {item.sku}</span> : null}
              {stockLabel ? (
                <>
                  <span className={styles.pdpMetaDot} aria-hidden />
                  <span>{soldOut ? "Sold out" : stockLabel}</span>
                </>
              ) : null}
              {weighed && item.unitType ? (
                <>
                  <span className={styles.pdpMetaDot} aria-hidden />
                  <span>Sold by {item.unitType}</span>
                </>
              ) : null}
            </div>

            {showPrice ? (
              <>
                <div className={styles.pdpPriceRow}>
                  <ShopItemLivePrice
                    slug={slug}
                    itemId={item.id}
                    currency={item.currency}
                    initialPrice={item.price}
                    className={styles.pdpPrice}
                  />
                  {discount ? (
                    <>
                      <span className={styles.pdpCompare}>
                        {formatDisplayPrice(item.currency, item.regularPrice ?? null)}
                      </span>
                      <span className={styles.pdpSaveChip}>
                        {discount.percent}% OFF
                      </span>
                    </>
                  ) : null}
                </div>
                {discount ? (
                  <p className={styles.pdpSave}>
                    You save {formatDisplayPrice(item.currency, discount.saved)}
                  </p>
                ) : null}
              </>
            ) : null}

            {hasOptions ? (
              <div className={styles.pdpOptionGroup}>
                <p className={styles.pdpOptionLabel}>
                  Option <span>{item.variantName?.trim() || "Selected"}</span>
                </p>
                <div className={styles.pdpVariants}>
                  {variants.map((variant) => {
                    const selected = variant.id === item.id;
                    const out =
                      variant.qtyOnHand != null &&
                      Number.isFinite(variant.qtyOnHand) &&
                      variant.qtyOnHand <= 0;
                    return (
                      <Link
                        key={variant.id}
                        href={shopItemPathFromCard(variant)}
                        className={cn(
                          styles.pdpVariant,
                          selected && styles.pdpVariantActive,
                          out && !selected && styles.pdpVariantOut,
                        )}
                        aria-current={selected ? "page" : undefined}
                      >
                        {variantLabel(variant)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : item.variantName ? (
              <div className={styles.pdpOptionGroup}>
                <p className={styles.pdpOptionLabel}>
                  Option <span>{item.variantName}</span>
                </p>
              </div>
            ) : null}

            {showPrice ? (
              <>
                <div className={styles.pdpBuyRow}>
                  <div className={styles.pdpQty}>
                    <button
                      type="button"
                      className={styles.pdpQtyBtn}
                      onClick={() => setQuantity(qty - 1)}
                      disabled={busy || qty <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className={styles.pdpQtyValue} aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className={styles.pdpQtyBtn}
                      onClick={() => setQuantity(qty + 1)}
                      disabled={busy || (maxQty != null && qty >= maxQty)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.pdpAdd}
                    onClick={() => void add(false)}
                    disabled={busy || soldOut}
                  >
                    {soldOut ? "Sold out" : busy ? "Adding…" : "Add to cart"}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.pdpBuyNow}
                  onClick={() => void add(true)}
                  disabled={busy || soldOut}
                >
                  Buy it now
                </button>
                {error ? <p className={styles.pdpError}>{error}</p> : null}
              </>
            ) : (
              <div className={styles.pdpUnavailable}>
                {hasOptions
                  ? "Pick an option above to add this piece to your bag."
                  : "Message the shop to confirm availability and price."}
              </div>
            )}

            <div className={styles.pdpTrust}>
              <div className={styles.pdpTrustCard}>
                <Truck size={16} strokeWidth={1.8} aria-hidden />
                <span>Delivery arranged at checkout</span>
              </div>
              <div className={styles.pdpTrustCard}>
                <RefreshCcw size={16} strokeWidth={1.8} aria-hidden />
                <span>Refund &amp; exchange policy</span>
              </div>
              <div className={styles.pdpTrustCard}>
                <ShieldCheck size={16} strokeWidth={1.8} aria-hidden />
                <span>Secure checkout</span>
              </div>
            </div>

            <div className={styles.pdpAccordion}>
              <details className={styles.pdpAccordionItem} open>
                <summary className={styles.pdpAccordionSummary}>
                  Description
                </summary>
                <div className={styles.pdpAccordionBody}>
                  {featureLines.length > 0 ? (
                    featureLines.map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))
                  ) : (
                    <p>Ask the shop for fabric, fit and sizing details.</p>
                  )}
                </div>
              </details>

              <details className={styles.pdpAccordionItem}>
                <summary className={styles.pdpAccordionSummary}>
                  Delivery &amp; returns
                </summary>
                <div className={styles.pdpAccordionBody}>
                  <p>
                    Delivery is arranged at checkout. Pay with M-Pesa, card or
                    cash on delivery where the shop delivers.
                  </p>
                  <p>
                    Need a different size or a quick swap? Message the shop on
                    WhatsApp from the cart and they will confirm the exchange.
                  </p>
                </div>
              </details>

              <details className={styles.pdpAccordionItem}>
                <summary className={styles.pdpAccordionSummary}>Care</summary>
                <div className={styles.pdpAccordionBody}>
                  <p>
                    Follow the care label on the piece. Wash cold, dry in the
                    shade and iron on the reverse to keep the colour.
                  </p>
                </div>
              </details>
            </div>
          </section>
        </div>
      </div>

      {relatedItems.filter((entry) => entry.id !== item.id).length > 0 ? (
        <section className={styles.pdpMore} aria-label="More from the shop">
          <div className={styles.pdpMoreHead}>
            <div>
              <span className={styles.kicker}>Keep looking</span>
              <h2 className={styles.pdpMoreTitle}>More from the shop</h2>
            </div>
            <Link href={APP_ROUTES.shop} className={styles.viewAll}>
              Shop all
            </Link>
          </div>
          <div className={styles.pdpMoreGrid}>
            {relatedItems
              .filter((entry) => entry.id !== item.id)
              .slice(0, 8)
              .map((entry) => (
                <ZetuCard
                  key={entry.id}
                  item={entry}
                  currency={item.currency}
                />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";

import ShopAddToCart from "@/components/storefront/shop-add-to-cart";
import { ShopItemHeroMedia } from "@/components/storefront/shop-item-hero-media";
import { ShopItemLivePrice } from "@/components/storefront/shop-item-live-price";
import { ShopItemNotifyButton } from "@/components/storefront/shop-item-notify-button";
import {
  mergeVariantOptions,
  ShopItemVariantPicker,
} from "@/components/storefront/shop-item-variant-picker";
import { ClimaxFloorProduct } from "@/components/storefront/templates/store/climax-floor-product";
import { PrintAtelierProduct } from "@/components/storefront/templates/store/print-atelier-product";
import { BlankDropProduct } from "@/components/storefront/templates/store/blank-drop-product";
import { PastryCaseProduct } from "@/components/storefront/templates/store/pastry-case-product";
import { APP_ROUTES } from "@/lib/config";
import {
  formatStoreQty,
  hasCatalogPrice,
  isStorefrontWeighedItem,
  type PublicCatalogItemDetail,
} from "@/lib/public-storefront";
import { normalizeStoreThemeId } from "@/lib/storefront-templates";

export function ShopProductDetailView({
  slug,
  item,
  storeThemeId,
}: {
  slug: string;
  item: PublicCatalogItemDetail;
  storeThemeId?: string | null;
}) {
  const theme = normalizeStoreThemeId(storeThemeId);
  if (theme === "print-atelier") {
    return <PrintAtelierProduct slug={slug} item={item} />;
  }
  if (theme === "blank-drop") {
    return <BlankDropProduct slug={slug} item={item} />;
  }
  if (theme === "pastry-case") {
    return <PastryCaseProduct slug={slug} item={item} />;
  }
  if (theme === "climax-floor") {
    return <ClimaxFloorProduct slug={slug} item={item} />;
  }

  const variantOptions = mergeVariantOptions(item);
  const hasMultipleOptions = variantOptions.length > 1;
  const weighed = isStorefrontWeighedItem(item);
  const showPrice = hasCatalogPrice(item.price);
  const stockLabel = formatStoreQty(item.qtyOnHand);
  const hero = item.images[0];
  const featureLines = item.description
    ? item.description
        .split(/\r?\n|[•·]/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <Link
          href={APP_ROUTES.shop}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to shop"
        >
          <span aria-hidden>←</span>
          <span>Back to shop</span>
        </Link>
        <div className="rounded-xl border border-border/60 bg-background p-3 shadow-sm sm:p-5">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
            <section>
              <ShopItemHeroMedia
                itemId={item.id}
                itemName={item.name}
                imageUrl={hero?.url ?? null}
                imageAlt={hero?.altText}
              />

              {item.images.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {item.images.slice(0, 5).map((img, idx) => (
                    <div
                      key={`${img.url}-${idx}`}
                      className="relative aspect-square overflow-hidden rounded-md border border-border/60 bg-muted"
                    >
                      <Image
                        src={img.url}
                        alt={img.altText?.trim() || `${item.name} ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                {item.name}
              </h1>
              {item.variantName && !hasMultipleOptions ? (
                <p className="mt-1 text-lg font-medium text-muted-foreground">
                  {item.variantName}
                </p>
              ) : null}

              {hasMultipleOptions ? (
                <ShopItemVariantPicker item={item} className="mt-5" />
              ) : null}

              {(showPrice || stockLabel) && (
                <div
                  className={
                    hasMultipleOptions
                      ? "mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border/60 bg-muted/25 px-4 py-3"
                      : "mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1"
                  }
                >
                  {showPrice ? (
                    <ShopItemLivePrice
                      slug={slug}
                      itemId={item.id}
                      currency={item.currency}
                      initialPrice={item.price}
                      className="text-3xl font-black tabular-nums text-foreground sm:text-4xl"
                    />
                  ) : null}
                  {stockLabel ? (
                    <span className="text-sm font-semibold text-emerald-600">
                      {stockLabel}
                    </span>
                  ) : null}
                </div>
              )}

              {!showPrice && hasMultipleOptions ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Select an option above to view the price and add it to your cart.
                </p>
              ) : null}

              {showPrice ? (
                <ShopAddToCart
                  slug={slug}
                  itemId={item.id}
                  weighed={weighed}
                  unitType={item.unitType}
                  maxQty={item.qtyOnHand}
                  className="mt-6"
                />
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                  {hasMultipleOptions
                    ? "Pick a priced option above to add this product to your cart."
                    : "This item is not available for online checkout yet. Visit the store or contact us for availability."}
                </div>
              )}

              <ShopItemNotifyButton
                itemId={item.id}
                outOfStock={item.qtyOnHand != null && item.qtyOnHand <= 0}
              />

              {featureLines.length > 0 && (
                <div className="mt-5 divide-y divide-border/70 rounded-xl border border-border/60">
                  {featureLines.slice(0, 6).map((line, idx) => (
                    <div
                      key={`${line}-${idx}`}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[11px] font-bold text-[var(--primary)]">
                        {idx + 1}
                      </span>
                      <span className="text-[15px] leading-relaxed">{line}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-border/60 text-center">
                <div className="px-3 py-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Safe Payments
                  </p>
                </div>
                <div className="border-x border-border/60 px-3 py-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Secure Logistics
                  </p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Privacy Protection
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {showPrice ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 p-3 shadow-[0_-12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md sm:hidden">
          <div className="mx-auto max-w-7xl">
            <ShopAddToCart
              slug={slug}
              itemId={item.id}
              weighed={weighed}
              unitType={item.unitType}
              maxQty={item.qtyOnHand}
              compact
              className="!mt-0 !border-0 !bg-transparent !p-0"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

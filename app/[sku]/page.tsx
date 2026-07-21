import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { CustomerTabPortal } from "@/components/credits/customer-tab-portal";
import ShopAddToCart from "@/components/storefront/shop-add-to-cart";
import { ShopItemLivePrice } from "@/components/storefront/shop-item-live-price";
import { ShopItemNotifyButton } from "@/components/storefront/shop-item-notify-button";
import {
  mergeVariantOptions,
  ShopItemVariantPicker,
} from "@/components/storefront/shop-item-variant-picker";
import { APP_BASE_URL, APP_ROUTES } from "@/lib/config";
import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";
import {
  fetchPublicItemDetail,
  fetchPublicStorefront,
  formatDisplayPrice,
  formatStoreQty,
  hasCatalogPrice,
  isStorefrontInStoreOnly,
} from "@/lib/public-storefront";
import {
  shopItemPathFromCard,
  shopItemUrlSegmentIsCanonical,
} from "@/lib/shop-item-url";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";

type PageProps = { params: Promise<{ sku: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { sku } = await params;
  if (looksLikeKenyanMobilePath(sku)) {
    const tenant = await resolveTenantContext();
    const slug = await resolveStorefrontSlug();
    const storefront = slug ? await fetchPublicStorefront(slug) : null;
    const shopLabel =
      tenant?.branding?.displayName?.trim() ||
      storefront?.label?.trim() ||
      storefront?.businessName ||
      tenant?.tenantName ||
      "Shop";
    const phone = toKenyanLocal07(sku) ?? sku;
    return {
      title: `Your tab · ${shopLabel}`,
      description: `View your balance and pay with M-Pesa at ${shopLabel} (${phone}).`,
      robots: { index: false, follow: false },
    };
  }
  const slug = await resolveStorefrontSlug();
  if (!slug) return { title: "Product" };
  const [item, storefront] = await Promise.all([
    fetchPublicItemDetail(slug, sku),
    fetchPublicStorefront(slug),
  ]);
  const shopLabel =
    storefront?.label?.trim() || storefront?.businessName || "Shop";
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const canonicalPath = item
    ? shopItemPathFromCard(item)
    : `/${encodeURIComponent(sku)}`;
  const canonical = `${base}${canonicalPath}`;
  if (!item)
    return { title: `Product · ${shopLabel}`, alternates: { canonical } };
  const heading = item.variantName
    ? `${item.name} · ${item.variantName}`
    : item.name;
  const pricePart = hasCatalogPrice(item.price)
    ? formatDisplayPrice(item.currency, item.price)
    : null;
  return {
    title: `${heading} · ${shopLabel}`,
    description:
      item.description?.trim().slice(0, 160) ||
      (pricePart ? `${heading} — ${pricePart}` : heading),
    alternates: { canonical },
    openGraph: {
      title: heading,
      description: item.description?.trim().slice(0, 160),
      url: canonical,
      images: item.images[0]?.url ? [{ url: item.images[0].url }] : undefined,
    },
  };
}

export default async function ShopItemPage({ params }: PageProps) {
  const { sku } = await params;

  if (looksLikeKenyanMobilePath(sku)) {
    const tenant = await resolveTenantContext();
    const slug = await resolveStorefrontSlug();
    const storefront = slug ? await fetchPublicStorefront(slug) : null;
    const shopName =
      tenant?.branding?.displayName?.trim() ||
      storefront?.label?.trim() ||
      storefront?.businessName ||
      tenant?.tenantName ||
      "Shop";
    return (
      <CustomerTabPortal
        phoneSegment={sku}
        branding={{
          shopName,
          primaryHex: parseStorefrontHex(tenant?.branding?.primaryColor),
          accentHex: parseStorefrontHex(tenant?.branding?.accentColor),
          logoUrl: tenant?.branding?.logoUrl?.trim() || null,
        }}
      />
    );
  }

  const slug = await resolveStorefrontSlug();
  if (!slug) redirect("/");
  const item = await fetchPublicItemDetail(slug, sku);
  if (!item) notFound();
  if (!shopItemUrlSegmentIsCanonical(sku, item)) {
    permanentRedirect(shopItemPathFromCard(item));
  }

  const variantOptions = mergeVariantOptions(item);
  const hasMultipleOptions = variantOptions.length > 1;
  const inStoreOnly = isStorefrontInStoreOnly(item.onlinePurchaseMode);
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
        <div className="rounded-2xl border border-border/60 bg-background p-3 shadow-sm sm:p-5">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
            <section>
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {hero ? (
                  <Image
                    src={hero.url}
                    alt={hero.altText?.trim() || item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 640px"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl font-medium text-muted-foreground/40">
                    {item.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

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

              {showPrice && !inStoreOnly ? (
                <ShopAddToCart slug={slug} itemId={item.id} className="mt-5" />
              ) : inStoreOnly ? (
                <ShopAddToCart
                  slug={slug}
                  itemId={item.id}
                  inStoreOnly
                  className="mt-5"
                />
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
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
                <ul className="mt-5 divide-y divide-border/70 rounded-lg border border-border/60">
                  {featureLines.slice(0, 6).map((line, idx) => (
                    <li
                      key={`${line}-${idx}`}
                      className="flex items-center gap-3 px-3 py-3 text-[15px]"
                    >
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">
                        •
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-border/70 text-center">
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  Safe Payments
                </div>
                <div className="border-x border-border/70 px-2 py-3 text-xs text-muted-foreground">
                  Secure Logistics
                </div>
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  Privacy Protection
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
              inStoreOnly={inStoreOnly}
              compact
              className="!mt-0 !border-0 !bg-transparent !p-0"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

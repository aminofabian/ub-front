import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { ShopProductDetailView } from "@/components/storefront/shop-product-detail-view";
import { joinProductNameParts } from "@/lib/catalog-display";
import { APP_BASE_URL } from "@/lib/config";
import {
  fetchPublicItemDetail,
  fetchPublicStorefront,
  formatDisplayPrice,
  hasCatalogPrice,
} from "@/lib/public-storefront";
import {
  resolveShopProductLookupKey,
  shopItemPathFromCard,
  shopItemUrlSegmentIsCanonical,
} from "@/lib/shop-item-url";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";
import { readStorefrontPreviewFromHeaders } from "@/lib/storefront-preview-headers";
import { normalizeStoreThemeId } from "@/lib/storefront-templates";

type PageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
};

function firstParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0]?.trim() || null;
  return v?.trim() || null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const sp = await searchParams;
  const variant = firstParam(sp.variant);
  const slug = await resolveStorefrontSlug();
  if (!slug) return { title: "Product" };
  const lookup = resolveShopProductLookupKey(handle, variant);
  const [item, storefront] = await Promise.all([
    fetchPublicItemDetail(slug, lookup),
    fetchPublicStorefront(slug),
  ]);
  const shopLabel =
    storefront?.label?.trim() || storefront?.businessName || "Shop";
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const canonicalPath = item
    ? shopItemPathFromCard(item)
    : `/products/${encodeURIComponent(handle)}`;
  const canonical = `${base}${canonicalPath}`;
  if (!item) {
    return { title: `Product · ${shopLabel}`, alternates: { canonical } };
  }
  const heading = item.variantName
    ? joinProductNameParts(item.name, item.variantName)
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

/**
 * Shopify-style product URL: `/products/{name-slug}?variant={id}`
 * Craft bar: https://shop.3deastafrica.com/products/...
 */
export default async function StorefrontProductPage({
  params,
  searchParams,
}: PageProps) {
  const { handle } = await params;
  const sp = await searchParams;
  const variant = firstParam(sp.variant);

  const slug = await resolveStorefrontSlug();
  if (!slug) redirect("/");

  const lookup = resolveShopProductLookupKey(handle, variant);
  const item = await fetchPublicItemDetail(slug, lookup);
  if (!item) notFound();

  if (!shopItemUrlSegmentIsCanonical(handle, item, variant)) {
    permanentRedirect(shopItemPathFromCard(item));
  }

  const tenant = await resolveTenantContext();
  const preview = await readStorefrontPreviewFromHeaders();
  const storeThemeId = normalizeStoreThemeId(
    preview.themeId ?? tenant?.storeThemeId,
  );

  return (
    <ShopProductDetailView
      slug={slug}
      item={item}
      storeThemeId={storeThemeId}
    />
  );
}

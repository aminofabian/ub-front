import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { CustomerTabPortalLoader } from "@/components/credits/customer-tab-portal-loader";
import { joinProductNameParts } from "@/lib/catalog-display";
import { APP_BASE_URL } from "@/lib/config";
import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";
import {
  fetchPublicItemDetail,
  fetchPublicStorefront,
  formatDisplayPrice,
  hasCatalogPrice,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
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
 * Legacy `/{sku}` product URLs permanently redirect to
 * `/products/{handle}?variant=…`. Phone segments still open the tab portal.
 */
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
      <CustomerTabPortalLoader
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
  permanentRedirect(shopItemPathFromCard(item));
}

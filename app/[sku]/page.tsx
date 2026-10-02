import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { CustomerTabPortalLoader } from "@/components/credits/customer-tab-portal-loader";
import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";
import {
  absoluteOriginFromHost,
  buildProductShareMetadata,
} from "@/lib/product-share-seo";
import {
  fetchPublicItemDetail,
  fetchPublicStorefront,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import {
  getRequestHostname,
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
  const [slug, host, tenant] = await Promise.all([
    resolveStorefrontSlug(),
    getRequestHostname(),
    resolveTenantContext(),
  ]);
  if (!slug) return { title: "Product" };
  const [item, storefront] = await Promise.all([
    fetchPublicItemDetail(slug, sku),
    fetchPublicStorefront(slug),
  ]);
  const shopLabel =
    storefront?.label?.trim() || storefront?.businessName || "Shop";
  const origin = absoluteOriginFromHost(host);
  const canonicalPath = item
    ? shopItemPathFromCard(item)
    : `/${encodeURIComponent(sku)}`;
  const canonical = `${origin}${canonicalPath}`;
  if (!item) {
    return { title: `Product · ${shopLabel}`, alternates: { canonical } };
  }
  return buildProductShareMetadata({
    item,
    shopLabel,
    origin,
    slug,
    contact: {
      phone: tenant?.landingContent?.phone,
      whatsapp: tenant?.landingContent?.whatsapp,
    },
  });
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

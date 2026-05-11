import type { Metadata } from "next";

import { StorefrontCatalogHome } from "@/components/storefront/storefront-catalog-home";
import { APP_BASE_URL } from "@/lib/config";
import { fetchPublicStorefront } from "@/lib/public-storefront";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";

type PageProps = {
  searchParams: Promise<{ q?: string; categoryId?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const [slug, tenant] = await Promise.all([
    resolveStorefrontSlug(),
    resolveTenantContext(),
  ]);

  // Use branding SEO overrides from tenant context when available
  const metaTitle = tenant?.branding?.metaTitle?.trim();
  const metaDescription = tenant?.branding?.metaDescription?.trim();
  const ogImage = tenant?.branding?.ogImage?.trim();
  const logo = tenant?.branding?.logoUrl?.trim();
  const ogImageUrl = ogImage || logo || undefined;

  if (!slug) {
    return { title: metaTitle ? `${metaTitle} · Shop` : "Shop" };
  }

  const storefront = await fetchPublicStorefront(slug);
  if (!storefront) {
    return { title: metaTitle ? `${metaTitle} · Shop` : "Shop" };
  }

  const name = storefront.label?.trim() || storefront.businessName;
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const description =
    metaDescription ||
    storefront.announcement?.trim() ||
    `Browse published products and prices from ${storefront.businessName}.`;

  return {
    title: metaTitle ? `${metaTitle} · Shop` : `${name} · Shop`,
    description,
    alternates: { canonical: `${base}/shop` },
    ...(ogImageUrl
      ? {
          openGraph: {
            title: metaTitle || name,
            description,
            url: `${base}/shop`,
            images: [{ url: ogImageUrl, alt: name }],
          },
          twitter: {
            card: "summary_large_image",
            title: metaTitle || name,
            description,
            images: [ogImageUrl],
          },
        }
      : {}),
  };
}

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return (
    <StorefrontCatalogHome
      q={sp.q?.trim() || undefined}
      categoryId={sp.categoryId?.trim() || undefined}
    />
  );
}

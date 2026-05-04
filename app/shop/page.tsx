import type { Metadata } from "next";

import { StorefrontCatalogHome } from "@/components/storefront/storefront-catalog-home";
import { APP_BASE_URL } from "@/lib/config";
import { fetchPublicStorefront } from "@/lib/public-storefront";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

type PageProps = {
  searchParams: Promise<{ q?: string; categoryId?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    return { title: "Shop" };
  }
  const storefront = await fetchPublicStorefront(slug);
  if (!storefront) {
    return { title: "Shop" };
  }
  const name = storefront.label?.trim() || storefront.businessName;
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const description =
    storefront.announcement?.trim() ||
    `Browse published products and prices from ${storefront.businessName}.`;
  return {
    title: `${name} · Shop`,
    description,
    alternates: { canonical: `${base}/shop` },
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

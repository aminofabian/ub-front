import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StorefrontCatalogHome } from "@/components/storefront/storefront-catalog-home";
import { APP_BASE_URL, APP_ROUTES } from "@/lib/config";
import { fetchPublicCategories, fetchPublicStorefront } from "@/lib/public-storefront";
import {
  findCategoryForStorefrontPath,
  shopCategoryListPath,
  storefrontCategoryPathSlug,
} from "@/lib/shop-url";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";

type PageProps = {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ categorySlug: rawSlug }, sp, slug, tenant] = await Promise.all([
    params,
    searchParams,
    resolveStorefrontSlug(),
    resolveTenantContext(),
  ]);
  const metaTitle = tenant?.branding?.metaTitle?.trim();
  const metaDescription = tenant?.branding?.metaDescription?.trim();
  const ogImage = tenant?.branding?.ogImage?.trim();
  const logo = tenant?.branding?.logoUrl?.trim();
  const ogImageUrl = ogImage || logo || undefined;

  if (!slug) {
    return { title: metaTitle ? `${metaTitle} · Shop` : "Shop" };
  }

  const [storefront, cats] = await Promise.all([
    fetchPublicStorefront(slug),
    fetchPublicCategories(slug),
  ]);
  if (!storefront) {
    return { title: metaTitle ? `${metaTitle} · Shop` : "Shop" };
  }

  const list = cats?.categories ?? [];
  const cat = findCategoryForStorefrontPath(list, rawSlug);
  const canonicalSeg = cat ? storefrontCategoryPathSlug(cat) : decodeURIComponent(rawSlug.trim());
  const pathOnly = shopCategoryListPath(canonicalSeg).split("?")[0];
  const pathWithQ = shopCategoryListPath(canonicalSeg, {
    q: sp.q?.trim() || undefined,
  });
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const storeLabel = storefront.label?.trim() || storefront.businessName;
  const titleCat = cat?.name?.trim() || canonicalSeg;
  const name = metaTitle || storeLabel;

  return {
    title: `${titleCat} · ${name}`,
    description:
      metaDescription ||
      storefront.announcement?.trim() ||
      `Browse ${titleCat} at ${storefront.businessName}.`,
    alternates: { canonical: `${base}${pathOnly}` },
    ...(ogImageUrl
      ? {
          openGraph: {
            title: `${titleCat} · ${name}`,
            description:
              metaDescription ||
              storefront.announcement?.trim() ||
              `Browse ${titleCat}.`,
            url: `${base}${pathWithQ}`,
            images: [{ url: ogImageUrl, alt: storeLabel }],
          },
          twitter: {
            card: "summary_large_image",
            title: `${titleCat} · ${name}`,
            description:
              metaDescription ||
              storefront.announcement?.trim() ||
              `Browse ${titleCat}.`,
            images: [ogImageUrl],
          },
        }
      : {}),
  };
}

export default async function ShopCategoryBrowsePage({ params, searchParams }: PageProps) {
  const [{ categorySlug }, sp] = await Promise.all([params, searchParams]);
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }

  const cats = await fetchPublicCategories(slug);
  const list = cats?.categories ?? [];
  const cat = findCategoryForStorefrontPath(list, categorySlug);
  if (!cat) {
    redirect(APP_ROUTES.shop);
  }

  const canonical = storefrontCategoryPathSlug(cat);
  const segmentDecoded = decodeURIComponent(categorySlug.trim());
  if (segmentDecoded !== canonical) {
    const q = sp.q?.trim();
    redirect(shopCategoryListPath(canonical, q ? { q } : undefined));
  }

  const q = sp.q?.trim() || undefined;

  return (
    <StorefrontCatalogHome
      q={q}
      categoryId={cat.id}
      categoryHeading={cat.name}
      categoryPathSlug={canonical}
    />
  );
}

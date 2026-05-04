import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ShopCatalogWithMore from "@/components/storefront/shop-catalog-with-more";
import ShopCategoryNav from "@/components/storefront/shop-category-nav";
import ShopSearchBar from "@/components/storefront/shop-search-bar";
import { APP_BASE_URL } from "@/lib/config";
import { resolveStorefrontSlug, resolveTenantContext } from "@/lib/storefront-slug";
import {
  fetchPublicCatalogItems,
  fetchPublicCategories,
  fetchPublicStorefront,
} from "@/lib/public-storefront";

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
    alternates: {
      canonical: `${base}/shop`,
    },
  };
}

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }

  const q = sp.q?.trim() || undefined;
  const categoryId = sp.categoryId?.trim() || undefined;

  const [list, categoriesPayload, storefront, tenant] = await Promise.all([
    fetchPublicCatalogItems(slug, {
      limit: 24,
      q,
      categoryId,
    }),
    fetchPublicCategories(slug),
    fetchPublicStorefront(slug),
    resolveTenantContext(),
  ]);

  if (!list) {
    notFound();
  }

  const categories = categoriesPayload?.categories ?? [];
  const branchHint = storefront?.catalogBranchName;
  const heroTitle = tenant?.branding.displayName ?? tenant?.tenantName ?? "Browse products";
  const eyebrow = tenant ? "Online catalog" : "Online catalog";
  const eyebrowStyle = tenant?.branding.primaryColor
    ? { color: tenant.branding.primaryColor }
    : undefined;

  return (
    <div className="bg-gradient-to-b from-muted/25 to-background px-4 py-8 dark:from-muted/10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-1">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] text-primary"
            style={eyebrowStyle}
          >
            {eyebrow}
          </p>
          {tenant?.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.branding.logoUrl}
              alt={`${heroTitle} logo`}
              className="mt-2 h-10 w-auto"
            />
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight">{heroTitle}</h1>
          {branchHint ? (
            <p className="text-sm text-muted-foreground">Prices from {branchHint}</p>
          ) : null}
        </div>

        <div className="mt-6">
          <ShopSearchBar defaultQuery={q} categoryId={categoryId} />
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-[14rem] lg:shrink-0">
            <ShopCategoryNav categories={categories} activeCategoryId={categoryId} q={q} />
          </aside>

          <div className="min-w-0 flex-1">
            <ShopCatalogWithMore
              key={`${q ?? ""}\0${categoryId ?? ""}`}
              slug={slug}
              currency={list.currency}
              initialItems={list.items}
              initialNextCursor={list.nextCursor}
              q={q}
              categoryId={categoryId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

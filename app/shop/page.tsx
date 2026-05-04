import type { Metadata } from "next";
import { headers } from "next/headers";

import { ShopAisleGrid } from "@/components/storefront/shop-aisle-grid";
import ShopCatalogWithMore from "@/components/storefront/shop-catalog-with-more";
import { ShopHeroMart } from "@/components/storefront/shop-hero-mart";
import { ShopSidebarWidgets } from "@/components/storefront/shop-sidebar-widgets";
import { ShopTrustStrip } from "@/components/storefront/shop-trust-strip";
import { ShopUnavailable } from "@/components/storefront/shop-unavailable";
import { APP_BASE_URL } from "@/lib/config";
import { resolveStorefrontSlug, resolveTenantContext } from "@/lib/storefront-slug";
import {
  fetchPublicCatalogItems,
  fetchPublicCategories,
  fetchPublicStorefront,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";

type PageProps = {
  searchParams: Promise<{ q?: string; categoryId?: string }>;
};

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

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
  const tenant = await resolveTenantContext();
  const slug = await resolveStorefrontSlug();

  if (!slug) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "this domain";
    return (
      <ShopUnavailable
        title="Storefront not configured"
        host={host}
        reason={
          tenant
            ? `Domain "${host}" is mapped to tenant "${tenant.tenantName}", but no storefront slug is set. Open Business → Branding (or contact platform support) to assign a slug.`
            : `Domain "${host}" is not mapped to any tenant yet. Add an active row in domains pointing to your business, or set NEXT_PUBLIC_STOREFRONT_SLUG on this Next.js deployment.`
        }
      />
    );
  }

  const q = sp.q?.trim() || undefined;
  const categoryId = sp.categoryId?.trim() || undefined;

  const [list, categoriesPayload, storefront] = await Promise.all([
    fetchPublicCatalogItems(slug, {
      limit: 24,
      q,
      categoryId,
    }),
    fetchPublicCategories(slug),
    fetchPublicStorefront(slug),
  ]);

  if (!list) {
    return (
      <ShopUnavailable
        title="Storefront is not enabled"
        host={tenant?.tenantName ?? slug}
        reason={`The catalog API rejected slug "${slug}". Likely the business has no slug, the storefront is disabled, the catalog branch is missing or inactive, or the backend is unreachable from this deployment (check BACKEND_ORIGIN).`}
      />
    );
  }

  const categories = categoriesPayload?.categories ?? [];
  const branchHint = storefront?.catalogBranchName;
  const heroTitle = tenant?.branding?.displayName ?? tenant?.tenantName ?? "Browse products";
  const announcement = storefront?.announcement?.trim() || null;
  const primaryRaw = tenant?.branding?.primaryColor?.trim() ?? "";
  const primary = isHexColor(primaryRaw) ? primaryRaw : null;
  const accentRaw = tenant?.branding?.accentColor?.trim() ?? "";
  const accentHex = isHexColor(accentRaw) ? accentRaw : null;
  const logoUrl = tenant?.branding?.logoUrl ?? null;

  // Featured fallback: use the first storefront items if the tenant hasn't curated featured.
  const featured: PublicCatalogItemCard[] =
    storefront?.featured?.length && storefront.featured.length > 0
      ? storefront.featured
      : list.items.slice(0, 4);

  const showcaseImage =
    featured[0]?.imageUrl ||
    storefront?.featured?.[0]?.imageUrl ||
    null;

  return (
    <div className="bg-[oklch(0.985_0.002_90)] dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-6">
        <div className="grid gap-5 lg:grid-cols-12 lg:gap-6 lg:items-start">
          <main className="min-w-0 space-y-6 lg:col-span-9">
            <ShopHeroMart
              title={heroTitle}
              tagline={announcement}
              branchHint={branchHint}
              primaryHex={primary}
              accentHex={accentHex}
              showcaseImage={showcaseImage}
              logoUrl={logoUrl}
            />

            <ShopTrustStrip primaryHex={primary} />

            <ShopAisleGrid
              categories={categories}
              primaryHex={primary}
              accentHex={accentHex}
            />

            <section id="shop-catalog">
              <ShopCatalogWithMore
                key={`${q ?? ""}\0${categoryId ?? ""}`}
                slug={slug}
                currency={list.currency}
                initialItems={list.items}
                initialNextCursor={list.nextCursor}
                q={q}
                categoryId={categoryId}
                primaryHex={primary}
                accentHex={accentHex}
              />
            </section>
          </main>

          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <ShopSidebarWidgets
                slug={slug}
                currency={list.currency}
                featured={featured}
                primaryHex={primary}
                accentHex={accentHex}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

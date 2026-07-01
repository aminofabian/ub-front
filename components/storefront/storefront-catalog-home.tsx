import { headers } from "next/headers";
import { Suspense } from "react";

import { ShopAisleGrid } from "@/components/storefront/shop-aisle-grid";
import ShopCatalogWithMore from "@/components/storefront/shop-catalog-with-more";
import { ShopTypeFilters } from "@/components/storefront/shop-type-filters";
import { ShopHeroMart } from "@/components/storefront/shop-hero-mart";
import { ShopSidebarWidgets } from "@/components/storefront/shop-sidebar-widgets";
import { ShopStorefrontComingSoon } from "@/components/storefront/shop-storefront-coming-soon";
import { ShopUnavailable } from "@/components/storefront/shop-unavailable";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";
import {
  fetchPublicCatalogItems,
  fetchPublicCategories,
  fetchPublicTypes,
  fetchPublicStorefront,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export async function StorefrontCatalogHome({
  q,
  categoryId,
  typeId,
  departmentId,
  categoryHeading,
  categoryPathSlug,
}: {
  q?: string;
  categoryId?: string;
  typeId?: string;
  /** @deprecated Use {@link typeId}. */
  departmentId?: string;
  /** Human-readable heading when filtering by category (not the raw id). */
  categoryHeading?: string;
  /** Canonical `/shop/c/:slug` segment for links and search form action. */
  categoryPathSlug?: string;
}) {
  const resolvedTypeId = typeId?.trim() || departmentId?.trim() || undefined;
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
            ? `Domain "${host}" is mapped to tenant "${tenant.tenantName}", but no storefront slug is set.`
            : `Domain "${host}" is not mapped to any tenant yet.`
        }
      />
    );
  }

  const [list, categoriesPayload, typesPayload, storefront] = await Promise.all([
    fetchPublicCatalogItems(slug, {
      limit: 24,
      q,
      categoryId,
      departmentId: resolvedTypeId,
    }),
    fetchPublicCategories(slug),
    fetchPublicTypes(slug),
    fetchPublicStorefront(slug),
  ]);

  if (!list) {
    const storeName =
      tenant?.branding?.displayName ?? tenant?.tenantName ?? slug;
    const primaryRaw = tenant?.branding?.primaryColor?.trim() ?? "";
    const accentRaw = tenant?.branding?.accentColor?.trim() ?? "";
    return (
      <ShopStorefrontComingSoon
        storeName={storeName}
        logoUrl={tenant?.branding?.logoUrl ?? null}
        primaryHex={isHexColor(primaryRaw) ? primaryRaw : null}
        accentHex={isHexColor(accentRaw) ? accentRaw : null}
      />
    );
  }

  const categories = categoriesPayload?.categories ?? [];
  const types =
    storefront?.types?.length
      ? storefront.types
      : (typesPayload?.types ?? []);
  const typeHeading =
    resolvedTypeId && !categoryHeading
      ? types.find((t) => t.id === resolvedTypeId)?.label?.trim()
      : undefined;
  const branchHint = storefront?.catalogBranchName;
  const heroTitle =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? "Browse products";
  const announcement = storefront?.announcement?.trim() || null;
  const primaryRaw = tenant?.branding?.primaryColor?.trim() ?? "";
  const primary = isHexColor(primaryRaw) ? primaryRaw : null;
  const accentRaw = tenant?.branding?.accentColor?.trim() ?? "";
  const accentHex = isHexColor(accentRaw) ? accentRaw : null;
  const logoUrl = tenant?.branding?.logoUrl ?? null;
  const heroBannerUrls = tenant?.branding?.heroBannerUrls ?? null;

  const featured: PublicCatalogItemCard[] =
    storefront?.featured?.length && storefront.featured.length > 0
      ? storefront.featured
      : list.items.slice(0, 4);

  const showcaseImage =
    featured[0]?.imageUrl || storefront?.featured?.[0]?.imageUrl || null;

  return (
    <div className="bg-[oklch(0.985_0.002_90)] dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 sm:pb-24 sm:pt-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-7 lg:items-start">
          {/* Main content */}
          <main className="min-w-0 space-y-3 sm:space-y-4 lg:col-span-9">
            <ShopHeroMart
              title={heroTitle}
              tagline={announcement}
              branchHint={branchHint}
              primaryHex={primary}
              accentHex={accentHex}
              showcaseImage={showcaseImage}
              logoUrl={logoUrl}
              heroBannerUrls={heroBannerUrls}
            />

            <Suspense fallback={null}>
              <ShopTypeFilters types={types} primaryHex={primary} />
            </Suspense>

            <ShopAisleGrid
              categories={categories}
              primaryHex={primary}
              accentHex={accentHex}
            />

            <section id="shop-catalog" className="scroll-mt-24">
              <ShopCatalogWithMore
                key={`${q ?? ""}\0${categoryId ?? ""}\0${resolvedTypeId ?? ""}\0${categoryPathSlug ?? ""}`}
                slug={slug}
                currency={list.currency}
                initialItems={list.items}
                initialNextCursor={list.nextCursor}
                initialTotalCount={list.totalCount}
                q={q}
                categoryId={categoryId}
                typeId={resolvedTypeId}
                categoryHeading={categoryHeading ?? typeHeading}
                categoryPathSlug={categoryPathSlug}
                accentHex={accentHex}
              />
            </section>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
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

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
import {
  primaryStorefrontArea,
  resolveStorefrontDeliveryHint,
} from "@/lib/storefront-seo-defaults";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function catalogLeadScore(item: PublicCatalogItemCard): number {
  let score = 0;
  if (item.name?.trim()) score += 4;
  if (item.imageUrl?.trim()) score += 2;
  if (item.price != null && item.price > 0) score += 2;
  return score;
}

/** Prefer featured + complete cards so "All Products" leads with a strong first item. */
function orderCatalogLead(
  items: PublicCatalogItemCard[],
  featured: PublicCatalogItemCard[],
): PublicCatalogItemCard[] {
  if (items.length <= 1) return items;
  const featuredIds = new Set(featured.map((f) => f.id));
  return [...items].sort((a, b) => {
    const aFeat = featuredIds.has(a.id) ? 1 : 0;
    const bFeat = featuredIds.has(b.id) ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    return catalogLeadScore(b) - catalogLeadScore(a);
  });
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
      limit: 48,
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
  const areaLabel = primaryStorefrontArea(tenant?.branchLocalities)
    ?? resolveStorefrontDeliveryHint({
      envHint: process.env.NEXT_PUBLIC_STOREFRONT_LOCATION_HINT,
      branchLocalities: tenant?.branchLocalities,
      deliveryAreaNames: (storefront?.deliveryAreas ?? [])
        .filter((area) => area.active && area.name.trim())
        .map((area) => area.name),
      catalogBranchName: storefront?.catalogBranchName,
    });
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

  const catalogItems = orderCatalogLead(list.items, featured);

  const showcaseImage =
    featured[0]?.imageUrl || storefront?.featured?.[0]?.imageUrl || null;

  return (
    <div className="min-w-0">
      <div className="mx-auto max-w-7xl px-3 pb-16 pt-3 sm:px-6 sm:pb-24 sm:pt-5 md:pt-6">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* Main content */}
          <main className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-9">
            <ShopHeroMart
              title={heroTitle}
              tagline={announcement}
              branchHint={branchHint}
              areaLabel={areaLabel}
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

            <section id="shop-catalog" className="scroll-mt-24 pt-1">
              <ShopCatalogWithMore
                key={`${q ?? ""}\0${categoryId ?? ""}\0${resolvedTypeId ?? ""}\0${categoryPathSlug ?? ""}`}
                slug={slug}
                currency={list.currency}
                initialItems={catalogItems}
                initialNextCursor={list.nextCursor}
                initialTotalCount={list.totalCount ?? undefined}
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
          <aside className="hidden lg:col-span-3 lg:block">
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

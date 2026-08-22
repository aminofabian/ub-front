import { Suspense } from "react";

import { ShopAisleGrid } from "@/components/storefront/shop-aisle-grid";
import ShopCatalogWithMore from "@/components/storefront/shop-catalog-with-more";
import { ShopTypeFilters } from "@/components/storefront/shop-type-filters";
import { ShopHeroMart } from "@/components/storefront/shop-hero-mart";
import { ShopSidebarWidgets } from "@/components/storefront/shop-sidebar-widgets";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";

/** Default grocery / aisle storefront home. */
export function MartStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    currency,
    catalogItems,
    nextCursor,
    totalCount,
    q,
    categoryId,
    typeId,
    categoryHeading,
    categoryPathSlug,
    categories,
    types,
    featured,
    heroTitle,
    announcement,
    branchHint,
    areaLabel,
    primaryHex,
    accentHex,
    logoUrl,
    heroBannerUrls,
    showcaseImage,
    design,
  } = props;

  return (
    <div className="min-w-0" data-store-theme-id="mart">
      <div className="mx-auto max-w-7xl px-3 pb-16 pt-2 sm:px-6 sm:pb-24 sm:pt-3">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-6">
          <main className="min-w-0 space-y-3.5 sm:space-y-4 lg:col-span-9">
            <ShopHeroMart
              title={heroTitle}
              tagline={announcement}
              branchHint={branchHint}
              areaLabel={areaLabel}
              primaryHex={primaryHex}
              accentHex={accentHex}
              showcaseImage={showcaseImage}
              logoUrl={logoUrl}
              heroBannerUrls={heroBannerUrls}
              design={design}
            />

            <Suspense fallback={null}>
              <ShopTypeFilters types={types} primaryHex={primaryHex} />
            </Suspense>

            <ShopAisleGrid
              categories={categories}
              primaryHex={primaryHex}
              accentHex={accentHex}
            />

            <section id="shop-catalog" className="scroll-mt-24 pt-1">
              <ShopCatalogWithMore
                key={`${q ?? ""}\0${categoryId ?? ""}\0${typeId ?? ""}\0${categoryPathSlug ?? ""}`}
                slug={slug}
                currency={currency}
                initialItems={catalogItems}
                initialNextCursor={nextCursor}
                initialTotalCount={totalCount}
                q={q}
                categoryId={categoryId}
                typeId={typeId}
                categoryHeading={categoryHeading}
                categoryPathSlug={categoryPathSlug}
                accentHex={accentHex}
              />
            </section>
          </main>

          <aside className="hidden lg:col-span-3 lg:block">
            <div className="lg:sticky lg:top-24">
              <ShopSidebarWidgets
                slug={slug}
                currency={currency}
                featured={featured}
                primaryHex={primaryHex}
                accentHex={accentHex}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

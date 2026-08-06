import { Suspense } from "react";

import ShopCatalogWithMore from "@/components/storefront/shop-catalog-with-more";
import { ShopTypeFilters } from "@/components/storefront/shop-type-filters";
import { ShopHeroMart } from "@/components/storefront/shop-hero-mart";
import { ShopSidebarWidgets } from "@/components/storefront/shop-sidebar-widgets";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";

/** Softer specialty / cosmetics layout with larger catalog breathing room. */
export function BoutiqueShelfStoreHome(props: StoreHomeTemplateProps) {
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
  } = props;

  return (
    <div
      className="min-w-0 bg-gradient-to-b from-rose-50/80 via-white to-stone-50"
      data-store-theme-id="boutique-shelf"
    >
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-8 sm:pb-28 sm:pt-8">
        <ShopHeroMart
          title={heroTitle}
          tagline={announcement ?? "Curated picks for everyday glow."}
          branchHint={branchHint}
          areaLabel={areaLabel}
          primaryHex={primaryHex}
          accentHex={accentHex}
          showcaseImage={showcaseImage}
          logoUrl={logoUrl}
          heroBannerUrls={heroBannerUrls}
        />

        <div className="mt-8 space-y-8">
          <Suspense fallback={null}>
            <ShopTypeFilters types={types} primaryHex={primaryHex} />
          </Suspense>

          <div className="grid gap-8 lg:grid-cols-12">
            <section id="shop-catalog" className="scroll-mt-24 lg:col-span-8">
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
            <aside className="lg:col-span-4">
              <div className="rounded-3xl border border-rose-100/80 bg-white/70 p-4 shadow-sm backdrop-blur lg:sticky lg:top-24">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-rose-500">
                  Staff picks
                </p>
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
    </div>
  );
}

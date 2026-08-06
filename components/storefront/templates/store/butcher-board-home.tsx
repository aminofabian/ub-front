import { Suspense } from "react";

import ShopCatalogWithMore from "@/components/storefront/shop-catalog-with-more";
import { ShopTypeFilters } from "@/components/storefront/shop-type-filters";
import { ShopAisleGrid } from "@/components/storefront/shop-aisle-grid";
import { ShopSidebarWidgets } from "@/components/storefront/shop-sidebar-widgets";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { cn } from "@/lib/utils";

/** Dense cuts-forward layout for butcheries / protein shops. */
export function ButcherBoardStoreHome(props: StoreHomeTemplateProps) {
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
    areaLabel,
    primaryHex,
    accentHex,
  } = props;

  const brand = accentHex || primaryHex || "#F97316";

  return (
    <div
      className="min-w-0 bg-stone-950 text-stone-50"
      data-store-theme-id="butcher-board"
    >
      <section
        className="border-b border-stone-800 px-3 py-8 sm:px-6 sm:py-12"
        style={{
          background: `linear-gradient(135deg, #1c1917 0%, color-mix(in srgb, ${brand} 35%, #1c1917) 100%)`,
        }}
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300/90">
            {areaLabel?.trim() || "Fresh counter"}
          </p>
          <h1 className="mt-2 max-w-2xl font-serif text-3xl font-medium tracking-tight sm:text-5xl">
            {heroTitle}
          </h1>
          {announcement ? (
            <p className="mt-3 max-w-xl text-sm text-stone-300 sm:text-base">
              {announcement}
            </p>
          ) : (
            <p className="mt-3 max-w-xl text-sm text-stone-300 sm:text-base">
              Cut to order. Same-day freshness. Browse the board below.
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-3 pb-16 pt-4 sm:px-6 sm:pb-24">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
          <main className="min-w-0 space-y-4 lg:col-span-8">
            <Suspense fallback={null}>
              <div className="rounded-none border border-stone-800 bg-stone-900/60 p-2">
                <ShopTypeFilters types={types} primaryHex={brand} />
              </div>
            </Suspense>

            <ShopAisleGrid
              categories={categories}
              primaryHex={brand}
              accentHex={accentHex}
            />

            <section
              id="shop-catalog"
              className={cn(
                "scroll-mt-24 rounded-none border border-stone-800 bg-stone-900/40 p-3 sm:p-4",
              )}
            >
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

          <aside className="lg:col-span-4">
            <div className="border border-stone-800 bg-stone-900/50 p-3 lg:sticky lg:top-24">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300/80">
                Top cuts
              </p>
              <ShopSidebarWidgets
                slug={slug}
                currency={currency}
                featured={featured}
                primaryHex={brand}
                accentHex={accentHex}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

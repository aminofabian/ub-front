import { Suspense } from "react";

import ShopCatalogWithMore from "@/components/storefront/shop-catalog-with-more";
import { ShopTypeFilters } from "@/components/storefront/shop-type-filters";
import { ShopAisleGrid } from "@/components/storefront/shop-aisle-grid";
import { ShopSidebarWidgets } from "@/components/storefront/shop-sidebar-widgets";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";

/** Dark editorial cellar layout for wines & spirits. */
export function SpiritsCellarStoreHome(props: StoreHomeTemplateProps) {
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
    showcaseImage,
  } = props;

  const glow = accentHex || primaryHex || "#C4B5FD";

  return (
    <div
      className="min-w-0 bg-slate-950 text-slate-100"
      data-store-theme-id="spirits-cellar"
    >
      <section className="relative overflow-hidden border-b border-indigo-950/80">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse at 20% 20%, ${glow}55, transparent 55%), radial-gradient(ellipse at 80% 0%, #312e81 0%, transparent 50%)`,
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-3 py-10 sm:grid-cols-2 sm:px-6 sm:py-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300/90">
              {areaLabel?.trim() || "Cellar selection"}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-light tracking-tight sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
              {announcement?.trim() ||
                "Bottles worth opening — browse the cellar and order for delivery."}
            </p>
          </div>
          {showcaseImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={showcaseImage}
              alt=""
              className="h-56 w-full object-cover sm:h-full sm:min-h-[16rem]"
            />
          ) : (
            <div
              className="flex h-56 items-end p-6 sm:min-h-[16rem]"
              style={{
                background: `linear-gradient(160deg, #1e1b4b, color-mix(in srgb, ${glow} 40%, #0f172a))`,
              }}
            >
              <p className="font-serif text-2xl italic text-violet-100/90">
                Featured pour
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-5 px-3 py-6 sm:px-6 sm:py-10">
        <Suspense fallback={null}>
          <ShopTypeFilters types={types} primaryHex={glow} />
        </Suspense>
        <ShopAisleGrid
          categories={categories}
          primaryHex={glow}
          accentHex={accentHex}
        />
        <div className="grid gap-6 lg:grid-cols-12">
          <section id="shop-catalog" className="scroll-mt-24 lg:col-span-9">
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
          <aside className="lg:col-span-3">
            <div className="border border-indigo-950 bg-slate-900/70 p-3 lg:sticky lg:top-24">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
                On the bar
              </p>
              <ShopSidebarWidgets
                slug={slug}
                currency={currency}
                featured={featured}
                primaryHex={glow}
                accentHex={accentHex}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

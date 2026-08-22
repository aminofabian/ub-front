import { Suspense } from "react";

import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import { ShopAisleGrid } from "@/components/storefront/shop-aisle-grid";
import ShopCatalogWithMore from "@/components/storefront/shop-catalog-with-more";
import { ShopTypeFilters } from "@/components/storefront/shop-type-filters";
import { ShopSidebarWidgets } from "@/components/storefront/shop-sidebar-widgets";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

/**
 * Default grocery / aisle storefront home.
 *
 * Section-aware since the section system landed: the merchant's `hero`
 * section replaces the built-in hero, and `categories` / `products` can be
 * hidden. Untouched sections keep the classic rendering.
 */
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
    landingContent,
    design,
  } = props;

  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const categoriesConfig = storefrontSectionConfig(design, "categories");
  const categoriesOn = categoriesConfig ? categoriesConfig.enabled : true;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;

  return (
    <div className="min-w-0" data-store-theme-id="mart">
      <div className="mx-auto max-w-7xl px-3 pb-16 pt-2 sm:px-6 sm:pb-24 sm:pt-3">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-6">
          <main
            className={cn(
              "min-w-0 space-y-3.5 sm:space-y-4",
              productsOn ? "lg:col-span-9" : "lg:col-span-12",
            )}
          >
            <StorefrontHeroSection
              title={heroTitle}
              tagline={
                heroOn && heroSettings?.headline.trim()
                  ? heroSettings.headline
                  : announcement
              }
              subheadline={heroSettings?.subheadline ?? null}
              height={heroSettings?.height ?? "medium"}
              overlay={heroSettings?.overlay ?? "none"}
              showCta={heroSettings?.showCta ?? true}
              showWhatsapp={heroSettings?.showWhatsapp ?? true}
              buttons={buttons}
              branchHint={branchHint}
              areaLabel={areaLabel}
              primaryHex={primaryHex}
              accentHex={accentHex}
              showcaseImage={showcaseImage}
              logoUrl={logoUrl}
              heroBannerUrls={heroBannerUrls}
              design={design}
              whatsappNumber={
                landingContent?.whatsapp ?? landingContent?.phone ?? null
              }
            />

            {productsOn ? (
              <Suspense fallback={null}>
                <ShopTypeFilters types={types} primaryHex={primaryHex} />
              </Suspense>
            ) : null}

            {categoriesOn ? (
              <ShopAisleGrid
                categories={categories}
                primaryHex={primaryHex}
                accentHex={accentHex}
              />
            ) : null}

            {productsOn ? (
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
            ) : null}
          </main>

          {productsOn ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { ComingSoonShopPage } from "@/components/storefront/templates/landing/coming-soon-shop-page";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { buildComingSoonShop } from "@/lib/coming-soon-shop";

/**
 * THESIS: The shop is already open for browsing. The bag is locked. Refuses
 * magazine manifesto, countdown, and "something worth waiting for."
 * OWN-WORLD: Cool paper, hairline product grid, brand only on lock and till,
 * DM Sans as the existing commerce face, product photos as display.
 * STORY: Window-shop real prices, pick a product to watch, leave an email.
 * FIRST VIEWPORT: Commerce chrome; featured product as a buy box; grid under
 * it; sticky locked till with notify.
 * FORM: Locked shelf. Sibling of coming-soon-editorial.
 */
export function ComingSoonShopLanding(props: LandingTemplateProps) {
  const content = buildComingSoonShop({
    storeName: props.storeName,
    landingContent: props.landingContent,
    catalogItems: props.catalogItems,
    featured: props.featured,
    categories: props.categories,
    types: props.types,
    currency: props.currency,
    totalCount: props.totalCount,
    areaLabel: props.areaLabel,
    announcement: props.announcement,
    deliveryAreaNames: props.deliveryAreaNames,
    countryCode: props.countryCode,
    heroFallbackUrl: props.heroFallbackUrl,
  });

  return (
    <div data-landing-template-id="coming-soon-shop">
      <ComingSoonShopPage
        storeName={content.displayName}
        logoUrl={props.logoUrl}
        primaryHex={props.primaryHex}
        accentHex={props.accentHex}
        content={content}
      />
    </div>
  );
}

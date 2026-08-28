import { ShopStorefrontComingSoon } from "@/components/storefront/shop-storefront-coming-soon";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { buildComingSoonEditorial } from "@/lib/coming-soon-editorial";

export function ComingSoonEditorialLanding(props: LandingTemplateProps) {
  const content = buildComingSoonEditorial({
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
    <div data-landing-template-id="coming-soon-editorial">
      <ShopStorefrontComingSoon
        storeName={content.displayName}
        logoUrl={props.logoUrl}
        primaryHex={props.primaryHex}
        accentHex={props.accentHex}
        content={content}
      />
    </div>
  );
}

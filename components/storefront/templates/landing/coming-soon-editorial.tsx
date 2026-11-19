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
    services: props.services,
  });

  return (
    <div data-landing-template-id="coming-soon-editorial">
      <ShopStorefrontComingSoon
        storeName={content.displayName}
        logoUrl={props.logoUrl}
        primaryHex={props.primaryHex}
        accentHex={props.accentHex}
        currency={props.currency}
        paysWithMpesa={paysWithMpesa(props.currency, props.countryCode)}
        content={content}
        landingContent={props.landingContent ?? null}
        slug={props.slug ?? null}
        catalogItems={props.catalogItems}
        featured={props.featured}
        catalogCursor={props.catalogCursor ?? null}
        totalCount={props.totalCount ?? null}
      />
    </div>
  );
}

function paysWithMpesa(currency?: string | null, countryCode?: string | null): boolean {
  const code = currency?.trim().toUpperCase() ?? "";
  const country = countryCode?.trim().toUpperCase() ?? "";
  return code === "KES" || country === "KE";
}

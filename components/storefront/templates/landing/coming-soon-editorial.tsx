import { ShopStorefrontComingSoon } from "@/components/storefront/shop-storefront-coming-soon";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";

export function ComingSoonEditorialLanding(props: LandingTemplateProps) {
  return (
    <div data-landing-template-id="coming-soon-editorial">
      <ShopStorefrontComingSoon
        storeName={props.landingContent?.headline?.trim() || props.storeName}
        logoUrl={props.logoUrl}
        primaryHex={props.primaryHex}
        accentHex={props.accentHex}
      />
    </div>
  );
}

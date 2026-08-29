import type { Metadata } from "next";

import { StaffPayPortalPage } from "@/components/payroll/staff-pay-portal-page";
import { fetchPublicStorefront } from "@/lib/public-storefront";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";

export const metadata: Metadata = {
  title: "My pay",
  robots: { index: false, follow: false },
};

export default async function MyPayPage() {
  const tenant = await resolveTenantContext();
  const slug = await resolveStorefrontSlug();
  const storefront = slug ? await fetchPublicStorefront(slug) : null;
  const shopName =
    tenant?.branding?.displayName?.trim() ||
    storefront?.label?.trim() ||
    storefront?.businessName ||
    tenant?.tenantName ||
    "Shop";

  return (
    <StaffPayPortalPage
      branding={{
        shopName,
        primaryHex: parseStorefrontHex(tenant?.branding?.primaryColor),
        accentHex: parseStorefrontHex(tenant?.branding?.accentColor),
        logoUrl: tenant?.branding?.logoUrl?.trim() || null,
      }}
    />
  );
}

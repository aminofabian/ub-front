import type { Metadata } from "next";

import { GlobalSupplierHubView } from "@/components/supplier-portal/global-supplier-hub";
import { PublicSupplierPortalView } from "@/components/supplier-portal/public-supplier-portal";
import {
  isPlatformApexHost,
  PLATFORM_DOMAIN,
} from "@/lib/config";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import {
  getRequestHostname,
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";
import { fetchPublicStorefront } from "@/lib/public-storefront";

type PageProps = { params: Promise<{ username: string }> };

/**
 * Global passport only on bare platform apex hosts.
 * Shop subdomains / custom domains must never match — even if APP_BASE_URL is odd.
 */
function isBarePlatformApex(hostname: string | null): boolean {
  if (!hostname) return false;
  const h = hostname.trim().toLowerCase();
  if (h === PLATFORM_DOMAIN || h === `www.${PLATFORM_DOMAIN}`) return true;
  if (h === "palmart.co.ke" || h === "www.palmart.co.ke") return true;
  if (isPlatformApexHost(h)) return true;
  return false;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const tenant = await resolveTenantContext();

  // Resolved shop tenant → shop portal metadata (never global passport).
  if (tenant) {
    const slug = await resolveStorefrontSlug();
    const storefront = slug ? await fetchPublicStorefront(slug) : null;
    const shopLabel =
      tenant.branding?.displayName?.trim() ||
      storefront?.label?.trim() ||
      storefront?.businessName ||
      tenant.tenantName ||
      "Shop";
    return {
      title: `Supplier · ${decoded} · ${shopLabel}`,
      description: `Supply history and amount owed at ${shopLabel}.`,
      robots: { index: false, follow: false },
    };
  }

  const hostname = await getRequestHostname();
  if (isBarePlatformApex(hostname)) {
    return {
      title: `@${decoded} · Supplier passport · ${PLATFORM_DOMAIN}`,
      description: `Cross-shop supply passport for @${decoded} on Kiosk.`,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Supplier · ${decoded}`,
    description: `Supply history and amount owed.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicSupplierPortalPage({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);

  // Tenant host always wins — public shop portal (pre-change behavior).
  const tenant = await resolveTenantContext();
  if (tenant) {
    const slug = await resolveStorefrontSlug();
    const storefront = slug ? await fetchPublicStorefront(slug) : null;
    const shopName =
      tenant.branding?.displayName?.trim() ||
      storefront?.label?.trim() ||
      storefront?.businessName ||
      tenant.tenantName ||
      "Shop";

    return (
      <PublicSupplierPortalView
        username={decoded}
        branding={{
          shopName,
          primaryHex: parseStorefrontHex(tenant.branding?.primaryColor),
          logoUrl: tenant.branding?.logoUrl?.trim() || null,
        }}
      />
    );
  }

  const hostname = await getRequestHostname();
  if (isBarePlatformApex(hostname)) {
    return <GlobalSupplierHubView username={decoded} />;
  }

  // Unknown host with no tenant — still try the public shop portal UI.
  return (
    <PublicSupplierPortalView
      username={decoded}
      branding={{
        shopName: "Shop",
        primaryHex: null,
        logoUrl: null,
      }}
    />
  );
}

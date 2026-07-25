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

function isGlobalHubHost(hostname: string | null): boolean {
  if (!hostname) return false;
  const h = hostname.trim().toLowerCase();
  if (isPlatformApexHost(h)) return true;
  if (h === PLATFORM_DOMAIN || h === `www.${PLATFORM_DOMAIN}`) return true;
  if (h === "palmart.co.ke" || h === "www.palmart.co.ke") return true;
  return false;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const hostname = await getRequestHostname();

  if (isGlobalHubHost(hostname)) {
    return {
      title: `@${decoded} · Supplier passport · ${PLATFORM_DOMAIN}`,
      description: `Cross-shop supply passport for @${decoded} on Kiosk.`,
      robots: { index: false, follow: false },
    };
  }

  const tenant = await resolveTenantContext();
  const slug = await resolveStorefrontSlug();
  const storefront = slug ? await fetchPublicStorefront(slug) : null;
  const shopLabel =
    tenant?.branding?.displayName?.trim() ||
    storefront?.label?.trim() ||
    storefront?.businessName ||
    tenant?.tenantName ||
    "Shop";
  return {
    title: `Supplier · ${decoded} · ${shopLabel}`,
    description: `Supply history and amount owed at ${shopLabel}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicSupplierPortalPage({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const hostname = await getRequestHostname();

  if (isGlobalHubHost(hostname)) {
    return <GlobalSupplierHubView username={decoded} />;
  }

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
    <PublicSupplierPortalView
      username={decoded}
      branding={{
        shopName,
        primaryHex: parseStorefrontHex(tenant?.branding?.primaryColor),
        logoUrl: tenant?.branding?.logoUrl?.trim() || null,
      }}
    />
  );
}

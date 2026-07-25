import type { Metadata } from "next";

import { PublicSupplierPortalView } from "@/components/supplier-portal/public-supplier-portal";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";
import { fetchPublicStorefront } from "@/lib/public-storefront";

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
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
    title: `Supplier · ${decodeURIComponent(username)} · ${shopLabel}`,
    description: `Supply history and amount owed at ${shopLabel}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicSupplierPortalPage({ params }: PageProps) {
  const { username } = await params;
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
      username={decodeURIComponent(username)}
      branding={{
        shopName,
        primaryHex: parseStorefrontHex(tenant?.branding?.primaryColor),
        logoUrl: tenant?.branding?.logoUrl?.trim() || null,
      }}
    />
  );
}

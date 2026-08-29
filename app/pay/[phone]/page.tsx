import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StaffPayPortalPage } from "@/components/payroll/staff-pay-portal-page";
import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";
import { fetchPublicStorefront } from "@/lib/public-storefront";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";

type PageProps = { params: Promise<{ phone: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { phone } = await params;
  const tenant = await resolveTenantContext();
  const slug = await resolveStorefrontSlug();
  const storefront = slug ? await fetchPublicStorefront(slug) : null;
  const shopLabel =
    tenant?.branding?.displayName?.trim() ||
    storefront?.label?.trim() ||
    storefront?.businessName ||
    tenant?.tenantName ||
    "Shop";
  const local = toKenyanLocal07(phone) ?? phone;
  return {
    title: `My pay · ${shopLabel}`,
    description: `View your salary and payslips at ${shopLabel} (${local}).`,
    robots: { index: false, follow: false },
  };
}

export default async function StaffPayPhonePage({ params }: PageProps) {
  const { phone } = await params;
  if (!looksLikeKenyanMobilePath(phone)) {
    notFound();
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
    <StaffPayPortalPage
      phoneSegment={phone}
      branding={{
        shopName,
        primaryHex: parseStorefrontHex(tenant?.branding?.primaryColor),
        accentHex: parseStorefrontHex(tenant?.branding?.accentColor),
        logoUrl: tenant?.branding?.logoUrl?.trim() || null,
      }}
    />
  );
}

import { Suspense } from "react";

import { ShopStorefrontChrome } from "@/components/storefront/shop-storefront-chrome";
import { ShopStorefrontRealtime } from "@/components/storefront/shop-storefront-realtime";
import {
  fetchPublicCategories,
  fetchPublicStorefront,
} from "@/lib/public-storefront";
import { resolveStorefrontSlug, resolveTenantContext } from "@/lib/storefront-slug";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

/**
 * Storefront chrome (utility bar, header, category rail, footer) shared by
 * `/shop/*` and the host-mapped homepage `/`.
 */
export async function StorefrontShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const slug = await resolveStorefrontSlug();
  const [tenant, storefront, categoriesPayload] = await Promise.all([
    resolveTenantContext(),
    slug ? fetchPublicStorefront(slug) : Promise.resolve(null),
    slug ? fetchPublicCategories(slug) : Promise.resolve(null),
  ]);

  const title =
    storefront?.label?.trim() || storefront?.businessName || tenant?.tenantName || "Shop";
  const headerTitle = tenant?.branding?.displayName ?? title;
  const logoUrl = tenant?.branding?.logoUrl?.trim() || null;
  const primaryRaw = tenant?.branding?.primaryColor?.trim() ?? "";
  const accentRaw = tenant?.branding?.accentColor?.trim() ?? "";
  const primary = isHexColor(primaryRaw) ? primaryRaw : null;
  const accent = isHexColor(accentRaw) ? accentRaw : null;
  const currency = storefront?.currency?.trim() || "KES";
  const categories = categoriesPayload?.categories ?? [];
  const branding = tenant?.branding
    ? {
        displayName: tenant.branding.displayName,
        logoUrl: tenant.branding.logoUrl,
        faviconUrl: tenant.branding.faviconUrl,
        primaryColor: tenant.branding.primaryColor,
        accentColor: tenant.branding.accentColor,
        metaTitle: tenant.branding.metaTitle,
        metaDescription: tenant.branding.metaDescription,
        ogImage: tenant.branding.ogImage,
        metaKeywords: tenant.branding.metaKeywords,
      }
    : null;

  const locationHint = process.env.NEXT_PUBLIC_STOREFRONT_LOCATION_HINT?.trim() || null;
  const isComingSoon = Boolean(slug && !storefront);

  if (isComingSoon) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[oklch(0.985_0.002_90)] [--shop-footer-offset:9.5rem] sm:[--shop-footer-offset:12.5rem] dark:bg-background">
      {slug ? (
        <ShopStorefrontChrome
          slug={slug}
          headerTitle={headerTitle}
          logoUrl={logoUrl}
          primaryHex={primary}
          accentHex={accent}
          locationHint={locationHint}
          categories={categories}
          storeName={headerTitle}
        >
          {children}
        </ShopStorefrontChrome>
      ) : (
        <div className="flex-1">{children}</div>
      )}
      <ShopStorefrontRealtime currency={currency} branding={branding} />
    </div>
  );
}

import { Suspense } from "react";

import { ShopCategoryRail } from "@/components/storefront/shop-category-rail";
import { ShopFooterMart } from "@/components/storefront/shop-footer-mart";
import { ShopHeaderBar } from "@/components/storefront/shop-header-bar";
import { ShopStorefrontRealtime } from "@/components/storefront/shop-storefront-realtime";
import { ShopUtilityBar } from "@/components/storefront/shop-utility-bar";
import {
  fetchPublicCategories,
  fetchPublicStorefront,
} from "@/lib/public-storefront";
import { resolveStorefrontSlug, resolveTenantContext } from "@/lib/storefront-slug";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function RailFallback() {
  return <div className="h-11 animate-pulse bg-primary/40" aria-hidden />;
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
  const logoUrl = tenant?.branding?.logoUrl ?? null;
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
    <div className="flex min-h-screen flex-col bg-[oklch(0.985_0.002_90)] [--shop-footer-offset:9.5rem] sm:[--shop-footer-offset:8.75rem] dark:bg-background">
      <ShopUtilityBar primaryHex={primary} locationHint={locationHint} />
      {slug ? (
        <ShopHeaderBar
          slug={slug}
          headerTitle={headerTitle}
          logoUrl={logoUrl}
          primaryHex={primary}
        />
      ) : null}
      <Suspense fallback={<RailFallback />}>
        {slug ? (
          <ShopCategoryRail
            categories={categories}
            primaryHex={primary}
            accentHex={accent}
          />
        ) : (
          <RailFallback />
        )}
      </Suspense>
      <div className="flex-1 pb-[var(--shop-footer-offset,9.5rem)]">
        {children}
      </div>
      <ShopFooterMart primaryHex={primary} storeName={headerTitle} />
      <ShopStorefrontRealtime currency={currency} branding={branding} />
    </div>
  );
}

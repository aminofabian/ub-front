import { Suspense } from "react";

import { ShopCategoryRail } from "@/components/storefront/shop-category-rail";
import { ShopFooterMart } from "@/components/storefront/shop-footer-mart";
import { ShopHeaderBar } from "@/components/storefront/shop-header-bar";
import { ShopUtilityBar } from "@/components/storefront/shop-utility-bar";
import { fetchPublicCategories, fetchPublicStorefront } from "@/lib/public-storefront";
import { resolveStorefrontSlug, resolveTenantContext } from "@/lib/storefront-slug";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function RailFallback() {
  return <div className="h-11 animate-pulse bg-primary/40" aria-hidden />;
}

export default async function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const slug = await resolveStorefrontSlug();
  const [tenant, storefront, categoriesPayload] = await Promise.all([
    resolveTenantContext(),
    slug ? fetchPublicStorefront(slug) : Promise.resolve(null),
    slug ? fetchPublicCategories(slug) : Promise.resolve(null),
  ]);

  const title =
    storefront?.label?.trim() || storefront?.businessName || tenant?.tenantName || "Shop";
  const headerTitle = tenant?.branding.displayName ?? title;
  const logoUrl = tenant?.branding.logoUrl ?? null;
  const primaryRaw = tenant?.branding.primaryColor?.trim() ?? "";
  const accentRaw = tenant?.branding.accentColor?.trim() ?? "";
  const primary = isHexColor(primaryRaw) ? primaryRaw : null;
  const accent = isHexColor(accentRaw) ? accentRaw : null;
  const categories = categoriesPayload?.categories ?? [];

  const locationHint = process.env.NEXT_PUBLIC_STOREFRONT_LOCATION_HINT?.trim() || null;

  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.985_0.002_90)] dark:bg-background">
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
      <div className="flex-1">{children}</div>
      <ShopFooterMart primaryHex={primary} storeName={headerTitle} />
    </div>
  );
}

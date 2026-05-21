import { Suspense } from "react";

import { ShopStorefrontChrome } from "@/components/storefront/shop-storefront-chrome";
import { ShopStorefrontRealtime } from "@/components/storefront/shop-storefront-realtime";
import { StorefrontThemeScope } from "@/components/storefront/storefront-theme-scope";
import {
  fetchPublicCategories,
  fetchPublicStorefront,
  fetchTenantContext,
} from "@/lib/public-storefront";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import { resolveStorefrontSlug, resolveTenantContext } from "@/lib/storefront-slug";
import { cn } from "@/lib/utils";

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
  let tenant = await resolveTenantContext();
  // Dev: plain localhost + env slug — resolve branding via `<slug>.localhost`
  if (slug && !parseStorefrontHex(tenant?.branding?.primaryColor)) {
    const byDevHost = await fetchTenantContext(`${slug}.localhost`);
    if (byDevHost) {
      tenant = byDevHost;
    }
  }
  const [storefront, categoriesPayload] = await Promise.all([
    slug ? fetchPublicStorefront(slug) : Promise.resolve(null),
    slug ? fetchPublicCategories(slug) : Promise.resolve(null),
  ]);

  const title =
    storefront?.label?.trim() || storefront?.businessName || tenant?.tenantName || "Shop";
  const headerTitle = tenant?.branding?.displayName ?? title;
  const logoUrl = tenant?.branding?.logoUrl?.trim() || null;
  const primary = parseStorefrontHex(tenant?.branding?.primaryColor);
  const accent = parseStorefrontHex(tenant?.branding?.accentColor);
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
    <StorefrontThemeScope
      primaryHex={primary}
      accentHex={accent}
      className={cn(
        "h-[100dvh] max-h-[100dvh] overflow-hidden bg-[oklch(0.985_0.002_90)] [--shop-footer-offset:9.5rem] sm:[--shop-footer-offset:12.5rem] dark:bg-background",
      )}
    >
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
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      )}
      <ShopStorefrontRealtime currency={currency} branding={branding} />
    </StorefrontThemeScope>
  );
}

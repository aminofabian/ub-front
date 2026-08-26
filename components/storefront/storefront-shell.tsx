import { ShopStorefrontChrome } from "@/components/storefront/shop-storefront-chrome";
import { ShopStorefrontRealtime } from "@/components/storefront/shop-storefront-realtime";
import { StorefrontPwaRuntime } from "@/components/storefront/storefront-pwa-runtime";
import { StorefrontPreviewBanner } from "@/components/storefront/storefront-preview-banner";
import { StorefrontSignInProvider } from "@/components/storefront/storefront-sign-in-sheet";
import { StorefrontThemeScope } from "@/components/storefront/storefront-theme-scope";
import { StorefrontSupportLauncher } from "@/components/support/storefront-support-launcher";
import { resolveStoreChromeVariant } from "@/components/storefront/templates/registry";
import {
  fetchPublicCategories,
  fetchPublicStorefront,
  fetchTenantContext,
} from "@/lib/public-storefront";
import { parseStorefrontPreview } from "@/lib/storefront-preview";
import { readStorefrontPreviewFromHeaders } from "@/lib/storefront-preview-headers";
import { resolveStorefrontDeliveryHint } from "@/lib/storefront-seo-defaults";
import {
  landingTemplateMeta,
  normalizeStoreThemeId,
  storeThemeMeta,
} from "@/lib/storefront-templates";
import { parseStorefrontDesignJson } from "@/lib/storefront-design";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import { resolveStorefrontSlug, resolveTenantContext } from "@/lib/storefront-slug";
import { hasSessionPresenceCookieServer } from "@/lib/session-presence";
import { cn } from "@/lib/utils";

/**
 * Storefront chrome (utility bar, header, category rail) shared by
 * `/shop/*` and the host-mapped homepage `/`.
 */
export async function StorefrontShell({
  children,
  previewThemeId,
  previewLandingId,
}: {
  children: React.ReactNode;
  previewThemeId?: string;
  previewLandingId?: string;
}) {
  const slug = await resolveStorefrontSlug();
  let tenant = await resolveTenantContext();
  // D8: returning-shopper label hint. Label-only, may be stale — the client
  // restore downgrades it (§10).
  const hasPresence = await hasSessionPresenceCookieServer();
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

  const locationHint = resolveStorefrontDeliveryHint({
    envHint: process.env.NEXT_PUBLIC_STOREFRONT_LOCATION_HINT,
    branchLocalities: tenant?.branchLocalities,
    deliveryAreaNames: (storefront?.deliveryAreas ?? [])
      .filter((area) => area.active && area.name.trim())
      .map((area) => area.name),
    catalogBranchName: storefront?.catalogBranchName,
  });
  const fromHeaders = await readStorefrontPreviewFromHeaders();
  const preview = parseStorefrontPreview(
    previewThemeId?.trim() || fromHeaders.themeId,
    previewLandingId?.trim() || fromHeaders.landingId,
    fromHeaders.designJson,
  );
  // Unsaved draft (previewDesign) wins over the saved design.
  const designOverride = preview.designJson
    ? parseStorefrontDesignJson(preview.designJson)
    : null;
  const forceLandingPreview = Boolean(preview.landingId);
  const isComingSoon = Boolean(slug && !storefront) || forceLandingPreview;
  const storeThemeId = normalizeStoreThemeId(
    preview.themeId ?? tenant?.storeThemeId,
  );
  const chromeVariant = resolveStoreChromeVariant(storeThemeId);
  const previewLookName = preview.landingId
    ? landingTemplateMeta(preview.landingId).name
    : preview.themeId
      ? storeThemeMeta(preview.themeId).name
      : null;
  const previewBanner = previewLookName ? (
    <StorefrontPreviewBanner lookName={previewLookName} />
  ) : null;

  if (isComingSoon) {
    return (
      <div
        className="min-h-screen"
        data-landing-template-id={
          preview.landingId ?? tenant?.landingTemplateId ?? undefined
        }
      >
        {previewBanner}
        <StorefrontSignInProvider
          surface="landing"
          storeName={headerTitle}
          hasPresence={hasPresence}
        >
          {children}
        </StorefrontSignInProvider>
      </div>
    );
  }

  return (
    <StorefrontThemeScope
      primaryHex={primary}
      accentHex={accent}
      design={designOverride ?? tenant?.design ?? null}
      className={cn(
        "h-[100dvh] max-h-[100dvh] overflow-hidden bg-[oklch(0.985_0.002_90)] dark:bg-background",
        chromeVariant === "dark" && "bg-stone-950 dark:bg-stone-950",
        chromeVariant === "oxide" && "bg-[#EDEAE2] dark:bg-[#EDEAE2]",
        chromeVariant === "tint-lab" && "bg-[#F6F1EA] dark:bg-[#F6F1EA]",
        chromeVariant === "milk-run" && "bg-[#FFFCF5] dark:bg-[#FFFCF5]",
        chromeVariant === "butcher-board" && "bg-[#0C0708] dark:bg-[#0C0708]",
        chromeVariant === "carbon-desk" && "bg-[#C9B896] dark:bg-[#C9B896]",
        chromeVariant === "boutique-shelf" && "bg-[#1F1020] dark:bg-[#1F1020]",
        chromeVariant === "beauty-edit" && "bg-white dark:bg-white",
        chromeVariant === "scent-story" && "bg-[#FCF8F0] dark:bg-[#FCF8F0]",
        chromeVariant === "print-atelier" && "bg-white dark:bg-white",
        chromeVariant === "blank-drop" && "bg-white dark:bg-white",
        chromeVariant === "chem-lab" && "bg-transparent dark:bg-transparent",
        chromeVariant === "spirits-cellar" && "bg-[#14100E] dark:bg-[#14100E]",
      )}
    >
      {previewBanner}
      {slug ? (
        <ShopStorefrontChrome
          slug={slug}
          headerTitle={headerTitle}
          logoUrl={logoUrl}
          primaryHex={primary}
          accentHex={accent}
          locationHint={locationHint}
          categories={categories}
          deliveryAreas={storefront?.deliveryAreas ?? []}
          chromeVariant={chromeVariant}
          storeThemeId={storeThemeId}
          hasPresence={hasPresence}
          whatsappNumber={
            tenant?.landingContent?.whatsapp ??
            tenant?.landingContent?.phone ??
            null
          }
          initialDesign={designOverride ?? tenant?.design ?? null}
          announcement={storefront?.announcement ?? null}
        >
          {children}
        </ShopStorefrontChrome>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      )}
      <ShopStorefrontRealtime currency={currency} branding={branding} />
      <StorefrontPwaRuntime />
      <StorefrontSupportLauncher
        slug={slug}
        label={headerTitle}
        primaryHex={primary}
      />
    </StorefrontThemeScope>
  );
}

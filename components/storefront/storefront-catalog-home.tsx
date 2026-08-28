import { headers } from "next/headers";

import { StorefrontAnalyticsBeacon } from "@/components/storefront/storefront-analytics-beacon";
import { WhatsAppLandingCta } from "@/components/storefront/whatsapp-landing-cta";
import { StorefrontSectionsStack } from "@/components/storefront/sections/storefront-sections-stack";
import {
  resolveLandingPage,
  resolveStoreHome,
} from "@/components/storefront/templates/registry";
import { ShopUnavailable } from "@/components/storefront/shop-unavailable";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";
import {
  fetchPublicCatalogItems,
  fetchPublicCategories,
  fetchPublicTypes,
  fetchPublicStorefront,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";
import {
  primaryStorefrontArea,
  resolveStorefrontDeliveryHint,
} from "@/lib/storefront-seo-defaults";
import { parseStorefrontPreview } from "@/lib/storefront-preview";
import { readStorefrontPreviewFromHeaders } from "@/lib/storefront-preview-headers";
import {
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
} from "@/lib/storefront-templates";
import {
  parseStorefrontDesignJson,
  storefrontSectionsInRegion,
} from "@/lib/storefront-design";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function catalogLeadScore(item: PublicCatalogItemCard): number {
  let score = 0;
  if (item.name?.trim()) score += 4;
  if (item.imageUrl?.trim()) score += 2;
  if (item.price != null && item.price > 0) score += 2;
  return score;
}

/** Prefer featured + complete cards so "All Products" leads with a strong first item. */
function orderCatalogLead(
  items: PublicCatalogItemCard[],
  featured: PublicCatalogItemCard[],
): PublicCatalogItemCard[] {
  if (items.length <= 1) return items;
  const featuredIds = new Set(featured.map((f) => f.id));
  return [...items].sort((a, b) => {
    const aFeat = featuredIds.has(a.id) ? 1 : 0;
    const bFeat = featuredIds.has(b.id) ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    return catalogLeadScore(b) - catalogLeadScore(a);
  });
}

export async function StorefrontCatalogHome({
  q,
  categoryId,
  typeId,
  departmentId,
  categoryHeading,
  categoryPathSlug,
  previewThemeId,
  previewLandingId,
}: {
  q?: string;
  categoryId?: string;
  typeId?: string;
  /** @deprecated Use {@link typeId}. */
  departmentId?: string;
  /** Human-readable heading when filtering by category (not the raw id). */
  categoryHeading?: string;
  /** Canonical `/shop/c/:slug` segment for links and search form action. */
  categoryPathSlug?: string;
  previewThemeId?: string;
  previewLandingId?: string;
}) {
  const resolvedTypeId = typeId?.trim() || departmentId?.trim() || undefined;
  const tenant = await resolveTenantContext();
  const slug = await resolveStorefrontSlug();

  if (!slug) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "this domain";
    return (
      <ShopUnavailable
        title="Storefront not configured"
        host={host}
        reason={
          tenant
            ? `Domain "${host}" is mapped to tenant "${tenant.tenantName}", but no storefront slug is set.`
            : `Domain "${host}" is not mapped to any tenant yet.`
        }
      />
    );
  }

  const [list, categoriesPayload, typesPayload, storefront, fromHeaders] =
    await Promise.all([
      fetchPublicCatalogItems(slug, {
        limit: 48,
        q,
        categoryId,
        departmentId: resolvedTypeId,
      }),
      fetchPublicCategories(slug),
      fetchPublicTypes(slug),
      fetchPublicStorefront(slug),
      readStorefrontPreviewFromHeaders(),
    ]);

  const preview = parseStorefrontPreview(
    previewThemeId?.trim() || fromHeaders.themeId,
    previewLandingId?.trim() || fromHeaders.landingId,
    fromHeaders.designJson,
  );

  const landingTemplateId = normalizeLandingTemplateId(
    preview.landingId ?? tenant?.landingTemplateId,
  );
  const themeId = normalizeStoreThemeId(
    preview.themeId ?? tenant?.storeThemeId,
  );

  if (!list || preview.landingId) {
    const storeName =
      tenant?.branding?.displayName ?? tenant?.tenantName ?? slug;
    const primaryRaw = tenant?.branding?.primaryColor?.trim() ?? "";
    const accentRaw = tenant?.branding?.accentColor?.trim() ?? "";
    const Landing = resolveLandingPage(landingTemplateId);
    return (
      <>
        <StorefrontAnalyticsBeacon
          surface="landing"
          slug={slug}
          landingTemplateId={landingTemplateId}
          storeThemeId={themeId}
        />
        <Landing
          templateId={landingTemplateId}
          storeName={storeName}
          logoUrl={tenant?.branding?.logoUrl ?? null}
          primaryHex={isHexColor(primaryRaw) ? primaryRaw : null}
          accentHex={isHexColor(accentRaw) ? accentRaw : null}
          landingContent={tenant?.landingContent ?? null}
        />
        <WhatsAppLandingCta slug={slug} storeName={storeName} />
      </>
    );
  }

  const categories = categoriesPayload?.categories ?? [];
  const types =
    storefront?.types?.length
      ? storefront.types
      : (typesPayload?.types ?? []);
  const typeHeading =
    resolvedTypeId && !categoryHeading
      ? types.find((t) => t.id === resolvedTypeId)?.label?.trim()
      : undefined;
  const branchHint = storefront?.catalogBranchName;
  const areaLabel = primaryStorefrontArea(tenant?.branchLocalities)
    ?? resolveStorefrontDeliveryHint({
      envHint: process.env.NEXT_PUBLIC_STOREFRONT_LOCATION_HINT,
      branchLocalities: tenant?.branchLocalities,
      deliveryAreaNames: (storefront?.deliveryAreas ?? [])
        .filter((area) => area.active && area.name.trim())
        .map((area) => area.name),
      catalogBranchName: storefront?.catalogBranchName,
    });
  const heroTitle =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? "Browse products";
  const announcement = storefront?.announcement?.trim() || null;
  const primaryRaw = tenant?.branding?.primaryColor?.trim() ?? "";
  const primary = isHexColor(primaryRaw) ? primaryRaw : null;
  const accentRaw = tenant?.branding?.accentColor?.trim() ?? "";
  const accentHex = isHexColor(accentRaw) ? accentRaw : null;
  const logoUrl = tenant?.branding?.logoUrl ?? null;
  const heroBannerUrls = tenant?.branding?.heroBannerUrls ?? null;

  const featured: PublicCatalogItemCard[] =
    storefront?.featured?.length && storefront.featured.length > 0
      ? storefront.featured
      : list.items.slice(0, 4);

  const catalogItems = orderCatalogLead(list.items, featured);

  const showcaseImage =
    featured[0]?.imageUrl || storefront?.featured?.[0]?.imageUrl || null;

  const StoreHome = resolveStoreHome(themeId);

  // Unsaved draft (previewDesign) wins over the saved design.
  const designOverride = preview.designJson
    ? parseStorefrontDesignJson(preview.designJson)
    : null;
  const design = designOverride ?? tenant?.design ?? null;
  const storeName =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? slug;
  const preSections =
    design && tenant?.storefrontEnabled
      ? storefrontSectionsInRegion(design, "pre").filter((s) => {
          // Print atelier owns announcement + first-viewport hero (3DEA craft bar).
          if (themeId === "print-atelier" || themeId === "blank-drop" || themeId === "pastry-case") {
            return s.id !== "announcement" && s.id !== "promo" && s.id !== "hero";
          }
          return true;
        })
      : [];
  const postSections =
    design && tenant?.storefrontEnabled
      ? storefrontSectionsInRegion(design, "post")
      : [];
  const showSectionStacks = Boolean(design && tenant?.storefrontEnabled);

  return (
    <>
      <StorefrontAnalyticsBeacon
        surface="store"
        slug={slug}
        storeThemeId={themeId}
        landingTemplateId={landingTemplateId}
      />
      {showSectionStacks ? (
        <StorefrontSectionsStack
          design={design!}
          sections={preSections}
          region="pre"
          storeName={storeName}
          primaryHex={primary}
          accentHex={accentHex}
        />
      ) : null}
      <StoreHome
        themeId={themeId}
        slug={slug}
        currency={list.currency}
        catalogItems={catalogItems}
        nextCursor={list.nextCursor}
        totalCount={list.totalCount ?? undefined}
        q={q}
        categoryId={categoryId}
        typeId={resolvedTypeId}
        categoryHeading={categoryHeading ?? typeHeading}
        categoryPathSlug={categoryPathSlug}
        categories={categories}
        types={types}
        featured={featured}
        heroTitle={heroTitle}
        announcement={announcement}
        branchHint={branchHint}
        areaLabel={areaLabel}
        primaryHex={primary}
        accentHex={accentHex}
        logoUrl={logoUrl}
        heroBannerUrls={heroBannerUrls}
        showcaseImage={showcaseImage}
        storefront={storefront}
        landingContent={tenant?.landingContent ?? null}
        design={design}
      />
      {showSectionStacks ? (
        <StorefrontSectionsStack
          design={design!}
          sections={postSections}
          region="post"
          storeName={storeName}
          primaryHex={primary}
          accentHex={accentHex}
        />
      ) : null}
    </>
  );
}

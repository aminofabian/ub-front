import type { BrandingRecord } from "@/lib/api";
import type { TenantBranding } from "@/lib/public-storefront";

function brandingFromRecord(
  businessName: string,
  branding?: BrandingRecord | null,
): TenantBranding {
  return {
    displayName: branding?.displayName?.trim() || businessName,
    logoUrl: branding?.logoUrl ?? null,
    faviconUrl: branding?.faviconUrl ?? null,
    primaryColor: branding?.primaryColor ?? null,
    accentColor: branding?.accentColor ?? null,
    metaTitle: branding?.metaTitle ?? null,
    metaDescription: branding?.metaDescription ?? null,
    ogImage: branding?.ogImage ?? null,
    metaKeywords: branding?.metaKeywords ?? null,
    heroBannerUrls: branding?.heroBannerUrls ?? null,
  };
}

/** Stable cache-buster for generated tenant favicons when branding changes. */
export function tenantFaviconCacheKey(input: {
  slug: string;
  branding: TenantBranding;
  resolvedAt?: string;
}): string {
  const b = input.branding;
  const raw = [
    input.slug,
    b.faviconUrl?.trim() ?? "",
    b.displayName?.trim() ?? "",
    b.primaryColor?.trim() ?? "",
    input.resolvedAt ?? "",
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/** Relative URL for the dynamic tenant favicon endpoint. */
export function tenantFaviconPath(input: {
  slug: string;
  branding: TenantBranding;
  resolvedAt?: string;
}): string {
  return `/tenant-favicon?k=${tenantFaviconCacheKey(input)}`;
}

/** Prefer uploaded favicon; otherwise use the generated tenant endpoint. */
export function resolveTenantFaviconHref(input: {
  slug: string;
  branding: TenantBranding;
  resolvedAt?: string;
}): string {
  const uploaded = input.branding.faviconUrl?.trim();
  if (uploaded) {
    return uploaded;
  }
  return tenantFaviconPath(input);
}

/** Dashboard branding editor — same favicon resolution as the public storefront. */
export function resolveBusinessFaviconHref(business: {
  slug?: string | null;
  id?: string | null;
  name: string;
  branding?: BrandingRecord | null;
}): string {
  const slug = business.slug?.trim() || business.id?.trim() || "tenant";
  return resolveTenantFaviconHref({
    slug,
    branding: brandingFromRecord(business.name, business.branding),
  });
}

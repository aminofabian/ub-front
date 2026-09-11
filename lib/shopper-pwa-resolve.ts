import "server-only";

import { formatMoney } from "@/lib/money";
import { fetchPublicMobileConfig } from "@/lib/public-mobile-config";
import {
  fetchPublicStorefront,
  sanitizeStorefrontSlug,
  type TenantContext,
} from "@/lib/public-storefront";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import { resolveTenantContext } from "@/lib/storefront-slug";

export type ShopperPwaProduct = {
  name: string;
  price: string | null;
};

export type ShopperPwaProfile = {
  slug: string;
  name: string;
  description: string | null;
  themeColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  tenantHost: string | null;
  products: ShopperPwaProduct[];
};

function profileFromTenant(tenant: TenantContext): ShopperPwaProfile {
  return {
    slug: tenant.slug,
    name:
      tenant.branding.displayName?.trim() ||
      tenant.tenantName.trim() ||
      tenant.slug,
    description: tenant.branding.metaDescription?.trim() || null,
    themeColor: parseStorefrontHex(tenant.branding.primaryColor),
    accentColor: parseStorefrontHex(tenant.branding.accentColor),
    logoUrl: tenant.branding.logoUrl?.trim() || null,
    faviconUrl: tenant.branding.faviconUrl?.trim() || null,
    tenantHost: null,
    products: [],
  };
}

export async function resolveShopperPwaProfile(
  rawSlug: string,
): Promise<ShopperPwaProfile | null> {
  const slug = sanitizeStorefrontSlug(rawSlug);
  if (!slug) return null;

  const [config, storefront] = await Promise.all([
    fetchPublicMobileConfig(slug),
    fetchPublicStorefront(slug),
  ]);

  if (config || storefront) {
    const name =
      config?.displayName?.trim() ||
      config?.branding.displayName?.trim() ||
      storefront?.label?.trim() ||
      storefront?.businessName?.trim() ||
      slug;

    const products: ShopperPwaProduct[] = (storefront?.featured ?? [])
      .slice(0, 4)
      .map((item) => ({
        name: item.name.trim() || item.sku,
        price:
          item.price != null
            ? formatMoney(item.price, storefront?.currency)
            : null,
      }));

    return {
      slug,
      name,
      description: config?.branding.metaDescription?.trim() || null,
      themeColor: parseStorefrontHex(config?.branding.primaryColor),
      accentColor: parseStorefrontHex(config?.branding.accentColor),
      logoUrl: config?.branding.logoUrl?.trim() || null,
      faviconUrl: config?.branding.faviconUrl?.trim() || null,
      tenantHost: config?.tenantHost?.trim() || null,
      products,
    };
  }

  const tenant = await resolveTenantContext();
  if (tenant && sanitizeStorefrontSlug(tenant.slug) === slug) {
    return profileFromTenant(tenant);
  }
  return null;
}

export async function loadShopperPwaMarkSrc(
  profile: ShopperPwaProfile,
): Promise<string | null> {
  const candidates = [profile.faviconUrl, profile.logoUrl].filter(
    (url): url is string => Boolean(url),
  );
  for (const url of candidates) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/") || type.includes("svg")) continue;
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.byteLength < 32 || bytes.byteLength > 1_500_000) continue;
      return `data:${type};base64,${bytes.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  return null;
}

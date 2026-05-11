import "server-only";

import type { Metadata } from "next";

import type { TenantContext } from "@/lib/public-storefront";

const PLATFORM_TITLE = "Admin";
const PLATFORM_DESCRIPTION = "Business management platform.";

function isHex3or6(s: string): boolean {
  return /^#[0-9A-Fa-f]{3}$/.test(s) || /^#[0-9A-Fa-f]{6}$/.test(s);
}

/** Expands #RGB to #RRGGBB for {@link Viewport} themeColor. */
export function themeColorFromTenant(
  tenant: TenantContext | null,
): string | null {
  const raw = tenant?.branding?.primaryColor?.trim();
  if (!raw || !isHex3or6(raw)) {
    return null;
  }
  if (raw.length === 4) {
    const b = raw.slice(1);
    return (
      "#" +
      b
        .split("")
        .map((c) => c + c)
        .join("")
    ).toLowerCase();
  }
  return raw.toLowerCase();
}

/**
 * `metadataBase` for resolving relative URLs and OG/Twitter absolutes.
 * Uses http on localhost-style hosts so dev previews match the browser.
 */
export function metadataBaseFromHost(host: string | null): URL | undefined {
  if (!host) {
    return undefined;
  }
  const lower = host.trim().toLowerCase();
  const localDev =
    lower.includes("localhost") ||
    lower.startsWith("127.0.0.1") ||
    lower.endsWith(".local");
  const protocol = localDev ? "http" : "https";
  try {
    return new URL(`${protocol}://${host.trim()}`);
  } catch {
    return undefined;
  }
}

/**
 * Site `<meta>` / OG tags derived from host-resolved tenant (domain mapping).
 */
export function metadataFromTenantAndHost(
  tenant: TenantContext | null,
  host: string | null,
): Metadata {
  const metadataBase = metadataBaseFromHost(host);

  const platform: Metadata = {
    metadataBase,
    title: PLATFORM_TITLE,
    description: PLATFORM_DESCRIPTION,
  };

  if (!tenant) {
    return platform;
  }

  const displayName =
    tenant.branding.displayName?.trim() ||
    tenant.tenantName.trim() ||
    tenant.slug;

  // SEO overrides from branding settings
  const metaTitle = tenant.branding.metaTitle?.trim();
  const metaDescription = tenant.branding.metaDescription?.trim();
  const ogImage = tenant.branding.ogImage?.trim();
  const metaKeywords = tenant.branding.metaKeywords?.trim();

  const description =
    metaDescription || `${displayName} — business management platform.`;
  const favicon = tenant.branding.faviconUrl?.trim();
  const logo = tenant.branding.logoUrl?.trim();

  const icons = favicon
    ? {
        icon: [{ url: favicon }],
        shortcut: [{ url: favicon }],
        apple: [{ url: favicon }],
      }
    : undefined;

  // OG image: prefer dedicated ogImage, fall back to business logo
  const ogImageUrl = ogImage || logo;
  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, alt: displayName }]
    : undefined;

  return {
    ...platform,
    title: {
      default: metaTitle || displayName,
      template: metaTitle ? `%s · ${metaTitle}` : `%s · ${displayName}`,
    },
    description,
    applicationName: displayName,
    other: metaKeywords
      ? {
          keywords: metaKeywords,
        }
      : undefined,
    appleWebApp: {
      capable: true,
      title: displayName,
    },
    icons,
    openGraph: {
      type: "website",
      title: metaTitle || displayName,
      description,
      siteName: displayName,
      ...(metadataBase ? { url: metadataBase.href } : {}),
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: metaTitle || displayName,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

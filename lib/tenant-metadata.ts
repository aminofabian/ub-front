import "server-only";

import type { Metadata } from "next";

import {
  PLATFORM_DESCRIPTION,
  PLATFORM_KEYWORDS,
  PLATFORM_SITE_NAME,
  PLATFORM_THEME_COLOR,
  PLATFORM_TITLE,
} from "@/lib/platform-seo";
import type { TenantContext } from "@/lib/public-storefront";
import {
  defaultStorefrontMetaDescription,
  defaultStorefrontMetaKeywords,
  defaultStorefrontMetaTitle,
} from "@/lib/storefront-seo-defaults";
import { resolveTenantFaviconHref } from "@/lib/tenant-favicon-path";

const BRAND_THEME_COLOR = PLATFORM_THEME_COLOR;

/** Crawlable PNG favicon (Google prefers ≥48px); SVG from `/icon` for browsers. */
const PLATFORM_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/icon", type: "image/svg+xml" },
    { url: "/apple-icon", type: "image/png", sizes: "180x180" },
  ],
  apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  shortcut: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
};

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
    title: {
      default: PLATFORM_TITLE,
      template: `%s · ${PLATFORM_TITLE}`,
    },
    description: PLATFORM_DESCRIPTION,
    keywords: [...PLATFORM_KEYWORDS],
    applicationName: PLATFORM_SITE_NAME,
    icons: PLATFORM_ICONS,
    appleWebApp: {
      capable: true,
      title: "Kiosk POS",
    },
    openGraph: {
      type: "website",
      title: PLATFORM_TITLE,
      description: PLATFORM_DESCRIPTION,
      siteName: PLATFORM_SITE_NAME,
      locale: "en_KE",
      ...(metadataBase ? { url: metadataBase.href } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: PLATFORM_TITLE,
      description: PLATFORM_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
    other: {
      "og:type": "website",
      "theme-color": BRAND_THEME_COLOR,
    },
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

  const title = metaTitle || defaultStorefrontMetaTitle(displayName);
  const description =
    metaDescription || defaultStorefrontMetaDescription(displayName);
  const logo = tenant.branding.logoUrl?.trim();

  const faviconHref = resolveTenantFaviconHref({
    slug: tenant.slug,
    branding: tenant.branding,
    resolvedAt: tenant.resolvedAt,
  });
  const faviconUrl =
    metadataBase != null
      ? new URL(faviconHref, metadataBase).href
      : faviconHref;

  const icons = {
    icon: [{ url: faviconUrl }],
    shortcut: [{ url: faviconUrl }],
    apple: [{ url: faviconUrl }],
  };

  // OG image: prefer dedicated ogImage, fall back to business logo
  const ogImageUrl = ogImage || logo;
  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, alt: displayName }]
    : undefined;

  return {
    ...platform,
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description,
    applicationName: displayName,
    other: {
      keywords: metaKeywords || defaultStorefrontMetaKeywords(displayName),
    },
    appleWebApp: {
      capable: true,
      title: displayName,
    },
    icons,
    openGraph: {
      type: "website",
      title,
      description,
      siteName: displayName,
      ...(metadataBase ? { url: metadataBase.href } : {}),
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

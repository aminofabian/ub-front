import { NextResponse } from "next/server";

import { PLATFORM_APP_ICON_SRC } from "@/lib/platform-brand-assets";
import { PLATFORM_THEME_COLOR } from "@/lib/platform-seo";
import {
  resolveStorefrontSlugFromHost,
  resolveTenantContext,
} from "@/lib/storefront-slug";
import { themeColorFromTenant } from "@/lib/tenant-metadata";
import { resolveTenantFaviconHref } from "@/lib/tenant-favicon-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 11).trimEnd()}…`;
}

function iconEntries(src: string): Array<Record<string, string>> {
  return [
    { src, sizes: "192x192", type: "image/png", purpose: "any" },
    { src, sizes: "512x512", type: "image/png", purpose: "any" },
    { src, sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
}

export async function GET() {
  const [tenant, hostSlug] = await Promise.all([
    resolveTenantContext(),
    resolveStorefrontSlugFromHost(),
  ]);

  const displayName =
    tenant?.branding.displayName?.trim() ||
    tenant?.tenantName.trim() ||
    "Shop";
  const theme =
    themeColorFromTenant(tenant) || PLATFORM_THEME_COLOR;
  const startUrl = hostSlug ? "/" : "/shop";
  const iconSrc = tenant
    ? resolveTenantFaviconHref({
        slug: tenant.slug,
        branding: tenant.branding,
        resolvedAt: tenant.resolvedAt,
      })
    : PLATFORM_APP_ICON_SRC;

  const icons = [
    ...iconEntries(iconSrc),
    ...iconEntries(PLATFORM_APP_ICON_SRC),
  ];

  const body = {
    id: `kiosk-shopper:${tenant?.slug ?? "shop"}`,
    name: displayName,
    short_name: shortName(displayName),
    description: `Browse and order from ${displayName}.`,
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: theme,
    background_color: "#f4f5f4",
    icons,
    categories: ["shopping"],
    lang: "en-KE",
    dir: "ltr",
    prefer_related_applications: false,
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

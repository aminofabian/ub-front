import { NextResponse } from "next/server";

import { PLATFORM_APP_ICON_SRC } from "@/lib/platform-brand-assets";
import { PLATFORM_THEME_COLOR } from "@/lib/platform-seo";
import { buildShopperPwaManifest, isShopperPwaHost } from "@/lib/shopper-pwa";
import {
  getRequestHostname,
  resolveStorefrontSlugFromHost,
  resolveTenantContext,
} from "@/lib/storefront-slug";
import { themeColorFromTenant } from "@/lib/tenant-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [tenant, hostSlug, host] = await Promise.all([
    resolveTenantContext(),
    resolveStorefrontSlugFromHost(),
    getRequestHostname(),
  ]);

  const slug = tenant?.slug ?? hostSlug;
  if (slug) {
    const displayName =
      tenant?.branding.displayName?.trim() ||
      tenant?.tenantName.trim() ||
      "Shop";
    const body = buildShopperPwaManifest({
      slug,
      name: displayName,
      themeColor: themeColorFromTenant(tenant) || PLATFORM_THEME_COLOR,
      onTenantHost: isShopperPwaHost({
        slug,
        currentHost: host ?? "",
      }),
    });
    return NextResponse.json(body, {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  }

  const body = {
    name: "Shop",
    short_name: "Shop",
    description: "Browse and order from this shop.",
    start_url: "/shop",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: PLATFORM_THEME_COLOR,
    background_color: "#f4f5f4",
    icons: [
      {
        src: PLATFORM_APP_ICON_SRC,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
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


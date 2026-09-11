import { NextResponse } from "next/server";

import { isShopperPwaHost, buildShopperPwaManifest } from "@/lib/shopper-pwa";
import { resolveShopperPwaProfile } from "@/lib/shopper-pwa-resolve";
import { getRequestHostname } from "@/lib/storefront-slug";
import { sanitizeStorefrontSlug } from "@/lib/public-storefront";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

type RouteContext = { params: Promise<{ slug: string }> };

const CACHE =
  "public, max-age=300, stale-while-revalidate=3600";

export async function GET(_req: Request, ctx: RouteContext) {
  const { slug: raw } = await ctx.params;
  const slug = sanitizeStorefrontSlug(decodeURIComponent(raw));
  if (!slug) {
    return NextResponse.json({ error: "Unknown shop" }, { status: 404 });
  }

  const [profile, host] = await Promise.all([
    resolveShopperPwaProfile(slug),
    getRequestHostname(),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Unknown shop" }, { status: 404 });
  }

  const onTenantHost = isShopperPwaHost({
    slug: profile.slug,
    tenantHost: profile.tenantHost,
    currentHost: host ?? "",
  });

  const body = buildShopperPwaManifest({
    slug: profile.slug,
    name: profile.name,
    description: profile.description,
    themeColor: profile.themeColor,
    onTenantHost,
  });

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": CACHE,
    },
  });
}

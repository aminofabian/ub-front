import { ImageResponse } from "next/og";

import { ShopperPwaScreenshot } from "@/lib/shopper-pwa-mark";
import { resolveShopperPwaProfile } from "@/lib/shopper-pwa-resolve";
import { sanitizeStorefrontSlug } from "@/lib/public-storefront";
import { monogramInitials } from "@/lib/tenant-favicon-mark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

type RouteContext = {
  params: Promise<{ slug: string; kind: string }>;
};

const CACHE =
  "public, max-age=600, stale-while-revalidate=3600";

const SIZES = {
  narrow: { width: 720, height: 1280 },
  wide: { width: 1280, height: 720 },
} as const;

export async function GET(_req: Request, ctx: RouteContext) {
  const { slug: raw, kind: kindRaw } = await ctx.params;
  const slug = sanitizeStorefrontSlug(decodeURIComponent(raw));
  const kind = kindRaw === "wide" ? "wide" : kindRaw === "narrow" ? "narrow" : null;
  if (!slug || !kind) {
    return new Response("Not found", { status: 404 });
  }

  const profile = await resolveShopperPwaProfile(slug);
  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const size = SIZES[kind];
  const primary = profile.themeColor || "#0D9488";

  return new ImageResponse(
    (
      <ShopperPwaScreenshot
        width={size.width}
        height={size.height}
        name={profile.name}
        monogram={monogramInitials(profile.name)}
        primary={primary}
        products={profile.products}
        wide={kind === "wide"}
      />
    ),
    {
      ...size,
      headers: { "Cache-Control": CACHE },
    },
  );
}

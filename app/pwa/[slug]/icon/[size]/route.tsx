import { ImageResponse } from "next/og";

import { ShopperPwaMark } from "@/lib/shopper-pwa-mark";
import {
  loadShopperPwaMarkSrc,
  resolveShopperPwaProfile,
} from "@/lib/shopper-pwa-resolve";
import { parseShopperPwaIconSize, sanitizeShopperPwaSlug } from "@/lib/shopper-pwa";
import { monogramInitials } from "@/lib/tenant-favicon-mark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

type RouteContext = {
  params: Promise<{ slug: string; size: string }>;
};

const CACHE =
  "public, max-age=3600, stale-while-revalidate=86400";

export async function GET(req: Request, ctx: RouteContext) {
  const { slug: raw, size: sizeRaw } = await ctx.params;
  const slug = sanitizeShopperPwaSlug(decodeURIComponent(raw));
  const size = parseShopperPwaIconSize(sizeRaw);
  if (!slug || !size) {
    return new Response("Not found", { status: 404 });
  }

  const profile = await resolveShopperPwaProfile(slug);
  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const purpose = new URL(req.url).searchParams.get("purpose");
  const maskable = purpose === "maskable";
  const mark = await loadShopperPwaMarkSrc(profile);
  const primary = profile.themeColor || "#0D9488";

  const image = new ImageResponse(
    (
      <ShopperPwaMark
        size={size}
        name={profile.name}
        monogram={monogramInitials(profile.name)}
        primary={primary}
        markSrc={mark.src}
        maskable={maskable}
        fillFrame={mark.fillFrame}
      />
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": CACHE },
    },
  );
  return image;
}

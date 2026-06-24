import { NextResponse } from "next/server";

import {
  buildTenantFaviconSvg,
  PLATFORM_FAVICON_SVG,
} from "@/lib/tenant-favicon-mark";
import { resolveTenantContext } from "@/lib/storefront-slug";

export const runtime = "nodejs";

const CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400, immutable";

function svgResponse(svg: string): NextResponse {
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export async function GET() {
  const tenant = await resolveTenantContext();
  if (!tenant) {
    return svgResponse(PLATFORM_FAVICON_SVG);
  }

  const uploaded = tenant.branding.faviconUrl?.trim();
  if (uploaded) {
    return NextResponse.redirect(uploaded, {
      status: 302,
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  const displayName =
    tenant.branding.displayName?.trim() ||
    tenant.tenantName.trim() ||
    tenant.slug;

  return svgResponse(
    buildTenantFaviconSvg({
      displayName,
      primaryColor: tenant.branding.primaryColor,
    }),
  );
}

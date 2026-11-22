import { NextRequest, NextResponse } from "next/server";

import { marketplaceRouting } from "@/lib/marketplace-host";
import {
  STOREFRONT_PREVIEW_DESIGN_HEADER,
  STOREFRONT_PREVIEW_DESIGN_PARAM,
  STOREFRONT_PREVIEW_LANDING_HEADER,
  STOREFRONT_PREVIEW_LANDING_PARAM,
  STOREFRONT_PREVIEW_THEME_HEADER,
  STOREFRONT_PREVIEW_THEME_PARAM,
} from "@/lib/storefront-preview";

/**
 * Forwards the original Host header as X-Tenant-Host on API requests so the
 * Java backend's DomainBusinessResolverFilter can resolve the tenant from the
 * hostname even when the BFF proxy rewrites change the Host header to the
 * backend origin (e.g. kiosk.zelisline.com).
 *
 * Also copies merchant storefront preview query params onto request headers so
 * layouts (which do not receive searchParams) can render the staged theme.
 *
 * The marketplace is its own host (ADR 0038, P0.6): on it `/` serves the
 * directory, and every other host sends `/marketplace…` there. Off until
 * NEXT_PUBLIC_MARKETPLACE_HOST is set (see lib/marketplace-host.ts).
 *
 * Protected dashboard routes rely on client-side JWT checks in layout hooks.
 * We intentionally do NOT gate navigations on the {@code ub.session} cookie
 * here — Safari / iOS often fails to persist that JS-written hint, which
 * caused a reload loop (login → dashboard → middleware redirect → login).
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  let mutated = false;

  const isProxiedApi =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/webhooks/") ||
    pathname.startsWith("/actuator/");

  const routing = isProxiedApi
    ? null
    : marketplaceRouting(
        request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
        pathname,
        request.nextUrl.search,
      );
  if (routing?.kind === "redirect") {
    return NextResponse.redirect(routing.url, 308);
  }

  if (isProxiedApi) {
    const host = request.headers.get("host");
    if (host && !requestHeaders.get("X-Tenant-Host")) {
      requestHeaders.set("X-Tenant-Host", host);
      mutated = true;
    }
  } else {
    // The root layout reads this to send an old shop address to the current
    // one. Taken from the real URL, not from a header the browser sent.
    requestHeaders.set(
      "x-kiosk-request-path",
      `${pathname}${request.nextUrl.search}`,
    );
    mutated = true;
  }

  const previewTheme = searchParams.get(STOREFRONT_PREVIEW_THEME_PARAM)?.trim();
  const previewLanding = searchParams
    .get(STOREFRONT_PREVIEW_LANDING_PARAM)
    ?.trim();
  const previewDesign = searchParams
    .get(STOREFRONT_PREVIEW_DESIGN_PARAM)
    ?.trim();
  if (previewTheme) {
    requestHeaders.set(STOREFRONT_PREVIEW_THEME_HEADER, previewTheme);
    mutated = true;
  }
  if (previewLanding) {
    requestHeaders.set(STOREFRONT_PREVIEW_LANDING_HEADER, previewLanding);
    mutated = true;
  }
  if (previewDesign) {
    requestHeaders.set(STOREFRONT_PREVIEW_DESIGN_HEADER, previewDesign);
    mutated = true;
  }

  if (routing?.kind === "rewrite") {
    const target = request.nextUrl.clone();
    target.pathname = routing.pathname;
    return NextResponse.rewrite(target, {
      request: { headers: requestHeaders },
    });
  }

  if (mutated) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/webhooks/:path*",
    "/actuator/:path*",
    "/",
    "/shop/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

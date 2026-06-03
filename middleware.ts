import { NextRequest, NextResponse } from "next/server";

import {
  isAuthProtectedPath,
  SESSION_PRESENCE_COOKIE,
} from "@/lib/auth-route-guard";
import { APP_ROUTES } from "@/lib/config";

/**
 * Forwards the original Host header as X-Tenant-Host on API requests so the
 * Java backend's DomainBusinessResolverFilter can resolve the tenant from the
 * hostname even when the BFF proxy rewrites change the Host header to the
 * backend origin (e.g. kiosk.zelisline.com).
 *
 * Also fast-redirects unauthenticated navigations to protected dashboard routes
 * using the non-secret {@link SESSION_PRESENCE_COOKIE} hint (real auth remains
 * client-side JWT validation).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthProtectedPath(pathname)) {
    const hasSessionHint =
      request.cookies.get(SESSION_PRESENCE_COOKIE)?.value === "1";
    if (!hasSessionHint) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = APP_ROUTES.login;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/webhooks/") ||
    pathname.startsWith("/actuator/")
  ) {
    const host = request.headers.get("host");
    if (host) {
      const requestHeaders = new Headers(request.headers);
      if (!requestHeaders.get("X-Tenant-Host")) {
        requestHeaders.set("X-Tenant-Host", host);
      }
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/webhooks/:path*",
    "/actuator/:path*",
    "/overview/:path*",
    "/business/:path*",
    "/branches/:path*",
    "/users/:path*",
    "/products/:path*",
    "/item-types/:path*",
    "/categories/:path*",
    "/suppliers/:path*",
    "/customers/:path*",
    "/supplies/:path*",
    "/purchasing/:path*",
    "/inventory/:path*",
    "/pricing/:path*",
    "/shifts/:path*",
    "/analytics/:path*",
    "/sales/:path*",
    "/storefront/:path*",
    "/payments/:path*",
    "/settings/:path*",
    "/sync-conflicts/:path*",
    "/credits/:path*",
    "/cashier/:path*",
    "/grocery/:path*",
    "/barcode/:path*",
    "/overview",
    "/business",
    "/branches",
    "/users",
    "/products",
    "/item-types",
    "/categories",
    "/suppliers",
    "/customers",
    "/supplies",
    "/cashier",
    "/grocery",
    "/barcode",
  ],
};

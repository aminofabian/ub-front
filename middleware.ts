import { NextRequest, NextResponse } from "next/server";

/**
 * Forwards the original Host header as X-Tenant-Host on API requests so the
 * Java backend's DomainBusinessResolverFilter can resolve the tenant from the
 * hostname even when the BFF proxy rewrites change the Host header to the
 * backend origin (e.g. kiosk.zelisline.com).
 *
 * Protected dashboard routes rely on client-side JWT checks in layout hooks.
 * We intentionally do NOT gate navigations on the {@code ub.session} cookie
 * here — Safari / iOS often fails to persist that JS-written hint, which
 * caused a reload loop (login → dashboard → middleware redirect → login).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  ],
};

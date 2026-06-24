import { NextRequest, NextResponse } from "next/server";

/**
 * Forwards the original Host header as X-Tenant-Host on API requests so the
 * Java backend's DomainBusinessResolverFilter can resolve the tenant from the
 * hostname even when the BFF proxy rewrites change the Host header to the
 * backend origin (e.g. kiosk.zelisline.com).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API and webhook rewrites
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/webhooks/") ||
    pathname.startsWith("/actuator/")
  ) {
    const host = request.headers.get("host");
    if (host) {
      const requestHeaders = new Headers(request.headers);
      // Preserve the original hostname so the backend tenant resolver
      // can look up the domain mapping even when the proxy rewrites
      // change the actual Host header to the backend origin.
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
  matcher: ["/api/:path*", "/webhooks/:path*", "/actuator/:path*"],
};

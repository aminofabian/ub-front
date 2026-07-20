import type { NextConfig } from "next";

/**
 * Gap G3 CSP: as strict as Next.js allows without per-request nonces.
 * `unsafe-inline` / `unsafe-eval` remain for the App Router runtime; JWT theft
 * is mitigated by httpOnly cookies, not by blocking all inline scripts.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
  "font-src 'self' data:",
  // Till Print Bridge runs on the cashier PC (HTTP loopback). Cloud cashier
  // must be allowed to fetch it; upgrade-insecure-requests exempts loopback.
  "connect-src 'self' https: wss: ws: http://127.0.0.1:19500 http://localhost:19500 http://[::1]:19500",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const overviewRedirect = {
  source: "/overview",
  destination: "/business",
  permanent: true,
} as const;

const overviewRedirectTrailing = {
  source: "/overview/",
  destination: "/business/",
  permanent: true,
} as const;

/**
 * Desktop / on-premise SKU.
 *
 * When `NEXT_PUBLIC_RUNTIME=desktop`, the Next.js app is built as a fully
 * static site (`output: 'export'`) that the Spring Boot fat JAR serves from
 * its classpath at `http://127.0.0.1:5050`. Browser → API traffic is
 * same-origin against Spring, so the BFF rewrites and the WebSocket origin
 * override are unused and must be omitted.
 *
 * See DESKTOP_INSTALLATION.md §6.1 for the full rationale.
 */
const IS_DESKTOP = process.env.NEXT_PUBLIC_RUNTIME === "desktop";

/**
 * Backend origin the Next.js BFF proxies REST + webhook calls to.
 *
 * Keeping all browser → API traffic same-origin (via these rewrites) eliminates
 * an entire class of production failures: a backend 502/503 no longer surfaces
 * in the browser as a CORS error (because no preflight is performed), and
 * CORS allow-list misconfiguration cannot break the storefront.
 *
 * WebSockets are NOT proxied here — the browser opens them directly on the Java
 * API origin (`NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_REALTIME_WS_ORIGIN`;
 * see `resolveRealtimeWebSocketBaseUrl` in `lib/config.ts`). The backend
 * WebSocket handler allows all origins, so this is safe.
 */
const BACKEND_ORIGIN = (
  process.env.BACKEND_ORIGIN?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "https://kiosk.zelisline.com"
).replace(/\/+$/, "");

/**
 * Baked into the client bundle so WebSockets hit the Java API directly.
 * MUST be the Java API origin — Next.js rewrites cannot proxy WebSocket
 * upgrades. If this equals the Next.js frontend host, the browser will fail
 * to connect with code 1006 and fall back to REST polling.
 */
const REALTIME_WS_ORIGIN = (
  process.env.NEXT_PUBLIC_REALTIME_WS_ORIGIN?.trim() || BACKEND_ORIGIN
).replace(/\/+$/, "");

const cloudOnlyConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_REALTIME_WS_ORIGIN: REALTIME_WS_ORIGIN,
  },
  images: {
    qualities: [75, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [overviewRedirect];
  },
  async rewrites() {
    // Do NOT rewrite /api/v1/* here — app/api/v1/[[...path]]/route.ts must handle
    // it so Gap G can set httpOnly ub.access and redact JWTs from JSON. A
    // next.config rewrite bypasses that route handler and breaks store-session.
    return [
      {
        source: "/webhooks/:path*",
        destination: `${BACKEND_ORIGIN}/webhooks/:path*`,
      },
      {
        source: "/actuator/:path*",
        destination: `${BACKEND_ORIGIN}/actuator/:path*`,
      },
    ];
  },
};

/**
 * Static-export configuration for the desktop SKU. No rewrites (Spring serves
 * `/api/*`, `/webhooks/*`, `/actuator/*` directly on the same origin), no
 * `headers()` (the Tauri webview / Spring static handler control headers), and
 * no `next/image` loader (Next disallows the default loader in `export`).
 *
 * `trailingSlash: true` makes each route emit `<route>/index.html`, which keeps
 * the Spring `ResourceHandler` mapping simple — no extension-less HTML files.
 */
const desktopConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
    qualities: [75, 95],
  },
  env: {
    NEXT_PUBLIC_REALTIME_WS_ORIGIN: "",
  },
  async redirects() {
    return [overviewRedirectTrailing];
  },
};

const nextConfig: NextConfig = IS_DESKTOP ? desktopConfig : cloudOnlyConfig;

export default nextConfig;

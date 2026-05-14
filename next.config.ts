import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

/**
 * Backend origin the Next.js BFF proxies REST + webhook calls to.
 *
 * Keeping all browser → API traffic same-origin (via these rewrites) eliminates
 * an entire class of production failures: a backend 502/503 no longer surfaces
 * in the browser as a CORS error (because no preflight is performed), and
 * CORS allow-list misconfiguration cannot break the storefront.
 *
 * WebSockets are NOT proxied here — they continue to connect directly to the
 * API origin (see `resolveRealtimeWebSocketBaseUrl` in `lib/config.ts`). The
 * backend WebSocket handler allows all origins, so this is safe.
 */
const BACKEND_ORIGIN = (
  process.env.BACKEND_ORIGIN?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "https://kiosk.zelisline.com"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  images: {
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
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
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

export default nextConfig;

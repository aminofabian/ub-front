import type { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/backend-proxy";
import { handleGoogleOAuthCallback } from "@/lib/google-oauth-callback.server";

// Force Node.js runtime — multipart uploads (logo, item images, etc.) need
// streaming `fetch` with `duplex: "half"`, which only the Node runtime
// supports reliably on Vercel.
export const runtime = "nodejs";

// Allow long-running passthroughs (Cloudinary uploads, slow report queries).
// Vercel caps this per plan: Hobby = 60s, Pro/Enterprise = 300s. The proxy
// itself enforces a tighter `UPSTREAM_TIMEOUT_MS` (~55s) so we always return
// a structured 504 instead of a bare platform 502 on slow backends.
export const maxDuration = 60;

// Avoid any framework-side caching/static optimization for proxied calls.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ path?: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const segments = path ?? [];
  // Google redirects here; run the same-host exchange instead of proxying a
  // backend 302 whose Set-Cookie must survive the hop (see handler docblock).
  if (
    req.method === "GET" &&
    segments.length === 4 &&
    segments[0] === "auth" &&
    segments[1] === "oauth" &&
    segments[2] === "google" &&
    segments[3] === "callback"
  ) {
    return handleGoogleOAuthCallback(req);
  }
  return proxyToBackend(req, path);
}

export function GET(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx);
}

export function POST(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx);
}

export function PUT(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx);
}

export function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx);
}

export function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx);
}

export function OPTIONS(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx);
}

import type { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/backend-proxy";

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

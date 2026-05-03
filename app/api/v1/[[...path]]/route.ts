import type { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/backend-proxy";

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

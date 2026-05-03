import { NextRequest, NextResponse } from "next/server";

const HEADER_ALLOWLIST = [
  "authorization",
  "content-type",
  "accept",
  "idempotency-key",
  "x-request-id",
  "x-tenant-id",
  "x-tenant-host",
  "x-test-user-id",
  "x-test-role-id",
] as const;

const SKIP_OUT_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
]);

function normalizeBackendOrigin(): string | null {
  const raw = process.env.BACKEND_ORIGIN?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function targetUrl(req: NextRequest, segments: string[] | undefined): URL | null {
  const base = normalizeBackendOrigin();
  if (!base) return null;
  const tail = segments?.length ? segments.join("/") : "";
  const pathname = tail ? `/api/v1/${tail}` : "/api/v1";
  const u = new URL(pathname, base);
  u.search = req.nextUrl.search;
  return u;
}

function buildUpstreamHeaders(req: NextRequest): Headers {
  const h = new Headers();
  for (const name of HEADER_ALLOWLIST) {
    const v = req.headers.get(name);
    if (v) h.set(name, v);
  }
  return h;
}

function copyUpstreamHeaders(from: Headers, to: NextResponse): void {
  from.forEach((value, key) => {
    if (SKIP_OUT_HEADERS.has(key.toLowerCase())) return;
    to.headers.set(key, value);
  });
}

export async function proxyToBackend(
  req: NextRequest,
  segments: string[] | undefined,
): Promise<NextResponse> {
  const url = targetUrl(req, segments);
  if (!url) {
    return NextResponse.json(
      {
        title: "Missing BACKEND_ORIGIN",
        detail: "Set BACKEND_ORIGIN on the Next.js server and restart.",
      },
      { status: 502, headers: { "Content-Type": "application/problem+json" } },
    );
  }

  const method = req.method.toUpperCase();
  const headers = buildUpstreamHeaders(req);
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    body = await req.text();
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = body;

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch {
    return NextResponse.json(
      { title: "Upstream unreachable", detail: url.origin },
      { status: 502, headers: { "Content-Type": "application/problem+json" } },
    );
  }

  const out = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
  copyUpstreamHeaders(upstream.headers, out);
  return out;
}

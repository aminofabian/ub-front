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

// Node's fetch auto-decodes gzip/br bodies, so `upstream.body` is already
// plain bytes. Forwarding the upstream's encoding/length headers would label
// decompressed bytes as compressed → browser fails with ERR_CONTENT_DECODING_FAILED.
const SKIP_OUT_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
]);

function normalizeBackendOrigin(): string | null {
  const keys = ["BACKEND_ORIGIN", "API_BACKEND_ORIGIN"] as const;
  for (const key of keys) {
    const raw = process.env[key]?.trim();
    if (raw) return raw.replace(/\/+$/, "");
  }
  return null;
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
        detail:
          "The Next.js server needs the real API URL (server-only env, not NEXT_PUBLIC_*). " +
          "Set BACKEND_ORIGIN=https://your-api.example.com in your host (e.g. Vercel → Project → Settings → Environment Variables), then redeploy. " +
          "Locally: BACKEND_ORIGIN in .env.local and restart next dev.",
      },
      { status: 502, headers: { "Content-Type": "application/problem+json" } },
    );
  }

  const method = req.method.toUpperCase();
  const headers = buildUpstreamHeaders(req);
  const init: RequestInit = { method, headers };

  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 0) {
      init.body = buf;
    }
  }

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

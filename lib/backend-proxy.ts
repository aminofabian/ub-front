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

/**
 * Hard cap on how long a single proxied call may wait for the backend before
 * we return our own structured 504. Sized below typical platform timeouts
 * (Vercel default 10s/60s/300s) so uploads to Cloudinary surface a friendly
 * "took too long" message instead of a bare platform 502.
 */
const UPSTREAM_TIMEOUT_MS = 55_000;

/** Below Vercel's ~4.5 MB serverless body cap; JSON APIs (login, mutations) buffer without duplex streaming. */
const MAX_JSON_PROXY_BODY_BYTES = 4 * 1024 * 1024;

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let body: BodyInit | undefined;
  let duplex: "half" | undefined;

  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && req.body) {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.toLowerCase().includes("application/json")) {
      const buf = await req.arrayBuffer();
      if (buf.byteLength > MAX_JSON_PROXY_BODY_BYTES) {
        clearTimeout(timeoutId);
        return NextResponse.json(
          {
            title: "Payload too large",
            detail: "JSON request body exceeds the proxy buffer limit.",
          },
          { status: 413, headers: { "Content-Type": "application/problem+json" } },
        );
      }
      body = buf;
    } else {
      // Multipart and non-JSON bodies: stream through. `duplex: "half"` is
      // required by undici when the body is a ReadableStream.
      body = req.body;
      duplex = "half";
    }
  }

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    signal: controller.signal,
    ...(duplex ? { duplex } : {}),
    ...(body !== undefined ? { body } : {}),
  };

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch (err) {
    clearTimeout(timeoutId);
    const aborted = err instanceof Error && err.name === "AbortError";
    if (aborted) {
      console.error("[backend-proxy] upstream timeout", {
        origin: url.origin,
        pathname: url.pathname,
      });
      return NextResponse.json(
        {
          title: "Request timed out",
          detail:
            `The server did not respond within ${Math.round(UPSTREAM_TIMEOUT_MS / 1000)}s. ` +
            "For large uploads, try a smaller file or retry. If this keeps happening, try again later.",
        },
        { status: 504, headers: { "Content-Type": "application/problem+json" } },
      );
    }
    console.error("[backend-proxy] upstream fetch failed", {
      origin: url.origin,
      pathname: url.pathname,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        title: "Service temporarily unavailable",
        detail:
          "We could not reach the API right now. Check your connection, try again in a moment, " +
          "or contact support if the problem continues.",
      },
      { status: 502, headers: { "Content-Type": "application/problem+json" } },
    );
  }
  clearTimeout(timeoutId);

  // 204/205/304 must not carry a body. Passing `upstream.body` here can hang or
  // break the client (e.g. POST /api/v1/auth/resend-verification → 204 No Content).
  const status = upstream.status;
  const proxyBody = status === 204 || status === 205 || status === 304 ? null : upstream.body;

  const out = new NextResponse(proxyBody, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
  copyUpstreamHeaders(upstream.headers, out);
  return out;
}

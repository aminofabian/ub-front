import { NextRequest, NextResponse } from "next/server";

import {
  applyAccessTokenCookie,
  clearAccessTokenCookies,
  isAccessTokenClearPath,
  isAccessTokenMintPath,
  readAccessTokenFromCookieHeader,
} from "@/lib/access-token-cookie";
import { redactAccessTokenFromAuthJson } from "@/lib/auth-session-claims";

const HEADER_ALLOWLIST = [
  "authorization",
  "content-type",
  "accept",
  "idempotency-key",
  "x-request-id",
  "x-tenant-id",
  "x-tenant-host",
  "x-till-device-id",
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

/**
 * Multipart buffer limit — aligned with Spring Boot's 12 MB cap.
 * Note: Vercel serverless functions enforce a ~4.5 MB total request payload
 * limit, so files above that will still fail until direct API mode is used.
 */
const MAX_MULTIPART_PROXY_BODY_BYTES = 12 * 1024 * 1024;

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

function resolveTenantHostHeader(req: NextRequest): string | null {
  const fromClient = req.headers.get("x-tenant-host")?.trim();
  if (fromClient) {
    return fromClient;
  }
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  const host = req.headers.get("host")?.split(":")[0]?.trim();
  return host && host.length > 0 ? host : null;
}

function buildUpstreamHeaders(req: NextRequest): Headers {
  const h = new Headers();
  for (const name of HEADER_ALLOWLIST) {
    const v = req.headers.get(name);
    if (v) h.set(name, v);
  }
  // HttpOnly refresh cookie (`ub.refresh`) — required for POST /auth/refresh when
  // the backend omits refreshToken from JSON (cookie-only mode).
  const cookie = req.headers.get("cookie");
  if (cookie) {
    h.set("cookie", cookie);
  }
  // Gap G: inject Bearer from httpOnly `ub.access` when the browser did not
  // send Authorization (storage cleared / future memory-only clients).
  if (!h.get("authorization")) {
    const access = readAccessTokenFromCookieHeader(cookie);
    if (access) {
      h.set("authorization", `Bearer ${access}`);
    }
  }
  if (!h.get("x-tenant-host")) {
    const tenantHost = resolveTenantHostHeader(req);
    if (tenantHost) {
      h.set("x-tenant-host", tenantHost);
    }
  }
  return h;
}

function requestIsHttps(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) {
    return proto.toLowerCase() === "https";
  }
  return req.nextUrl.protocol === "https:";
}

/**
 * Strip {@code Domain=} from upstream Set-Cookie so the browser stores the cookie
 * on the Next.js frontend host (e.g. palmart.co.ke), not the Java API host
 * (kiosk.zelisline.com) the BFF calls server-side.
 */
function rewriteSetCookieForFrontend(setCookie: string): string {
  return setCookie.replace(/;\s*Domain=[^;]*/gi, "");
}

function readSetCookieHeaders(from: Headers): string[] {
  if (typeof from.getSetCookie === "function") {
    return from.getSetCookie();
  }
  const combined = from.get("set-cookie");
  return combined ? [combined] : [];
}

function copyUpstreamHeaders(from: Headers, to: NextResponse): void {
  from.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (SKIP_OUT_HEADERS.has(lower) || lower === "set-cookie") return;
    to.headers.set(key, value);
  });
  appendUpstreamSetCookies(from, to);
}

/**
 * Append upstream Set-Cookie lines. Must run AFTER any `cookies.set()` calls —
 * Next rebuilds the Set-Cookie header from its cookie jar and would drop
 * previously appended upstream cookies (e.g. httpOnly `ub.refresh`).
 */
function appendUpstreamSetCookies(from: Headers, to: NextResponse): void {
  for (const cookie of readSetCookieHeaders(from)) {
    to.headers.append("Set-Cookie", rewriteSetCookieForFrontend(cookie));
  }
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
      // Multipart and non-JSON bodies: buffer into memory instead of streaming.
      // `duplex: "half"` with a ReadableStream is unreliable in Vercel's
      // serverless Node runtime and causes bare 502s for image uploads.
      const buf = await req.arrayBuffer();
      if (buf.byteLength > MAX_MULTIPART_PROXY_BODY_BYTES) {
        clearTimeout(timeoutId);
        return NextResponse.json(
          {
            title: "Payload too large",
            detail:
              "File upload exceeds the proxy buffer limit. Try a smaller image or enable direct API calls.",
          },
          { status: 413, headers: { "Content-Type": "application/problem+json" } },
        );
      }
      body = buf;
    }
  }

  const init: RequestInit = {
    method,
    headers,
    signal: controller.signal,
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

  if (
    upstream.status >= 400 &&
    url.pathname.includes("/auth/")
  ) {
    console.warn("[backend-proxy] upstream auth error", {
      status: upstream.status,
      pathname: url.pathname,
      tenantHost: headers.get("x-tenant-host"),
      tenantId: headers.get("x-tenant-id"),
    });
  }

  // 204/205/304 must not carry a body. Passing `upstream.body` here can hang or
  // break the client (e.g. POST /api/v1/auth/resend-verification → 204 No Content).
  const status = upstream.status;
  const secure = requestIsHttps(req);
  const mintAccess = status === 200 && isAccessTokenMintPath(url.pathname);
  const clearAccess =
    status >= 200 &&
    status < 300 &&
    isAccessTokenClearPath(url.pathname);

  if (mintAccess) {
    const rawBody = await upstream.text();
    // Gap G3: cookie holds the JWT; browser JSON gets session claims only.
    const { bodyText, accessToken } = redactAccessTokenFromAuthJson(rawBody);
    const out = new NextResponse(bodyText, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: { "Content-Type": "application/json" },
    });
    // Non-cookie headers first, then ub.access via cookies.set, then upstream
    // Set-Cookie (ub.refresh) so Next does not wipe the refresh cookie.
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (SKIP_OUT_HEADERS.has(lower) || lower === "set-cookie") return;
      out.headers.set(key, value);
    });
    if (accessToken) {
      applyAccessTokenCookie(out, accessToken, { secure });
    }
    appendUpstreamSetCookies(upstream.headers, out);
    return out;
  }

  const proxyBody =
    status === 204 || status === 205 || status === 304 ? null : upstream.body;

  const out = new NextResponse(proxyBody, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
  if (clearAccess) {
    // Clear access first, then forward upstream Set-Cookie (refresh clear).
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (SKIP_OUT_HEADERS.has(lower) || lower === "set-cookie") return;
      out.headers.set(key, value);
    });
    clearAccessTokenCookies(out, { secure });
    appendUpstreamSetCookies(upstream.headers, out);
    return out;
  }
  copyUpstreamHeaders(upstream.headers, out);
  return out;
}

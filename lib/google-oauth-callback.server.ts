import { NextRequest, NextResponse } from "next/server";

import { applyAccessTokenCookie } from "@/lib/access-token-cookie";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getServerApiOrigin, hostDerivedShopUrl } from "@/lib/config";
import {
  hostOnlyRefreshCookieClears,
  readSetCookieHeaders,
  rewriteSetCookieForFrontend,
} from "@/lib/rewrite-set-cookie";
import { requestHostname, sessionCookieDomain } from "@/lib/tenant-host";

type ExchangePayload = {
  accessToken?: string;
  nextPath?: string | null;
  slug?: string | null;
  returnHost?: string | null;
};

const OAUTH_NEXT_COOKIE = "ub.oauth_next";
const OAUTH_RETURN_HOST_COOKIE = "ub.oauth_return_host";

function requestIsHttps(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) {
    return proto.toLowerCase() === "https";
  }
  return req.nextUrl.protocol === "https:";
}

function safeNext(value: string | null | undefined): string {
  const t = value?.trim() ?? "";
  return t.startsWith("/") && !t.startsWith("//") ? t : "/";
}

function safeReturnHost(value: string | null | undefined): string | null {
  const t = value?.trim().toLowerCase() ?? "";
  if (!t || t.includes("/") || t.includes(" ") || t.includes("..") || t.includes(":")) {
    return null;
  }
  return t.length > 253 ? null : t;
}

function readOauthNextCookie(req: NextRequest): string {
  return safeNext(req.cookies.get(OAUTH_NEXT_COOKIE)?.value);
}

/** Hub / office destinations return to staff office login (Google-only owners). */
function preferOfficeLogin(nextPath: string): boolean {
  if (!nextPath || nextPath === "/" || nextPath.startsWith("/shop")) {
    return false;
  }
  return (
    nextPath.startsWith("/business") ||
    nextPath.startsWith("/overview") ||
    nextPath.startsWith("/settings") ||
    nextPath.startsWith("/inventory") ||
    nextPath.startsWith("/suppliers") ||
    nextPath.startsWith("/users") ||
    nextPath.startsWith("/branches") ||
    nextPath.startsWith("/reports") ||
    nextPath.startsWith("/cashier") ||
    nextPath.startsWith("/grocery") ||
    nextPath.startsWith("/butcher")
  );
}

function clearOauthHintCookies(
  res: NextResponse,
  opts: { secure: boolean; cookieDomain?: string },
): void {
  const clear = {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: opts.secure,
    sameSite: "lax" as const,
    ...(opts.cookieDomain ? { domain: opts.cookieDomain } : {}),
  };
  res.cookies.set(OAUTH_NEXT_COOKIE, "", clear);
  res.cookies.set(OAUTH_RETURN_HOST_COOKIE, "", clear);
}

/**
 * Same-host BFF handler for the Google OAuth redirect.
 *
 * Google redirects the browser to {@code /api/v1/auth/oauth/google/callback}. Instead of
 * letting the generic proxy forward a backend 302 (whose {@code Set-Cookie} must survive the
 * hop, and which a plain rewrite or a redirect-following fetch would drop), we exchange the
 * code server-side via {@code /exchange} and mint {@code ub.access}/{@code ub.refresh} on the
 * browser-facing host — the same cookie contract password login relies on.
 *
 * Falls back to the legacy proxied callback when the backend has no {@code /exchange}
 * endpoint yet or is unreachable, so a frontend-first deploy cannot regress sign-in.
 */
export async function handleGoogleOAuthCallback(
  req: NextRequest,
): Promise<NextResponse> {
  const hostname = requestHostname(req);
  const secure = requestIsHttps(req);
  const cookieDomain = sessionCookieDomain(req) || undefined;
  const origin = hostname
    ? `${secure ? "https" : "http"}://${hostname}`
    : req.nextUrl.origin;

  const loginRedirect = (
    code: string,
    nextPath?: string | null,
  ): NextResponse => {
    const next = safeNext(nextPath || readOauthNextCookie(req));
    const returnHost = safeReturnHost(
      req.cookies.get(OAUTH_RETURN_HOST_COOKIE)?.value,
    );
    const shopOrigin = returnHost ? hostDerivedShopUrl(returnHost) : "";

    let target: URL;
    if (shopOrigin) {
      // Custom-domain / subdomain storefront sheet — not apex /login.
      target = new URL(shopOrigin);
      target.searchParams.set("signin", "1");
      target.searchParams.set("googleError", code);
      if (preferOfficeLogin(next)) {
        target.searchParams.set("door", "staff");
        target.searchParams.set("next", next);
      }
    } else {
      target = preferOfficeLogin(next)
        ? new URL("/login/staff", origin)
        : new URL("/login", origin);
      if (preferOfficeLogin(next)) {
        target.searchParams.set("mode", "office");
        target.searchParams.set("next", next);
      }
      target.searchParams.set("googleError", code);
    }

    const res = NextResponse.redirect(target, 303);
    clearOauthHintCookies(res, { secure, cookieDomain });
    return res;
  };

  const segments = ["auth", "oauth", "google", "callback"];
  const legacy = (): Promise<NextResponse> => proxyToBackend(req, segments);

  if (req.nextUrl.searchParams.get("error")) {
    // User declined, or Google returned an error (e.g. access_denied).
    return loginRedirect("cancelled");
  }
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return loginRedirect("missing_code");
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getServerApiOrigin()}/api/v1/auth/oauth/google/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Carry ub.oauth_bind through for the browser-binding check.
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ code, state }),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return legacy();
  }

  // Backend predates /exchange, or is down → keep the old 302 + cookie path working.
  if (upstream.status === 404 || upstream.status === 405 || upstream.status >= 500) {
    return legacy();
  }

  if (!upstream.ok) {
    let errorCode = "failed";
    try {
      const problem = (await upstream.json()) as {
        detail?: string;
        title?: string;
      };
      errorCode = problem?.detail?.trim() || problem?.title?.trim() || "failed";
    } catch {
      /* keep default */
    }
    return loginRedirect(errorCode);
  }

  let payload: ExchangePayload | null = null;
  try {
    payload = (await upstream.json()) as ExchangePayload;
  } catch {
    payload = null;
  }
  const accessToken = payload?.accessToken?.trim();
  if (!accessToken) {
    return loginRedirect("failed");
  }

  const handoff = new URL("/auth/handoff", origin);
  handoff.searchParams.set("next", safeNext(payload?.nextPath));
  const slug = payload?.slug?.trim();
  if (slug) {
    handoff.searchParams.set("slug", slug);
  }
  const returnHost = payload?.returnHost?.trim();
  if (returnHost) {
    handoff.searchParams.set("returnHost", returnHost);
  }

  const response = NextResponse.redirect(handoff, 303);
  // Apply ub.access first, then append the upstream refresh cookie so Next's cookie jar
  // does not wipe it (same ordering contract as restore-session / store-session).
  applyAccessTokenCookie(response, accessToken, {
    secure,
    domain: cookieDomain,
  });
  for (const cookie of readSetCookieHeaders(upstream.headers)) {
    response.headers.append(
      "Set-Cookie",
      rewriteSetCookieForFrontend(cookie, hostname),
    );
  }
  if (cookieDomain) {
    for (const clear of hostOnlyRefreshCookieClears(secure)) {
      response.headers.append("Set-Cookie", clear);
    }
  }
  return response;
}

import { NextRequest, NextResponse } from "next/server";

import { applyAccessTokenCookie } from "@/lib/access-token-cookie";
import {
  SESSION_PRESENCE_COOKIE,
  SESSION_PRESENCE_MAX_AGE_SEC,
} from "@/lib/auth-route-guard";
import { APP_ROUTES, getServerApiOrigin } from "@/lib/config";
import { type LoginAudience, loginHrefForDestination } from "@/lib/login-audience";
import { fetchTenantContext } from "@/lib/public-storefront";
import { formatApiProblemMessage } from "@/lib/problem";
import {
  readSetCookieHeaders,
  rewriteSetCookieForFrontend,
} from "@/lib/rewrite-set-cookie";
import {
  buildSessionFinalizeHtml,
  newLoginIdempotencyKey,
  prefetchSessionBootstrap,
  resolveFinalizeDestination,
} from "@/lib/login-session.server";

function resolveTenantHost(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  const host = request.headers.get("host")?.split(":")[0]?.trim();
  return host && host.length > 0 ? host : null;
}

function parseAudience(raw: string): LoginAudience {
  return raw.trim().toLowerCase() === "staff" ? "staff" : "customer";
}

function loginPathForAudience(audience: LoginAudience): string {
  return audience === "staff" ? APP_ROUTES.staffLogin : APP_ROUTES.login;
}

function loginErrorRedirect(
  request: NextRequest,
  message: string,
  audience: LoginAudience,
  requestedNext = "",
  office = false,
): NextResponse {
  const href =
    audience === "staff"
      ? loginHrefForDestination(requestedNext)
      : loginPathForAudience(audience);
  const url = new URL(href, request.url);
  if (
    audience === "customer" &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
  ) {
    url.searchParams.set("next", requestedNext);
  }
  if (office && audience === "staff") {
    url.searchParams.set("mode", "office");
  }
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

async function resolveTenantId(
  fromForm: string,
  tenantHost: string | null,
): Promise<string> {
  const trimmed = fromForm.trim();
  if (trimmed) {
    return trimmed;
  }
  if (!tenantHost) {
    return "";
  }
  const ctx = await fetchTenantContext(tenantHost);
  return ctx?.tenantId?.trim() ?? "";
}

/**
 * Native HTML form login — works when client JS fails to load (common on older iPadOS).
 * Proxies to Java server-side, then returns a tiny HTML page that stores tokens locally.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const requestedNext = String(form.get("next") ?? "");
  const office =
    String(form.get("mode") ?? "").trim().toLowerCase() === "office";
  const audience = parseAudience(String(form.get("audience") ?? "customer"));
  const tenantHost = resolveTenantHost(request);
  const tenantId = await resolveTenantId(
    String(form.get("tenantId") ?? ""),
    tenantHost,
  );

  const fail = (message: string) =>
    loginErrorRedirect(request, message, audience, requestedNext, office);

  if (!email || !password) {
    return fail("Email and password are required.");
  }
  const backendOrigin = getServerApiOrigin();
  const upstreamUrl = `${backendOrigin}/api/v1/auth/login`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Idempotency-Key": newLoginIdempotencyKey(),
  };
  // Omitted on the platform apex: the API then resolves the shop from the email.
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }
  if (tenantHost) {
    headers["X-Tenant-Host"] = tenantHost;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return fail("Could not reach the server. Check your connection and try again.");
  }

  if (!upstream.ok) {
    const errorPayload = await upstream.json().catch(() => ({}));
    const message = formatApiProblemMessage(errorPayload) || "Login failed.";
    return fail(message);
  }

  const payload = (await upstream.json()) as {
    accessToken?: string;
    refreshToken?: string;
    user?: { businessId?: string };
  };
  const accessToken = payload.accessToken?.trim();
  if (!accessToken) {
    return fail("Login failed: no access token returned.");
  }
  const sessionTenantId = tenantId || payload.user?.businessId?.trim() || "";

  const bootstrap = await prefetchSessionBootstrap(
    accessToken,
    sessionTenantId,
    tenantHost,
  );

  // Password login keeps the session and routes by role / shop `?next=`.
  // Do not reject staff on customer login (or the reverse).
  const nextPath = resolveFinalizeDestination(
    bootstrap.me,
    requestedNext,
    bootstrap.business,
    { office },
  );

  const refreshToken = payload.refreshToken?.trim();
  const html = buildSessionFinalizeHtml({
    accessToken,
    refreshToken,
    tenantId: sessionTenantId,
    tenantHost,
    nextPath,
    bootstrap,
  });

  const response = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  // cookies.set first — Next rebuilds Set-Cookie from its jar and would drop
  // previously appended upstream cookies (httpOnly ub.refresh).
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set({
    name: SESSION_PRESENCE_COOKIE,
    value: "1",
    path: "/",
    maxAge: SESSION_PRESENCE_MAX_AGE_SEC,
    sameSite: "lax",
    secure,
    httpOnly: false,
  });
  applyAccessTokenCookie(response, accessToken, { secure });

  const upstreamCookies = readSetCookieHeaders(upstream.headers).map(
    rewriteSetCookieForFrontend,
  );
  const hasRefreshCookie = upstreamCookies.some((cookie) =>
    cookie.toLowerCase().startsWith("ub.refresh="),
  );
  if (refreshToken && !hasRefreshCookie) {
    response.cookies.set({
      name: "ub.refresh",
      value: refreshToken,
      path: "/api",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
      secure,
      httpOnly: true,
    });
    const secureAttr = secure ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `ub.refresh=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Lax${secureAttr}`,
    );
  }
  for (const cookie of upstreamCookies) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}

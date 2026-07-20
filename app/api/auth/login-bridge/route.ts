import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { applyAccessTokenCookie } from "@/lib/access-token-cookie";
import {
  SESSION_PRESENCE_COOKIE,
  SESSION_PRESENCE_MAX_AGE_SEC,
} from "@/lib/auth-route-guard";
import { getServerApiOrigin } from "@/lib/config";
import { fetchTenantContext } from "@/lib/public-storefront";
import { formatApiProblemMessage } from "@/lib/problem";
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

function loginErrorRedirect(request: NextRequest, message: string): NextResponse {
  const url = new URL("/login", request.url);
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
  const tenantHost = resolveTenantHost(request);
  const tenantId = await resolveTenantId(
    String(form.get("tenantId") ?? ""),
    tenantHost,
  );

  if (!email || !password) {
    return loginErrorRedirect(request, "Email and password are required.");
  }
  if (!tenantId) {
    return loginErrorRedirect(
      request,
      "Could not determine your business from this page. Reload and try again.",
    );
  }

  const backendOrigin = getServerApiOrigin();
  const upstreamUrl = `${backendOrigin}/api/v1/auth/login`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Idempotency-Key": newLoginIdempotencyKey(),
    "X-Tenant-Id": tenantId,
  };
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
    return loginErrorRedirect(
      request,
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (!upstream.ok) {
    const payload = await upstream.json().catch(() => ({}));
    const message = formatApiProblemMessage(payload) || "Login failed.";
    return loginErrorRedirect(request, message);
  }

  const payload = (await upstream.json()) as {
    accessToken?: string;
    refreshToken?: string;
  };
  const accessToken = payload.accessToken?.trim();
  if (!accessToken) {
    return loginErrorRedirect(request, "Login failed: no access token returned.");
  }

  const bootstrap = await prefetchSessionBootstrap(
    accessToken,
    tenantId,
    tenantHost,
  );

  const nextPath = resolveFinalizeDestination(bootstrap.me, requestedNext);

  const html = buildSessionFinalizeHtml({
    accessToken,
    refreshToken: payload.refreshToken?.trim(),
    tenantId,
    tenantHost,
    nextPath,
    bootstrap,
  });

  const response = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("Set-Cookie", value);
    }
  });

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

  return response;
}

import { NextRequest, NextResponse } from "next/server";

import {
  applyAccessTokenCookie,
  readAccessTokenFromCookieHeader,
} from "@/lib/access-token-cookie";
import { claimsFromAccessToken } from "@/lib/auth-session-claims";
import { getServerApiOrigin } from "@/lib/config";
import { businessIdFromAccessToken } from "@/lib/jwt-client";
import { prefetchSessionBootstrap } from "@/lib/login-session.server";

function resolveTenantHost(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  const host = request.headers.get("host")?.split(":")[0]?.trim();
  return host && host.length > 0 ? host : null;
}

function sessionJsonResponse(params: {
  accessToken: string;
  tenantHost: string | null;
  bootstrap: {
    me: unknown | null;
    business: unknown | null;
    branches: unknown | null;
  };
}): NextResponse {
  const { accessToken, tenantHost, bootstrap } = params;
  const tenantId = businessIdFromAccessToken(accessToken) ?? "";
  const session = claimsFromAccessToken(accessToken);
  return NextResponse.json({
    session: session
      ? {
          ...(session.exp != null ? { exp: session.exp } : {}),
          ...(session.businessId ? { businessId: session.businessId } : {}),
          ...(session.sub ? { sub: session.sub } : {}),
        }
      : undefined,
    tenantId: tenantId || undefined,
    tenantHost,
    bootstrap,
  });
}

/**
 * Restore JS session claims from httpOnly cookies when memory is empty.
 *
 * Prefer existing `ub.access` (path `/api`, sent to this route). Fall back to
 * refresh via the Java API. Note: Spring's `ub.refresh` is path-scoped to
 * `/api/v1/auth`, so it is often absent here — clients should also try
 * `POST /api/v1/auth/refresh` directly when this returns 401.
 *
 * Gap G3: response omits the raw JWT — only session claims + bootstrap.
 */
export async function POST(request: NextRequest) {
  const backendOrigin = getServerApiOrigin();
  const tenantHost = resolveTenantHost(request);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const secure = new URL(request.url).protocol === "https:";

  const existingAccess = readAccessTokenFromCookieHeader(cookieHeader);
  if (existingAccess) {
    const tenantId = businessIdFromAccessToken(existingAccess) ?? "";
    const bootstrap = tenantId
      ? await prefetchSessionBootstrap(existingAccess, tenantId, tenantHost)
      : { me: null, business: null, branches: null };
    const response = sessionJsonResponse({
      accessToken: existingAccess,
      tenantHost,
      bootstrap,
    });
    applyAccessTokenCookie(response, existingAccess, { secure });
    return response;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Cookie: cookieHeader,
  };
  if (tenantHost) {
    headers["X-Tenant-Host"] = tenantHost;
  }

  let refreshResponse: Response;
  try {
    refreshResponse = await fetch(`${backendOrigin}/api/v1/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
  } catch {
    return NextResponse.json({ error: "network" }, { status: 503 });
  }

  if (!refreshResponse.ok) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const payload = (await refreshResponse.json()) as {
    accessToken?: string;
    refreshToken?: string;
  };
  const accessToken = payload.accessToken?.trim();
  if (!accessToken) {
    return NextResponse.json({ error: "no_token" }, { status: 401 });
  }

  const tenantId = businessIdFromAccessToken(accessToken) ?? "";
  const bootstrap = tenantId
    ? await prefetchSessionBootstrap(accessToken, tenantId, tenantHost)
    : { me: null, business: null, branches: null };

  const response = sessionJsonResponse({
    accessToken,
    tenantHost,
    bootstrap,
  });

  // Apply access cookie first, then append upstream Set-Cookie (refresh) so
  // Next's cookie jar does not wipe the refresh cookie.
  applyAccessTokenCookie(response, accessToken, { secure });
  if (typeof refreshResponse.headers.getSetCookie === "function") {
    for (const cookie of refreshResponse.headers.getSetCookie()) {
      response.headers.append("Set-Cookie", cookie);
    }
  } else {
    const combined = refreshResponse.headers.get("set-cookie");
    if (combined) {
      response.headers.append("Set-Cookie", combined);
    }
  }

  return response;
}

import { NextRequest, NextResponse } from "next/server";

import { getServerApiOrigin } from "@/lib/config";
import { businessIdFromAccessToken } from "@/lib/jwt-client";
import {
  prefetchSessionBootstrap,
} from "@/lib/login-session.server";

function resolveTenantHost(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  const host = request.headers.get("host")?.split(":")[0]?.trim();
  return host && host.length > 0 ? host : null;
}

/**
 * Mint a fresh access token from the httpOnly refresh cookie when localStorage
 * is empty (common on iPad Safari after login handoff).
 */
export async function POST(request: NextRequest) {
  const backendOrigin = getServerApiOrigin();
  const tenantHost = resolveTenantHost(request);
  const cookieHeader = request.headers.get("cookie") ?? "";

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

  const response = NextResponse.json({
    accessToken,
    refreshToken: payload.refreshToken?.trim() || undefined,
    tenantId: tenantId || undefined,
    tenantHost,
    bootstrap,
  });

  refreshResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("Set-Cookie", value);
    }
  });

  return response;
}

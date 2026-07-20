import { NextRequest, NextResponse } from "next/server";

import {
  applyAccessTokenCookie,
  readAccessTokenFromCookieHeader,
} from "@/lib/access-token-cookie";
import {
  SESSION_PRESENCE_COOKIE,
  SESSION_PRESENCE_MAX_AGE_SEC,
} from "@/lib/auth-route-guard";
import { loginPathForNext } from "@/lib/login-audience";
import {
  buildSessionFinalizeHtml,
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

function loginErrorRedirect(
  request: NextRequest,
  message: string,
  requestedNext = "",
): NextResponse {
  const url = new URL(loginPathForNext(requestedNext), request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

function readField(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/**
 * After client-side login, finalize the session via native form POST so the
 * server can prefetch dashboard data before redirect (iPad-safe).
 * Gap G3: prefers httpOnly `ub.access` when the form omits accessToken.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const formAccess = readField(form, "accessToken");
  const cookieAccess = readAccessTokenFromCookieHeader(
    request.headers.get("cookie"),
  );
  const accessToken = formAccess || cookieAccess || "";
  const refreshToken = readField(form, "refreshToken");
  const tenantId = readField(form, "tenantId");
  const requestedNext = String(form.get("next") ?? "");
  const tenantHost = resolveTenantHost(request);

  if (!accessToken || !tenantId) {
    return loginErrorRedirect(
      request,
      "Session data missing. Please sign in again.",
      requestedNext,
    );
  }

  const bootstrap = await prefetchSessionBootstrap(
    accessToken,
    tenantId,
    tenantHost,
  );
  if (!bootstrap.me) {
    return loginErrorRedirect(
      request,
      "Could not verify your session. Please sign in again.",
      requestedNext,
    );
  }

  const nextPath = resolveFinalizeDestination(bootstrap.me, requestedNext);

  const html = buildSessionFinalizeHtml({
    accessToken,
    refreshToken: refreshToken || undefined,
    tenantId,
    tenantHost,
    nextPath,
    bootstrap,
  });

  const response = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
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

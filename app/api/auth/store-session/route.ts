import { NextRequest, NextResponse } from "next/server";

import {
  applyAccessTokenCookie,
  readAccessTokenFromCookieHeader,
} from "@/lib/access-token-cookie";
import {
  SESSION_PRESENCE_COOKIE,
  SESSION_PRESENCE_MAX_AGE_SEC,
} from "@/lib/auth-route-guard";
import { APP_ROUTES } from "@/lib/config";
import { loginHrefForDestination } from "@/lib/login-audience";
import {
  buildSessionFinalizeHtml,
  prefetchSessionBootstrap,
  resolveFinalizeDestination,
} from "@/lib/login-session.server";
import {
  isSameSiteHandoffOrigin,
  requestHostname,
  sessionCookieDomain,
} from "@/lib/tenant-host";

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
  const url = new URL(loginHrefForDestination(requestedNext), request.url);
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
  const handoffOrigin = readField(form, "handoffOrigin");
  const slug = readField(form, "slug");
  const office =
    String(form.get("office") ?? "").trim() === "1" ||
    String(form.get("mode") ?? "").trim().toLowerCase() === "office";
  const tenantHost = resolveTenantHost(request);
  const cookieDomain = sessionCookieDomain(request) || undefined;

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

  const nextPath = resolveFinalizeDestination(
    bootstrap.me,
    requestedNext,
    bootstrap.business,
    { office },
  );

  const secure = new URL(request.url).protocol === "https:";
  const applySessionCookies = (response: NextResponse) => {
    response.cookies.set({
      name: SESSION_PRESENCE_COOKIE,
      value: "1",
      path: "/",
      maxAge: SESSION_PRESENCE_MAX_AGE_SEC,
      sameSite: "lax",
      secure,
      httpOnly: false,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    applyAccessTokenCookie(response, accessToken, {
      secure,
      domain: cookieDomain,
    });
    // Cross-origin handoff (SA impersonation) brings refresh in the form — mint
    // the same Path=/api cookie Spring sets so restore-session can see it.
    if (refreshToken) {
      response.cookies.set({
        name: "ub.refresh",
        value: refreshToken,
        path: "/api",
        maxAge: 30 * 24 * 60 * 60,
        sameSite: "lax",
        secure,
        httpOnly: true,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      });
      // Next keys cookies by name — append the legacy-path clear as a raw header.
      const secureAttr = secure ? "; Secure" : "";
      const domainAttr = cookieDomain ? `; Domain=${cookieDomain}` : "";
      response.headers.append(
        "Set-Cookie",
        `ub.refresh=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Lax${secureAttr}${domainAttr}`,
      );
    }
  };

  // Owner/admin signup often verifies on the platform apex, then must land on
  // {slug}.kiosk.ke. Mint parent-domain cookies here, then 303 to the shop
  // handoff so restore-session sees ub.access / ub.refresh.
  if (
    handoffOrigin &&
    isSameSiteHandoffOrigin(handoffOrigin, requestHostname(request))
  ) {
    const dest = new URL(APP_ROUTES.authHandoff, handoffOrigin);
    dest.searchParams.set("next", nextPath);
    if (slug) {
      dest.searchParams.set("slug", slug);
    }
    const redirect = NextResponse.redirect(dest, 303);
    applySessionCookies(redirect);
    return redirect;
  }

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
  applySessionCookies(response);
  return response;
}

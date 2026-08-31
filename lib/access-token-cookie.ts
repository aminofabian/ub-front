/**
 * Gap G (increment 1): BFF-held httpOnly access JWT.
 *
 * Dual-write with `ub.accessToken` in web storage remains until clients stop
 * sending Bearer from JS. The Next proxy injects Authorization from this cookie
 * when the browser omits it.
 *
 * Path is `/api` (not `/api/v1`) so BFF routes and Next auth helpers under
 * `/api/auth/*` (store-session, session, restore-session) all receive the cookie.
 */

import { parseAccessTokenClaims } from "@/lib/jwt-client";

export const ACCESS_TOKEN_COOKIE = "ub.access";

/** Sent on same-origin `/api/*` BFF + auth helper calls. */
export const ACCESS_TOKEN_COOKIE_PATH = "/api";

/**
 * Prior Gap G1 path. Cleared whenever we set/clear so browsers do not keep a
 * second `ub.access` that only covers `/api/v1/*`.
 */
export const ACCESS_TOKEN_COOKIE_LEGACY_PATH = "/api/v1";

const DEFAULT_MAX_AGE_SEC = 60 * 60;

export function accessTokenMaxAgeSec(accessToken: string): number {
  const exp = parseAccessTokenClaims(accessToken)?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return DEFAULT_MAX_AGE_SEC;
  }
  const seconds = Math.floor(exp - Date.now() / 1000);
  if (seconds <= 0) {
    return 60;
  }
  return Math.min(seconds, 24 * 60 * 60);
}

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Read {@code ub.access}. When the browser sends both a host-only leftover and
 * a parent-domain cookie, prefer the JWT with the latest {@code exp} so a
 * 3-minute refresh cannot keep injecting a revoked jti.
 */
export function readAccessTokenFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  let best: string | null = null;
  let bestExp = Number.NEGATIVE_INFINITY;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${ACCESS_TOKEN_COOKIE}=`)) {
      continue;
    }
    const raw = trimmed.slice(ACCESS_TOKEN_COOKIE.length + 1).trim();
    if (!raw) {
      continue;
    }
    const token = decodeCookieValue(raw);
    const exp = parseAccessTokenClaims(token)?.exp;
    const score = typeof exp === "number" && Number.isFinite(exp) ? exp : 0;
    if (best === null || score > bestExp) {
      best = token;
      bestExp = score;
    }
  }
  return best;
}

export type AccessTokenCookieOptions = {
  secure: boolean;
  maxAgeSec?: number;
  /** Parent domain (e.g. `.kiosk.ke`) so apex → shop-subdomain handoff keeps the JWT. */
  domain?: string;
};

type AccessCookieSetShape = {
  name: string;
  value: string;
  path: string;
  maxAge: number;
  sameSite: "lax";
  secure: boolean;
  httpOnly: true;
  domain?: string;
};

/** Cookie attributes for {@link NextResponse.cookies.set}. */
export function accessTokenCookieSetOptions(
  accessToken: string,
  opts: AccessTokenCookieOptions,
): AccessCookieSetShape {
  const domain = opts.domain?.trim();
  return {
    name: ACCESS_TOKEN_COOKIE,
    value: accessToken,
    path: ACCESS_TOKEN_COOKIE_PATH,
    maxAge: opts.maxAgeSec ?? accessTokenMaxAgeSec(accessToken),
    sameSite: "lax",
    secure: opts.secure,
    httpOnly: true,
    ...(domain ? { domain } : {}),
  };
}

export function accessTokenCookieClearOptions(opts: {
  secure: boolean;
  path?: string;
  domain?: string;
}): AccessCookieSetShape {
  const domain = opts.domain?.trim();
  return {
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    path: opts.path ?? ACCESS_TOKEN_COOKIE_PATH,
    maxAge: 0,
    sameSite: "lax",
    secure: opts.secure,
    httpOnly: true,
    ...(domain ? { domain } : {}),
  };
}

/**
 * Serialize a Set-Cookie line. Next's `cookies.set` keys by cookie name only, so
 * a second `ub.access` (legacy path clear) would overwrite the primary set —
 * append raw headers for extra path variants instead.
 */
export function serializeAccessTokenCookie(
  opts: AccessCookieSetShape,
): string {
  const value = opts.value ? encodeURIComponent(opts.value) : "";
  let line = `${opts.name}=${value}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=${opts.sameSite}`;
  if (opts.domain) {
    line += `; Domain=${opts.domain}`;
  }
  if (opts.secure) {
    line += "; Secure";
  }
  return line;
}

type CookieResponse = {
  cookies: {
    set: (options: AccessCookieSetShape) => unknown;
  };
  headers: {
    append: (name: string, value: string) => void;
  };
};

/** Set `ub.access` on `/api` and expire any legacy `/api/v1` copy. */
export function applyAccessTokenCookie(
  response: CookieResponse,
  accessToken: string,
  opts: AccessTokenCookieOptions,
): void {
  response.cookies.set(accessTokenCookieSetOptions(accessToken, opts));
  response.headers.append(
    "Set-Cookie",
    serializeAccessTokenCookie(
      accessTokenCookieClearOptions({
        secure: opts.secure,
        path: ACCESS_TOKEN_COOKIE_LEGACY_PATH,
        domain: opts.domain,
      }),
    ),
  );
  // Host-only cookies beat parent-domain ones in Chrome. Expire leftovers so
  // the next request does not keep the pre-refresh (revoked) jti.
  if (opts.domain) {
    response.headers.append(
      "Set-Cookie",
      serializeAccessTokenCookie(
        accessTokenCookieClearOptions({ secure: opts.secure }),
      ),
    );
    response.headers.append(
      "Set-Cookie",
      serializeAccessTokenCookie(
        accessTokenCookieClearOptions({
          secure: opts.secure,
          path: ACCESS_TOKEN_COOKIE_LEGACY_PATH,
        }),
      ),
    );
  }
}

/** Clear `ub.access` on current + legacy paths (parent-domain and host-only leftovers). */
export function clearAccessTokenCookies(
  response: CookieResponse,
  opts: { secure: boolean; domain?: string },
): void {
  response.cookies.set(
    accessTokenCookieClearOptions({
      secure: opts.secure,
      domain: opts.domain,
    }),
  );
  response.headers.append(
    "Set-Cookie",
    serializeAccessTokenCookie(
      accessTokenCookieClearOptions({
        secure: opts.secure,
        path: ACCESS_TOKEN_COOKIE_LEGACY_PATH,
        domain: opts.domain,
      }),
    ),
  );
  if (opts.domain) {
    response.headers.append(
      "Set-Cookie",
      serializeAccessTokenCookie(
        accessTokenCookieClearOptions({ secure: opts.secure }),
      ),
    );
    response.headers.append(
      "Set-Cookie",
      serializeAccessTokenCookie(
        accessTokenCookieClearOptions({
          secure: opts.secure,
          path: ACCESS_TOKEN_COOKIE_LEGACY_PATH,
        }),
      ),
    );
  }
}

/** Tenant auth only — super-admin and supplier-portal keep Bearer tokens in sessionStorage. */
const TENANT_AUTH_PREFIX = "/api/v1/auth/";

/** Auth JSON responses that mint a new access token. */
export function isAccessTokenMintPath(pathname: string): boolean {
  if (!pathname.startsWith(TENANT_AUTH_PREFIX)) {
    return false;
  }
  return (
    pathname.endsWith("/login") ||
    pathname.endsWith("/login-pin") ||
    pathname.endsWith("/unlock-pin") ||
    pathname.endsWith("/refresh") ||
    pathname.endsWith("/register") ||
    pathname.endsWith("/accept-invite") ||
    pathname.endsWith("/verify-email")
  );
}

/** Auth responses that should drop the BFF access cookie. */
export function isAccessTokenClearPath(pathname: string): boolean {
  return (
    pathname.endsWith("/auth/logout") ||
    pathname.endsWith("/auth/clear-session-cookie")
  );
}

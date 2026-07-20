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

export function readAccessTokenFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${ACCESS_TOKEN_COOKIE}=`)) {
      continue;
    }
    const raw = trimmed.slice(ACCESS_TOKEN_COOKIE.length + 1).trim();
    if (!raw) {
      return null;
    }
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export type AccessTokenCookieOptions = {
  secure: boolean;
  maxAgeSec?: number;
};

type AccessCookieSetShape = {
  name: string;
  value: string;
  path: string;
  maxAge: number;
  sameSite: "lax";
  secure: boolean;
  httpOnly: true;
};

/** Cookie attributes for {@link NextResponse.cookies.set}. */
export function accessTokenCookieSetOptions(
  accessToken: string,
  opts: AccessTokenCookieOptions,
): AccessCookieSetShape {
  return {
    name: ACCESS_TOKEN_COOKIE,
    value: accessToken,
    path: ACCESS_TOKEN_COOKIE_PATH,
    maxAge: opts.maxAgeSec ?? accessTokenMaxAgeSec(accessToken),
    sameSite: "lax",
    secure: opts.secure,
    httpOnly: true,
  };
}

export function accessTokenCookieClearOptions(opts: {
  secure: boolean;
  path?: string;
}): AccessCookieSetShape {
  return {
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    path: opts.path ?? ACCESS_TOKEN_COOKIE_PATH,
    maxAge: 0,
    sameSite: "lax",
    secure: opts.secure,
    httpOnly: true,
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
      }),
    ),
  );
}

/** Clear `ub.access` on current + legacy paths. */
export function clearAccessTokenCookies(
  response: CookieResponse,
  opts: { secure: boolean },
): void {
  response.cookies.set(accessTokenCookieClearOptions({ secure: opts.secure }));
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

/** Auth JSON responses that mint a new access token. */
export function isAccessTokenMintPath(pathname: string): boolean {
  return (
    pathname.endsWith("/auth/login") ||
    pathname.endsWith("/auth/login-pin") ||
    pathname.endsWith("/auth/unlock-pin") ||
    pathname.endsWith("/auth/refresh") ||
    pathname.endsWith("/auth/register") ||
    pathname.endsWith("/auth/accept-invite")
  );
}

/** Auth responses that should drop the BFF access cookie. */
export function isAccessTokenClearPath(pathname: string): boolean {
  return (
    pathname.endsWith("/auth/logout") ||
    pathname.endsWith("/auth/clear-session-cookie")
  );
}

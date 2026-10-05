import { cookieDomainForHost } from "@/lib/tenant-host";

export const REFRESH_COOKIE_NAME = "ub.refresh";

/**
 * A {@code Max-Age=0} {@code ub.refresh} on the live {@code /api} path.
 * The API emits these as host-only leftovers. Re-attaching the shop parent
 * domain (`.palmart.co.ke`) makes the browser delete the cookie we just set,
 * so the next refresh — about 3 minutes later on a short access token — has
 * no session and the owner is sent to sign-in.
 */
function isLiveRefreshDeletion(setCookie: string): boolean {
  const first = (setCookie.split(";")[0] ?? "").trim().toLowerCase();
  if (!first.startsWith(`${REFRESH_COOKIE_NAME.toLowerCase()}=`)) {
    return false;
  }
  if (first.slice(REFRESH_COOKIE_NAME.length + 1).trim() !== "") {
    return false;
  }
  if (!/;\s*Max-Age=0\b/i.test(setCookie)) {
    return false;
  }
  const path = /;\s*Path=([^;]*)/i.exec(setCookie)?.[1]?.trim() || "/";
  return path === "/api" || path === "/api/";
}

/**
 * Drop the upstream API {@code Domain=} and, when the browser is on a real
 * host, re-apply the frontend parent domain so {@code ub.refresh} survives
 * apex → shop-subdomain handoff after owner/admin signup.
 *
 * Live-path deletions stay host-only so they cannot erase that parent-domain
 * cookie.
 */
export function rewriteSetCookieForFrontend(
  setCookie: string,
  hostname?: string | null,
): string {
  let out = setCookie.replace(/;\s*Domain=[^;]*/gi, "");
  if (isLiveRefreshDeletion(setCookie)) {
    return out;
  }
  const host = hostname?.split(":")[0]?.trim() ?? "";
  const domain = host ? cookieDomainForHost(host) : "";
  if (domain) {
    out += `; Domain=${domain}`;
  }
  return out;
}

function refreshCookieValue(setCookie: string): string {
  const first = (setCookie.split(";")[0] ?? "").trim();
  const prefix = `${REFRESH_COOKIE_NAME}=`;
  if (!first.toLowerCase().startsWith(prefix.toLowerCase())) {
    return "";
  }
  return first.slice(prefix.length).trim();
}

function refreshCookiePath(setCookie: string): string {
  return /;\s*Path=([^;]*)/i.exec(setCookie)?.[1]?.trim() || "/";
}

/**
 * Logout sends a live-path {@code Max-Age=0} and nothing else. That deletion
 * must also target the parent-domain cookie login wrote. A refresh response
 * that both sets a new token and emits a live-path deletion must NOT — re-homing
 * that deletion would erase the cookie just minted.
 */
export function shouldExpireParentDomainRefresh(setCookies: string[]): boolean {
  let liveClear = false;
  let liveSet = false;
  for (const cookie of setCookies) {
    const path = refreshCookiePath(cookie);
    const livePath = path === "/api" || path === "/api/";
    if (!livePath) {
      continue;
    }
    if (isLiveRefreshDeletion(cookie)) {
      liveClear = true;
      continue;
    }
    if (refreshCookieValue(cookie)) {
      liveSet = true;
    }
  }
  return liveClear && !liveSet;
}

/** Parent-domain deletion for the live {@code ub.refresh} cookie. */
export function parentDomainLiveRefreshClear(
  hostname: string | null | undefined,
  secure: boolean,
): string | null {
  const host = hostname?.split(":")[0]?.trim() ?? "";
  const domain = host ? cookieDomainForHost(host) : "";
  if (!domain) {
    return null;
  }
  const secureAttr = secure ? "; Secure" : "";
  return `${REFRESH_COOKIE_NAME}=; Path=/api; Max-Age=0; HttpOnly; SameSite=Lax; Domain=${domain}${secureAttr}`;
}

/**
 * Expire host-only {@code ub.refresh} on the legacy path only.
 * A {@code Path=/api} deletion in the same response as the live cookie is
 * what browsers apply to the parent-domain session and drops the owner.
 */
export function hostOnlyRefreshCookieClears(secure: boolean): string[] {
  const secureAttr = secure ? "; Secure" : "";
  return [
    `${REFRESH_COOKIE_NAME}=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Lax${secureAttr}`,
  ];
}

export function readSetCookieHeaders(from: Headers): string[] {
  if (typeof from.getSetCookie === "function") {
    return from.getSetCookie();
  }
  const combined = from.get("set-cookie");
  return combined ? [combined] : [];
}

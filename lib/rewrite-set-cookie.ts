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

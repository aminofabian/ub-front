import { cookieDomainForHost } from "@/lib/tenant-host";

export const REFRESH_COOKIE_NAME = "ub.refresh";

/**
 * Drop the upstream API {@code Domain=} and, when the browser is on a real
 * host, re-apply the frontend parent domain so {@code ub.refresh} survives
 * apex → shop-subdomain handoff after owner/admin signup.
 */
export function rewriteSetCookieForFrontend(
  setCookie: string,
  hostname?: string | null,
): string {
  let out = setCookie.replace(/;\s*Domain=[^;]*/gi, "");
  const host = hostname?.split(":")[0]?.trim() ?? "";
  const domain = host ? cookieDomainForHost(host) : "";
  if (domain) {
    out += `; Domain=${domain}`;
  }
  return out;
}

/** Expire host-only {@code ub.refresh} leftovers that would shadow the parent-domain cookie. */
export function hostOnlyRefreshCookieClears(secure: boolean): string[] {
  const secureAttr = secure ? "; Secure" : "";
  return [
    `${REFRESH_COOKIE_NAME}=; Path=/api; Max-Age=0; HttpOnly; SameSite=Lax${secureAttr}`,
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

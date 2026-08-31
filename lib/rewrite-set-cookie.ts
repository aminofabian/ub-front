import { cookieDomainForHost } from "@/lib/tenant-host";

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

export function readSetCookieHeaders(from: Headers): string[] {
  if (typeof from.getSetCookie === "function") {
    return from.getSetCookie();
  }
  const combined = from.get("set-cookie");
  return combined ? [combined] : [];
}

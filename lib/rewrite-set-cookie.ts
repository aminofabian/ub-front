/**
 * Strip {@code Domain=} from upstream Set-Cookie so the browser stores the
 * cookie on the Next.js frontend host, not the Java API host the BFF calls.
 */
export function rewriteSetCookieForFrontend(setCookie: string): string {
  return setCookie.replace(/;\s*Domain=[^;]*/gi, "");
}

export function readSetCookieHeaders(from: Headers): string[] {
  if (typeof from.getSetCookie === "function") {
    return from.getSetCookie();
  }
  const combined = from.get("set-cookie");
  return combined ? [combined] : [];
}

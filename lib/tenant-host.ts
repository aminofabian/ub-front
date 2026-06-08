/** Strips a leading {@code www.} segment for host comparison (www.palmart.co.ke ≡ palmart.co.ke). */
export function stripLeadingWww(host: string): string {
  const h = host.trim().toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

/** True when two hostnames refer to the same tenant site (ignoring {@code www.}). */
export function tenantHostsMatch(a: string, b: string): boolean {
  return stripLeadingWww(a) === stripLeadingWww(b);
}

const CC_SLD = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);

/**
 * Parent domain for first-party session cookies so {@code www.} and apex share
 * {@code ub.session} (e.g. {@code .palmart.co.ke}).
 */
export function cookieDomainForHost(hostname: string): string {
  const h = stripLeadingWww(hostname.trim().toLowerCase());
  if (!h || h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) {
    return "";
  }
  const parts = h.split(".");
  if (parts.length >= 4 && CC_SLD.has(parts[parts.length - 2] ?? "")) {
    return `.${parts.slice(-3).join(".")}`;
  }
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join(".")}`;
  }
  return "";
}

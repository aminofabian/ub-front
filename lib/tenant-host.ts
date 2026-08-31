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
  if (
    !h ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".localhost")
  ) {
    return "";
  }
  const parts = h.split(".");
  if (parts.length >= 3 && CC_SLD.has(parts[parts.length - 2] ?? "")) {
    return `.${parts.slice(-3).join(".")}`;
  }
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join(".")}`;
  }
  return "";
}

type HeaderReader = { get(name: string): string | null };

/** Hostname from `x-forwarded-host` or `host`, without port. */
export function requestHostname(request: { headers: HeaderReader }): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (forwarded || request.headers.get("host") || "")
    .split(":")[0]
    ?.trim();
  return host || "";
}

/** Parent cookie domain for the incoming request host, or `""` on localhost. */
export function sessionCookieDomain(request: { headers: HeaderReader }): string {
  return cookieDomainForHost(requestHostname(request));
}

/**
 * True when {@code origin} is the same host or the same registrable parent as
 * {@code currentHostname} (apex ↔ shop subdomain). Rejects open redirects.
 */
export function isSameSiteHandoffOrigin(
  origin: string,
  currentHostname: string,
): boolean {
  let target: URL;
  try {
    target = new URL(origin);
  } catch {
    return false;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return false;
  }
  const current = stripLeadingWww(currentHostname);
  const dest = stripLeadingWww(target.hostname);
  if (!current || !dest) {
    return false;
  }
  if (current === dest) {
    return true;
  }
  const currentDomain = cookieDomainForHost(current);
  const destDomain = cookieDomainForHost(dest);
  if (currentDomain && destDomain && currentDomain === destDomain) {
    return true;
  }
  const currentLocal =
    current === "localhost" || current.endsWith(".localhost");
  const destLocal = dest === "localhost" || dest.endsWith(".localhost");
  return currentLocal && destLocal;
}

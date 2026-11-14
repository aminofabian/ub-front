const HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Lower-case hostname, without a port or a scheme. Empty when it is not a host. */
export function tidyHostname(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim().toLowerCase() ?? "";
  const withoutScheme = first.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const host = withoutScheme.split(":")[0] ?? "";
  return HOST.test(host) ? host : null;
}

/**
 * Absolute URL to send the browser to, or null when this host should stay.
 * The target is a hostname we already resolved, never a scheme or path from
 * the caller, so a crafted host cannot leave the shop.
 */
export function canonicalRedirectUrl(
  requestHost: string | null | undefined,
  canonicalHost: string | null | undefined,
  pathAndQuery: string | null | undefined,
): string | null {
  const current = tidyHostname(requestHost);
  const target = tidyHostname(canonicalHost);
  if (!current || !target || current === target) return null;
  const path = safePath(pathAndQuery);
  return `https://${target}${path}`;
}

function safePath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  if (raw.includes("\\") || raw.includes("\n") || raw.includes("\r") || raw.includes("\0")) {
    return "/";
  }
  return raw;
}

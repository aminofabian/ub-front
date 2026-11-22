/**
 * The wholesale marketplace lives on its own host (ADR 0038, P0.6):
 * `marketplace.kiosk.ke`, not a page under the platform apex or under a shop.
 *
 * It is switched on by `NEXT_PUBLIC_MARKETPLACE_HOST` (for example
 * `marketplace.kiosk.ke`, or `marketplace.localhost:3000` in local dev). While
 * that is unset nothing here changes any route, so previews, staging and local
 * work keep serving `/marketplace` where they always did.
 *
 * Pure functions only: the middleware runs them on every request.
 */

/** Host (with port when one is given) the marketplace is served on, or "" when off. */
export function configuredMarketplaceHost(): string {
  return normalizeHost(process.env.NEXT_PUBLIC_MARKETPLACE_HOST ?? "");
}

function normalizeHost(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function hostnameOnly(host: string): string {
  // Proxies may send "a.example.com, b.example.com": use the leftmost.
  const first = host.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.split(":")[0] ?? "";
}

export function isMarketplaceHostname(
  requestHost: string | null | undefined,
  marketplaceHost: string = configuredMarketplaceHost(),
): boolean {
  if (!marketplaceHost || !requestHost) return false;
  return hostnameOnly(requestHost) === hostnameOnly(marketplaceHost);
}

/** `https://marketplace.kiosk.ke`, or "" when the marketplace host is off. */
export function marketplaceOrigin(
  marketplaceHost: string = configuredMarketplaceHost(),
): string {
  if (!marketplaceHost) return "";
  const name = hostnameOnly(marketplaceHost);
  const local = name === "localhost" || name.endsWith(".localhost");
  return `${local ? "http" : "https"}://${marketplaceHost}`;
}

/**
 * Origin for canonical marketplace URLs: the marketplace host when it is on,
 * otherwise the fallback (the app base URL).
 */
export function marketplacePublicOrigin(fallbackBaseUrl: string): string {
  return marketplaceOrigin() || fallbackBaseUrl.replace(/\/+$/, "");
}

export type MarketplaceRouting =
  /** Serve this path instead, keeping the URL the visitor sees. */
  | { kind: "rewrite"; pathname: string }
  /** Send the visitor to this absolute URL (308). */
  | { kind: "redirect"; url: string }
  | null;

/** The shop's own review queue for supplier product edits; it needs the shop's session. */
const TENANT_ONLY_PREFIX = "/marketplace/product-edits";

/**
 * What to do with a page request, given the host it arrived on.
 *
 * - On the marketplace host, `/` is the directory and `/marketplace` is its old
 *   spelling.
 * - On every other host (the apex and every shop), `/marketplace…` belongs to
 *   the marketplace host. A shop's host must be the shop.
 */
export function marketplaceRouting(
  requestHost: string | null | undefined,
  pathname: string,
  search: string = "",
  marketplaceHost: string = configuredMarketplaceHost(),
): MarketplaceRouting {
  if (!marketplaceHost) return null;
  const isDirectoryRoot = pathname === "/marketplace" || pathname === "/marketplace/";
  const isUnderMarketplace = isDirectoryRoot || pathname.startsWith("/marketplace/");
  const origin = marketplaceOrigin(marketplaceHost);

  if (isMarketplaceHostname(requestHost, marketplaceHost)) {
    if (pathname === "/") return { kind: "rewrite", pathname: "/marketplace" };
    if (isDirectoryRoot) return { kind: "redirect", url: `${origin}/${search}` };
    return null;
  }

  if (!isUnderMarketplace) return null;
  if (
    pathname === TENANT_ONLY_PREFIX ||
    pathname.startsWith(`${TENANT_ONLY_PREFIX}/`)
  ) {
    return null;
  }
  return {
    kind: "redirect",
    url: `${origin}${isDirectoryRoot ? "/" : pathname}${search}`,
  };
}

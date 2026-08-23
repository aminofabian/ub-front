import { slugDerivedShopUrl } from "@/lib/config";

/**
 * Phase 4 (§8, §12, §21): the apex never authenticates — it identifies a shop
 * and forwards to the shop's own host. Forward URLs must be built exclusively
 * from the resolved tenant record's hosts (slug + primaryHost), never from raw
 * user input, and a tampered query can never redirect off the tenant's own
 * hosts.
 */

export type ApexShopRecord = {
  slug: string;
  name: string;
  logoUrl?: string | null;
  primaryHost?: string | null;
};

const HOSTNAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

/**
 * True for a bare hostname (letters, digits, dots, hyphens) that cannot carry
 * a scheme, credentials, port, or path. Only such values may become a forward
 * origin — anything else falls back to the slug-derived origin.
 */
export function isValidTenantHost(host: string | null | undefined): host is string {
  if (!host) {
    return false;
  }
  const h = host.trim().toLowerCase();
  if (h.length > 253 || h.startsWith(".") || h.endsWith(".")) {
    return false;
  }
  if (!HOSTNAME_PATTERN.test(h)) {
    return false;
  }
  return !/[/:@?#]/.test(h);
}

/**
 * The origin the apex forwards to for a shop. Prefers the tenant's own
 * {@code primaryHost} (custom domain or platform subdomain as recorded); falls
 * back to the slug-derived origin. In dev the local dev server runs on
 * {@code {slug}.localhost:<port>}, where the backend's host has no port — so
 * the slug-derived origin wins there.
 */
export function resolveApexShopOrigin(shop: ApexShopRecord): string {
  const slug = shop.slug.trim().toLowerCase();
  if (!slug) {
    return "";
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return slugDerivedShopUrl(slug);
    }
  }
  if (isValidTenantHost(shop.primaryHost)) {
    return `https://${shop.primaryHost.trim().toLowerCase()}`;
  }
  return slugDerivedShopUrl(slug);
}

/**
 * Full forward URL for a shop-relative path (e.g. {@code /login?next=…}).
 * Returns "" when no origin can be derived — callers must not navigate.
 */
export function buildApexForwardUrl(shop: ApexShopRecord, path: string): string {
  const origin = resolveApexShopOrigin(shop);
  if (!origin) {
    return "";
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}

/**
 * Normalizes the apex sheet's search input before hitting
 * {@code /api/v1/public/shops/search}: pasted URLs become their hostname
 * (scheme/path stripped, the full host kept so custom domains still match
 * server-side); everything else is passed through trimmed.
 */
export function apexShopSearchQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      /* fall through to raw */
    }
  }
  return trimmed;
}

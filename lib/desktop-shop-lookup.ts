/**
 * Cloud shop lookup for the desktop first-run wizard.
 *
 * The till webview talks to localhost; shop discovery must hit the online API
 * ({@link REMOTE_API_ORIGIN}) so owners can find their kiosk.ke shop before
 * signing in to copy it onto this PC.
 */

import {
  parseSignInDestinations,
  type PublicSignInDestination,
} from "@/lib/api";
import { REMOTE_API_ORIGIN, PLATFORM_DOMAIN } from "@/lib/config";
import { normalizeShopLookupQuery } from "@/lib/shop-lookup";

const LOOKUP_ORIGIN = REMOTE_API_ORIGIN.replace(/\/$/, "");

export type DesktopFoundShop = {
  name: string;
  slug: string;
  host: string;
  logoUrl: string | null;
  /** API origin used for connect + sync (not the storefront host). */
  apiOrigin: string;
};

function toFoundShop(row: PublicSignInDestination): DesktopFoundShop | null {
  const slug = row.slug?.trim().toLowerCase() ?? "";
  if (!slug) return null;
  const host =
    row.primaryHost?.trim().toLowerCase() || `${slug}.${PLATFORM_DOMAIN}`;
  return {
    name: row.name.trim() || slug,
    slug,
    host,
    logoUrl: row.logoUrl?.trim() || null,
    apiOrigin: LOOKUP_ORIGIN,
  };
}

/** Staff shops linked to this email on kiosk.ke. */
export async function findDesktopShopsByEmail(
  email: string,
): Promise<DesktopFoundShop[]> {
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) return [];
  const url = `${LOOKUP_ORIGIN}/api/v1/public/host/sign-in-destinations?email=${encodeURIComponent(e)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return parseSignInDestinations(await res.json())
      .filter((row) => row.door === "STAFF")
      .map(toFoundShop)
      .filter((s): s is DesktopFoundShop => s != null);
  } catch {
    return [];
  }
}

/**
 * Find a shop by name, slug, or pasted URL (e.g. "Palmart", "palmart",
 * "https://palmart.kiosk.ke").
 */
export async function findDesktopShopByQuery(
  query: string,
): Promise<DesktopFoundShop | null> {
  const q = normalizeShopLookupQuery(query);
  if (!q) return null;
  const url = `${LOOKUP_ORIGIN}/api/v1/public/host/resolve-by-shop?q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      tenantName?: unknown;
      slug?: unknown;
      branding?: { logoUrl?: unknown } | null;
    };
    const slug =
      typeof payload.slug === "string" ? payload.slug.trim().toLowerCase() : "";
    if (!slug) return null;
    const name =
      typeof payload.tenantName === "string" && payload.tenantName.trim()
        ? payload.tenantName.trim()
        : slug;
    const logoUrl =
      typeof payload.branding?.logoUrl === "string" &&
      payload.branding.logoUrl.trim()
        ? payload.branding.logoUrl.trim()
        : null;
    return {
      name,
      slug,
      host: `${slug}.${PLATFORM_DOMAIN}`,
      logoUrl,
      apiOrigin: LOOKUP_ORIGIN,
    };
  } catch {
    return null;
  }
}

import { isPlatformApexHost } from "@/lib/config";
import { isMarketplaceHostname } from "@/lib/marketplace-host";

/**
 * On a supplier's own shop address the portal's pages drop the `/supplier-portal` prefix: the shop already is the
 * supplier's place, so `yourshop.kiosk.ke/shops`, not `yourshop.kiosk.ke/supplier-portal/shops`. On the platform's
 * own address (`kiosk.ke`) the portal keeps its prefix, because there it is one product among several.
 *
 * Each portal page keeps its name, except the few whose name a shop page already has.
 */
const PREFIX = "/supplier-portal";

/** Portal page → the first part of its address on a shop. */
const SHOP_NAME: Record<string, string> = {
  shops: "shops",
  orders: "orders",
  deliveries: "deliveries",
  invoices: "invoices",
  statements: "statements",
  reports: "reports",
  catalog: "catalog",
  notifications: "notifications",
  team: "team",
  profile: "profile",
  "payment-details": "payment-details",
  // A shop already has pages with these names, so the portal's take another.
  messages: "shop-messages",
  payments: "shop-payments",
  overview: "supply",
  settings: "portal-settings",
};

const PORTAL_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(SHOP_NAME).map(([portal, shop]) => [shop, portal]),
);

/** Where the portal's sign-in sends someone on a shop: back to the trade desk, which opens the portal signed in. */
const SHOP_SIGN_IN = "/storefront/trade-orders";

function hostnameOnly(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
}

/** True for a shop's own address: not the platform's, not the marketplace's, not bare localhost. */
export function isShopHost(host: string | null | undefined): boolean {
  const h = hostnameOnly(host);
  if (!h || h === "localhost" || h === "127.0.0.1") return false;
  return !isPlatformApexHost(h) && !isMarketplaceHostname(h);
}

function split(pathname: string): { first: string; rest: string } {
  const parts = pathname.split("/").filter((part) => part.length > 0);
  return { first: parts[0] ?? "", rest: parts.slice(1).join("/") };
}

/** `/supplier-portal/shops/abc` → `/shops/abc`. A path that is not a portal page with a shop name is returned as it is. */
export function shopPathForPortalPath(pathname: string): string {
  if (pathname !== PREFIX && !pathname.startsWith(`${PREFIX}/`)) return pathname;
  const { first, rest } = split(pathname.slice(PREFIX.length));
  const shopName = SHOP_NAME[first];
  if (!shopName) return pathname;
  return rest ? `/${shopName}/${rest}` : `/${shopName}`;
}

/** `/shops/abc` → `/supplier-portal/shops/abc`. Null when the path is not one of the portal's pages on a shop. */
export function portalPathForShopPath(pathname: string): string | null {
  const { first, rest } = split(pathname);
  const portalName = PORTAL_NAME[first];
  if (!portalName) return null;
  return rest ? `${PREFIX}/${portalName}/${rest}` : `${PREFIX}/${portalName}`;
}

export type ShopPortalRouting =
  | { kind: "redirect"; pathname: string }
  | { kind: "rewrite"; pathname: string }
  | null;

/**
 * What the routing layer does with a request on a shop's address. A prefixed portal address is sent to its short
 * one; a short one is served by the portal page behind it. Everything else, and every other host, is left alone.
 */
export function shopPortalRouting(host: string | null | undefined, pathname: string): ShopPortalRouting {
  if (!isShopHost(host)) return null;
  if (pathname === `${PREFIX}/login`) {
    return { kind: "redirect", pathname: SHOP_SIGN_IN };
  }
  if (pathname.startsWith(`${PREFIX}/`)) {
    const short = shopPathForPortalPath(pathname);
    return short === pathname ? null : { kind: "redirect", pathname: short };
  }
  const portal = portalPathForShopPath(pathname);
  return portal ? { kind: "rewrite", pathname: portal } : null;
}

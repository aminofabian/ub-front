import { APP_ROUTES } from "@/lib/config";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
import type { BusinessRecord } from "@/lib/api";
import {
  getBusinessStoreTypes,
  isButcheryOnlyBusiness,
  type StoreTypeId,
} from "@/lib/business-store-type";

export type PostAuthMe = {
  role?: { key?: string | null } | null;
};

function isSafeAppPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/** Storefront destinations from `?next=` — password login should honor these. */
export function isShopNextPath(path?: string | null): boolean {
  const next = path?.trim() ?? "";
  return (
    isSafeAppPath(next) &&
    (next === APP_ROUTES.shop || next.startsWith(`${APP_ROUTES.shop}/`))
  );
}

/**
 * Where to send the user after sign-in.
 * Shop `?next=` paths win (password login from the storefront).
 * Otherwise role homes beat generic defaults (clerks → till apps, not /business).
 * Used on the server during session finalize and on the client when fetchMe succeeds.
 */
export function resolvePostAuthDestination(
  me: PostAuthMe | null | undefined,
  requestedNext?: string | null,
  business?: BusinessRecord | null,
): string {
  const requested = requestedNext?.trim() ?? "";
  if (isShopNextPath(requested)) {
    return requested;
  }

  if (me && isBuyerAccount(me)) {
    return buyerHomePath();
  }

  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey === "grocery_clerk") {
    return APP_ROUTES.grocery;
  }
  if (roleKey === "butcher_cashier") {
    return APP_ROUTES.butcher;
  }
  if (roleKey === "cashier") {
    return APP_ROUTES.cashier;
  }
  if (roleKey === "stock_manager") {
    return APP_ROUTES.inventoryStockTakeDailyAudit;
  }

  if (isSafeAppPath(requested)) {
    return requested;
  }

  if (isButcheryOnlyBusiness(business)) {
    return APP_ROUTES.butcher;
  }

  return APP_ROUTES.business;
}

/** Admin landing pages that should redirect when the role has a dedicated app. */
export const ROLE_OVERRIDE_LANDING_PATHS = new Set<string>([
  APP_ROUTES.business,
  APP_ROUTES.overview,
]);

/** Returns a redirect target when the user landed on a generic page by mistake. */
export function roleLandingRedirect(
  me: PostAuthMe | null | undefined,
  pathname: string,
  business?: BusinessRecord | null,
): string | null {
  const home = resolvePostAuthDestination(me, null, business);
  if (home === pathname) {
    return null;
  }
  if (!ROLE_OVERRIDE_LANDING_PATHS.has(pathname)) {
    return null;
  }
  return home;
}

export function formatBusinessStoreTypesLabel(
  business: BusinessRecord | null | undefined,
): string {
  const labels: Record<StoreTypeId, string> = {
    butchery: "Butchery",
    "mini-mart": "Mini mart",
    "full-grocery": "Full grocery",
    "fresh-market": "Fresh market",
    "mixed-shop": "Mixed shop",
    cosmetics: "Cosmetics",
    "wines-spirits": "Wines & spirits",
    other: "Other",
  };
  const types = getBusinessStoreTypes(business);
  if (types.length === 0) {
    return "your shop";
  }
  const names = types.map((type) => labels[type]);
  if (names.length === 1) {
    return names[0]!;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

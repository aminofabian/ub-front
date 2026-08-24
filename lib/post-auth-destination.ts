import { APP_ROUTES } from "@/lib/config";
import {
  buyerHomePath,
  customerTabPathFromPhone,
  isBuyerAccount,
  isCustomerTabPath,
} from "@/lib/buyer-role";
import type { BusinessRecord } from "@/lib/api";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  isButcheryOnlyBusiness,
  isGroceryOperationsBusiness,
  type StoreTypeId,
  getBusinessStoreTypes,
} from "@/lib/business-store-type";

export type PostAuthMe = {
  role?: { key?: string | null } | null;
  /** Public tab path (`/07XXXXXXXX`) when this shopper is a credit customer. */
  tabPath?: string | null;
};

export type ShopperTabHint = {
  tabPhone?: string | null;
  linkedStorefrontProfile?: boolean;
  balances?: { balanceOwed?: number | string | null };
};

function isSafeAppPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function roleKeyOf(me: PostAuthMe | null | undefined): string {
  return me?.role?.key?.trim().toLowerCase() ?? "";
}

/**
 * Storefront destinations from `?next=` — password login should honor these.
 *
 * Accepts the storefront root `/` (host-mapped homepage, D3) plus `/shop` and
 * `/shop/*`, including query strings (e.g. `/?edit=1`, `/shop/account?x=1`).
 * `/` is only ever *produced* by tenant-host components (the account
 * links never render on the apex), so the apex console stays unreachable via
 * this allowlist; Phase 4 adds the apex's own host-scoped forward building.
 */
export function isShopNextPath(path?: string | null): boolean {
  const next = path?.trim() ?? "";
  if (!isSafeAppPath(next)) {
    return false;
  }
  const pathname = next.split(/[?#]/, 1)[0] || "/";
  return (
    pathname === APP_ROUTES.shop ||
    pathname === "/" ||
    pathname.startsWith(`${APP_ROUTES.shop}/`)
  );
}

/**
 * Attach a credit-tab path when the shopper hub shows a directory customer
 * (or an open balance) with a usable Kenyan mobile.
 */
export function applyShopperTabHint<T extends PostAuthMe>(
  me: T,
  hint: ShopperTabHint | null | undefined,
): T {
  if (!hint || !isBuyerAccount(me)) {
    return me;
  }
  const tabPath = customerTabPathFromPhone(hint.tabPhone);
  if (!tabPath) {
    return me;
  }
  const owed = Number(hint.balances?.balanceOwed ?? 0);
  const isCreditor =
    hint.linkedStorefrontProfile === true ||
    (Number.isFinite(owed) && owed > 0);
  if (!isCreditor) {
    return me;
  }
  return { ...me, tabPath };
}

function dedicatedRoleHome(
  me: PostAuthMe | null | undefined,
  business?: BusinessRecord | null,
): string | null {
  const roleKey = roleKeyOf(me);

  if (roleKey === "grocery_clerk" || roleKey === "grocery_manager") {
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
  if (roleKey === "manager" && isGroceryOperationsBusiness(business)) {
    return APP_ROUTES.grocery;
  }
  return null;
}

function isStorefrontHome(path: string): boolean {
  return path === APP_ROUTES.shop || path === "/";
}

/**
 * True when the merchant has not finished (or dismissed) business onboarding.
 * While onboarding is pending/active, the business hub must gate routing so a
 * brand-new owner is never dropped onto the storefront or role apps.
 */
export function isOnboardingIncomplete(
  business?: BusinessRecord | null,
): boolean {
  const status = business?.onboarding?.status?.trim().toLowerCase() ?? "";
  return status === "pending" || status === "active";
}

/**
 * Where to send the user after sign-in.
 *
 * Buyers keep their storefront `?next=` / credit-tab paths. Owner/admin with an
 * unfinished business setup (or a missing business payload) go straight to the
 * business hub — `?next=` and role homes cannot pull a brand-new owner onto the
 * storefront before their shop is configured, and a failed business fetch must
 * not fall through to the storefront default. Staff/POS roles keep their
 * dedicated homes (grocery managers stay on /grocery, cashiers on /cashier…).
 * The onboarding gate is cloud-only (`!IS_DESKTOP`): the desktop SKU uses its
 * own `/setup` first-run wizard and should keep its prior routing.
 * Otherwise role homes beat generic defaults; tenant default is the storefront.
 */
export function resolvePostAuthDestination(
  me: PostAuthMe | null | undefined,
  requestedNext?: string | null,
  business?: BusinessRecord | null,
): string {
  const requested = requestedNext?.trim() ?? "";

  if (me && isBuyerAccount(me)) {
    if (isShopNextPath(requested) || isCustomerTabPath(requested)) {
      return requested;
    }
    if (me.tabPath && isCustomerTabPath(me.tabPath)) {
      return me.tabPath;
    }
    return buyerHomePath();
  }

  const roleKey = roleKeyOf(me);
  if (
    !IS_DESKTOP &&
    (roleKey === "owner" || roleKey === "admin") &&
    (isOnboardingIncomplete(business) || !business)
  ) {
    return APP_ROUTES.business;
  }

  if (isShopNextPath(requested) || isCustomerTabPath(requested)) {
    return requested;
  }

  const roleHome = dedicatedRoleHome(me, business);
  if (roleHome) {
    return roleHome;
  }

  // The desktop SKU has no storefront. Owner/admin (and any role without a
  // dedicated POS home) land on the dashboard overview instead of the cloud's
  // /shop default, otherwise they'd bounce straight back to the login screen.
  if (IS_DESKTOP) {
    return APP_ROUTES.overview;
  }

  if (isSafeAppPath(requested)) {
    return requested;
  }

  if (isButcheryOnlyBusiness(business)) {
    return APP_ROUTES.butcher;
  }

  return APP_ROUTES.shop;
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
  // Storefront is the tenant default — do not yank owners/admins off /business.
  if (isStorefrontHome(home) || isCustomerTabPath(home)) {
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

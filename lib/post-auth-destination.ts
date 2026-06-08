import { APP_ROUTES } from "@/lib/config";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";

export type PostAuthMe = {
  role?: { key?: string | null } | null;
};

/**
 * Where to send the user after sign-in. Role always wins over generic defaults
 * (e.g. grocery clerks → /grocery, not /business). Used on the server during
 * session finalize and on the client when fetchMe succeeds.
 */
export function resolvePostAuthDestination(
  me: PostAuthMe | null | undefined,
  requestedNext?: string | null,
): string {
  if (me && isBuyerAccount(me)) {
    return buyerHomePath();
  }

  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey === "grocery_clerk") {
    return APP_ROUTES.grocery;
  }
  if (roleKey === "cashier") {
    return APP_ROUTES.salesQuick;
  }
  if (roleKey === "stock_manager") {
    return APP_ROUTES.inventoryStockTake;
  }

  const requested = requestedNext?.trim() ?? "";
  if (requested.startsWith("/") && !requested.startsWith("//")) {
    return requested;
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
): string | null {
  const home = resolvePostAuthDestination(me);
  if (home === pathname) {
    return null;
  }
  if (!ROLE_OVERRIDE_LANDING_PATHS.has(pathname)) {
    return null;
  }
  return home;
}

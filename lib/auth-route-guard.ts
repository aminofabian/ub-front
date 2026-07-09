/** Non-secret UX cookie set alongside JWT storage so middleware can fast-fail unauthenticated dashboard navigations. */
export const SESSION_PRESENCE_COOKIE = "ub.session";

/** Max-age aligned with refresh token lifetime (30 days). */
export const SESSION_PRESENCE_MAX_AGE_SEC = 30 * 24 * 60 * 60;

/**
 * Route prefixes that require an authenticated tenant session.
 * Public storefront, auth, and super-admin paths are intentionally excluded.
 */
export const AUTH_PROTECTED_PREFIXES = [
  "/overview",
  "/business",
  "/branches",
  "/users",
  "/products",
  "/item-types",
  "/categories",
  "/suppliers",
  "/marketplace",
  "/customers",
  "/supplies",
  "/purchasing",
  "/inventory",
  "/pricing",
  "/shifts",
  "/analytics",
  "/sales",
  "/storefront",
  "/payments",
  "/settings",
  "/sync-conflicts",
  "/credits",
  "/cashier",
  "/grocery",
] as const;

export function isAuthProtectedPath(pathname: string): boolean {
  return AUTH_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

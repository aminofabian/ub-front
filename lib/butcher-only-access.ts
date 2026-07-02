import type { BusinessRecord } from "@/lib/api";
import { isButcheryOnlyBusiness } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";

const BUTCHERY_ONLY_PREFIXES = [
  APP_ROUTES.butcher,
  APP_ROUTES.login,
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/signup",
] as const;

export function isButcheryOnlyAllowedPath(pathname: string): boolean {
  if (!pathname || pathname === "/") {
    return false;
  }
  return BUTCHERY_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * When a tenant selected only Butchery during onboarding, keep staff inside the
 * butcher workspace instead of the full retail dashboard.
 */
export function resolveButcheryOnlyRedirect(
  pathname: string,
  business: BusinessRecord | null | undefined,
): string | null {
  if (!business || !isButcheryOnlyBusiness(business)) {
    return null;
  }
  if (isButcheryOnlyAllowedPath(pathname)) {
    return null;
  }

  if (
    pathname === APP_ROUTES.products ||
    pathname.startsWith(`${APP_ROUTES.products}/`)
  ) {
    return APP_ROUTES.butcherProducts;
  }

  if (
    pathname === APP_ROUTES.analytics ||
    pathname.startsWith(`${APP_ROUTES.analytics}/`)
  ) {
    return APP_ROUTES.butcherAnalytics;
  }

  if (pathname === APP_ROUTES.butcherSuppliers) {
    return APP_ROUTES.butcherSuppliers;
  }

  return APP_ROUTES.butcher;
}

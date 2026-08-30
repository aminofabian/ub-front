import { APP_ROUTES } from "@/lib/config";
import { isBuyerAccount, isCustomerTabPath } from "@/lib/buyer-role";

export type LoginAudience = "customer" | "staff";

export type LoginAudienceMe = {
  role?: { key?: string | null } | null;
};

export type LoginAudienceResult =
  | { ok: true }
  | { ok: false; message: string; correctLoginPath: string };

/**
 * Soft portal hint helpers (path detection). Password/PIN login does not block
 * mismatched audiences after auth — destination routing handles that instead.
 * Customers typically use `/login`; staff use `/login/staff` (PIN + office).
 */
export function checkLoginAudience(
  me: LoginAudienceMe | null | undefined,
  audience: LoginAudience,
): LoginAudienceResult {
  if (!me) {
    return { ok: true };
  }

  const buyer = isBuyerAccount(me);

  if (audience === "customer" && !buyer) {
    return {
      ok: false,
      message:
        "This is a staff account. Sign in on the staff page instead.",
      correctLoginPath: APP_ROUTES.staffLogin,
    };
  }

  if (audience === "staff" && buyer) {
    return {
      ok: false,
      message:
        "This is a customer account. Sign in on the shop account page instead.",
      correctLoginPath: APP_ROUTES.login,
    };
  }

  return { ok: true };
}

function pathnameOf(path: string): string {
  return path.split(/[?#]/, 1)[0] || "/";
}

function isSafeAppPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function isPosAppPath(path: string): boolean {
  const pathname = pathnameOf(path);
  for (const home of [APP_ROUTES.cashier, APP_ROUTES.grocery, APP_ROUTES.butcher]) {
    if (pathname === home || pathname.startsWith(`${home}/`)) {
      return true;
    }
  }
  return false;
}

/** Dashboard / settings / inventory — not the till, not the storefront. */
export function isOfficeConsolePath(path?: string | null): boolean {
  const next = path?.trim() ?? "";
  if (!isSafeAppPath(next)) {
    return false;
  }
  const pathname = pathnameOf(next);
  if (
    pathname === APP_ROUTES.shop ||
    pathname === "/" ||
    pathname.startsWith(`${APP_ROUTES.shop}/`)
  ) {
    return false;
  }
  if (pathname === APP_ROUTES.login || pathname.startsWith(`${APP_ROUTES.login}/`)) {
    return false;
  }
  if (isPosAppPath(pathname) || isCustomerTabPath(pathname)) {
    return false;
  }
  return true;
}

export function isOfficeLoginMode(
  search: { get: (key: string) => string | null } | null | undefined,
): boolean {
  return search?.get("mode")?.trim().toLowerCase() === "office";
}

/** Login path after session expiry — shop routes stay on customer login. */
export function loginPathForNext(nextPath?: string | null): string {
  const next = nextPath?.trim() ?? "";
  if (next === APP_ROUTES.shop || next.startsWith(`${APP_ROUTES.shop}/`)) {
    return APP_ROUTES.login;
  }
  return APP_ROUTES.staffLogin;
}

/**
 * Full login href including `mode=office` and `next` so owners return to the
 * office door instead of the till PIN screen.
 */
export function loginHrefForDestination(nextPath?: string | null): string {
  const next = nextPath?.trim() ?? "";
  const safeNext = isSafeAppPath(next) ? next : "";

  if (
    safeNext &&
    (pathnameOf(safeNext) === APP_ROUTES.shop ||
      pathnameOf(safeNext).startsWith(`${APP_ROUTES.shop}/`))
  ) {
    return `${APP_ROUTES.login}?next=${encodeURIComponent(safeNext)}`;
  }

  const params = new URLSearchParams();
  if (isOfficeConsolePath(safeNext || null)) {
    params.set("mode", "office");
  }
  if (safeNext) {
    params.set("next", safeNext);
  }
  const qs = params.toString();
  return qs ? `${APP_ROUTES.staffLogin}?${qs}` : APP_ROUTES.staffLogin;
}

export function isStaffLoginPath(pathname: string): boolean {
  return (
    pathname === APP_ROUTES.staffLogin ||
    pathname.startsWith(`${APP_ROUTES.staffLogin}/`)
  );
}

export function isAnyLoginPath(pathname: string): boolean {
  return (
    pathname === APP_ROUTES.login ||
    pathname.startsWith(`${APP_ROUTES.login}/`)
  );
}

import { APP_ROUTES } from "@/lib/config";
import { isBuyerAccount } from "@/lib/buyer-role";

export type LoginAudience = "customer" | "staff";

export type LoginAudienceMe = {
  role?: { key?: string | null } | null;
};

export type LoginAudienceResult =
  | { ok: true }
  | { ok: false; message: string; correctLoginPath: string };

/**
 * Ensures the signed-in account matches the login portal in use.
 * Customers use `/login`; staff use `/login/staff`.
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

/** Login path after session expiry — shop routes stay on customer login. */
export function loginPathForNext(nextPath?: string | null): string {
  const next = nextPath?.trim() ?? "";
  if (next === APP_ROUTES.shop || next.startsWith(`${APP_ROUTES.shop}/`)) {
    return APP_ROUTES.login;
  }
  return APP_ROUTES.staffLogin;
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

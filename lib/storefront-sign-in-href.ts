import { APP_ROUTES } from "@/lib/config";
import { isShopNextPath } from "@/lib/post-auth-destination";

/** Which door the sign-in sheet opens in. */
export type StorefrontSignInDoor = "staff" | "shopper";

/** Phases of the one-form sign-in sheet. */
export type StorefrontSignInPhase =
  | "credentials"
  | "code"
  | "new-pin"
  | "signup"
  | "verify";

/**
 * Shop-host URL that opens the sign-in sheet (there is no `/login` page on a
 * tenant host). Used by apex forwards and progressive-enhancement fallbacks —
 * when the sheet provider is mounted and hydrated, callers intercept the click
 * and open the sheet in place instead.
 *
 * Kept in `lib` rather than beside the sheet component so it stays unit-testable:
 * the sheet module transitively imports `next/font/local` via the theme fonts,
 * which `bun test` cannot load.
 *
 * `signup: true` marks the create-account door. The header renders both doors,
 * and they used to build an identical URL, so "Sign up" opened the sign-in form.
 */
export function buildStorefrontSignInHref(opts?: {
  path?: string;
  email?: string | null;
  phone?: string | null;
  door?: StorefrontSignInDoor | null;
  next?: string | null;
  /** Open the sheet on the create-account form (the "Sign up" door). */
  signup?: boolean;
}): string {
  const path = (opts?.path?.trim() || APP_ROUTES.shop).split("?")[0] || APP_ROUTES.shop;
  const params = new URLSearchParams({ signin: "1" });
  const email = opts?.email?.trim();
  const phone = opts?.phone?.replace(/\D/g, "");
  if (email?.includes("@")) params.set("email", email.toLowerCase());
  if (phone && phone.length >= 9) params.set("phone", phone);
  if (opts?.door === "staff") params.set("door", "staff");
  if (opts?.signup) params.set("signup", "1");
  const next = opts?.next?.trim();
  if (next && isShopNextPath(next)) params.set("next", next);
  return `${path}?${params.toString()}`;
}

/**
 * Which phase the sheet may open in, given the requested phase and the door.
 *
 * The signup form is shopper-only: staff signup is its own page, and opening the
 * sheet's signup phase under the staff door would register a buyer account. So a
 * `?signup=1&door=staff` link (or a stale bookmark) falls back to sign-in.
 */
export function signInPhaseForDoor(
  requested: StorefrontSignInPhase | null | undefined,
  door: StorefrontSignInDoor | null | undefined,
): StorefrontSignInPhase {
  const resolvedDoor = door ?? "shopper";
  return requested === "signup" && resolvedDoor === "shopper"
    ? "signup"
    : "credentials";
}

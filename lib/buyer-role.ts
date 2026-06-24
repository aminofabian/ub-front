import { APP_ROUTES } from "@/lib/config";

export const BUYER_ROLE_KEY = "buyer";

/** Storefront customer accounts (default self-signup role on the API). */
export function isBuyerAccount(
  me: { role?: { key?: string | null } | null } | null | undefined,
): boolean {
  return (me?.role?.key ?? "").trim().toLowerCase() === BUYER_ROLE_KEY;
}

/** Landing path after password sign-in / sign-up for storefront customers. */
export function buyerHomePath(): string {
  return APP_ROUTES.shopAccount;
}

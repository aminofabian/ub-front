import { APP_ROUTES } from "@/lib/config";
import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";

export const BUYER_ROLE_KEY = "buyer";

/** Storefront customer accounts (default self-signup role on the API). */
export function isBuyerAccount(
  me: { role?: { key?: string | null } | null } | null | undefined,
): boolean {
  return (me?.role?.key ?? "").trim().toLowerCase() === BUYER_ROLE_KEY;
}

/** Catalog storefront — default landing for shoppers and tenant owners. */
export function buyerHomePath(): string {
  return APP_ROUTES.shop;
}

/** Public credit-tab URL (`/07XXXXXXXX`) when the phone is a Kenyan mobile. */
export function customerTabPathFromPhone(
  phone: string | null | undefined,
): string | null {
  const raw = phone?.trim() ?? "";
  if (!raw || !looksLikeKenyanMobilePath(raw)) {
    return null;
  }
  const local = toKenyanLocal07(raw);
  return local ? `/${local}` : null;
}

export function isCustomerTabPath(path?: string | null): boolean {
  const next = path?.trim() ?? "";
  if (!next.startsWith("/") || next.startsWith("//")) {
    return false;
  }
  const segment = next.replace(/^\//, "").split("/")[0] ?? "";
  return looksLikeKenyanMobilePath(segment);
}

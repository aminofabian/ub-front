/**
 * First-sale activation deep link: hub / setup progress send owners to
 * `/cashier?activate=first-sale`, which registers this device as a till (if
 * needed) and opens the shift gate so they can ring a real sale.
 */

import { APP_ROUTES } from "@/lib/config";
import {
  notifyPosGuidanceResolved,
} from "@/lib/pos-guidance";
import {
  fetchTillDeviceMe,
  registerTillDevice,
} from "@/lib/till-devices-api";

export const FIRST_SALE_ACTIVATE_PARAM = "activate";
export const FIRST_SALE_ACTIVATE_VALUE = "first-sale";

export function cashierFirstSaleActivateHref(): string {
  return `${APP_ROUTES.cashier}?${FIRST_SALE_ACTIVATE_PARAM}=${FIRST_SALE_ACTIVATE_VALUE}`;
}

/** Prefer activate deep-link for first_sale even if the API still returns `/cashier`. */
export function resolveSetupProgressActionUrl(
  stepKey: string | null | undefined,
  actionUrl: string | null | undefined,
): string {
  if (stepKey === "first_sale") {
    return cashierFirstSaleActivateHref();
  }
  const url = actionUrl?.trim();
  return url || "/business";
}

export function isFirstSaleActivateParam(
  value: string | null | undefined,
): boolean {
  return value?.trim().toLowerCase() === FIRST_SALE_ACTIVATE_VALUE;
}

export type EnsureTillResult = "existing" | "registered";

/** Idempotent: reuse /till-devices/me when present, else register this browser. */
export async function ensureTillRegisteredForBranch(
  branchId: string,
): Promise<EnsureTillResult> {
  const bid = branchId.trim();
  if (!bid) {
    throw new Error("Select a branch before opening the till.");
  }
  try {
    await fetchTillDeviceMe({ branchId: bid, toast: false });
    return "existing";
  } catch {
    await registerTillDevice({
      branchId: bid,
      label: "Front counter",
      toast: false,
    });
    notifyPosGuidanceResolved("register-till");
    return "registered";
  }
}

export function stripFirstSaleActivateFromUrl(): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (!url.searchParams.has(FIRST_SALE_ACTIVATE_PARAM)) {
    return;
  }
  url.searchParams.delete(FIRST_SALE_ACTIVATE_PARAM);
  window.history.replaceState({}, "", url.toString());
}

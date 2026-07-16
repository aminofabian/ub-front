import type { BusinessRecord, MeResponse } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function roleKey(me: MeResponse | null | undefined): string {
  return me?.role?.key?.trim().toLowerCase() ?? "";
}

function isCashierRole(key: string): boolean {
  return key === "cashier" || key === "butcher_cashier";
}

/** Absent settings default to enabled (matches backend). */
export function receiveStockSettings(
  business: BusinessRecord | null | undefined,
) {
  return business?.inventory?.receiveStock;
}

/**
 * Create / post Path B receive-stock sessions.
 * Owners/managers use the role permission; cashiers and stock managers need
 * the admin business-settings toggle (defaults on).
 */
export function canReceiveStock(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.PurchasingPathBWrite)) {
    return true;
  }
  const key = roleKey(me);
  const settings = receiveStockSettings(business);
  if (key === "stock_manager") {
    return settings?.allowReceiveForStockManager !== false;
  }
  if (isCashierRole(key)) {
    return settings?.allowReceiveForCashier !== false;
  }
  return false;
}

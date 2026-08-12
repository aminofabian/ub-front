import type { BusinessRecord, MeResponse } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function roleKey(me: MeResponse | null | undefined): string {
  return me?.role?.key?.trim().toLowerCase() ?? "";
}

function isTillRole(key: string): boolean {
  return key === "cashier" || key === "butcher_cashier";
}

/** Absent / false → disabled (admin must opt in). */
export function creditTabsSettings(
  business: BusinessRecord | null | undefined,
) {
  return business?.inventory?.creditTabs;
}

/** Default on — new tab customers must verify phone via OTP unless admin disables. */
export function phoneVerificationRequiredForNewTab(
  business: BusinessRecord | null | undefined,
): boolean {
  return (
    creditTabsSettings(business)?.requirePhoneVerificationForNewTabCustomers !==
    false
  );
}

/**
 * When true, Tab checkout Find accepts name or phone.
 * Default off — admin must opt in under Credit tabs settings.
 */
export function canSearchCustomersByName(
  business: BusinessRecord | null | undefined,
): boolean {
  return Boolean(creditTabsSettings(business)?.allowCashierSearchCustomersByName);
}

/**
 * Cashier (and butcher cashier) may open the Tabs modal and propose clearances
 * when the admin toggle is on and they can read credit customers.
 */
export function canCashierClearTabs(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (!hasPermission(me?.permissions, Permission.CreditsCustomersRead)) {
    return false;
  }
  if (!isTillRole(roleKey(me))) {
    return false;
  }
  return Boolean(creditTabsSettings(business)?.allowCashierTabClearance);
}

import type { BusinessRecord, MeResponse } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

export type GroceryCounterMode = "sell" | "spoils" | "stockIn";

function roleKey(me: MeResponse | null | undefined): string {
  return me?.role?.key?.trim().toLowerCase() ?? "";
}

/** Spoils on grocery counter — default on when unset (matches backend). */
export function groceryClerkSpoilsEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return business?.inventory?.stockLevels?.allowSpoilsForGroceryClerk !== false;
}

/** Path B stock-in on grocery counter — default on when unset. */
export function groceryClerkStockInEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return business?.inventory?.receiveStock?.allowReceiveForGroceryClerk !== false;
}

export function canRecordGrocerySpoils(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.InventoryWrite)) {
    // Owners/admins on the grocery surface also get the mode.
    return groceryClerkSpoilsEnabled(business);
  }
  if (roleKey(me) !== "grocery_clerk") {
    return false;
  }
  return groceryClerkSpoilsEnabled(business);
}

export function canGroceryStockIn(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.PurchasingPathBWrite)) {
    return groceryClerkStockInEnabled(business);
  }
  if (roleKey(me) !== "grocery_clerk") {
    return false;
  }
  return groceryClerkStockInEnabled(business);
}

export function groceryCounterModesAvailable(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): GroceryCounterMode[] {
  const modes: GroceryCounterMode[] = ["sell"];
  if (canRecordGrocerySpoils(me, business)) modes.push("spoils");
  if (canGroceryStockIn(me, business)) modes.push("stockIn");
  return modes;
}

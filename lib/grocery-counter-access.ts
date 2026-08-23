import type { BusinessRecord, MeResponse } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

export type GroceryCounterMode = "sell" | "spoils" | "stockIn" | "stockEdit";

function roleKey(me: MeResponse | null | undefined): string {
  return me?.role?.key?.trim().toLowerCase() ?? "";
}

function isGroceryCounterRole(me: MeResponse | null | undefined): boolean {
  const key = roleKey(me);
  return key === "grocery_clerk" || key === "grocery_manager";
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

/** Edit on-hand on grocery counter — default on when unset; admin can turn off. */
export function groceryClerkStockEditEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return business?.inventory?.stockLevels?.allowStockEditForGroceryClerk !== false;
}

/** Min / reorder in Edit stock — default on when unset. */
export function groceryClerkMinStockEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return business?.inventory?.stockLevels?.allowMinStockForGroceryClerk !== false;
}

/** Order pad on grocery — default on when unset. */
export function groceryClerkOrderPadEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return business?.inventory?.stockLevels?.allowOrderPadForGroceryClerk !== false;
}

/** Confirm (Path A) on grocery — default on when unset. */
export function groceryClerkOrderConfirmEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return (
    business?.inventory?.stockLevels?.allowOrderConfirmForGroceryClerk !== false
  );
}

export function canRecordGrocerySpoils(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.InventoryWrite)) {
    // Owners/admins on the grocery surface also get the mode.
    return groceryClerkSpoilsEnabled(business);
  }
  if (!isGroceryCounterRole(me)) {
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
  if (!isGroceryCounterRole(me)) {
    return false;
  }
  return groceryClerkStockInEnabled(business);
}

export function canGroceryEditStock(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.InventoryWrite)) {
    return groceryClerkStockEditEnabled(business);
  }
  if (!isGroceryCounterRole(me)) {
    return false;
  }
  return groceryClerkStockEditEnabled(business);
}

/** Set minimum / reorder inside Edit stock dialog. */
export function canGroceryEditMinStock(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (!groceryClerkMinStockEnabled(business)) {
    return false;
  }
  if (
    hasPermission(me?.permissions, Permission.InventoryWrite) ||
    hasPermission(me?.permissions, Permission.CatalogItemsWrite)
  ) {
    return true;
  }
  return isGroceryCounterRole(me);
}

/**
 * Supplier Order drawer — Path A place/WhatsApp (backend delegates path_a when
 * the grocery Order flag is on).
 */
export function canGroceryOrderPad(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (!groceryClerkOrderPadEnabled(business)) {
    return false;
  }
  if (hasPermission(me?.permissions, Permission.PurchasingPathAWrite)) {
    return true;
  }
  return isGroceryCounterRole(me);
}

/** Confirm orders chip — Path A write or grocery-role override. */
export function canGroceryOrderConfirm(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (!groceryClerkOrderConfirmEnabled(business)) {
    return false;
  }
  if (hasPermission(me?.permissions, Permission.PurchasingPathAWrite)) {
    return true;
  }
  return isGroceryCounterRole(me);
}

export function groceryCounterModesAvailable(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): GroceryCounterMode[] {
  const modes: GroceryCounterMode[] = ["sell"];
  if (canRecordGrocerySpoils(me, business)) modes.push("spoils");
  if (canGroceryStockIn(me, business)) modes.push("stockIn");
  if (canGroceryEditStock(me, business)) modes.push("stockEdit");
  return modes;
}

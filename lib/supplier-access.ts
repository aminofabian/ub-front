import type { BusinessRecord, MeResponse } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function roleKey(me: MeResponse | null | undefined): string {
  return me?.role?.key?.trim().toLowerCase() ?? "";
}

function isCashierRole(key: string): boolean {
  return key === "cashier" || key === "butcher_cashier";
}

export function suppliersAccessSettings(
  business: BusinessRecord | null | undefined,
) {
  return business?.inventory?.suppliers;
}

/** Create/edit suppliers — role permission or admin-delegated toggle. */
export function canWriteSuppliers(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.SuppliersWrite)) {
    return true;
  }
  const key = roleKey(me);
  const settings = suppliersAccessSettings(business);
  if (key === "stock_manager") {
    return Boolean(settings?.allowSupplierWriteForStockManager);
  }
  if (isCashierRole(key)) {
    return Boolean(settings?.allowSupplierWriteForCashier);
  }
  return false;
}

/** Link catalog products to suppliers — role permission or admin-delegated toggle. */
export function canLinkSupplierProducts(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.CatalogItemsLinkSuppliers)) {
    return true;
  }
  const key = roleKey(me);
  const settings = suppliersAccessSettings(business);
  if (key === "stock_manager") {
    return Boolean(settings?.allowLinkProductsForStockManager);
  }
  if (isCashierRole(key)) {
    return Boolean(settings?.allowLinkProductsForCashier);
  }
  return false;
}

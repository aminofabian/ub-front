import type { InventorySettingsRecord } from "@/lib/api";

/** When true (default), product names show exactly as entered/imported. */
let preserveProductNameCasing = true;

export function setCatalogDisplayPolicy(opts: {
  preserveProductNameCasing: boolean;
}): void {
  preserveProductNameCasing = opts.preserveProductNameCasing;
}

export function shouldPreserveProductNameCasing(): boolean {
  return preserveProductNameCasing;
}

/** Reads the business inventory.catalog setting; defaults to exact names. */
export function preserveProductNameCasingFromInventory(
  inventory?: InventorySettingsRecord | null,
): boolean {
  return inventory?.catalog?.preserveProductNameCasing !== false;
}

export function syncCatalogDisplayPolicyFromBusiness(
  inventory?: InventorySettingsRecord | null,
): void {
  setCatalogDisplayPolicy({
    preserveProductNameCasing: preserveProductNameCasingFromInventory(inventory),
  });
}

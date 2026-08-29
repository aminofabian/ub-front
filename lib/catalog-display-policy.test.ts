import { describe, expect, it } from "vitest";

import type { InventorySettingsRecord } from "@/lib/api";

import {
  preserveProductNameCasingFromInventory,
  setCatalogDisplayPolicy,
  shouldPreserveProductNameCasing,
  syncCatalogDisplayPolicyFromBusiness,
} from "./catalog-display-policy";

describe("catalog-display-policy", () => {
  it("defaults to preserving exact product names", () => {
    setCatalogDisplayPolicy({ preserveProductNameCasing: true });
    expect(shouldPreserveProductNameCasing()).toBe(true);
    expect(preserveProductNameCasingFromInventory(undefined)).toBe(true);
    expect(preserveProductNameCasingFromInventory({})).toBe(true);
  });

  it("reads false from business inventory settings", () => {
    const inventory: InventorySettingsRecord = {
      catalog: { preserveProductNameCasing: false },
    };
    expect(preserveProductNameCasingFromInventory(inventory)).toBe(false);
    syncCatalogDisplayPolicyFromBusiness(inventory);
    expect(shouldPreserveProductNameCasing()).toBe(false);
    setCatalogDisplayPolicy({ preserveProductNameCasing: true });
  });
});

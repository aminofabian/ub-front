import { describe, expect, it } from "vitest";

import {
  isPosPackageSellRow,
  mergePosItemStockFromDetail,
  posAvailablePackages,
  posPackageStockHeadline,
  posSearchItemDetailLine,
} from "./cashier-item-display";
import type { ItemSummaryRecord } from "./api";

const trayRow: ItemSummaryRecord = {
  id: "tray",
  name: "Eggs",
  sku: "BC-EGGS-TRAY",
  variantName: "Tray",
  variantOfItemId: "parent",
  stockQty: 30,
  baseStockQty: 120,
  packageUnitsPerSale: 30,
  packageVariant: true,
};

describe("pos package stock", () => {
  it("shows trays from base stock, not eggs per tray", () => {
    expect(posAvailablePackages(trayRow)).toBe(4);
    expect(posSearchItemDetailLine(trayRow)).toBe("Only 4 trays left");
  });

  it("uses short unit name for tray-of-N labels", () => {
    const trayOf30: ItemSummaryRecord = {
      ...trayRow,
      variantName: "Tray of 30",
      baseStockQty: 790,
      packageUnitsPerSale: 30,
    };
    expect(posAvailablePackages(trayOf30)).toBe(26);
    expect(posSearchItemDetailLine(trayOf30)).toBe("26 trays ready");
  });

  it("infers units when API omits packageUnitsPerSale", () => {
    const stale: ItemSummaryRecord = {
      ...trayRow,
      packageUnitsPerSale: undefined,
      packageVariant: undefined,
      stockQty: 4,
      baseStockQty: 120,
    };
    expect(isPosPackageSellRow(stale)).toBe(true);
    expect(posAvailablePackages(stale)).toBe(4);
  });

  it("does not treat single-unit shared stock as a package row", () => {
    const single: ItemSummaryRecord = {
      id: "single",
      name: "Eggs",
      sku: "BC-EGGS-EGG-SINGLE",
      variantName: "Egg Single",
      variantOfItemId: "parent",
      stockQty: 120,
      packageUnitsPerSale: 1,
    };
    expect(isPosPackageSellRow(single)).toBe(false);
    expect(posSearchItemDetailLine(single)).toBe("120 available · BC-EGGS-EGG-SINGLE");
  });

  it("merges detail packaging qty into list row", () => {
    const list: ItemSummaryRecord = {
      id: "tray",
      name: "Eggs",
      sku: "BC-EGGS-TRAY",
      variantName: "Tray",
      variantOfItemId: "parent",
      stockQty: 30,
    };
    const merged = mergePosItemStockFromDetail(list, {
      packageVariant: true,
      packagingUnitQty: 30,
      stockQty: 4,
      baseStockQty: 120,
    });
    expect(posAvailablePackages(merged)).toBe(4);
  });

  it("returns null cap when oversell is allowed and stock is zero", () => {
    const zeroRow: ItemSummaryRecord = {
      ...trayRow,
      baseStockQty: 0,
      stockQty: 0,
    };
    expect(posAvailablePackages(zeroRow)).toBe(0);
    expect(posAvailablePackages(zeroRow, true)).toBeNull();
    expect(posPackageStockHeadline(zeroRow, true)).toBe("0 on hand");
  });
});

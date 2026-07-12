import { describe, expect, it } from "vitest";

import {
  cashierItemPrimaryLabel,
  cashierItemTitleParts,
  isPosPackageSellRow,
  mergePosItemStockFromDetail,
  posAvailablePackages,
  posCartLineSuffix,
  posPackageStockHeadline,
  posSearchItemDetailLine,
  stripPosCartSkuClutter,
} from "./cashier-item-display";
import type { ItemSummaryRecord } from "./api";
import { splitShelfPriceDisplay } from "./cashier-shelf-price";

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

describe("cashier labels", () => {
  it("disambiguates variants with size or package, not full SKU", () => {
    const tray: ItemSummaryRecord = {
      id: "1",
      name: "Eggs",
      sku: "EGGS-10001-TRAY",
      variantName: "Tray",
      variantOfItemId: "p",
      packageVariant: true,
      packageUnitsPerSale: 30,
    };
    const single: ItemSummaryRecord = {
      id: "2",
      name: "Eggs",
      sku: "EGGS-10002-SINGLE",
      variantName: "Single",
      variantOfItemId: "p",
    };
    expect(cashierItemPrimaryLabel(tray)).toBe("Eggs · Tray of 30");
    expect(cashierItemPrimaryLabel(single)).toBe("Eggs · Single");
  });

  it("enriches weak promo and numeric names from SKU family", () => {
    expect(
      cashierItemPrimaryLabel({
        id: "t",
        name: "3 for 20",
        sku: "TOMATO-10002-3-FOR-20",
      }),
    ).toBe("Tomatoes · 3 for 20");
    expect(
      cashierItemPrimaryLabel({
        id: "f",
        name: "210",
        sku: "FLOURS-10001-1KG",
      }),
    ).toBe("Flour 210 · 1kg");
    expect(
      cashierItemPrimaryLabel({
        id: "f2",
        name: "210 1kg",
        sku: "FLOURS-10001-1KG",
      }),
    ).toBe("Flour 210 · 1kg");
    expect(
      cashierItemPrimaryLabel({
        id: "f3",
        name: "210",
        sku: "X-10001-1KG",
        size: "1kg",
        categoryName: "Soap",
      }),
    ).toBe("Soap 210 · 1kg");
    expect(
      cashierItemPrimaryLabel({
        id: "f4",
        name: "210",
        sku: "X-9",
        size: "1kg",
      }),
    ).toBe("Item 210 · 1kg");
  });

  it("never appends SKU to cart suffix", () => {
    const row: ItemSummaryRecord = {
      id: "m",
      name: "Milk",
      sku: "FRESHM-10001-500ML",
      stockQty: 12,
    };
    expect(posCartLineSuffix(row)).toBe("");
    expect(
      stripPosCartSkuClutter("Brookside Milk (FRESHM-10001-500ML)"),
    ).toBe("Brookside Milk");
  });

  it("keeps price badges to amount + currency only", () => {
    expect(splitShelfPriceDisplay("1 kg 435 KES")).toEqual({
      amount: "435",
      code: "KES",
    });
    expect(splitShelfPriceDisplay("1kg / 435 KES")).toEqual({
      amount: "435",
      code: "KES",
    });
    expect(splitShelfPriceDisplay("65 KES")).toEqual({
      amount: "65",
      code: "KES",
    });
    expect(splitShelfPriceDisplay("1kg / 435")).toEqual({
      amount: "435",
      code: null,
    });
  });

  it("splits title so size/variant can stay visible when name truncates", () => {
    expect(
      cashierItemTitleParts({
        id: "o",
        name: "Omo Hand Washing Powder",
        sku: "OMO-1KG",
        size: "1kg",
      }),
    ).toEqual({ primary: "Omo Hand Washing Powder", option: "1kg" });
    expect(
      cashierItemTitleParts({
        id: "e",
        name: "Eggs",
        sku: "EGGS-TRAY",
        variantName: "Tray",
        variantOfItemId: "p",
        packageVariant: true,
        packageUnitsPerSale: 30,
      }),
    ).toEqual({ primary: "Eggs", option: "Tray of 30" });
  });
});

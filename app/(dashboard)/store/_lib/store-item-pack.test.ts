import { describe, expect, test } from "bun:test";

import {
  catalogDisplayToPacks,
  catalogNativePack,
  packCountPreview,
  packsToCatalogDisplay,
  retargetCount,
  storePackCatalogFromItem,
} from "./store-item-pack";
import type { ItemDetailRecord } from "@/lib/api";

function detail(partial: Partial<ItemDetailRecord>): ItemDetailRecord {
  return {
    id: "p1",
    name: "Eggs",
    sku: "SKU",
    ...partial,
  };
}

describe("storePackCatalogFromItem", () => {
  test("reads a tray SKU factor", () => {
    const catalog = storePackCatalogFromItem(
      "p1",
      detail({
        packageVariant: true,
        variantOfItemId: "base",
        packageUnitsPerSale: 30,
        packagingUnitName: "tray",
      }),
      [],
    );
    expect(catalog.displayToHolderFactor).toBe(30);
    expect(catalogNativePack(catalog)).toEqual({
      unitsPerPack: 30,
      packUnit: "tray",
    });
  });

  test("keeps a plain SKU in each", () => {
    const catalog = storePackCatalogFromItem("p1", detail({}), []);
    expect(catalog.displayToHolderFactor).toBe(1);
    expect(catalogNativePack(catalog)).toBeNull();
  });
});

describe("packsToCatalogDisplay", () => {
  test("leaves each-mode counts alone", () => {
    expect(packsToCatalogDisplay(12, null, 1)).toBe(12);
  });

  test("does not double-convert a tray SKU counted in trays", () => {
    expect(
      packsToCatalogDisplay(2, { unitsPerPack: 30, packUnit: "tray" }, 30),
    ).toBe(2);
  });

  test("converts a 12-pack on a base SKU into each", () => {
    expect(
      packsToCatalogDisplay(2, { unitsPerPack: 12, packUnit: "pack" }, 1),
    ).toBe(24);
  });

  test("converts a custom pack on a tray SKU into trays", () => {
    expect(
      packsToCatalogDisplay(2, { unitsPerPack: 12, packUnit: "pack" }, 30),
    ).toBe(0.8);
  });
});

describe("catalogDisplayToPacks", () => {
  test("turns tray display back into 12-packs", () => {
    expect(
      catalogDisplayToPacks(26, { unitsPerPack: 12, packUnit: "pack" }, 30),
    ).toBe(65);
  });
});

describe("retargetCount", () => {
  test("keeps the same stock when switching pack size", () => {
    const next = retargetCount(
      2,
      { unitsPerPack: 30, packUnit: "tray" },
      { unitsPerPack: 12, packUnit: "pack" },
      30,
    );
    expect(next).toBe(5);
  });
});

describe("packCountPreview", () => {
  test("shows packs times size", () => {
    expect(
      packCountPreview(2, { unitsPerPack: 30, packUnit: "tray" }),
    ).toBe("2 × 30 = 60 each");
  });
});

import { describe, expect, test } from "bun:test";

import {
  catalogDisplayToPacks,
  catalogNativePack,
  packBreakdownLabel,
  packCountPreview,
  packsToCatalogDisplay,
  packStockEach,
  retargetCount,
  countSaveHint,
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
        baseStockQty: 56,
        stockQty: 1,
      }),
      [],
    );
    expect(catalog.displayToHolderFactor).toBe(30);
    expect(catalog.holderEach).toBe(56);
    expect(catalogNativePack(catalog)).toEqual({
      unitsPerPack: 30,
      packUnit: "tray",
    });
  });

  test("keeps a plain SKU in each", () => {
    const catalog = storePackCatalogFromItem(
      "p1",
      detail({ stockQty: 12 }),
      [],
    );
    expect(catalog.displayToHolderFactor).toBe(1);
    expect(catalog.holderEach).toBe(12);
    expect(catalogNativePack(catalog)).toBeNull();
  });
});

describe("packStockEach", () => {
  test("prefers holder pool over floored display trays", () => {
    expect(
      packStockEach(1, {
        itemId: "p1",
        displayToHolderFactor: 30,
        catalogPackUnit: "tray",
        options: [],
        holderEach: 56,
      }),
    ).toBe(56);
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
  test("splits remainder into packs and singles", () => {
    expect(
      packCountPreview(56 / 30, { unitsPerPack: 30, packUnit: "pack" }),
    ).toBe("1 pack(s), 26 singles · 56 each");
  });

  test("omits singles when the count divides evenly", () => {
    expect(
      packCountPreview(2, { unitsPerPack: 30, packUnit: "tray" }),
    ).toBe("2 tray(s) · 60 each");
  });
});

describe("countSaveHint", () => {
  test("explains a piece count", () => {
    expect(countSaveHint(6, null, "set")).toBe(
      "Save sets on-hand to 6 pieces.",
    );
  });

  test("explains a pack count as pieces", () => {
    expect(
      countSaveHint(2, { unitsPerPack: 100, packUnit: "pack" }, "set"),
    ).toBe("Save sets on-hand to 200 pieces (2 × 100).");
  });

  test("uses move copy for take-out", () => {
    expect(
      countSaveHint(1, { unitsPerPack: 12, packUnit: "pack" }, "move"),
    ).toBe("This is 12 pieces (1 × 12).");
  });
});

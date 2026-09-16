import { describe, expect, test } from "bun:test";

import {
  catalogDisplayToPacks,
  catalogNativePack,
  composePackEach,
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

  test("does not let a zero pool wipe a live display count", () => {
    expect(
      packStockEach(6, {
        itemId: "p1",
        displayToHolderFactor: 100,
        catalogPackUnit: "pack",
        options: [],
        holderEach: 0,
      }),
    ).toBe(600);
  });
});

describe("packsToCatalogDisplay", () => {
  test("turns pieces into display on a plain SKU", () => {
    expect(packsToCatalogDisplay(12, null, 1)).toBe(12);
  });

  test("turns pieces into trays on a tray SKU", () => {
    expect(packsToCatalogDisplay(60, null, 30)).toBe(2);
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

  test("turns tray display into pieces when unpacked", () => {
    expect(catalogDisplayToPacks(2, null, 30)).toBe(60);
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

  test("turns a piece count into packs", () => {
    expect(
      retargetCount(6, null, { unitsPerPack: 100, packUnit: "pack" }, 1),
    ).toBe(0.06);
  });

  test("turns packs back into pieces", () => {
    expect(
      retargetCount(2, { unitsPerPack: 100, packUnit: "pack" }, null, 1),
    ).toBe(200);
  });

  test("does not leave pack count equal to pieces on a pack SKU", () => {
    expect(
      retargetCount(6, null, { unitsPerPack: 100, packUnit: "pack" }, 100),
    ).toBe(0.06);
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

  test("explains packs plus leftover pieces", () => {
    expect(
      countSaveHint(306, { unitsPerPack: 100, packUnit: "pack" }, "set"),
    ).toBe("Save sets on-hand to 3 packs and 6 pieces (306 pieces).");
  });

  test("uses move copy for take-out", () => {
    expect(
      countSaveHint(12, { unitsPerPack: 12, packUnit: "pack" }, "move"),
    ).toBe("This is 1 pack (12 pieces).");
  });
});

describe("composePackEach", () => {
  test("keeps full packs and leftover pieces", () => {
    expect(composePackEach(3, 6, 100)).toBe(306);
  });

  test("carries leftover that fills another pack", () => {
    expect(composePackEach(3, 106, 100)).toBe(406);
  });
});

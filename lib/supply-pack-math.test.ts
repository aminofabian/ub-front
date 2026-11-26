import { describe, expect, it } from "bun:test";

import {
  inferSupplyPackSellUnit,
  supplyEntryQty,
  supplyLineTotal,
  supplyMarginCost,
  supplyPackSnapshotLabel,
  supplyRetailRevenue,
  supplySellPerPack,
  supplyStockQty,
  supplyUnitCost,
  toPackEntry,
  toUnitEntry,
} from "./supply-pack-math";

const pack = { unitsPerPack: 12, packUnit: "pack" };
const tray = { unitsPerPack: 30, packUnit: "tray" };

describe("supply pack math", () => {
  it("treats typed qty as packs", () => {
    expect(supplyStockQty("1", pack)).toBe(12);
    expect(supplyStockQty("2", pack)).toBe(24);
    expect(supplyStockQty("1", null)).toBe(1);
    expect(supplyEntryQty("10", tray)).toBe(10);
  });

  it("derives unit cost from pack price", () => {
    expect(supplyUnitCost("50.04", pack)).toBe(4.17);
    expect(supplyUnitCost("4.17", null)).toBe(4.17);
    expect(supplyUnitCost("430", tray)).toBe(14.33);
  });

  it("line total is packs × pack price", () => {
    expect(supplyLineTotal("1", "50.04", pack)).toBe(50.04);
    expect(supplyLineTotal("4", "4.17", null)).toBe(16.68);
    expect(supplyLineTotal("10", "430", tray)).toBe(4300);
  });

  it("detects pack-priced shelf sell from the catalog SKU", () => {
    expect(
      supplySellPerPack(tray, {
        packageVariant: true,
        packageUnitsPerSale: 30,
      }),
    ).toBe(true);
    expect(
      supplySellPerPack(pack, {
        packageVariant: false,
        packageUnitsPerSale: 1,
      }),
    ).toBe(false);
    expect(
      supplySellPerPack(pack, {
        packageUnitsPerSale: 12,
      }),
    ).toBe(true);
    expect(
      supplySellPerPack({ ...tray, sellUnit: "pack" }, {
        packageVariant: false,
        packageUnitsPerSale: 1,
      }),
    ).toBe(true);
    expect(
      supplySellPerPack({ ...tray, sellUnit: "piece" }, {
        packageVariant: true,
        packageUnitsPerSale: 30,
      }),
    ).toBe(false);
  });

  it("infers sell unit for the pack sheet", () => {
    expect(
      inferSupplyPackSellUnit(
        { packageVariant: true, packageUnitsPerSale: 30 },
        30,
      ),
    ).toBe("pack");
    expect(
      inferSupplyPackSellUnit(
        { packageVariant: false, packageUnitsPerSale: 1 },
        40,
      ),
    ).toBe("piece");
    expect(inferSupplyPackSellUnit(null, 30)).toBe("pack");
  });

  it("margin cost matches the sell unit", () => {
    expect(supplyMarginCost("430", tray, true)).toBe(430);
    expect(supplyMarginCost("430", tray, false)).toBe(14.33);
    expect(supplyMarginCost("10", null, false)).toBe(10);
  });

  it("retail revenue uses packs when the shelf sells packs", () => {
    // Eggs Large Tray: 10 trays @ 450/tray — not 300 eggs × 450.
    expect(supplyRetailRevenue("10", "450", tray, true)).toBe(4500);
    expect(supplyRetailRevenue("10", "450", tray, false)).toBe(135000);
    // Royco sachets bought in a carton: shelf is per piece.
    expect(supplyRetailRevenue("2", "15", pack, false)).toBe(360);
  });

  it("collapses exact unit multiples to pack count", () => {
    expect(toPackEntry("12", "4.17", 12)).toEqual({
      qtyStr: "1",
      unitStr: "50.04",
    });
  });

  it("keeps non-multiples as pack count", () => {
    expect(toPackEntry("4", "4.17", 12)).toEqual({
      qtyStr: "4",
      unitStr: "50.04",
    });
  });

  it("expands packs back to units", () => {
    expect(toUnitEntry("1", "50.04", 12)).toEqual({
      qtyStr: "12",
      unitStr: "4.17",
    });
  });

  it("labels a posted receipt's packaging snapshot", () => {
    expect(
      supplyPackSnapshotLabel({
        purchaseUnit: "carton",
        purchaseQty: 2,
        unitsPerPurchaseUnit: 24,
        packPrice: 1200,
        baseUnit: "each",
      }),
    ).toBe("2 × cartons · 1200.00 per carton · 24 per carton = 48 each");
    expect(
      supplyPackSnapshotLabel({
        purchaseUnit: "carton",
        purchaseQty: 1,
        unitsPerPurchaseUnit: 24,
      }),
    ).toBe("1 × carton · 24 per carton = 24 units");
    expect(supplyPackSnapshotLabel({ purchaseUnit: null })).toBeNull();
  });
});

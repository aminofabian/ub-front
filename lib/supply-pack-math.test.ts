import { describe, expect, it } from "bun:test";

import {
  sellLooksLikePiecePrice,
  supplyEntryQty,
  supplyLineTotal,
  supplyMarginCost,
  supplyPackSell,
  supplyPackSnapshotLabel,
  supplyRetailRevenue,
  supplyStockQty,
  supplyUnitCost,
  toCatalogSellPrice,
  toPackEntry,
  toPackLineSell,
  toPieceLineSell,
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

  it("margin cost is always the pack price in pack mode", () => {
    expect(supplyMarginCost("430", tray)).toBe(430);
    expect(supplyMarginCost("10", null)).toBe(10);
  });

  it("detects an each sell sitting beside a pack cost", () => {
    expect(sellLooksLikePiecePrice(15, 430, 30)).toBe(true);
    expect(sellLooksLikePiecePrice(14.33, 429.9, 30)).toBe(true);
    expect(sellLooksLikePiecePrice(450, 430, 30)).toBe(false);
    expect(sellLooksLikePiecePrice(429.9, 429.9, 30)).toBe(false);
    // Real low tray price — not an each figure.
    expect(sellLooksLikePiecePrice(20, 430, 30)).toBe(false);
  });

  it("lifts each sell onto the pack line", () => {
    expect(toPackLineSell(15, 30, 430, null)).toBe(450);
    expect(toPackLineSell(450, 30, 430, null)).toBe(450);
    expect(
      toPackLineSell(15, 40, 400, {
        packageVariant: false,
        packageUnitsPerSale: 1,
      }),
    ).toBe(600);
    expect(toPieceLineSell(450, 30)).toBe(15);
  });

  it("normalizes pack sell for margin even when the draft still holds each", () => {
    expect(supplyPackSell("15", "430", tray)).toBe(450);
    expect(supplyPackSell("450", "430", tray)).toBe(450);
  });

  it("retail revenue is always packs × pack sell", () => {
    // Eggs: 10 trays, sell typed as 15 each → treat as 450 / tray.
    expect(supplyRetailRevenue("10", "15", tray, null, "430")).toBe(4500);
    expect(supplyRetailRevenue("10", "450", tray, null, "430")).toBe(4500);
    // Unpacked line stays pieces × sell.
    expect(supplyRetailRevenue("2", "15", null)).toBe(30);
  });

  it("posts pack sell to the catalog in the SKU’s unit", () => {
    expect(
      toCatalogSellPrice(450, tray, {
        packageVariant: true,
        packageUnitsPerSale: 30,
      }),
    ).toBe(450);
    expect(
      toCatalogSellPrice(600, pack, {
        packageVariant: false,
        packageUnitsPerSale: 1,
      }),
    ).toBe(50);
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

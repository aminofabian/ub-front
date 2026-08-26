import { describe, expect, it } from "bun:test";

import {
  supplyLineTotal,
  supplyStockQty,
  supplyUnitCost,
  toPackEntry,
  toUnitEntry,
} from "./supply-pack-math";

const pack = { unitsPerPack: 12, packUnit: "pack" };

describe("supply pack math", () => {
  it("treats typed qty as packs", () => {
    expect(supplyStockQty("1", pack)).toBe(12);
    expect(supplyStockQty("2", pack)).toBe(24);
    expect(supplyStockQty("1", null)).toBe(1);
  });

  it("derives unit cost from pack price", () => {
    expect(supplyUnitCost("50.04", pack)).toBe(4.17);
    expect(supplyUnitCost("4.17", null)).toBe(4.17);
  });

  it("line total is packs × pack price", () => {
    expect(supplyLineTotal("1", "50.04", pack)).toBe(50.04);
    expect(supplyLineTotal("4", "4.17", null)).toBe(16.68);
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
});

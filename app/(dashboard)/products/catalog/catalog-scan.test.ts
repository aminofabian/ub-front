import { describe, expect, it } from "vitest";

import type { GlobalProductRecord } from "@/lib/api";

import {
  barcodeKey,
  barcodeVariants,
  decideScan,
  normalizeScannedCode,
} from "./catalog-scan";

function product(partial: Partial<GlobalProductRecord>): GlobalProductRecord {
  return {
    id: "g-1",
    catalogId: "c1",
    name: "Fresh Milk 500ml",
    barcode: "6161100000012",
    unitType: "each",
    weighed: false,
    sellable: true,
    stocked: true,
    hasExpiry: false,
    sortOrder: 0,
    alreadyImported: false,
    ...partial,
  };
}

const none = () => false;

describe("normalizeScannedCode", () => {
  it("trims what the camera read", () => {
    expect(normalizeScannedCode("  6161100000012\n")).toBe("6161100000012");
  });

  it("rejects blanks and text too long to be a barcode", () => {
    expect(normalizeScannedCode("   ")).toBe("");
    expect(normalizeScannedCode("x".repeat(65))).toBe("");
    expect(normalizeScannedCode("x".repeat(64))).toBe("x".repeat(64));
  });
});

describe("barcodeKey", () => {
  it("treats UPC-A, EAN-13 and GTIN-14 spellings of one number as equal", () => {
    expect(barcodeKey("012345678905")).toBe(barcodeKey("0012345678905"));
    expect(barcodeKey("012345678905")).toBe(barcodeKey("00012345678905"));
  });

  it("keeps different numbers apart", () => {
    expect(barcodeKey("6161100000012")).not.toBe(barcodeKey("6161100000013"));
    expect(barcodeKey("012345678905")).not.toBe(barcodeKey("112345678905"));
  });

  it("leaves in-house codes alone", () => {
    expect(barcodeKey("00123")).toBe("00123");
    expect(barcodeKey("ABC-12")).toBe("ABC-12");
  });
});

describe("barcodeVariants", () => {
  it("adds the leading-zero twin of a 12-digit code", () => {
    expect(barcodeVariants("012345678905")).toEqual([
      "012345678905",
      "0012345678905",
    ]);
  });

  it("adds the 12-digit twin of a 13-digit code that starts with 0", () => {
    expect(barcodeVariants("0012345678905")).toEqual([
      "0012345678905",
      "012345678905",
    ]);
  });

  it("asks once for everything else", () => {
    expect(barcodeVariants("6161100000012")).toEqual(["6161100000012"]);
    expect(barcodeVariants("ABC-12")).toEqual(["ABC-12"]);
  });
});

describe("decideScan", () => {
  it("selects the one importable product with that barcode", () => {
    const g = product({});
    expect(decideScan({ code: "6161100000012", rows: [g], isSelected: none })).toEqual({
      kind: "select",
      product: g,
    });
  });

  it("says so when it is already in the import", () => {
    const g = product({});
    const d = decideScan({
      code: "6161100000012",
      rows: [g],
      isSelected: (id) => id === "g-1",
    });
    expect(d.kind).toBe("already-selected");
  });

  it("reports a product the shop already has, with its shop id", () => {
    const g = product({ alreadyImported: true, adoptedItemId: " item-9 " });
    expect(decideScan({ code: "6161100000012", rows: [g], isSelected: none })).toEqual({
      kind: "in-shop",
      product: g,
      itemId: "item-9",
    });
  });

  it("reports an owned product even without a shop id", () => {
    const g = product({ alreadyImported: true });
    const d = decideScan({ code: "6161100000012", rows: [g], isSelected: none });
    expect(d).toEqual({ kind: "in-shop", product: g, itemId: null });
  });

  it("asks to pick when several importable products share the barcode", () => {
    const a = product({ id: "a", name: "Long Life 500ml" });
    const b = product({ id: "b", name: "Long Life 500ml (promo)" });
    const d = decideScan({ code: "6161100000012", rows: [a, b], isSelected: none });
    expect(d).toEqual({ kind: "pick", products: [a, b] });
  });

  it("ignores an owned twin when exactly one importable product remains", () => {
    const owned = product({ id: "owned", alreadyImported: true, adoptedItemId: "item-1" });
    const fresh = product({ id: "fresh" });
    const d = decideScan({ code: "6161100000012", rows: [owned, fresh], isSelected: none });
    expect(d).toEqual({ kind: "select", product: fresh });
  });

  it("is not found when rows only match by name or SKU", () => {
    const byName = product({ barcode: "6161100000999" });
    const noCode = product({ id: "g-2", barcode: null });
    expect(
      decideScan({ code: "6161100000012", rows: [byName, noCode], isSelected: none }),
    ).toEqual({ kind: "not-found", code: "6161100000012" });
    expect(decideScan({ code: "6161100000012", rows: [], isSelected: none })).toEqual({
      kind: "not-found",
      code: "6161100000012",
    });
  });

  it("matches a UPC-A scan against an EAN-13 catalogue entry", () => {
    const g = product({ barcode: "0012345678905" });
    const d = decideScan({ code: "012345678905", rows: [g], isSelected: none });
    expect(d).toEqual({ kind: "select", product: g });
  });
});

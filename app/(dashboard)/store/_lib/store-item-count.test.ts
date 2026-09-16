import { describe, expect, test } from "bun:test";

import type { StoreItemRecord } from "@/lib/api";

import {
  parseStoreCount,
  storeItemCount,
  storeItemCountInput,
} from "./store-item-count";

function row(partial: Partial<StoreItemRecord>): StoreItemRecord {
  return {
    id: "s1",
    name: "Cloths",
    barcode: null,
    itemId: null,
    quantity: 0,
    expiryDate: null,
    buyingPrice: null,
    inventoryQuantity: null,
    inventoryItemName: null,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("parseStoreCount", () => {
  test("accepts a whole local count", () => {
    expect(parseStoreCount("12", true)).toBe(12);
    expect(parseStoreCount("12.5", true)).toBeNull();
  });

  test("accepts a fractional inventory count", () => {
    expect(parseStoreCount("12.5", false)).toBe(12.5);
    expect(parseStoreCount("0", false)).toBe(0);
  });

  test("rejects blanks and negatives", () => {
    expect(parseStoreCount("", false)).toBeNull();
    expect(parseStoreCount("-1", false)).toBeNull();
  });
});

describe("storeItemCount", () => {
  test("uses live inventory while linked and connected", () => {
    expect(
      storeItemCount(
        row({ itemId: "p1", quantity: 0, inventoryQuantity: "24.5" }),
        true,
      ),
    ).toBe(24.5);
  });

  test("uses the local count when unlinked or standalone", () => {
    expect(storeItemCount(row({ quantity: 8, itemId: "p1" }), false)).toBe(8);
    expect(storeItemCount(row({ quantity: 3 }), true)).toBe(3);
  });
});

describe("storeItemCountInput", () => {
  test("does not pad whole numbers", () => {
    expect(storeItemCountInput(24)).toBe("24");
    expect(storeItemCountInput(24.5)).toBe("24.5");
  });
});

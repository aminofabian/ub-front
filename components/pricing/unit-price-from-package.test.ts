import { describe, expect, test } from "bun:test";

import { unitPriceFromPackage } from "./unit-price-from-package";

describe("unitPriceFromPackage", () => {
  test("divides the package price by its units", () => {
    expect(unitPriceFromPackage(24, 480)).toBe(20);
    expect(unitPriceFromPackage(1000, 800)).toBe(0.8);
  });

  test("rounds to the destination column's scale", () => {
    // items.buying_price / unit_price_kes are scale 2.
    expect(unitPriceFromPackage(3, 100)).toBe(33.33);
    // inventory_batches.unit_cost is scale 4.
    expect(unitPriceFromPackage(3, 100, 4)).toBe(33.3333);
  });

  test("produces a clean string at four decimals", () => {
    // String() is what callers put back into the input.
    expect(String(unitPriceFromPackage(3, 100, 4))).toBe("33.3333");
    expect(String(unitPriceFromPackage(2, 295, 4))).toBe("147.5");
  });

  test("rejects a package that works out to nothing", () => {
    expect(unitPriceFromPackage(0, 100)).toBe(0);
    expect(unitPriceFromPackage(-1, 100)).toBe(0);
    expect(unitPriceFromPackage(10, 0)).toBe(0);
    expect(unitPriceFromPackage(10, -5)).toBe(0);
    // 100,000 units for KES 1 rounds below the smallest scale-2 price.
    expect(unitPriceFromPackage(100000, 1)).toBe(0);
  });
});

import { describe, expect, test } from "bun:test";
import {
  effectiveOnHand,
  formatOverallStockLabel,
  formatStockLabel,
} from "./_utils";

describe("store stock helpers", () => {
  test("formatStockLabel uses stockQty only (never overall currentStock)", () => {
    expect(
      formatStockLabel({
        stockQty: 3,
        currentStock: 99,
      } as { stockQty: number; currentStock: number }),
    ).toBe("3");
    expect(
      formatStockLabel({
        stockQty: null,
        currentStock: 99,
      } as { stockQty: null; currentStock: number }),
    ).toBe("—");
  });

  test("formatOverallStockLabel reads currentStock", () => {
    expect(formatOverallStockLabel({ currentStock: 42 })).toBe("42");
    expect(formatOverallStockLabel({ currentStock: null })).toBe("—");
  });

  test("effectiveOnHand ignores overall currentStock", () => {
    expect(
      effectiveOnHand({
        stockQty: 5,
        currentStock: 100,
      } as { stockQty: number; currentStock: number }),
    ).toBe(5);
    expect(
      effectiveOnHand({
        stockQty: null,
        currentStock: 100,
      } as { stockQty: null; currentStock: number }),
    ).toBeNull();
  });

  test("package variant uses stockQty/baseStockQty, not currentStock", () => {
    expect(
      formatStockLabel({
        packageVariant: true,
        stockQty: 2,
        baseStockQty: 60,
        packagingUnitQty: 30,
        currentStock: 999,
      } as {
        packageVariant: boolean;
        stockQty: number;
        baseStockQty: number;
        packagingUnitQty: number;
        currentStock: number;
      }),
    ).toBe("2 pkg · 60 base");
    expect(
      effectiveOnHand({
        packageVariant: true,
        stockQty: null,
        baseStockQty: null,
        packagingUnitQty: 30,
        currentStock: 999,
      } as {
        packageVariant: boolean;
        stockQty: null;
        baseStockQty: null;
        packagingUnitQty: number;
        currentStock: number;
      }),
    ).toBeNull();
  });
});

import { describe, expect, test } from "bun:test";
import {
  formatStockLabel,
  isPackUnits,
  packChipLabel,
  packEditHint,
  packStockBlock,
  variantSellShape,
} from "./_utils";

describe("shared selling units", () => {
  test("a one-unit package is counted as base units, never packs", () => {
    const sharedUnit = {
      packageVariant: true,
      stockQty: 150,
      baseStockQty: 150,
      packagingUnitQty: 1,
    };
    expect(formatStockLabel(sharedUnit)).toBe("150");
    expect(packChipLabel(1)).toBe("Each");
    expect(isPackUnits(1)).toBe(false);
    expect(isPackUnits(null)).toBe(false);
  });

  test("real packs keep pack wording", () => {
    expect(
      formatStockLabel({
        packageVariant: true,
        stockQty: 5,
        baseStockQty: 150,
        packagingUnitQty: 30,
      }),
    ).toBe("5 packs · 150 units");
    expect(packChipLabel(30)).toBe("30/pack");
    expect(isPackUnits(30)).toBe(true);
  });

  test("one unit with the pack box unchecked stays a shared selling unit", () => {
    expect(
      variantSellShape({
        units: 1,
        explicitPack: false,
        variantName: "Single",
      }),
    ).toEqual({
      packageVariant: false,
      packagingUnitQty: 1,
      packagingUnitName: "Single",
      isStocked: false,
    });
  });

  test("a checked box or more than one unit is a package", () => {
    expect(
      variantSellShape({
        units: 1,
        explicitPack: true,
        variantName: "Tray",
      }).packageVariant,
    ).toBe(true);

    const tray = variantSellShape({
      units: 30,
      explicitPack: false,
      variantName: "Tray",
      packagingUnitName: "Tray of 30",
    });
    expect(tray).toEqual({
      packageVariant: true,
      packagingUnitQty: 30,
      packagingUnitName: "Tray of 30",
      isStocked: false,
      isWeighed: false,
    });
  });

  test("the unit hint explains one-at-a-time instead of a pack", () => {
    expect(packEditHint("1", "Eggs Small")).toMatch(/one Eggs Small at a time/);
    expect(packEditHint("30", "Eggs Small")).toMatch(/1 pack = 30 Eggs Small/);
  });
});

describe("pack stock guard", () => {
  test("flags a pack whose count sits on a sibling option", () => {
    expect(
      packStockBlock(
        {
          stockQty: 0,
          baseStockQty: null,
          variants: [
            { id: "single", variantName: "Single", stockQty: 150 },
            { id: "tray", packageVariant: true, stockQty: 0 },
          ],
        },
        "eggs",
      ),
    ).toEqual({ names: ["Single"] });
  });

  test("allows a pack when the base pool holds stock", () => {
    expect(
      packStockBlock(
        {
          stockQty: 150,
          variants: [{ id: "single", variantName: "Single", stockQty: 150 }],
        },
        "eggs",
      ),
    ).toBeNull();
  });

  test("allows a pack on a fresh product with no stock anywhere", () => {
    expect(
      packStockBlock({ stockQty: 0, variants: [] }, "eggs"),
    ).toBeNull();
  });

  test("ignores package siblings and the parent row itself", () => {
    expect(
      packStockBlock(
        {
          stockQty: 0,
          variants: [
            { id: "eggs", stockQty: 0 },
            { id: "tray", packageVariant: true, stockQty: 60 },
          ],
        },
        "eggs",
      ),
    ).toBeNull();
  });
});

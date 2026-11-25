import { describe, expect, test } from "bun:test";
import {
  allocateOnHand,
  unitAvailabilityLabel,
  catalogQtyPresentation,
  familySellsPacks,
  formatStockLabel,
  isPackUnits,
  onHandBreakdownLabel,
  packChipLabel,
  packEditHint,
  packStockBlock,
  saleTakesLabel,
  shelfSellingUnits,
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

const eggFamily = [
  { id: "single", variantName: "single", packageUnitsPerSale: 1 },
  {
    id: "tray",
    variantName: "Tray",
    packageVariant: true,
    packageUnitsPerSale: 30,
  },
];

describe("shared shelf breakdown", () => {
  test("lists every selling unit and what one sale takes", () => {
    const units = shelfSellingUnits(eggFamily, "Eggs Large");
    expect(units.map((unit) => unit.label)).toEqual(["single", "Tray"]);
    expect(saleTakesLabel(1, "Eggs Large")).toBe("1 sale takes 1 Eggs Large");
    expect(saleTakesLabel(30, "Eggs Large")).toBe(
      "1 sale takes 30 Eggs Large",
    );
  });

  test("168 eggs is 5 trays and 18 singles", () => {
    const units = shelfSellingUnits(eggFamily, "Eggs Large");
    const { slices, loose } = allocateOnHand(168, units);
    expect(loose).toBe(0);
    expect(onHandBreakdownLabel(slices, loose, "Eggs Large")).toBe(
      "5 Tray, 18 single",
    );
  });

  test("every unit reads the one shelf count", () => {
    const [single, tray] = shelfSellingUnits(eggFamily, "Eggs Large");
    expect(unitAvailabilityLabel(158, single)).toBe("158");
    expect(unitAvailabilityLabel(158, tray)).toBe("5, 8 rem");
    expect(unitAvailabilityLabel(128, tray)).toBe("4, 8 rem");
    expect(unitAvailabilityLabel(150, tray)).toBe("5");
    expect(unitAvailabilityLabel(0, tray)).toBe("0");
  });

  test("60 eggs is 2 trays and no loose singles", () => {
    const units = shelfSellingUnits(eggFamily, "Eggs Large");
    const { slices, loose } = allocateOnHand(60, units);
    expect(onHandBreakdownLabel(slices, loose, "Eggs Large")).toBe(
      "2 Tray, 0 single",
    );
  });

  test("a tray-only family keeps the leftover on the base product", () => {
    const units = shelfSellingUnits(
      [{ id: "tray", variantName: "Tray", packageUnitsPerSale: 30 }],
      "Eggs Large",
    );
    expect(units.map((unit) => [unit.label, unit.unitsPerSale])).toEqual([
      ["Eggs Large", 1],
      ["Tray", 30],
    ]);
    const { slices, loose } = allocateOnHand(18, units);
    expect(loose).toBe(0);
    expect(onHandBreakdownLabel(slices, loose, "Eggs Large")).toBe(
      "0 Tray, 18 Eggs Large",
    );
  });

  test("a product with no packs is not a shared shelf", () => {
    expect(
      familySellsPacks([
        { id: "vanilla", variantName: "Vanilla", stockQty: 4 },
      ]),
    ).toBe(false);
  });
});

describe("catalog qty for a shared shelf", () => {
  test("a tray shows whole packs and how many of the shelf they use", () => {
    expect(
      catalogQtyPresentation({
        id: "tray",
        variantName: "Tray",
        parentName: "Eggs Large",
        packageVariant: true,
        packageUnitsPerSale: 30,
        stockQty: 5,
        baseStockQty: 168,
      }),
    ).toEqual({
      label: "5",
      title:
        "5 packs · 150 of 168 Eggs Large. 1 sale takes 30 Eggs Large",
      note: "of 168",
    });
  });

  test("a single shows the shared shelf, not a second stock", () => {
    expect(
      catalogQtyPresentation({
        id: "single",
        name: "Eggs Large single",
        parentName: "Eggs Large",
        packageUnitsPerSale: 1,
        stockQty: 168,
        baseStockQty: 168,
      }).title,
    ).toBe("168 Eggs Large. 1 sale takes 1 Eggs Large");
  });
});

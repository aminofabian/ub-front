import { describe, expect, it } from "vitest";

import { isPackSellSku } from "./pack-sell-sku";

describe("isPackSellSku", () => {
  it("treats packageVariant as a pack", () => {
    expect(isPackSellSku({ packageVariant: true })).toBe(true);
  });

  it("treats unstocked child with units as a pack", () => {
    expect(
      isPackSellSku({
        variantOfItemId: "parent",
        packageUnitsPerSale: 30,
        isStocked: false,
      }),
    ).toBe(true);
  });

  it("treats multi-unit child as a pack even when stocked", () => {
    expect(
      isPackSellSku({
        variantOfItemId: "parent",
        packageUnitsPerSale: 30,
        isStocked: true,
      }),
    ).toBe(true);
  });

  it("does not treat a plain option variant as a pack", () => {
    expect(
      isPackSellSku({
        variantOfItemId: "parent",
        packageUnitsPerSale: 1,
        isStocked: true,
      }),
    ).toBe(false);
  });

  it("does not treat a standalone SKU as a pack", () => {
    expect(isPackSellSku({ packageVariant: false })).toBe(false);
  });
});

import { describe, expect, it } from "bun:test";

import { filterShopperTypes } from "@/components/storefront/shop-type-filters";

describe("filterShopperTypes", () => {
  it("keeps catch-all store types such as Retail Shop", () => {
    expect(
      filterShopperTypes([
        { id: "1", label: "Retail Shop", itemCount: 1210 },
      ]).map((t) => t.label),
    ).toEqual(["Retail Shop"]);
  });

  it("keeps every named type in order", () => {
    expect(
      filterShopperTypes([
        { id: "1", label: "retail", itemCount: 100 },
        { id: "2", label: "Cereals", itemCount: 25 },
        { id: "3", label: "spices", itemCount: 40 },
      ]).map((t) => t.label),
    ).toEqual(["retail", "Cereals", "spices"]);
  });

  it("drops types with a blank label", () => {
    expect(
      filterShopperTypes([
        { id: "1", label: "  ", itemCount: 5 },
        { id: "2", label: "Drinks", itemCount: 5 },
      ]).map((t) => t.label),
    ).toEqual(["Drinks"]);
  });
});

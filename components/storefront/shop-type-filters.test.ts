import { describe, expect, it } from "bun:test";

import { filterShopperTypes } from "@/components/storefront/shop-type-filters";

describe("filterShopperTypes", () => {
  it("hides lone Retail / Grocery catch-all types", () => {
    expect(
      filterShopperTypes([
        { id: "1", label: "Retail Shop", itemCount: 1210 },
      ]),
    ).toEqual([]);
  });

  it("keeps product-family types and drops generic ones", () => {
    expect(
      filterShopperTypes([
        { id: "1", label: "retail", itemCount: 100 },
        { id: "2", label: "Cereals", itemCount: 25 },
        { id: "3", label: "spices", itemCount: 40 },
      ]).map((t) => t.label),
    ).toEqual(["Cereals", "spices"]);
  });
});

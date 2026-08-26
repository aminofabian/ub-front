import { describe, expect, it } from "bun:test";

import {
  catalogEachFromPack,
  catalogWholesalePack,
} from "./marketplace-catalog-groups";

describe("catalogWholesalePack", () => {
  it("hides single-unit SKUs", () => {
    expect(
      catalogWholesalePack({ packSize: 1, packUnit: "pcs" }),
    ).toBeNull();
    expect(
      catalogWholesalePack({ packSize: null, packUnit: "pack" }),
    ).toBeNull();
  });

  it("exposes carton size for wholesale packs", () => {
    expect(
      catalogWholesalePack({ packSize: 40, packUnit: "pack" }),
    ).toEqual({ size: 40, unit: "pack" });
  });

  it("derives each price from pack price", () => {
    expect(
      catalogEachFromPack({ packSize: 40, unitPrice: 400 }),
    ).toBe(10);
    expect(
      catalogEachFromPack({ packSize: 1, unitPrice: 400 }),
    ).toBeNull();
  });
});

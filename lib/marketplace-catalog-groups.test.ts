import { describe, expect, it } from "bun:test";

import {
  catalogEachFromPack,
  catalogPackOptionById,
  catalogPackOptions,
  catalogPackSizeLine,
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

describe("catalogPackOptions", () => {
  it("returns empty for unit-only products", () => {
    expect(catalogPackOptions({ packs: undefined })).toEqual([]);
    expect(catalogPackOptions({ packs: [] })).toEqual([]);
  });

  it("exposes the saved pack shapes in backend order", () => {
    expect(
      catalogPackOptions({
        packs: [
          { id: "p48", label: "Crate", packUnit: "pack", unitsPerPack: 48, unitPrice: 400, eachPrice: 8.33 },
          { id: "p12", label: "Dozen", packUnit: "pack", unitsPerPack: 12, unitPrice: 120, eachPrice: 10 },
          { id: "p18", label: null, packUnit: "pack", unitsPerPack: 18, unitPrice: 170, eachPrice: 9.44 },
        ],
      }),
    ).toHaveLength(3);
  });

  it("drops malformed options with unitsPerPack <= 1", () => {
    expect(
      catalogPackOptions({
        packs: [
          { id: "bad", label: null, packUnit: "pack", unitsPerPack: 1, unitPrice: 100, eachPrice: null },
          { id: "p12", label: null, packUnit: "pack", unitsPerPack: 12, unitPrice: 120, eachPrice: 10 },
        ],
      }),
    ).toEqual([
      { id: "p12", label: null, packUnit: "pack", unitsPerPack: 12, unitPrice: 120, eachPrice: 10 },
    ]);
  });
});

describe("catalogPackOptionById", () => {
  it("resolves a selected option and treats unit mode as null", () => {
    const product = {
      packs: [
        { id: "p12", label: "Dozen", packUnit: "pack", unitsPerPack: 12, unitPrice: 120, eachPrice: 10 },
        { id: "p48", label: "Crate", packUnit: "pack", unitsPerPack: 48, unitPrice: 400, eachPrice: 8.33 },
      ],
    };
    expect(catalogPackOptionById(product, "p48")?.unitsPerPack).toBe(48);
    expect(catalogPackOptionById(product, null)).toBeNull();
    expect(catalogPackOptionById(product, undefined)).toBeNull();
    expect(catalogPackOptionById(product, "nope")).toBeNull();
  });
});

describe("catalogPackSizeLine", () => {
  it("renders compact available packs and empty for unit-only", () => {
    expect(
      catalogPackSizeLine({
        packs: [
          { id: "p12", label: "Dozen", packUnit: "pack", unitsPerPack: 12, unitPrice: 120, eachPrice: 10 },
          { id: "p48", label: "Crate", packUnit: "pack", unitsPerPack: 48, unitPrice: 400, eachPrice: 8.33 },
        ],
      }),
    ).toBe("×12 · ×48");
    expect(catalogPackSizeLine({ packs: undefined })).toBe("");
    expect(catalogPackSizeLine({ packs: [] })).toBe("");
  });
});

import { describe, expect, it } from "vitest";

import type { GlobalProductRecord } from "@/lib/api";

import type { GroupOptionRow } from "./CreateGroupOptionsPad";
import {
  fillEmptyOptionFields,
  optionSuffixFromShared,
  planFamilyFill,
  sharedProductToOptionSeed,
} from "./shared-option-fill";

function shared(partial: Partial<GlobalProductRecord>): GlobalProductRecord {
  return {
    id: "g1",
    catalogId: "c1",
    name: "Fresh Milk",
    unitType: "each",
    weighed: false,
    sellable: true,
    stocked: true,
    hasExpiry: false,
    sortOrder: 0,
    alreadyImported: false,
    ...partial,
  };
}

function row(partial: Partial<GroupOptionRow> = {}): GroupOptionRow {
  return {
    key: "k1",
    label: "",
    barcode: "",
    buyingPrice: "",
    unitPrice: "",
    stock: "1",
    imageFile: null,
    imagePreview: null,
    ...partial,
  };
}

describe("optionSuffixFromShared", () => {
  it("keeps the whole name while there is no family name yet", () => {
    expect(
      optionSuffixFromShared("", shared({ name: "Fresh Milk 500ml" })),
    ).toBe("Fresh Milk 500ml");
  });

  it("drops the family name from a product that repeats it", () => {
    expect(
      optionSuffixFromShared("Fresh Milk", shared({ name: "Fresh Milk 500ml" })),
    ).toBe("500ml");
  });

  it("ignores case and separators after the family name", () => {
    expect(
      optionSuffixFromShared("brookside", shared({ name: "Brookside - 500ml" })),
    ).toBe("500ml");
  });

  it("uses the variant name when the product is the family itself", () => {
    expect(
      optionSuffixFromShared(
        "Fresh Milk",
        shared({ name: "Fresh Milk", variantName: "1L" }),
      ),
    ).toBe("1L");
  });

  it("describes a pack with its unit and quantity", () => {
    expect(
      optionSuffixFromShared(
        "Eggs",
        shared({ name: "Eggs", packagingUnitName: "Tray", packagingUnitQty: 30 }),
      ),
    ).toBe("Tray ×30");
  });

  it("falls back to the given label when nothing tells the product apart", () => {
    expect(
      optionSuffixFromShared("Eggs", shared({ name: "Eggs" }), {
        fallback: "Single",
      }),
    ).toBe("Single");
  });

  it("uses the size or variant of a family member whose name does not repeat the family", () => {
    expect(
      optionSuffixFromShared(
        "Brookside Milk",
        shared({ name: "Half litre pack", variantName: "Half litre" }),
        { inFamily: true },
      ),
    ).toBe("Half litre");
  });

  it("keeps the full name of a product that only shares a barcode", () => {
    expect(
      optionSuffixFromShared(
        "Fresh drinks",
        shared({ name: "Coca-Cola 500ml", size: "500ml" }),
      ),
    ).toBe("Coca-Cola 500ml");
  });
});

describe("sharedProductToOptionSeed", () => {
  it("carries barcode, recommended prices and the shared id", () => {
    const seed = sharedProductToOptionSeed(
      shared({
        id: "g9",
        name: "Fresh Milk 500ml",
        barcode: " 6161100000012 ",
        recommendedSellingPrice: 65,
        recommendedBuyingPrice: 52.5,
      }),
      "Fresh Milk",
    );
    expect(seed).toEqual({
      label: "500ml",
      barcode: "6161100000012",
      unitPrice: "65",
      buyingPrice: "52.5",
      sharedProductId: "g9",
    });
  });

  it("leaves prices empty when the catalog has none", () => {
    const seed = sharedProductToOptionSeed(
      shared({ recommendedSellingPrice: 0, recommendedBuyingPrice: null }),
      "",
    );
    expect(seed.unitPrice).toBe("");
    expect(seed.buyingPrice).toBe("");
  });
});

describe("fillEmptyOptionFields", () => {
  const seed = {
    label: "500ml",
    barcode: "6161100000012",
    unitPrice: "65",
    buyingPrice: "52",
    sharedProductId: "g9",
  };

  it("fills an empty row", () => {
    const next = fillEmptyOptionFields(row(), seed);
    expect(next).toMatchObject({ ...seed, stock: "1" });
  });

  it("never overwrites what the clerk already typed", () => {
    const next = fillEmptyOptionFields(
      row({ label: "Half litre", unitPrice: "70" }),
      seed,
    );
    expect(next.label).toBe("Half litre");
    expect(next.unitPrice).toBe("70");
    expect(next.buyingPrice).toBe("52");
    expect(next.sharedProductId).toBe("g9");
  });
});

describe("planFamilyFill", () => {
  const eggs = shared({
    id: "root",
    name: "Eggs",
    sellable: true,
    size: "1 egg",
    recommendedSellingPrice: 15,
  });
  const tray = shared({
    id: "tray",
    name: "Eggs Tray of 30",
    variantOfGlobalProductId: "root",
    recommendedSellingPrice: 420,
  });
  const half = shared({
    id: "half",
    name: "Eggs Half tray",
    variantOfGlobalProductId: "root",
    recommendedSellingPrice: 220,
  });

  it("turns a base product and its pack sizes into one option each", () => {
    const plan = planFamilyFill({
      match: eggs,
      family: { root: eggs, variants: [tray, half] },
      typedName: "egg",
      room: 24,
    });
    expect(plan.isFamily).toBe(true);
    expect(plan.familyTitle).toBe("Eggs");
    expect(plan.picks.map((p) => p.seed.label)).toEqual([
      "1 egg",
      "Tray of 30",
      "Half tray",
    ]);
    expect(plan.picks.map((p) => p.seed.unitPrice)).toEqual([
      "15",
      "420",
      "220",
    ]);
    expect(plan.onShelf).toBe(0);
    expect(plan.trimmed).toBe(0);
  });

  it("names the base option Single when nothing tells it apart", () => {
    const bare = { ...eggs, size: null };
    const plan = planFamilyFill({
      match: bare,
      family: { root: bare, variants: [tray] },
      typedName: "",
      room: 24,
    });
    expect(plan.picks[0].seed.label).toBe("Single");
  });

  it("skips a base product that is not sellable", () => {
    const plan = planFamilyFill({
      match: eggs,
      family: { root: { ...eggs, sellable: false }, variants: [tray, half] },
      typedName: "",
      room: 24,
    });
    expect(plan.picks.map((p) => p.g.id)).toEqual(["tray", "half"]);
  });

  it("builds the family from the base product when a pack size was picked", () => {
    const plan = planFamilyFill({
      match: tray,
      family: { root: eggs, variants: [tray, half] },
      typedName: "tray",
      room: 24,
    });
    expect(plan.familyTitle).toBe("Eggs");
    expect(plan.picks.map((p) => p.g.id)).toEqual(["root", "tray", "half"]);
  });

  it("leaves out what is already on the shelf", () => {
    const plan = planFamilyFill({
      match: eggs,
      family: {
        root: eggs,
        variants: [{ ...tray, alreadyImported: true }, half],
      },
      typedName: "",
      room: 24,
    });
    expect(plan.picks.map((p) => p.g.id)).toEqual(["root", "half"]);
    expect(plan.onShelf).toBe(1);
  });

  it("keeps the typed family name for a lone product", () => {
    const milk = shared({
      id: "m1",
      name: "Brookside Fresh Milk 500ml",
      recommendedSellingPrice: 65,
    });
    const plan = planFamilyFill({
      match: milk,
      family: { root: milk, variants: [] },
      typedName: "Brookside Fresh Milk",
      room: 24,
    });
    expect(plan.isFamily).toBe(false);
    expect(plan.familyTitle).toBe("Brookside Fresh Milk");
    expect(plan.picks).toHaveLength(1);
    expect(plan.picks[0].seed.label).toBe("500ml");
  });

  it("still works when the family could not be loaded", () => {
    const plan = planFamilyFill({
      match: eggs,
      family: null,
      typedName: "Eggs",
      room: 24,
    });
    expect(plan.picks.map((p) => p.g.id)).toEqual(["root"]);
  });

  it("stops at the room left and reports what did not fit", () => {
    const plan = planFamilyFill({
      match: eggs,
      family: { root: eggs, variants: [tray, half] },
      typedName: "",
      room: 2,
    });
    expect(plan.picks).toHaveLength(2);
    expect(plan.trimmed).toBe(1);
  });

  it("adds nothing when the form is full", () => {
    const plan = planFamilyFill({
      match: eggs,
      family: { root: eggs, variants: [tray] },
      typedName: "",
      room: 0,
    });
    expect(plan.picks).toHaveLength(0);
    expect(plan.trimmed).toBe(2);
  });
});

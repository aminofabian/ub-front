import { describe, expect, it } from "vitest";

import {
  joinProductNameParts,
  normalizeProductDisplayName,
  resolveCatalogItemName,
  resolveCatalogVariantListTitle,
  trimCatalogLabel,
  formatProductNameForCatalog,
} from "./catalog-display";
import {
  setCatalogDisplayPolicy,
} from "./catalog-display-policy";

describe("normalizeProductDisplayName", () => {
  it("title-cases all-lower and all-upper names", () => {
    expect(normalizeProductDisplayName("coca cola 2 litre")).toBe("Coca Cola 2L");
    expect(normalizeProductDisplayName("CLUB SODA")).toBe("Club Soda");
    expect(normalizeProductDisplayName("COCA COLA")).toBe("Coca Cola");
  });

  it("normalizes glued size units", () => {
    expect(normalizeProductDisplayName("Pina Colada 350ML")).toBe(
      "Pina Colada 350ml",
    );
    expect(normalizeProductDisplayName("Sprite 2Litres")).toBe("Sprite 2L");
    expect(normalizeProductDisplayName("Tangawizi 90G")).toBe("Tangawizi 90g");
    expect(normalizeProductDisplayName("Coca Cola 2L")).toBe("Coca Cola 2L");
  });

  it("keeps known acronyms", () => {
    expect(normalizeProductDisplayName("LED TV 32")).toBe("LED TV 32");
  });
});

describe("trimCatalogLabel", () => {
  it("preserves entered casing and collapses whitespace", () => {
    expect(trimCatalogLabel("  BL CVD-12  ")).toBe("BL CVD-12");
    expect(trimCatalogLabel("BL   DRY-10")).toBe("BL DRY-10");
  });
});

describe("resolveCatalogItemName", () => {
  it("shows inventory codes exactly as stored when policy preserves casing", () => {
    setCatalogDisplayPolicy({ preserveProductNameCasing: true });
    expect(resolveCatalogItemName({ name: "BL CVD-12" }).label).toBe("BL CVD-12");
    expect(resolveCatalogItemName({ name: "CLUB SODA" }).label).toBe("CLUB SODA");
  });

  it("title-cases names when policy allows formatting", () => {
    setCatalogDisplayPolicy({ preserveProductNameCasing: false });
    expect(resolveCatalogItemName({ name: "BL CVD-12" }).label).toBe("Bl Cvd-12");
    expect(resolveCatalogItemName({ name: "CLUB SODA" }).label).toBe("Club Soda");
    setCatalogDisplayPolicy({ preserveProductNameCasing: true });
  });
});

describe("formatProductNameForCatalog", () => {
  it("follows the active display policy", () => {
    setCatalogDisplayPolicy({ preserveProductNameCasing: true });
    expect(formatProductNameForCatalog("BL CVD-12")).toBe("BL CVD-12");
    setCatalogDisplayPolicy({ preserveProductNameCasing: false });
    expect(formatProductNameForCatalog("BL CVD-12")).toBe("Bl Cvd-12");
    setCatalogDisplayPolicy({ preserveProductNameCasing: true });
  });
});

describe("joinProductNameParts", () => {
  it("reads family and option as one name", () => {
    expect(
      joinProductNameParts("Velvex Products", "Scouring Powder Lavender Fragrance 1Kg"),
    ).toBe("Velvex Scouring Powder Lavender Fragrance 1Kg");
    expect(joinProductNameParts("Velvex Scouring Powder", "1Kg")).toBe(
      "Velvex Scouring Powder 1Kg",
    );
  });

  it("never repeats a part the other already contains", () => {
    expect(joinProductNameParts("Velvex Tissue White 8Pack", "Tissue White 8Pack")).toBe(
      "Velvex Tissue White 8Pack",
    );
    expect(joinProductNameParts("Velvex", "Velvex Tissue 4Pack")).toBe(
      "Velvex Tissue 4Pack",
    );
  });

  it("keeps a family whose last word only looks like filler", () => {
    expect(joinProductNameParts("Rhino", "Single 60 Sticks")).toBe(
      "Rhino Single 60 Sticks",
    );
    expect(joinProductNameParts("Products", "Assorted 1Kg")).toBe("Products Assorted 1Kg");
  });

  it("handles a missing part", () => {
    expect(joinProductNameParts("Velvex Tissue", null)).toBe("Velvex Tissue");
    expect(joinProductNameParts(null, "Tissue 4Pack")).toBe("Tissue 4Pack");
  });
});

describe("resolveCatalogVariantListTitle", () => {
  it("shows family plus option when parent is not in the list (search hits)", () => {
    const title = resolveCatalogVariantListTitle({
      name: "Rhino Kubwa",
      sku: "MATCHE-10003-SINGLE-60-STICKS",
      variantName: "Single 60 Sticks",
    });
    expect(title.family).toBe("Rhino Kubwa");
    expect(title.option).toBe("Single 60 Sticks");
    expect(title.combined).toBe("Rhino Kubwa Single 60 Sticks");
  });

  it("keeps option-only title when parent row is already on screen", () => {
    const title = resolveCatalogVariantListTitle(
      {
        name: "Rhino Kubwa",
        sku: "MATCHE-10003-SINGLE-60-STICKS",
        variantName: "Single 60 Sticks",
      },
      {
        parentInList: true,
        parentRow: { name: "Rhino Kubwa" },
      },
    );
    expect(title.family).toBeNull();
    expect(title.option).toBe("Single 60 Sticks");
    expect(title.combined).toBe("Single 60 Sticks");
  });

  it("does not duplicate when name equals the option label", () => {
    const title = resolveCatalogVariantListTitle({
      name: "Single 60 Sticks",
      variantName: "Single 60 Sticks",
      brand: "Rhino Kubwa",
    });
    expect(title.family).toBe("Rhino Kubwa");
    expect(title.combined).toBe("Rhino Kubwa Single 60 Sticks");
  });

  it("peels a repeated option suffix off a long name", () => {
    const title = resolveCatalogVariantListTitle({
      name: "Rhino Kubwa Single 60 Sticks",
      variantName: "Single 60 Sticks",
    });
    expect(title.family).toBe("Rhino Kubwa");
    expect(title.combined).toBe("Rhino Kubwa Single 60 Sticks");
  });
});

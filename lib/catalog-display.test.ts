import { describe, expect, it } from "vitest";

import { resolveCatalogVariantListTitle } from "./catalog-display";

describe("resolveCatalogVariantListTitle", () => {
  it("shows family · option when parent is not in the list (search hits)", () => {
    const title = resolveCatalogVariantListTitle({
      name: "Rhino Kubwa",
      sku: "MATCHE-10003-SINGLE-60-STICKS",
      variantName: "Single 60 Sticks",
    });
    expect(title.family).toBe("Rhino Kubwa");
    expect(title.option).toBe("Single 60 Sticks");
    expect(title.combined).toBe("Rhino Kubwa · Single 60 Sticks");
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
    expect(title.combined).toBe("Rhino Kubwa · Single 60 Sticks");
  });

  it("peels a repeated option suffix off a long name", () => {
    const title = resolveCatalogVariantListTitle({
      name: "Rhino Kubwa Single 60 Sticks",
      variantName: "Single 60 Sticks",
    });
    expect(title.family).toBe("Rhino Kubwa");
    expect(title.combined).toBe("Rhino Kubwa · Single 60 Sticks");
  });
});

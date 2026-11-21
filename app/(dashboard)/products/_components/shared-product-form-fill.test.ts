import { describe, expect, it } from "bun:test";

import type { GlobalProductRecord } from "@/lib/api";

import {
  sharedCatalogCoverUrl,
  sharedProductFormFill,
} from "./shared-option-fill";

function product(partial: Partial<GlobalProductRecord>): GlobalProductRecord {
  return {
    id: "g1",
    catalogId: "c1",
    name: "Brookside Fresh Milk 500ml",
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

describe("sharedProductFormFill", () => {
  it("fills the form from the catalog product, including pack size and gallery photo", () => {
    const fill = sharedProductFormFill(
      product({
        barcode: "6161100012345",
        skuTemplate: "MILK-500",
        brand: "Brookside",
        size: "500ml",
        description: "Fresh milk",
        unitType: "each",
        recommendedBuyingPrice: 52,
        recommendedSellingPrice: 65,
        packagingUnitQty: 12,
        packagingUnitName: "crate",
        defaultReorderLevel: 4,
        defaultReorderQty: 6,
        defaultMinStockLevel: 2,
        imageUrl: null,
        images: [{ id: "i1", imageUrl: "https://cdn.example/milk.jpg", sortOrder: 0 }],
      }),
    );
    expect(fill).toMatchObject({
      name: "Brookside Fresh Milk 500ml",
      barcode: "6161100012345",
      sku: "MILK-500",
      brand: "Brookside",
      size: "500ml",
      description: "Fresh milk",
      buyingPrice: "52",
      sellingPrice: "65",
      bundleQty: "12",
      bundleName: "crate",
      reorderLevel: "4",
      reorderQty: "6",
      minStockLevel: "2",
      photoUrl: "https://cdn.example/milk.jpg",
    });
  });

  it("prefers the cover photo over the gallery", () => {
    expect(
      sharedCatalogCoverUrl({
        imageUrl: "https://cdn.example/cover.jpg",
        images: [{ imageUrl: "https://cdn.example/other.jpg" }],
      }),
    ).toBe("https://cdn.example/cover.jpg");
  });
});

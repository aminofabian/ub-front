import { describe, expect, it } from "bun:test";

import type { MarketplaceSupplierDetail } from "@/lib/marketplace-api";
import {
  humanizeSupplierUsername,
  resolveSupplierProductHighlights,
  resolveSupplierServiceAreas,
  supplierPassportDescription,
  supplierPassportTitle,
} from "@/lib/supplier-passport-seo";

function detail(
  overrides: Partial<MarketplaceSupplierDetail> = {},
): MarketplaceSupplierDetail {
  return {
    id: "sup-1",
    name: "David Mutuku",
    slug: "david-mutuku--abcd1234",
    description: null,
    supplierType: "WHOLESALER",
    listedBy: null,
    location: "Nairobi",
    locations: ["Nairobi", "Kiambu"],
    status: "ACTIVE",
    contactEmail: null,
    contactPhone: null,
    contacts: [],
    paymentMethodPreferred: null,
    paymentDetails: null,
    payoutType: null,
    payoutPhone: null,
    creditTermsDays: null,
    deliveryRegions: ["Nairobi CBD", "Westlands"],
    categoryTags: ["Beverages", "Household"],
    products: [
      {
        id: "p1",
        name: "Coca-Cola 500ml Crate",
        slug: "coke",
        barcode: null,
        sku: null,
        categoryName: "Beverages",
        imageUrl: null,
        packSize: 24,
        packUnit: "pcs",
        minOrderQty: 1,
        unitPrice: 1200,
        currency: "KES",
        available: true,
      },
      {
        id: "p2",
        name: "Sunlight Soap Bar",
        slug: "soap",
        barcode: null,
        sku: null,
        categoryName: "Household",
        imageUrl: null,
        packSize: 12,
        packUnit: "pcs",
        minOrderQty: 1,
        unitPrice: 480,
        currency: "KES",
        available: true,
      },
      {
        id: "p3",
        name: "Cooking Oil 5L",
        slug: "oil",
        barcode: null,
        sku: null,
        categoryName: "Cooking",
        imageUrl: null,
        packSize: 1,
        packUnit: "pcs",
        minOrderQty: 1,
        unitPrice: 1500,
        currency: "KES",
        available: true,
      },
    ],
    ...overrides,
  };
}

describe("supplier-passport-seo", () => {
  it("humanizes username handles", () => {
    expect(humanizeSupplierUsername("david-mutuku")).toBe("David Mutuku");
  });

  it("prefers delivery regions as service area", () => {
    expect(resolveSupplierServiceAreas(detail())).toEqual([
      "Nairobi CBD",
      "Westlands",
      "Nairobi",
      "Kiambu",
    ]);
  });

  it("highlights a few wholesale products", () => {
    expect(resolveSupplierProductHighlights(detail().products, 3)).toEqual([
      "Coca-Cola 500ml Crate",
      "Sunlight Soap Bar",
      "Cooking Oil 5L",
    ]);
  });

  it("builds a wholesale-forward title with products and area", () => {
    const title = supplierPassportTitle({
      username: "david-mutuku",
      detail: detail(),
    });
    expect(title.toLowerCase()).toContain("wholesale");
    expect(title).toContain("David Mutuku");
    expect(title).toMatch(/Coca-Cola|Sunlight|Cooking Oil/);
    expect(title).toContain("Nairobi CBD");
  });

  it("builds a description that says wholesale supplier + products + area", () => {
    const description = supplierPassportDescription({
      username: "david-mutuku",
      detail: detail(),
    });
    expect(description.toLowerCase()).toContain("wholesale supplier");
    expect(description).toMatch(/Coca-Cola|Sunlight|Cooking Oil/);
    expect(description).toMatch(/Nairobi|Westlands/);
    expect(description.length).toBeLessThanOrEqual(158);
  });

  it("falls back when catalogue is empty", () => {
    const title = supplierPassportTitle({
      username: "david-mutuku",
      detail: detail({
        products: [],
        deliveryRegions: [],
        locations: [],
        location: null,
        categoryTags: [],
      }),
    });
    expect(title).toBe("David Mutuku — Wholesale Supplier Passport | Kiosk");
  });
});

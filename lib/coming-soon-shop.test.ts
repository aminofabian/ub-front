import { describe, expect, it } from "bun:test";

import { buildComingSoonShop } from "@/lib/coming-soon-shop";

type Card = {
  id: string;
  sku: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number | null;
  regularPrice?: number | null;
};

type Cat = {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
  itemCount?: number;
};

function item(id: string, name: string, extras: Partial<Card> = {}): Card {
  return {
    id,
    sku: id,
    name,
    variantName: null,
    imageUrl: null,
    price: null,
    ...extras,
  };
}

function category(id: string, name: string, extras: Partial<Cat> = {}): Cat {
  return { id, name, parentId: null, slug: id, ...extras };
}

describe("buildComingSoonShop", () => {
  it("puts real products and prices on the shelf, not magazine copy", () => {
    const content = buildComingSoonShop({
      storeName: "FLYWORKS",
      currency: "KES",
      countryCode: "KE",
      totalCount: 48,
      areaLabel: "Westlands",
      catalogItems: [
        item("1", "Fresh paprika", {
          imageUrl: "https://cdn.example/paprika.jpg",
          price: 120,
        }),
        item("2", "Whole milk 1L", {
          imageUrl: "https://cdn.example/milk.jpg",
          price: 85,
        }),
        item("3", "Sourdough loaf", { price: 200 }),
      ],
      categories: [
        category("produce", "Produce", { itemCount: 12 }),
        category("dairy", "Dairy", { itemCount: 8 }),
      ],
    });

    expect(content.featured?.name).toBe("Fresh Paprika");
    expect(content.featured?.price).toMatch(/120/);
    expect(content.products.map((p) => p.name)).toEqual([
      "Whole Milk 1L",
      "Sourdough Loaf",
    ]);
    expect(content.collections.map((c) => c.name)).toEqual(["Produce", "Dairy"]);
    expect(content.productCount).toBe(48);
    expect(content.description).toBe(
      "Browse the shelf. Prices are up. The bag opens when we do.",
    );
    expect(content.place).toBe("Westlands");
    expect(JSON.stringify(content)).not.toMatch(
      /Something worth waiting|mini-mart|15%|Same-day|1,000\+/i,
    );
  });

  it("dresses a cosmetics shelf from its own names", () => {
    const content = buildComingSoonShop({
      storeName: "Glow Lab",
      currency: "KES",
      catalogItems: [
        item("a", "Rosehip oil", {
          imageUrl: "https://cdn.example/oil.jpg",
          price: 1850,
        }),
        item("b", "Clay mask", { price: 920 }),
      ],
    });
    expect(content.featured?.name).toBe("Rosehip Oil");
    expect(content.products[0]?.name).toBe("Clay Mask");
    expect(JSON.stringify(content)).not.toMatch(/paprika|aisle|mini-mart/i);
  });

  it("keeps an empty chemist empty, with merchant copy if they wrote it", () => {
    const content = buildComingSoonShop({
      storeName: "Ruaka Chemist",
      landingContent: {
        subheadline: "Prescriptions, first aid, and daily care from next week.",
      },
    });
    expect(content.featured).toBeNull();
    expect(content.products).toEqual([]);
    expect(content.collections).toEqual([]);
    expect(content.description).toMatch(/Prescriptions/);
    expect(content.description).not.toMatch(/mini-mart/i);
  });

  it("shows a real strikethrough only when the catalog has a higher regular price", () => {
    const content = buildComingSoonShop({
      storeName: "Mart",
      currency: "KES",
      catalogItems: [
        item("1", "Rice 2kg", {
          imageUrl: "https://cdn.example/rice.jpg",
          price: 280,
          regularPrice: 340,
        }),
      ],
    });
    expect(content.featured?.price).toMatch(/280/);
    expect(content.featured?.regularPrice).toMatch(/340/);
  });

  it("does not invent Nairobi or a launch discount", () => {
    const content = buildComingSoonShop({ storeName: "Oak & Ink" });
    expect(content.place).toBeNull();
    expect(content.productCount).toBe(0);
    expect(JSON.stringify(content)).not.toMatch(/Nairobi|15%|countdown/i);
  });
});

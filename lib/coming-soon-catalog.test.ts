import { describe, expect, it } from "bun:test";

import {
  appendComingSoonShelf,
  comingSoonShelfCount,
  seedComingSoonShelf,
} from "@/lib/coming-soon-catalog";
import type { ComingSoonShelfItem } from "@/lib/coming-soon-editorial";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

function card(id: string, name: string): PublicCatalogItemCard {
  return {
    id,
    sku: id,
    name,
    variantName: null,
    imageUrl: null,
    price: 100,
  };
}

function line(id: string, name: string): ComingSoonShelfItem {
  return { id, name, price: "KES 100.00", imageUrl: null, imageAlt: name };
}

describe("coming soon catalog shelf", () => {
  it("keeps catalog order and skips a featured item already on the page", () => {
    const shelf = seedComingSoonShelf(
      [card("a", "Fresh milk")],
      [card("a", "Fresh milk"), card("b", "Brown bread")],
      "KES",
    );
    expect(shelf.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("appends only products that are not already on the shelf", () => {
    const next = appendComingSoonShelf(
      [line("a", "Fresh milk")],
      [line("a", "Fresh milk"), line("c", "Tea leaves")],
    );
    expect(next.map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("counts only while more products remain", () => {
    expect(comingSoonShelfCount(48, 512)).toBe("48 of 512");
    expect(comingSoonShelfCount(512, 512)).toBeNull();
    expect(comingSoonShelfCount(4, null)).toBeNull();
  });
});

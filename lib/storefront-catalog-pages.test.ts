import { describe, expect, it } from "bun:test";

import { appendCatalogPage } from "@/lib/storefront-catalog-pages";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

function card(id: string): PublicCatalogItemCard {
  return { id, name: id } as PublicCatalogItemCard;
}

describe("appendCatalogPage", () => {
  it("appends unseen products and advances the cursor", () => {
    const result = appendCatalogPage(
      [card("a")],
      [card("a"), card("b")],
      "c1",
      "c2",
    );
    expect(result.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.next).toBe("c2");
  });

  it("stops when the page is empty or the cursor does not move", () => {
    expect(appendCatalogPage([card("a")], [], "c1", "c2").next).toBeNull();
    expect(
      appendCatalogPage([card("a")], [card("b")], "c1", "c1").next,
    ).toBeNull();
  });
});

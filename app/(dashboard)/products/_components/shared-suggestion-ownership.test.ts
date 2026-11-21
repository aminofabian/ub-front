import { describe, expect, it } from "bun:test";

import { sharedSuggestionOwnership } from "./shared-suggestion-ownership";

const milk = {
  name: "Brookside Fresh Milk 500ml",
  barcode: "6161100012345",
  alreadyImported: false,
  adoptedItemId: null,
};

describe("sharedSuggestionOwnership", () => {
  it("marks a product the shop already adopted", () => {
    expect(
      sharedSuggestionOwnership(
        { ...milk, alreadyImported: true, adoptedItemId: " item-1 " },
        [],
      ),
    ).toEqual({ inShop: true, itemId: "item-1" });
  });

  it("marks a shop product with the same barcode", () => {
    expect(
      sharedSuggestionOwnership(milk, [
        { id: "shop-9", name: "Milk", barcode: "6161100012345" },
      ]),
    ).toEqual({ inShop: true, itemId: "shop-9" });
  });

  it("marks a shop product with the same name", () => {
    expect(
      sharedSuggestionOwnership(
        { ...milk, barcode: null },
        [{ id: "shop-2", name: "  brookside fresh milk 500ml " }],
      ),
    ).toEqual({ inShop: true, itemId: "shop-2" });
  });

  it("leaves a new shared product unmarked", () => {
    expect(
      sharedSuggestionOwnership(milk, [
        { id: "shop-3", name: "Yoghurt", barcode: "111" },
      ]),
    ).toEqual({ inShop: false, itemId: null });
  });

  it("still marks an import when the shop id is missing", () => {
    expect(
      sharedSuggestionOwnership({ ...milk, alreadyImported: true }, []),
    ).toEqual({ inShop: true, itemId: null });
  });
});

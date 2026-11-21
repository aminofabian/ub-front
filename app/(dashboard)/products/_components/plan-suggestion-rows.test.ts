import { describe, expect, it } from "bun:test";

import { planSuggestionRows } from "./plan-suggestion-rows";

const milk = {
  id: "g-milk",
  name: "Brookside Fresh Milk 500ml",
  barcode: "6161100012345",
  alreadyImported: false,
  adoptedItemId: null,
};

const yoghurt = {
  id: "g-yog",
  name: "Brookside Yoghurt 250ml",
  barcode: "6161100099999",
  alreadyImported: false,
  adoptedItemId: null,
};

describe("planSuggestionRows", () => {
  it("shows a shop-only product once, with nothing from the catalog beside it", () => {
    expect(
      planSuggestionRows(
        { name: "Mandazi", barcode: "" },
        [],
        [{ id: "shop-1", name: "Mandazi" }],
      ),
    ).toEqual([{ source: "shop", itemId: "shop-1", open: true }]);
  });

  it("does not repeat a shop product that is already a shared-catalog row", () => {
    const rows = planSuggestionRows(
      { name: "brook", barcode: "" },
      [{ ...milk, alreadyImported: true, adoptedItemId: "shop-1" }],
      [{ id: "shop-1", name: "Brookside Fresh Milk 500ml", barcode: milk.barcode }],
    );
    expect(rows).toEqual([
      {
        source: "shared",
        catalogId: "g-milk",
        inShop: true,
        itemId: "shop-1",
        open: true,
      },
    ]);
  });

  it("stands an exact barcode the shop already sells alone, ready to open", () => {
    expect(
      planSuggestionRows(
        { name: "milk", barcode: milk.barcode },
        [milk, yoghurt],
        [{ id: "shop-9", name: "Milk", barcode: milk.barcode }],
      ),
    ).toEqual([
      {
        source: "shared",
        catalogId: "g-milk",
        inShop: true,
        itemId: "shop-9",
        open: true,
      },
    ]);
  });

  it("stands an exact barcode the shop does not sell alone, ready to use", () => {
    expect(
      planSuggestionRows({ name: "", barcode: milk.barcode }, [milk, yoghurt], []),
    ).toEqual([
      {
        source: "shared",
        catalogId: "g-milk",
        inShop: false,
        itemId: null,
        open: false,
      },
    ]);
  });

  it("stands an exact name the shop already sells alone", () => {
    expect(
      planSuggestionRows(
        { name: "Mandazi", barcode: "" },
        [yoghurt],
        [{ id: "shop-1", name: "Mandazi" }],
      ),
    ).toEqual([{ source: "shop", itemId: "shop-1", open: true }]);
  });

  it("drops hits that only share a size with the typed name", () => {
    expect(
      planSuggestionRows(
        { name: "blueband 500g", barcode: "" },
        [
          { id: "g-blue", name: "Blue Band Margarine 500g", barcode: "1", alreadyImported: true, adoptedItemId: "shop-blue" },
          { id: "g-classic", name: "Classic Detergent Lavender - 500g", barcode: "2", alreadyImported: true, adoptedItemId: "shop-classic" },
          { id: "g-kleesoft", name: "Kleesoft Rose - 500gm", barcode: "3", alreadyImported: true, adoptedItemId: "shop-kleesoft" },
          { id: "g-msafi", name: "Msafi lavender 500g", barcode: "4", alreadyImported: true, adoptedItemId: "shop-msafi" },
        ],
        [
          { id: "shop-blue", name: "Blue Band Margarine 500g" },
          { id: "shop-classic", name: "Classic Detergent Lavender - 500g" },
          { id: "shop-kleesoft", name: "Kleesoft Rose - 500gm" },
          { id: "shop-msafi", name: "Msafi lavender 500g" },
        ],
      ),
    ).toEqual([
      {
        source: "shared",
        catalogId: "g-blue",
        inShop: true,
        itemId: "shop-blue",
        open: true,
      },
    ]);
  });

  it("keeps a partial name as one list, shop-only first", () => {
    expect(
      planSuggestionRows(
        { name: "brook", barcode: "" },
        [milk, yoghurt],
        [{ id: "shop-3", name: "Brookside loaf", barcode: "111" }],
      ),
    ).toEqual([
      { source: "shop", itemId: "shop-3", open: false },
      {
        source: "shared",
        catalogId: "g-milk",
        inShop: false,
        itemId: null,
        open: false,
      },
      {
        source: "shared",
        catalogId: "g-yog",
        inShop: false,
        itemId: null,
        open: false,
      },
    ]);
  });
});

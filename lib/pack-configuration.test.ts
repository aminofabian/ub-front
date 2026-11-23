import { describe, expect, it } from "bun:test";

import {
  INDIVIDUAL_ITEM_LABEL,
  eachFromPackPrice,
  orderLinePackName,
  packPriceFromEach,
  packagingLabel,
  seedPackConfiguration,
} from "./pack-configuration";

const carton = {
  id: "carton",
  packUnit: "carton",
  unitsPerPack: 6,
  unitPrice: 6000,
  eachPrice: 1000,
};

describe("packaging labels", () => {
  it("names a pack by its unit and how many items it holds", () => {
    expect(packagingLabel("carton", 6)).toBe("Carton (6 items)");
    expect(packagingLabel("pack", 12)).toBe("Pack (12 items)");
    expect(packagingLabel("bale", 1)).toBe(INDIVIDUAL_ITEM_LABEL);
    expect(packagingLabel(null, null)).toBe(INDIVIDUAL_ITEM_LABEL);
  });

  it("puts the same phrase on the order line", () => {
    expect(
      orderLinePackName("Soko maize flour 2Kg", { unit: "carton", units: 6 }, true),
    ).toBe("Soko maize flour 2Kg — Carton (6 items)");
    expect(orderLinePackName("Soko maize flour 2Kg", null, true)).toBe(
      "Soko maize flour 2Kg — Individual item",
    );
    expect(orderLinePackName("Salt", null, false)).toBe("Salt");
  });
});

describe("pack price and price per item", () => {
  it("recalculates the item price from the pack price and the count", () => {
    expect(eachFromPackPrice(6000, 6)).toBe(1000);
    expect(eachFromPackPrice(50.04, 12)).toBe(4.17);
    expect(packPriceFromEach(1000, 6)).toBe(6000);
  });
});

describe("seedPackConfiguration", () => {
  it("loads the saved pack instead of asking again", () => {
    expect(
      seedPackConfiguration({
        packUnit: "pack",
        saved: [carton],
      }),
    ).toEqual({
      optionId: "carton",
      unit: "carton",
      units: "6",
      packPrice: "6000",
      each: "1000",
    });
  });

  it("keeps a price already typed on the line", () => {
    expect(
      seedPackConfiguration({
        packSize: 6,
        packUnit: "carton",
        packPrice: 5400,
        saved: [carton],
      }).packPrice,
    ).toBe("5400");
  });

  it("builds the pack price from the known item price when the pack has none", () => {
    const seed = seedPackConfiguration({
      packSize: 6,
      packUnit: "carton",
      knownEach: 1000,
      saved: [{ ...carton, unitPrice: null, eachPrice: null }],
    });
    expect(seed.packPrice).toBe("6000");
    expect(seed.each).toBe("1000");
  });

  it("leaves the count empty when the product has no packaging yet", () => {
    expect(seedPackConfiguration({ packUnit: "pack" })).toEqual({
      optionId: null,
      unit: "pack",
      units: "",
      packPrice: "",
      each: "",
    });
  });
});

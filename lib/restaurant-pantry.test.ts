import { describe, expect, test } from "bun:test";

import type { PantryDishRecord, PantryIngredientRecord } from "./restaurant-api";
import { coverText, lossSentence, portionsForDays, quantityText, servingsOf, expiringFirst } from "./restaurant-pantry";

const dish = (over: Partial<PantryDishRecord>): PantryDishRecord => ({
  menuItemId: "d",
  name: "Stew",
  canMake: 5,
  limitingIngredient: "Oil",
  mustUseToday: 0,
  soldPerDay: 0,
  daysOfCover: null,
  ...over,
});

const ingredient = (over: Partial<PantryIngredientRecord>): PantryIngredientRecord => ({
  itemId: "i",
  name: "Oil",
  unit: "l",
  usable: 10,
  expired: 0,
  dishes: ["Stew"],
  servingsDish: "Stew",
  perServing: 2,
  servings: 5,
  expiringSoon: 0,
  firstExpiry: null,
  lastBoughtAt: null,
  lastSupplier: null,
  lastUnitCost: null,
  ...over,
});

describe("pantry wording", () => {
  test("quantities drop trailing zeros and the unit 'each'", () => {
    expect(quantityText(3, "kg")).toBe("3 kg");
    expect(quantityText(2.5, "each")).toBe("2.5");
    expect(quantityText(0.1 + 0.2)).toBe("0.3");
  });

  test("days of cover", () => {
    expect(coverText(dish({ daysOfCover: null }))).toBeNull();
    expect(coverText(dish({ daysOfCover: 0.4 }))).toBe("under a day at the usual rate");
    expect(coverText(dish({ daysOfCover: 1.9 }))).toBe("about 1 day at the usual rate");
    expect(coverText(dish({ daysOfCover: 3.2 }))).toBe("about 3 days at the usual rate");
    expect(coverText(dish({ daysOfCover: 0, canMake: 0 }))).toBeNull();
  });

  test("a loss is said in portions when a dish is known", () => {
    expect(lossSentence({ name: "Tomatoes", quantity: 3, unit: "kg", servingsDish: "Salad", servingsLost: 20 })).toBe(
      "3 kg of Tomatoes — about 20 × Salad",
    );
    expect(lossSentence({ name: "Tomatoes", quantity: 0.1, unit: "kg", servingsDish: "Salad", servingsLost: 0 })).toBe(
      "0.1 kg of Tomatoes",
    );
  });
});

describe("pantry sums", () => {
  test("a plan for some days rounds up and skips what has not sold", () => {
    expect(
      portionsForDays([dish({ menuItemId: "a", soldPerDay: 2.5 }), dish({ menuItemId: "b", soldPerDay: 0 })], 3),
    ).toEqual({ a: "8" });
  });

  test("use-first lists only what expires soon, soonest first", () => {
    const list = expiringFirst([
      ingredient({ itemId: "a", expiringSoon: 2, firstExpiry: "2026-11-19" }),
      ingredient({ itemId: "b" }),
      ingredient({ itemId: "c", expiringSoon: 1, firstExpiry: "2026-11-18" }),
    ]);
    expect(list.map((i) => i.itemId)).toEqual(["c", "a"]);
    // Stock already past its date comes before anything that is only close to it.
    expect(
      expiringFirst([
        ingredient({ itemId: "a", expiringSoon: 2, firstExpiry: "2026-11-18" }),
        ingredient({ itemId: "x", expired: 3 }),
      ]).map((i) => i.itemId),
    ).toEqual(["x", "a"]);
  });

  test("portions of the stated dish a quantity makes", () => {
    expect(servingsOf(ingredient({ perServing: 0.15 }), 3)).toBe(20);
    expect(servingsOf(ingredient({ perServing: null }), 3)).toBe(0);
  });
});

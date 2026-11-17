import { describe, expect, test } from "bun:test";

import { canMakeNote, canMakeOnTile, withoutCanMake } from "./restaurant-can-make";

describe("canMakeNote", () => {
  test("says nothing for a dish with no counted recipe", () => {
    expect(canMakeNote({})).toBeNull();
    expect(canMakeNote({ canMake: null, limitingIngredient: "Cheese" })).toBeNull();
  });

  test("a healthy count is quiet", () => {
    expect(canMakeNote({ canMake: 18, limitingIngredient: "Cheese", mustUseToday: 0 })).toEqual({
      tone: "ok",
      label: "~18 to make",
      detail: null,
    });
  });

  test("a low count names what runs out first", () => {
    expect(canMakeNote({ canMake: 3, limitingIngredient: "Cheese" })).toEqual({
      tone: "low",
      label: "~3 to make",
      detail: "Cheese runs out first",
    });
  });

  test("nothing left says what is needed", () => {
    expect(canMakeNote({ canMake: 0, limitingIngredient: "Cheese" })).toEqual({ tone: "out", label: "Out", detail: "needs Cheese" });
  });

  test("stock expiring today is called out, never more than can be made", () => {
    expect(canMakeNote({ canMake: 12, limitingIngredient: "Milk", mustUseToday: 4 })?.detail).toBe("4 only today");
    expect(canMakeNote({ canMake: 2, limitingIngredient: "Milk", mustUseToday: 9 })?.detail).toBe("Milk runs out first · 2 only today");
  });
});

describe("canMakeOnTile", () => {
  test("only speaks up when the count is low", () => {
    expect(canMakeOnTile({ canMake: 18 })).toBeNull();
    expect(canMakeOnTile({})).toBeNull();
    expect(canMakeOnTile({ canMake: 3 })).toBe("3 left");
    expect(canMakeOnTile({ canMake: 0 })).toBe("None left by the count");
  });
});

describe("withoutCanMake", () => {
  test("drops the counts and keeps the rest", () => {
    const kept = withoutCanMake({ stations: [1], items: [{ id: "a", canMake: 3, limitingIngredient: "Cheese", mustUseToday: 1 }] });
    expect(kept.stations).toEqual([1]);
    expect(kept.items[0]).toEqual({ id: "a", canMake: null, limitingIngredient: null, mustUseToday: null });
    expect(canMakeOnTile(kept.items[0])).toBeNull();
  });
});

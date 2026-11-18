import { describe, expect, test } from "bun:test";

import {
  isFoodBusiness,
  isFoodOnlyBusiness,
  isFoodOnlyStoreTypes,
  isServiceOnlyBusiness,
  isTableServiceStoreTypes,
} from "./business-store-type";
import {
  FOOD_MAX_STATIONS,
  cleanFoodStationNames,
  defaultFoodStationName,
  foodMenuDraftError,
  foodMenuDraftsToItems,
  foodMenuPictureError,
  foodMenuPicturesFromDrafts,
  foodTableNames,
  parseFoodMenuPrice,
  parseFoodTableCount,
} from "./onboarding-questionnaire";

const business = (storeTypes: string[]) => ({ profile: { storeTypes } });

describe("food store types", () => {
  test("a restaurant, café, fast-food counter and bar are food businesses", () => {
    for (const type of ["restaurant", "cafe", "fast-food", "bar"]) {
      expect(isFoodBusiness(business([type]))).toBe(true);
      expect(isFoodOnlyBusiness(business([type]))).toBe(true);
      expect(isFoodOnlyStoreTypes([type])).toBe(true);
    }
  });

  test("a café with a shelf of goods is food, but not food-only", () => {
    expect(isFoodOnlyBusiness(business(["cafe", "mini-mart"]))).toBe(false);
    expect(isFoodOnlyStoreTypes(["cafe", "mini-mart"])).toBe(false);
    expect(isFoodBusiness(business(["cafe", "mini-mart"]))).toBe(true);
  });

  test("retail, service and empty shops are not food-only", () => {
    expect(isFoodOnlyBusiness(business(["mini-mart"]))).toBe(false);
    expect(isFoodOnlyBusiness(business(["barbershop"]))).toBe(false);
    expect(isFoodOnlyBusiness(business([]))).toBe(false);
    expect(isFoodOnlyBusiness(null)).toBe(false);
    expect(isFoodOnlyStoreTypes([])).toBe(false);
    expect(isFoodOnlyStoreTypes(null)).toBe(false);
  });

  test("a bar is not mistaken for a service-only shop", () => {
    expect(isServiceOnlyBusiness(business(["bar"]))).toBe(false);
  });
});

describe("the kitchen a food shop starts with", () => {
  test("a bar makes drinks at the bar; everything else in the kitchen", () => {
    expect(defaultFoodStationName(["bar"])).toBe("Bar");
    expect(defaultFoodStationName(["restaurant"])).toBe("Kitchen");
    expect(defaultFoodStationName(["cafe"])).toBe("Kitchen");
    expect(defaultFoodStationName(["fast-food"])).toBe("Kitchen");
    expect(defaultFoodStationName(["cafe", "bar"])).toBe("Kitchen");
  });

  test("station names are trimmed, de-duplicated and bounded", () => {
    expect(cleanFoodStationNames(["  Kitchen  ", "kitchen", "", "  "])).toEqual([
      "Kitchen",
    ]);
    const many = Array.from({ length: FOOD_MAX_STATIONS + 3 }, (_, i) => `S${i}`);
    expect(cleanFoodStationNames(many)).toHaveLength(FOOD_MAX_STATIONS);
  });
});

describe("a price typed by the owner", () => {
  test("accepts the ways a Kenyan price is written", () => {
    expect(parseFoodMenuPrice("250")).toBe(250);
    expect(parseFoodMenuPrice("1,250")).toBe(1250);
    expect(parseFoodMenuPrice("KSh 1 250")).toBe(1250);
    expect(parseFoodMenuPrice("1250.50")).toBe(1250.5);
    expect(parseFoodMenuPrice(" 350. ")).toBe(350);
  });

  test("refuses nothing, zero, negatives and junk", () => {
    expect(parseFoodMenuPrice("")).toBeNull();
    expect(parseFoodMenuPrice("   ")).toBeNull();
    expect(parseFoodMenuPrice("0")).toBeNull();
    expect(parseFoodMenuPrice("0.00")).toBeNull();
    expect(parseFoodMenuPrice("-250")).toBeNull();
    expect(parseFoodMenuPrice("12.3.4")).toBeNull();
    expect(parseFoodMenuPrice("two hundred")).toBeNull();
    expect(parseFoodMenuPrice("1000000")).toBeNull();
    expect(parseFoodMenuPrice("1.250")).toBeNull();
    expect(parseFoodMenuPrice("1.25")).toBe(1.25);
  });

  test("a blank row is unused, not an error", () => {
    expect(foodMenuDraftError({ name: "", price: "" })).toBeNull();
  });

  test("a picture on an empty row has to be named or removed", () => {
    const file = new File(["a"], "dish.jpg", { type: "image/jpeg" });
    expect(foodMenuDraftError({ name: "", price: "", picture: file })).toContain(
      "name and a price",
    );
  });

  test("a half-filled row says what is missing", () => {
    expect(foodMenuDraftError({ name: "Chips", price: "" })).toContain("price");
    expect(foodMenuDraftError({ name: "", price: "250" })).toContain("name");
    expect(foodMenuDraftError({ name: "Chips", price: "zero" })).toContain(
      "from 1 to 999,999",
    );
    expect(foodMenuDraftError({ name: "Chips", price: "250" })).toBeNull();
  });

  test("a name over the menu column is refused", () => {
    expect(foodMenuDraftError({ name: "x".repeat(192), price: "250" })).toContain(
      "191 characters",
    );
  });

  test("a picture must be a JPEG, PNG or WebP under 8 MB", () => {
    expect(foodMenuPictureError(new File(["x"], "dish.gif", { type: "image/gif" }))).toContain(
      "JPEG",
    );
    const huge = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "dish.jpg", {
      type: "image/jpeg",
    });
    expect(foodMenuPictureError(huge)).toContain("8 MB");
    expect(
      foodMenuPictureError(new File(["x"], "dish.jpg", { type: "image/jpeg" })),
    ).toBeNull();
  });

  test("a picture stays with the first valid row of that dish", () => {
    const chips = new File(["a"], "chips.jpg", { type: "image/jpeg" });
    const later = new File(["b"], "later.jpg", { type: "image/jpeg" });
    const tea = new File(["c"], "tea.png", { type: "image/png" });
    expect(
      foodMenuPicturesFromDrafts([
        { name: "Chips", price: "250", picture: chips },
        { name: "  ", price: "", picture: later },
        { name: "chips", price: "300", picture: later },
        { name: "Soda", price: "70" },
        { name: "Tea", price: "", picture: tea },
        { name: "Tea", price: "80", picture: tea },
      ]),
    ).toEqual([
      { name: "Chips", file: chips },
      { name: "Tea", file: tea },
    ]);
  });

  test("only complete, named dishes are created — once each", () => {
    expect(
      foodMenuDraftsToItems([
        { name: "Chips", price: "250" },
        { name: "  ", price: "" },
        { name: "chips", price: "300" },
        { name: "Soda", price: "0" },
        { name: "Tea", price: "1,000" },
      ]),
    ).toEqual([
      { name: "Chips", price: 250 },
      { name: "Tea", price: 1000 },
    ]);
  });

  test("no more than the menu limit is created", () => {
    const drafts = Array.from({ length: 10 }, (_, i) => ({
      name: `Dish ${i}`,
      price: "100",
    }));
    expect(foodMenuDraftsToItems(drafts)).toHaveLength(8);
  });
});

describe("tables asked of a restaurant or bar", () => {
  test("only a food-only shop with a table-service format is asked", () => {
    expect(isTableServiceStoreTypes(["restaurant"])).toBe(true);
    expect(isTableServiceStoreTypes(["bar"])).toBe(true);
    expect(isTableServiceStoreTypes(["cafe", "bar"])).toBe(true);
    expect(isTableServiceStoreTypes(["cafe"])).toBe(false);
    expect(isTableServiceStoreTypes(["fast-food"])).toBe(false);
    expect(isTableServiceStoreTypes(["restaurant", "mini-mart"])).toBe(false);
    expect(isTableServiceStoreTypes([])).toBe(false);
    expect(isTableServiceStoreTypes(null)).toBe(false);
  });

  test("blank is not answered, zero is an answer, a typo is refused", () => {
    expect(parseFoodTableCount("")).toBeUndefined();
    expect(parseFoodTableCount("   ")).toBeUndefined();
    expect(parseFoodTableCount("0")).toBe(0);
    expect(parseFoodTableCount(" 12 ")).toBe(12);
    expect(parseFoodTableCount("60")).toBe(60);
    expect(parseFoodTableCount("61")).toBeNull();
    expect(parseFoodTableCount("1000")).toBeNull();
    expect(parseFoodTableCount("2.5")).toBeNull();
    expect(parseFoodTableCount("-3")).toBeNull();
    expect(parseFoodTableCount("ten")).toBeNull();
  });

  test("tables are named in order, and nothing is made for none or nonsense", () => {
    expect(foodTableNames(3)).toEqual(["Table 1", "Table 2", "Table 3"]);
    expect(foodTableNames(0)).toEqual([]);
    expect(foodTableNames(undefined)).toEqual([]);
    expect(foodTableNames(null)).toEqual([]);
    expect(foodTableNames(-2)).toEqual([]);
    expect(foodTableNames(2.5)).toEqual([]);
    expect(foodTableNames(500)).toHaveLength(60);
  });
});

import { describe, expect, test } from "bun:test";

import {
  DEFAULT_GOODS_STORE_TYPE,
  GOODS_STORE_TYPES,
  sellsGoodsBusiness,
  sellsGoodsStoreTypes,
} from "./business-store-type";

const business = (
  storeTypes: string[],
  sellsProducts?: boolean,
) => ({
  profile: { storeTypes },
  onboarding:
    sellsProducts === undefined ? undefined : { answers: { sellsProducts } },
});

describe("sells goods — who sees Products in the sidebar", () => {
  test("a mini-mart, a shop, or an unclassified business always shows products", () => {
    expect(sellsGoodsBusiness(business(["mini-mart"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["full-grocery"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["pharmacy"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["butchery"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["wines-spirits"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["mixed-shop"]))).toBe(true);
    // "other" and a shop that never picked a format keep the retail sidebar.
    expect(sellsGoodsBusiness(business(["other"]))).toBe(true);
    expect(sellsGoodsBusiness(business([]))).toBe(true);
    expect(sellsGoodsBusiness(null)).toBe(true);
    expect(sellsGoodsStoreTypes(undefined)).toBe(true);
    // A guest house sells from a shelf unless it is also a restaurant or a service.
    expect(sellsGoodsBusiness(business(["lodging"]))).toBe(true);
  });

  test("a restaurant or a service shop hides products until they are turned on", () => {
    expect(sellsGoodsBusiness(business(["bar"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["restaurant"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["cafe"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["fast-food"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["barbershop"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["salon", "spa"]))).toBe(false);
    // Rooms above a bar do not bring the shelf back.
    expect(sellsGoodsBusiness(business(["bar", "lodging"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["restaurant", "bar", "lodging"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["restaurant", "salon"]))).toBe(false);
  });

  test("turning products on brings the sidebar back", () => {
    expect(sellsGoodsBusiness(business(["bar", DEFAULT_GOODS_STORE_TYPE]))).toBe(true);
    expect(sellsGoodsBusiness(business(["salon", "cosmetics"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["lodging", "mini-mart"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["restaurant"], true))).toBe(true);
    expect(sellsGoodsBusiness(business(["barbershop"], true))).toBe(true);
    expect(sellsGoodsBusiness(business(["restaurant"], false))).toBe(false);
    expect((GOODS_STORE_TYPES as readonly string[]).includes(DEFAULT_GOODS_STORE_TYPE)).toBe(true);
  });

  test("a goods format and a food or service format are not mutually exclusive", () => {
    expect(sellsGoodsStoreTypes(["bar", "mixed-shop"])).toBe(true);
    expect(sellsGoodsStoreTypes(["cafe", "mini-mart"])).toBe(true);
    expect(sellsGoodsStoreTypes(["bar"])).toBe(false);
  });
});

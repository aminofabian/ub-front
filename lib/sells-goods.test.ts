import { describe, expect, test } from "bun:test";

import {
  DEFAULT_GOODS_STORE_TYPE,
  GOODS_STORE_TYPES,
  sellsGoodsBusiness,
  sellsGoodsStoreTypes,
} from "./business-store-type";

const business = (storeTypes: string[]) => ({ profile: { storeTypes } });

describe("sells goods — the retail-sidebar gate (ADR 0031 nav cleanup)", () => {
  test("a plain retail shop always sells goods", () => {
    expect(sellsGoodsBusiness(business(["mini-mart"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["pharmacy"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["butchery"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["wines-spirits"]))).toBe(true);
    // "other" is an unclassified shop — it keeps the retail sidebar it had.
    expect(sellsGoodsBusiness(business(["other"]))).toBe(true);
  });

  test("a bar, kinyozi or guest house does not sell goods on its own", () => {
    expect(sellsGoodsBusiness(business(["bar"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["restaurant"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["barbershop"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["salon", "spa"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["lodging"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["bar", "lodging"]))).toBe(false);
    expect(sellsGoodsBusiness(business(["restaurant", "bar", "lodging"]))).toBe(false);
  });

  test("adding a retail line flips the gate on — the opt-in path", () => {
    // What AddProductLineButton does: append the default goods format.
    expect(sellsGoodsBusiness(business(["bar", DEFAULT_GOODS_STORE_TYPE]))).toBe(true);
    expect(sellsGoodsBusiness(business(["salon", "cosmetics"]))).toBe(true);
    expect(sellsGoodsBusiness(business(["lodging", "mini-mart"]))).toBe(true);
    // The default is itself a goods format, so the opt-in always works.
    expect((GOODS_STORE_TYPES as readonly string[]).includes(DEFAULT_GOODS_STORE_TYPE)).toBe(true);
  });

  test("no formats means no goods (and no crash)", () => {
    expect(sellsGoodsBusiness(business([]))).toBe(false);
    expect(sellsGoodsBusiness(null)).toBe(false);
    expect(sellsGoodsStoreTypes(undefined)).toBe(false);
  });

  test("a goods format and a food/service format are not mutually exclusive", () => {
    // The whole point: a food-led shop can also sell goods once it opts in.
    expect(sellsGoodsStoreTypes(["bar", "mixed-shop"])).toBe(true);
    expect(sellsGoodsStoreTypes(["bar"])).toBe(false);
  });
});

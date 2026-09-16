import { describe, expect, test } from "bun:test";

import {
  FIRST_SALE_ACTIVATE_PARAM,
  FIRST_SALE_ACTIVATE_VALUE,
  cashierFirstSaleActivateHref,
  isFirstSaleActivateParam,
  resolveSetupProgressActionUrl,
} from "@/lib/first-sale-activate";

describe("first-sale activate", () => {
  test("href targets cashier activate query", () => {
    expect(cashierFirstSaleActivateHref()).toBe(
      `/cashier?${FIRST_SALE_ACTIVATE_PARAM}=${FIRST_SALE_ACTIVATE_VALUE}`,
    );
  });

  test("isFirstSaleActivateParam accepts the canonical value", () => {
    expect(isFirstSaleActivateParam("first-sale")).toBe(true);
    expect(isFirstSaleActivateParam(" First-Sale ")).toBe(true);
    expect(isFirstSaleActivateParam("open-shift")).toBe(false);
    expect(isFirstSaleActivateParam(null)).toBe(false);
  });

  test("resolveSetupProgressActionUrl upgrades first_sale", () => {
    expect(resolveSetupProgressActionUrl("first_sale", "/cashier")).toBe(
      cashierFirstSaleActivateHref(),
    );
    expect(resolveSetupProgressActionUrl("stock_shelf", "/products")).toBe(
      "/products",
    );
  });
});

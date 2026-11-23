import { describe, expect, it } from "bun:test";

import { isWholesaleOnlyBusiness, SUPPLIER_COUNTER_ORDERS_FLAG } from "@/lib/business-store-type";

const shop = (storeTypes: string[], flags: Record<string, boolean> = {}) => ({
  profile: { storeTypes },
  featureFlags: flags,
});

describe("isWholesaleOnlyBusiness", () => {
  it("is true for a supplier whose only other format is the neutral one", () => {
    expect(isWholesaleOnlyBusiness(shop(["other", "supplier"]))).toBe(true);
    expect(isWholesaleOnlyBusiness(shop(["supplier"]))).toBe(true);
  });

  it("is false for a supplier that is also a shop with a counter", () => {
    expect(isWholesaleOnlyBusiness(shop(["mini-mart", "supplier"]))).toBe(false);
  });

  it("is false once the supplier sells over the counter", () => {
    expect(
      isWholesaleOnlyBusiness(shop(["other", "supplier"], { [SUPPLIER_COUNTER_ORDERS_FLAG]: true })),
    ).toBe(false);
  });

  it("is false for a shop that is not a supplier", () => {
    expect(isWholesaleOnlyBusiness(shop(["other"]))).toBe(false);
    expect(isWholesaleOnlyBusiness(null)).toBe(false);
  });
});

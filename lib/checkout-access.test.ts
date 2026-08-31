import { describe, expect, it } from "vitest";

import type { BusinessRecord } from "@/lib/api";
import { captureCustomerForCashAndMpesa } from "@/lib/checkout-access";

function business(
  checkout: NonNullable<
    NonNullable<BusinessRecord["inventory"]>["checkout"]
  > = {},
): BusinessRecord {
  return {
    name: "Shop",
    inventory: { checkout },
  };
}

describe("captureCustomerForCashAndMpesa", () => {
  it("defaults off when absent", () => {
    expect(captureCustomerForCashAndMpesa({ name: "Shop" })).toBe(false);
    expect(captureCustomerForCashAndMpesa(null)).toBe(false);
    expect(captureCustomerForCashAndMpesa(undefined)).toBe(false);
    expect(captureCustomerForCashAndMpesa(business())).toBe(false);
  });

  it("respects the admin toggle", () => {
    expect(
      captureCustomerForCashAndMpesa(
        business({ captureCustomerForCashAndMpesa: true }),
      ),
    ).toBe(true);
    expect(
      captureCustomerForCashAndMpesa(
        business({ captureCustomerForCashAndMpesa: false }),
      ),
    ).toBe(false);
  });

  it("does not leak creditTabs settings into the checkout flag", () => {
    expect(
      captureCustomerForCashAndMpesa({
        name: "Shop",
        inventory: {
          creditTabs: { allowCashierSearchCustomersByName: true },
        },
      }),
    ).toBe(false);
  });
});

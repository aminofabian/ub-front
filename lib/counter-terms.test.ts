import { describe, expect, it } from "bun:test";

import { counterPriceFor, type CounterTerms } from "@/lib/counter-terms";

const terms = (over: Partial<CounterTerms>): CounterTerms => ({
  found: true,
  accountId: "a1",
  buyerName: "Buyer",
  businessName: null,
  discountPercent: null,
  termsDays: 30,
  creditLimit: null,
  creditAvailable: null,
  prices: {},
  ...over,
});

describe("counterPriceFor", () => {
  it("keeps the shelf price without terms", () => {
    expect(counterPriceFor(null, "i1", 200)).toBe(200);
    expect(counterPriceFor(terms({ found: false, discountPercent: 10 }), "i1", 200)).toBe(200);
  });

  it("takes the account discount off the shelf price", () => {
    expect(counterPriceFor(terms({ discountPercent: 10 }), "i1", 200)).toBe(180);
    expect(counterPriceFor(terms({ discountPercent: 2.5 }), "i1", 99.99)).toBe(97.49);
  });

  it("uses the buyer's own price with no discount on top", () => {
    expect(counterPriceFor(terms({ discountPercent: 10, prices: { i1: 150 } }), "i1", 200)).toBe(150);
  });
});

import { describe, expect, it } from "bun:test";

import {
  encodeMarketplaceOrderQuery,
  marketplaceSupplierOrderPath,
  parseMarketplaceOrderQuery,
} from "@/lib/marketplace-url";

describe("marketplace order query", () => {
  it("round-trips quantities and rounded line totals", () => {
    const encoded = encodeMarketplaceOrderQuery([
      { slug: "onions-red-10", qty: 16, lineTotal: 110 },
      { slug: "potatoes", qty: 2 },
    ]);

    expect(encoded).toBe("onions-red-10*16*110,potatoes*2");
    expect(parseMarketplaceOrderQuery(encoded)).toEqual([
      { slug: "onions-red-10", qty: 16, lineTotal: 110 },
      { slug: "potatoes", qty: 2 },
    ]);
  });

  it("builds a supplier URL that preserves the full order", () => {
    const path = marketplaceSupplierOrderPath(
      { slug: "grocery--abc12345" },
      [{ slug: "onions-red-10", qty: 16, lineTotal: 110 }],
      null,
      true,
    );
    const url = new URL(path, "https://example.test");

    expect(url.pathname).toBe("/marketplace/s/grocery--abc12345");
    expect(url.searchParams.get("o")).toBe("onions-red-10*16*110");
    expect(url.searchParams.get("r")).toBe("10");
  });

  it("ignores malformed order entries", () => {
    expect(
      parseMarketplaceOrderQuery("bad,valid-product*3,zero*0,rounded*2*100"),
    ).toEqual([
      { slug: "valid-product", qty: 3 },
      { slug: "rounded", qty: 2, lineTotal: 100 },
    ]);
  });

  it("round-trips pack option ids with and without a line total", () => {
    const encoded = encodeMarketplaceOrderQuery([
      { slug: "mandazi", qty: 2, packOptionId: "opt-12-aaaa" },
      { slug: "mandazi", qty: 1, lineTotal: 110, packOptionId: "opt-48-bbbb" },
    ]);

    expect(encoded).toBe(
      "mandazi*2*0*opt-12-aaaa,mandazi*1*110*opt-48-bbbb",
    );
    expect(parseMarketplaceOrderQuery(encoded)).toEqual([
      { slug: "mandazi", qty: 2, packOptionId: "opt-12-aaaa" },
      { slug: "mandazi", qty: 1, lineTotal: 110, packOptionId: "opt-48-bbbb" },
    ]);
  });

  it("keeps legacy two-segment and three-segment entries parseable", () => {
    expect(
      parseMarketplaceOrderQuery("milk*4,eggs*2*90"),
    ).toEqual([
      { slug: "milk", qty: 4 },
      { slug: "eggs", qty: 2, lineTotal: 90 },
    ]);
  });
});

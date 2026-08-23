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
});

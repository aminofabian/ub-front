import { describe, expect, test } from "bun:test";

import {
  isMarketplaceHostname,
  marketplaceOrigin,
  marketplaceRouting,
} from "./marketplace-host";

const HOST = "marketplace.kiosk.ke";

describe("marketplaceRouting", () => {
  test("does nothing while the marketplace host is not configured", () => {
    expect(marketplaceRouting("kiosk.ke", "/marketplace", "", "")).toBeNull();
    expect(marketplaceRouting("marketplace.kiosk.ke", "/", "", "")).toBeNull();
  });

  test("the marketplace host serves the directory at /", () => {
    expect(marketplaceRouting(HOST, "/", "", HOST)).toEqual({
      kind: "rewrite",
      pathname: "/marketplace",
    });
    expect(marketplaceRouting(HOST, "/marketplace", "?q=rice", HOST)).toEqual({
      kind: "redirect",
      url: "https://marketplace.kiosk.ke/?q=rice",
    });
    expect(marketplaceRouting(HOST, "/marketplace/s/acme--1a2b3c4d", "", HOST)).toBeNull();
  });

  test("the apex and every shop hand /marketplace to the marketplace host", () => {
    expect(marketplaceRouting("kiosk.ke", "/marketplace", "", HOST)).toEqual({
      kind: "redirect",
      url: "https://marketplace.kiosk.ke/",
    });
    expect(
      marketplaceRouting("palmart.co.ke", "/marketplace/s/acme--1a2b3c4d", "?p=x", HOST),
    ).toEqual({
      kind: "redirect",
      url: "https://marketplace.kiosk.ke/marketplace/s/acme--1a2b3c4d?p=x",
    });
    expect(marketplaceRouting("shop.kiosk.ke", "/marketplaces", "", HOST)).toBeNull();
    expect(marketplaceRouting("shop.kiosk.ke", "/overview", "", HOST)).toBeNull();
  });

  test("a shop keeps its own review queue for supplier product edits", () => {
    expect(marketplaceRouting("shop.kiosk.ke", "/marketplace/product-edits", "", HOST)).toBeNull();
  });

  test("local dev uses http and keeps the port", () => {
    const local = "marketplace.localhost:3000";
    expect(marketplaceOrigin(local)).toBe("http://marketplace.localhost:3000");
    expect(isMarketplaceHostname("marketplace.localhost:3000", local)).toBe(true);
    expect(marketplaceRouting("localhost:3000", "/marketplace", "", local)).toEqual({
      kind: "redirect",
      url: "http://marketplace.localhost:3000/",
    });
  });
});

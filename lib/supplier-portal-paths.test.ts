import { describe, expect, test } from "bun:test";

import {
  isShopHost,
  portalPathForShopPath,
  shopPathForPortalPath,
  shopPortalRouting,
} from "./supplier-portal-paths";

describe("supplier portal addresses on a shop", () => {
  test("a shop's own address is not the platform's or localhost", () => {
    expect(isShopHost("yourshop.kiosk.ke")).toBe(true);
    expect(isShopHost("palmart.co.ke")).toBe(true);
    expect(isShopHost("kiosk.ke")).toBe(false);
    expect(isShopHost("www.kiosk.ke")).toBe(false);
    expect(isShopHost("localhost:3000")).toBe(false);
  });

  test("the prefix is dropped, and a page under it keeps the rest of its address", () => {
    expect(shopPathForPortalPath("/supplier-portal/shops")).toBe("/shops");
    expect(shopPathForPortalPath("/supplier-portal/shops/abc-123")).toBe("/shops/abc-123");
    expect(portalPathForShopPath("/shops/abc-123")).toBe("/supplier-portal/shops/abc-123");
  });

  test("a page whose name a shop page already has takes another name", () => {
    expect(shopPathForPortalPath("/supplier-portal/messages")).toBe("/shop-messages");
    expect(shopPathForPortalPath("/supplier-portal/payments")).toBe("/shop-payments");
    // The shop's own pages are never taken over.
    expect(portalPathForShopPath("/messages")).toBeNull();
    expect(portalPathForShopPath("/payments")).toBeNull();
    expect(portalPathForShopPath("/overview")).toBeNull();
    expect(portalPathForShopPath("/settings")).toBeNull();
  });

  test("on a shop, the long address is sent to the short one and the short one is served", () => {
    expect(shopPortalRouting("yourshop.kiosk.ke", "/supplier-portal/shops")).toEqual({
      kind: "redirect",
      pathname: "/shops",
    });
    expect(shopPortalRouting("yourshop.kiosk.ke", "/shops")).toEqual({
      kind: "rewrite",
      pathname: "/supplier-portal/shops",
    });
    expect(shopPortalRouting("yourshop.kiosk.ke", "/supplier-portal/login")).toEqual({
      kind: "redirect",
      pathname: "/storefront/trade-orders",
    });
    expect(shopPortalRouting("yourshop.kiosk.ke", "/products")).toBeNull();
  });

  test("on the platform's own address nothing changes", () => {
    expect(shopPortalRouting("kiosk.ke", "/supplier-portal/shops")).toBeNull();
    expect(shopPortalRouting("kiosk.ke", "/shops")).toBeNull();
  });
});

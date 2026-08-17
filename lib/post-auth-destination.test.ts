import { describe, expect, it } from "bun:test";

import { APP_ROUTES } from "@/lib/config";
import {
  applyShopperTabHint,
  resolvePostAuthDestination,
  roleLandingRedirect,
} from "@/lib/post-auth-destination";

const groceryShop = { profile: { storeTypes: ["full-grocery"] } };
const miniMart = { profile: { storeTypes: ["mini-mart"] } };

describe("resolvePostAuthDestination", () => {
  it("sends grocery clerks to /grocery", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "grocery_clerk" } }),
    ).toBe(APP_ROUTES.grocery);
  });

  it("sends grocery managers to /grocery", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "manager" } },
        null,
        groceryShop,
      ),
    ).toBe(APP_ROUTES.grocery);
    expect(
      resolvePostAuthDestination(
        { role: { key: "grocery_manager" } },
        null,
        miniMart,
      ),
    ).toBe(APP_ROUTES.grocery);
  });

  it("sends butcher cashiers to /butcher", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "butcher_cashier" } }),
    ).toBe(APP_ROUTES.butcher);
  });

  it("sends cashiers to cashier", () => {
    expect(resolvePostAuthDestination({ role: { key: "cashier" } })).toBe(
      APP_ROUTES.cashier,
    );
  });

  it("sends stock managers to daily audit", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "stock_manager" } }),
    ).toBe(APP_ROUTES.inventoryStockTakeDailyAudit);
  });

  it("sends shoppers to the storefront catalog", () => {
    expect(resolvePostAuthDestination({ role: { key: "buyer" } })).toBe(
      APP_ROUTES.shop,
    );
  });

  it("sends creditors to their customer tab", () => {
    const me = applyShopperTabHint(
      { role: { key: "buyer" } },
      {
        tabPhone: "0714282874",
        linkedStorefrontProfile: true,
        balances: { balanceOwed: 1200 },
      },
    );
    expect(resolvePostAuthDestination(me)).toBe("/0714282874");
  });

  it("prefers role over non-shop requested next", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "grocery_clerk" } },
        APP_ROUTES.business,
      ),
    ).toBe(APP_ROUTES.grocery);
  });

  it("honours shop next over staff role (storefront password login)", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        APP_ROUTES.shopAccount,
      ),
    ).toBe(APP_ROUTES.shopAccount);
    expect(
      resolvePostAuthDestination(
        { role: { key: "grocery_clerk" } },
        APP_ROUTES.shopAccount,
      ),
    ).toBe(APP_ROUTES.shopAccount);
  });

  it("honours shop next for buyers", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "buyer" } },
        "/shop/cart",
      ),
    ).toBe("/shop/cart");
  });

  it("honours a tab next path for buyers", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "buyer" } }, "/0714282874"),
    ).toBe("/0714282874");
  });

  it("honours explicit next for non-role users", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "owner" } }, "/products"),
    ).toBe("/products");
  });

  it("defaults tenants to the storefront", () => {
    expect(resolvePostAuthDestination({ role: { key: "owner" } })).toBe(
      APP_ROUTES.shop,
    );
    expect(resolvePostAuthDestination({ role: { key: "admin" } })).toBe(
      APP_ROUTES.shop,
    );
    expect(resolvePostAuthDestination({ role: { key: "viewer" } })).toBe(
      APP_ROUTES.shop,
    );
  });
});

describe("roleLandingRedirect", () => {
  it("redirects grocery clerk off /business", () => {
    expect(
      roleLandingRedirect(
        { role: { key: "grocery_clerk" } },
        APP_ROUTES.business,
      ),
    ).toBe(APP_ROUTES.grocery);
  });

  it("does not redirect when already on role home", () => {
    expect(
      roleLandingRedirect({ role: { key: "grocery_clerk" } }, APP_ROUTES.grocery),
    ).toBeNull();
  });

  it("redirects cashier off /business", () => {
    expect(
      roleLandingRedirect({ role: { key: "cashier" } }, APP_ROUTES.business),
    ).toBe(APP_ROUTES.cashier);
  });

  it("redirects stock manager off /business", () => {
    expect(
      roleLandingRedirect(
        { role: { key: "stock_manager" } },
        APP_ROUTES.business,
      ),
    ).toBe(APP_ROUTES.inventoryStockTakeDailyAudit);
  });

  it("does not yank owners off the business hub onto the storefront", () => {
    expect(
      roleLandingRedirect({ role: { key: "owner" } }, APP_ROUTES.overview),
    ).toBeNull();
    expect(
      roleLandingRedirect({ role: { key: "owner" } }, APP_ROUTES.business),
    ).toBeNull();
  });
});

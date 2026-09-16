import { describe, expect, it } from "bun:test";

import { APP_ROUTES } from "@/lib/config";
import {
  applyShopperTabHint,
  buyerStaysOnPage,
  destinationForShopAccountSignIn,
  isShopNextPath,
  resolvePostAuthDestination,
  roleLandingRedirect,
} from "@/lib/post-auth-destination";

const groceryShop = { profile: { storeTypes: ["full-grocery"] } };
const miniMart = { profile: { storeTypes: ["mini-mart"] } };
const pendingOnboarding = {
  onboarding: { status: "pending" },
};
const completedOnboarding = {
  onboarding: { status: "completed" },
};
const dismissedOnboarding = {
  onboarding: { status: "dismissed" },
};

describe("isShopNextPath", () => {
  it("accepts the storefront root and shop paths", () => {
    expect(isShopNextPath("/")).toBe(true);
    expect(isShopNextPath(APP_ROUTES.shop)).toBe(true);
    expect(isShopNextPath(APP_ROUTES.shopAccount)).toBe(true);
    expect(isShopNextPath("/shop/cart")).toBe(true);
    expect(isShopNextPath("/shop/account?x=1")).toBe(true);
    expect(isShopNextPath("/?edit=1")).toBe(true);
    expect(isShopNextPath("/shop?edit=1")).toBe(true);
  });

  it("rejects external, malformed, and non-storefront targets", () => {
    expect(isShopNextPath("//evil.com")).toBe(false);
    expect(isShopNextPath("https://evil.com")).toBe(false);
    expect(isShopNextPath("javascript:alert(1)")).toBe(false);
    expect(isShopNextPath(APP_ROUTES.login)).toBe(false);
    expect(isShopNextPath("/shopping")).toBe(false);
    expect(isShopNextPath("/shop_account")).toBe(false);
    expect(isShopNextPath("")).toBe(false);
    expect(isShopNextPath(null)).toBe(false);
  });
});

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

  it("sends configured owners and admins to the admin dashboard", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        null,
        completedOnboarding,
      ),
    ).toBe(APP_ROUTES.overview);
    expect(
      resolvePostAuthDestination(
        { role: { key: "admin" } },
        null,
        completedOnboarding,
      ),
    ).toBe(APP_ROUTES.overview);
  });

  it("sends dismissed onboarding owners to the business hub for Resume", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        null,
        dismissedOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
  });

  it("sends stock managers to take stock", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "stock_manager" } }),
    ).toBe(`${APP_ROUTES.inventoryStock}?view=levels`);
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
        APP_ROUTES.shopCart,
        completedOnboarding,
      ),
    ).toBe(APP_ROUTES.shopCart);
    expect(
      resolvePostAuthDestination(
        { role: { key: "grocery_clerk" } },
        APP_ROUTES.shopCart,
      ),
    ).toBe(APP_ROUTES.shopCart);
  });

  it("does not pin staff to /shop/account", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        APP_ROUTES.shopAccount,
        completedOnboarding,
      ),
    ).toBe(APP_ROUTES.overview);
    expect(
      resolvePostAuthDestination(
        { role: { key: "grocery_clerk" } },
        APP_ROUTES.shopAccount,
      ),
    ).toBe(APP_ROUTES.grocery);
    expect(
      resolvePostAuthDestination(
        { role: { key: "cashier" } },
        APP_ROUTES.shopAccount,
      ),
    ).toBe(APP_ROUTES.cashier);
  });

  it("sends shoppers from /shop/account to the shop floor", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "buyer" } },
        APP_ROUTES.shopAccount,
      ),
    ).toBe("/");
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

  it("honours explicit next for configured owners", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        "/products",
        completedOnboarding,
      ),
    ).toBe("/products");
  });

  it("defaults staff roles to the storefront when no business payload exists", () => {
    expect(resolvePostAuthDestination({ role: { key: "viewer" } })).toBe(
      APP_ROUTES.shop,
    );
    expect(resolvePostAuthDestination({ role: { key: "manager" } })).toBe(
      APP_ROUTES.shop,
    );
  });

  it("sends owner/admin with pending onboarding to the business hub", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        null,
        pendingOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
    expect(
      resolvePostAuthDestination(
        { role: { key: "admin" } },
        null,
        pendingOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
  });

  it("sends owner/admin to the business hub when the business payload is missing", () => {
    expect(resolvePostAuthDestination({ role: { key: "owner" } })).toBe(
      APP_ROUTES.business,
    );
    expect(resolvePostAuthDestination({ role: { key: "admin" } })).toBe(
      APP_ROUTES.business,
    );
    expect(
      resolvePostAuthDestination({ role: { key: "owner" } }, null, null),
    ).toBe(APP_ROUTES.business);
  });

  it("does not let a storefront next pull an unconfigured owner off the hub", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        "/shop?setup=storefront",
        pendingOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        APP_ROUTES.shop,
        pendingOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
  });

  it("keeps staff on their dedicated role home during onboarding", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "cashier" } },
        null,
        pendingOnboarding,
      ),
    ).toBe(APP_ROUTES.cashier);
    expect(
      resolvePostAuthDestination(
        { role: { key: "stock_manager" } },
        null,
        pendingOnboarding,
      ),
    ).toBe(`${APP_ROUTES.inventoryStock}?view=levels`);
    expect(
      resolvePostAuthDestination(
        { role: { key: "grocery_manager" } },
        null,
        pendingOnboarding,
      ),
    ).toBe(APP_ROUTES.grocery);
    expect(
      resolvePostAuthDestination(
        { role: { key: "manager" } },
        null,
        { ...pendingOnboarding, ...groceryShop },
      ),
    ).toBe(APP_ROUTES.grocery);
  });

  it("keeps buyers on the storefront during onboarding", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "buyer" } },
        null,
        pendingOnboarding,
      ),
    ).toBe(APP_ROUTES.shop);
    expect(
      resolvePostAuthDestination(
        { role: { key: "buyer" } },
        "/shop/cart",
        pendingOnboarding,
      ),
    ).toBe("/shop/cart");
  });

  it("stops gating once onboarding is finished", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        null,
        completedOnboarding,
      ),
    ).toBe(APP_ROUTES.overview);
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        APP_ROUTES.shopAccount,
        completedOnboarding,
      ),
    ).toBe(APP_ROUTES.overview);
  });

  it("keeps dismissed onboarding on the business hub over storefront next", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        null,
        dismissedOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        APP_ROUTES.shop,
        dismissedOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
  });

  it("ignores storefront next on office login for configured owners", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        APP_ROUTES.shopAccount,
        completedOnboarding,
        { office: true },
      ),
    ).toBe(APP_ROUTES.overview);
    expect(
      resolvePostAuthDestination(
        { role: { key: "admin" } },
        APP_ROUTES.shop,
        completedOnboarding,
        { office: true },
      ),
    ).toBe(APP_ROUTES.overview);
  });

  it("office login still sends dismissed owners to the business hub", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "admin" } },
        APP_ROUTES.shop,
        dismissedOnboarding,
        { office: true },
      ),
    ).toBe(APP_ROUTES.business);
  });

  it("honours the business hub next on office login", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        APP_ROUTES.business,
        completedOnboarding,
        { office: true },
      ),
    ).toBe(APP_ROUTES.business);
  });

  it("sends cashiers to the till even from office login", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "cashier" } },
        APP_ROUTES.business,
        completedOnboarding,
        { office: true },
      ),
    ).toBe(APP_ROUTES.cashier);
    expect(
      resolvePostAuthDestination(
        { role: { key: "cashier" } },
        APP_ROUTES.shopAccount,
        completedOnboarding,
        { office: true },
      ),
    ).toBe(APP_ROUTES.cashier);
  });
});

describe("destinationForShopAccountSignIn", () => {
  it("sends shoppers to the shop floor", () => {
    expect(
      destinationForShopAccountSignIn({ role: { key: "buyer" } }),
    ).toBe("/");
  });

  it("sends cashiers to the till", () => {
    expect(
      destinationForShopAccountSignIn({ role: { key: "cashier" } }),
    ).toBe(APP_ROUTES.cashier);
    expect(
      destinationForShopAccountSignIn({ role: { key: "butcher_cashier" } }),
    ).toBe(APP_ROUTES.butcher);
  });

  it("sends owners and admins to the business hub", () => {
    expect(
      destinationForShopAccountSignIn(
        { role: { key: "owner" } },
        completedOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
    expect(
      destinationForShopAccountSignIn(
        { role: { key: "admin" } },
        completedOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
  });
});

describe("buyerStaysOnPage", () => {
  const hub = APP_ROUTES.shopAccount;

  it("keeps a shopper on their account hub when the hub was the sign-in target", () => {
    // resolvePostAuthDestination forwards /shop/account to "/" (door
    // semantics); the shopper signed in *from* the hub, so stay put.
    expect(
      buyerStaysOnPage({
        destination: "/",
        pathname: hub,
        requestedNext: hub,
      }),
    ).toBe(true);
  });

  it("keeps a shopper on the hub when the hub was the next with a query string", () => {
    expect(
      buyerStaysOnPage({
        destination: "/",
        pathname: hub,
        requestedNext: `${hub}?tab=history`,
      }),
    ).toBe(true);
  });

  it("keeps a shopper put when there is nowhere to go", () => {
    expect(
      buyerStaysOnPage({ destination: null, pathname: hub }),
    ).toBe(true);
  });

  it("keeps a shopper put when the destination is the page they are on", () => {
    expect(
      buyerStaysOnPage({ destination: "/shop/cart", pathname: "/shop/cart" }),
    ).toBe(true);
  });

  it("keeps a shopper put when the destination is the storefront home", () => {
    expect(
      buyerStaysOnPage({ destination: APP_ROUTES.shop, pathname: "/shop/cart" }),
    ).toBe(true);
  });

  it("does not keep a shopper on a non-hub page asking for the hub", () => {
    // Signing in from /shop must still honour the requested hop to the hub.
    expect(
      buyerStaysOnPage({
        destination: "/",
        pathname: APP_ROUTES.shop,
        requestedNext: hub,
      }),
    ).toBe(false);
  });

  it("does not keep a shopper on the hub when a credit-tab path was requested", () => {
    expect(
      buyerStaysOnPage({
        destination: "/0714282874",
        pathname: hub,
        requestedNext: hub,
      }),
    ).toBe(false);
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
    ).toBe(`${APP_ROUTES.inventoryStock}?view=levels`);
  });

  it("does not yank configured owners off the business hub", () => {
    expect(
      roleLandingRedirect(
        { role: { key: "owner" } },
        APP_ROUTES.overview,
        completedOnboarding,
      ),
    ).toBeNull();
    expect(
      roleLandingRedirect(
        { role: { key: "owner" } },
        APP_ROUTES.business,
        completedOnboarding,
      ),
    ).toBeNull();
    expect(
      roleLandingRedirect(
        { role: { key: "admin" } },
        APP_ROUTES.business,
        completedOnboarding,
      ),
    ).toBeNull();
  });

  it("sends an onboarding-pending owner from /overview to the business hub", () => {
    expect(
      roleLandingRedirect(
        { role: { key: "owner" } },
        APP_ROUTES.overview,
        pendingOnboarding,
      ),
    ).toBe(APP_ROUTES.business);
  });
});

import { describe, expect, it } from "bun:test";

import { APP_ROUTES } from "@/lib/config";
import {
  resolvePostAuthDestination,
  roleLandingRedirect,
} from "@/lib/post-auth-destination";

describe("resolvePostAuthDestination", () => {
  it("sends grocery clerks to /grocery", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "grocery_clerk" } }),
    ).toBe(APP_ROUTES.grocery);
  });

  it("sends butcher cashiers to /butcher", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "butcher_cashier" } }),
    ).toBe(APP_ROUTES.butcher);
  });

  it("sends cashiers to quick sale", () => {
    expect(resolvePostAuthDestination({ role: { key: "cashier" } })).toBe(
      APP_ROUTES.salesQuick,
    );
  });

  it("prefers role over requested next", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "grocery_clerk" } },
        APP_ROUTES.business,
      ),
    ).toBe(APP_ROUTES.grocery);
  });

  it("honours explicit next for non-role users", () => {
    expect(
      resolvePostAuthDestination({ role: { key: "owner" } }, "/products"),
    ).toBe("/products");
  });

  it("defaults to business for owners without next", () => {
    expect(resolvePostAuthDestination({ role: { key: "owner" } })).toBe(
      APP_ROUTES.business,
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
    ).toBe(APP_ROUTES.salesQuick);
  });

  it("redirects stock manager off /business", () => {
    expect(
      roleLandingRedirect(
        { role: { key: "stock_manager" } },
        APP_ROUTES.business,
      ),
    ).toBe(APP_ROUTES.inventoryStockTake);
  });

  it("redirects overview bookmarks to business hub", () => {
    expect(
      roleLandingRedirect({ role: { key: "owner" } }, APP_ROUTES.overview),
    ).toBe(APP_ROUTES.business);
  });
});

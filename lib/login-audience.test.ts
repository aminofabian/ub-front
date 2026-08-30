import { describe, expect, it } from "bun:test";

import { APP_ROUTES } from "@/lib/config";
import {
  checkLoginAudience,
  isAnyLoginPath,
  isOfficeConsolePath,
  isOfficeLoginMode,
  isStaffLoginPath,
  loginHrefForDestination,
  loginPathForNext,
} from "@/lib/login-audience";

describe("checkLoginAudience", () => {
  it("allows buyers on customer login", () => {
    expect(
      checkLoginAudience({ role: { key: "buyer" } }, "customer").ok,
    ).toBe(true);
  });

  it("rejects staff on customer login", () => {
    const result = checkLoginAudience({ role: { key: "owner" } }, "customer");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.correctLoginPath).toBe(APP_ROUTES.staffLogin);
    }
  });

  it("allows staff on staff login", () => {
    expect(
      checkLoginAudience({ role: { key: "cashier" } }, "staff").ok,
    ).toBe(true);
  });

  it("rejects buyers on staff login", () => {
    const result = checkLoginAudience({ role: { key: "buyer" } }, "staff");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.correctLoginPath).toBe(APP_ROUTES.login);
    }
  });
});

describe("loginPathForNext", () => {
  it("routes shop destinations to customer login", () => {
    expect(loginPathForNext("/shop/account")).toBe(APP_ROUTES.login);
    expect(loginPathForNext("/shop")).toBe(APP_ROUTES.login);
  });

  it("routes staff destinations to staff login", () => {
    expect(loginPathForNext("/cashier")).toBe(APP_ROUTES.staffLogin);
    expect(loginPathForNext(null)).toBe(APP_ROUTES.staffLogin);
  });
});

describe("isOfficeConsolePath", () => {
  it("treats dashboard routes as office", () => {
    expect(isOfficeConsolePath(APP_ROUTES.overview)).toBe(true);
    expect(isOfficeConsolePath(APP_ROUTES.business)).toBe(true);
    expect(isOfficeConsolePath(APP_ROUTES.products)).toBe(true);
  });

  it("rejects storefront, till, and login paths", () => {
    expect(isOfficeConsolePath(APP_ROUTES.shop)).toBe(false);
    expect(isOfficeConsolePath(APP_ROUTES.shopAccount)).toBe(false);
    expect(isOfficeConsolePath(APP_ROUTES.cashier)).toBe(false);
    expect(isOfficeConsolePath(APP_ROUTES.grocery)).toBe(false);
    expect(isOfficeConsolePath(APP_ROUTES.login)).toBe(false);
    expect(isOfficeConsolePath("/0714282874")).toBe(false);
  });
});

describe("loginHrefForDestination", () => {
  it("sends owners back to office sign-in with next", () => {
    expect(loginHrefForDestination(APP_ROUTES.overview)).toBe(
      `${APP_ROUTES.staffLogin}?mode=office&next=${encodeURIComponent(APP_ROUTES.overview)}`,
    );
    expect(loginHrefForDestination(APP_ROUTES.business)).toBe(
      `${APP_ROUTES.staffLogin}?mode=office&next=${encodeURIComponent(APP_ROUTES.business)}`,
    );
  });

  it("keeps cashiers on the till door", () => {
    expect(loginHrefForDestination(APP_ROUTES.cashier)).toBe(
      `${APP_ROUTES.staffLogin}?next=${encodeURIComponent(APP_ROUTES.cashier)}`,
    );
  });

  it("sends shoppers to customer login", () => {
    expect(loginHrefForDestination("/shop/account")).toBe(
      `${APP_ROUTES.login}?next=${encodeURIComponent("/shop/account")}`,
    );
  });
});

describe("isOfficeLoginMode", () => {
  it("reads mode=office", () => {
    expect(isOfficeLoginMode(new URLSearchParams("mode=office"))).toBe(true);
    expect(isOfficeLoginMode(new URLSearchParams("mode=till"))).toBe(false);
    expect(isOfficeLoginMode(new URLSearchParams())).toBe(false);
  });
});

describe("login path helpers", () => {
  it("detects staff and shared login paths", () => {
    expect(isStaffLoginPath("/login/staff")).toBe(true);
    expect(isStaffLoginPath("/login")).toBe(false);
    expect(isAnyLoginPath("/login")).toBe(true);
    expect(isAnyLoginPath("/login/staff")).toBe(true);
  });
});

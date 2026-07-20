import { describe, expect, it } from "bun:test";

import { APP_ROUTES } from "@/lib/config";
import {
  checkLoginAudience,
  isAnyLoginPath,
  isStaffLoginPath,
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

describe("login path helpers", () => {
  it("detects staff and shared login paths", () => {
    expect(isStaffLoginPath("/login/staff")).toBe(true);
    expect(isStaffLoginPath("/login")).toBe(false);
    expect(isAnyLoginPath("/login")).toBe(true);
    expect(isAnyLoginPath("/login/staff")).toBe(true);
  });
});

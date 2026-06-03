import { describe, expect, it } from "bun:test";

import { isAuthProtectedPath } from "@/lib/auth-route-guard";

describe("isAuthProtectedPath", () => {
  it("protects dashboard prefixes", () => {
    expect(isAuthProtectedPath("/products")).toBe(true);
    expect(isAuthProtectedPath("/products/abc")).toBe(true);
    expect(isAuthProtectedPath("/cashier")).toBe(true);
    expect(isAuthProtectedPath("/inventory/stock")).toBe(true);
  });

  it("allows public routes", () => {
    expect(isAuthProtectedPath("/login")).toBe(false);
    expect(isAuthProtectedPath("/shop")).toBe(false);
    expect(isAuthProtectedPath("/shop/account")).toBe(false);
    expect(isAuthProtectedPath("/verify-email")).toBe(false);
    expect(isAuthProtectedPath("/some-sku")).toBe(false);
  });
});

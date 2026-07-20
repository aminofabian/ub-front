import { describe, expect, it } from "bun:test";

import {
  assertTillUnlockUserAllowed,
  formatTillUnlockError,
  resolveTillUnlockEmail,
} from "@/lib/pos-till-unlock";

describe("resolveTillUnlockEmail", () => {
  it("uses unlock context for same-cashier mode", () => {
    expect(
      resolveTillUnlockEmail({
        mode: "same",
        context: {
          email: "Ada@Shop.com",
          branchId: "br-1",
          displayName: "Ada",
          userId: "u-1",
        },
      }),
    ).toBe("ada@shop.com");
  });

  it("requires email for switch mode", () => {
    expect(() =>
      resolveTillUnlockEmail({
        mode: "switch",
        context: {
          email: "ada@shop.com",
          branchId: "br-1",
          displayName: "Ada",
          userId: "u-1",
        },
        email: "  Mgr@Shop.com ",
      }),
    ).not.toThrow();
    expect(
      resolveTillUnlockEmail({
        mode: "switch",
        context: null,
        email: "  Mgr@Shop.com ",
      }),
    ).toBe("mgr@shop.com");
    expect(() =>
      resolveTillUnlockEmail({ mode: "switch", context: null, email: "nope" }),
    ).toThrow(/email/i);
  });
});

describe("assertTillUnlockUserAllowed", () => {
  it("rejects userId change in same mode", () => {
    expect(() =>
      assertTillUnlockUserAllowed({
        mode: "same",
        previousUserId: "u-1",
        nextUserId: "u-2",
      }),
    ).toThrow(/different user/i);
  });

  it("allows userId change in switch mode", () => {
    expect(() =>
      assertTillUnlockUserAllowed({
        mode: "switch",
        previousUserId: "u-1",
        nextUserId: "u-2",
      }),
    ).not.toThrow();
  });
});

describe("formatTillUnlockError", () => {
  it("guides password-only users toward password unlock", () => {
    expect(
      formatTillUnlockError("Incorrect email or password", "pin"),
    ).toMatch(/Password unlock/i);
    expect(
      formatTillUnlockError("Incorrect email or password", "password"),
    ).toMatch(/Wrong password/i);
  });
});

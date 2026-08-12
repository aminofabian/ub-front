import { describe, expect, it } from "vitest";

import type { BusinessRecord, MeResponse } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { canCashierClearTabs, canSearchCustomersByName, phoneVerificationRequiredForNewTab } from "@/lib/credit-tabs-access";

function me(roleKey: string, permissions: string[] = []): MeResponse {
  return {
    id: "u1",
    email: "a@b.c",
    name: "User",
    role: { id: "r1", key: roleKey, name: roleKey },
    permissions,
  } as MeResponse;
}

function business(
  allow?: boolean,
  creditTabs: NonNullable<
    NonNullable<BusinessRecord["inventory"]>["creditTabs"]
  > = {},
): BusinessRecord {
  return {
    name: "Shop",
    inventory: {
      creditTabs: {
        allowCashierTabClearance: allow,
        ...creditTabs,
      },
    },
  };
}

describe("canCashierClearTabs", () => {
  it("requires credits.customers.read", () => {
    expect(canCashierClearTabs(me("cashier"), business(true))).toBe(false);
  });

  it("requires till role", () => {
    expect(
      canCashierClearTabs(
        me("stock_manager", [Permission.CreditsCustomersRead]),
        business(true),
      ),
    ).toBe(false);
  });

  it("requires admin toggle", () => {
    expect(
      canCashierClearTabs(
        me("cashier", [Permission.CreditsCustomersRead]),
        business(false),
      ),
    ).toBe(false);
    expect(
      canCashierClearTabs(
        me("cashier", [Permission.CreditsCustomersRead]),
        { name: "Shop" },
      ),
    ).toBe(false);
  });

  it("allows cashier and butcher cashier when enabled", () => {
    expect(
      canCashierClearTabs(
        me("cashier", [Permission.CreditsCustomersRead]),
        business(true),
      ),
    ).toBe(true);
    expect(
      canCashierClearTabs(
        me("butcher_cashier", [Permission.CreditsCustomersRead]),
        business(true),
      ),
    ).toBe(true);
  });
});

describe("phoneVerificationRequiredForNewTab", () => {
  it("defaults to required when absent", () => {
    expect(phoneVerificationRequiredForNewTab({ name: "Shop" })).toBe(true);
    expect(phoneVerificationRequiredForNewTab(null)).toBe(true);
  });

  it("respects explicit setting", () => {
    expect(
      phoneVerificationRequiredForNewTab(
        business(undefined, { requirePhoneVerificationForNewTabCustomers: true }),
      ),
    ).toBe(true);
    expect(
      phoneVerificationRequiredForNewTab(
        business(undefined, { requirePhoneVerificationForNewTabCustomers: false }),
      ),
    ).toBe(false);
  });
});

describe("canSearchCustomersByName", () => {
  it("defaults off when absent", () => {
    expect(canSearchCustomersByName({ name: "Shop" })).toBe(false);
    expect(canSearchCustomersByName(null)).toBe(false);
  });

  it("respects admin toggle", () => {
    expect(
      canSearchCustomersByName(
        business(undefined, { allowCashierSearchCustomersByName: true }),
      ),
    ).toBe(true);
    expect(
      canSearchCustomersByName(
        business(undefined, { allowCashierSearchCustomersByName: false }),
      ),
    ).toBe(false);
  });
});

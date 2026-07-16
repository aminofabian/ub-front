import { describe, expect, it } from "vitest";

import type { BusinessRecord, MeResponse } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { canReceiveStock } from "@/lib/receive-stock-access";

function me(
  roleKey: string,
  permissions: string[] = [],
): MeResponse {
  return {
    id: "u1",
    email: "a@b.c",
    name: "User",
    role: { id: "r1", key: roleKey, name: roleKey },
    permissions,
  } as MeResponse;
}

function business(opts?: {
  allowReceiveForCashier?: boolean;
  allowReceiveForStockManager?: boolean;
}): BusinessRecord {
  return {
    name: "Shop",
    inventory: {
      receiveStock: {
        allowReceiveForCashier: opts?.allowReceiveForCashier,
        allowReceiveForStockManager: opts?.allowReceiveForStockManager,
      },
    },
  };
}

describe("canReceiveStock", () => {
  it("allows users with purchasing.path_b.write", () => {
    expect(
      canReceiveStock(me("owner", [Permission.PurchasingPathBWrite]), business()),
    ).toBe(true);
  });

  it("defaults cashier receive on when setting absent", () => {
    expect(canReceiveStock(me("cashier"), { name: "Shop" })).toBe(true);
    expect(canReceiveStock(me("butcher_cashier"), business({}))).toBe(true);
  });

  it("respects cashier toggle off", () => {
    expect(
      canReceiveStock(
        me("cashier"),
        business({ allowReceiveForCashier: false }),
      ),
    ).toBe(false);
  });

  it("respects stock manager toggle", () => {
    expect(
      canReceiveStock(
        me("stock_manager"),
        business({ allowReceiveForStockManager: true }),
      ),
    ).toBe(true);
    expect(
      canReceiveStock(
        me("stock_manager"),
        business({ allowReceiveForStockManager: false }),
      ),
    ).toBe(false);
  });
});

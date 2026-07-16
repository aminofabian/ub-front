import { describe, expect, it } from "bun:test";

import type { BusinessRecord, MeResponse } from "@/lib/api";
import {
  canLinkSupplierProducts,
  canWriteSuppliers,
} from "@/lib/supplier-access";

function me(roleKey: string, permissions: string[] = []): MeResponse {
  return {
    role: { key: roleKey },
    permissions,
  } as MeResponse;
}

function business(suppliers: {
  allowSupplierWriteForStockManager?: boolean;
  allowSupplierWriteForCashier?: boolean;
  allowLinkProductsForStockManager?: boolean;
  allowLinkProductsForCashier?: boolean;
}): BusinessRecord {
  return {
    name: "Shop",
    inventory: { suppliers },
  };
}

describe("canWriteSuppliers", () => {
  it("allows role permission without toggles", () => {
    expect(
      canWriteSuppliers(me("cashier", ["suppliers.write"]), business({})),
    ).toBe(true);
  });

  it("allows stock manager when toggle enabled", () => {
    expect(
      canWriteSuppliers(
        me("stock_manager"),
        business({ allowSupplierWriteForStockManager: true }),
      ),
    ).toBe(true);
  });

  it("denies stock manager when toggle off", () => {
    expect(canWriteSuppliers(me("stock_manager"), business({}))).toBe(false);
  });

  it("allows cashier when toggle enabled", () => {
    expect(
      canWriteSuppliers(
        me("cashier"),
        business({ allowSupplierWriteForCashier: true }),
      ),
    ).toBe(true);
  });
});

describe("canLinkSupplierProducts", () => {
  it("allows link when stock manager toggle enabled", () => {
    expect(
      canLinkSupplierProducts(
        me("stock_manager"),
        business({ allowLinkProductsForStockManager: true }),
      ),
    ).toBe(true);
  });

  it("treats butcher_cashier like cashier", () => {
    expect(
      canLinkSupplierProducts(
        me("butcher_cashier"),
        business({ allowLinkProductsForCashier: true }),
      ),
    ).toBe(true);
  });
});

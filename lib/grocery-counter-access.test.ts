import { describe, expect, it } from "vitest";

import {
  canGroceryEditMinStock,
  canGroceryEditStock,
  canGroceryOrderConfirm,
  canGroceryOrderPad,
  groceryClerkStockEditEnabled,
  groceryCounterModesAvailable,
} from "@/lib/grocery-counter-access";
import type { BusinessRecord, MeResponse } from "@/lib/api";

const clerk: MeResponse = {
  role: { key: "grocery_clerk" },
  permissions: [],
};

describe("grocery-counter-access stock edit", () => {
  it("defaults Edit stock on when the setting is unset", () => {
    const business: BusinessRecord = { name: "Palmart" };
    expect(groceryClerkStockEditEnabled(business)).toBe(true);
    expect(canGroceryEditStock(clerk, business)).toBe(true);
    expect(groceryCounterModesAvailable(clerk, business)).toContain("stockEdit");
  });

  it("hides Edit stock when the admin override is off", () => {
    const business: BusinessRecord = {
      name: "Palmart",
      inventory: {
        stockLevels: { allowStockEditForGroceryClerk: false },
      },
    };
    expect(groceryClerkStockEditEnabled(business)).toBe(false);
    expect(canGroceryEditStock(clerk, business)).toBe(false);
    expect(groceryCounterModesAvailable(clerk, business)).not.toContain(
      "stockEdit",
    );
  });
});

describe("grocery-counter-access order pad / confirm / min stock", () => {
  it("defaults order pad, confirm, and min stock on", () => {
    const business: BusinessRecord = { name: "Palmart" };
    expect(canGroceryOrderPad(clerk, business)).toBe(true);
    expect(canGroceryOrderConfirm(clerk, business)).toBe(true);
    expect(canGroceryEditMinStock(clerk, business)).toBe(true);
  });

  it("hides each when the admin override is off", () => {
    const business: BusinessRecord = {
      name: "Palmart",
      inventory: {
        stockLevels: {
          allowOrderPadForGroceryClerk: false,
          allowOrderConfirmForGroceryClerk: false,
          allowMinStockForGroceryClerk: false,
        },
      },
    };
    expect(canGroceryOrderPad(clerk, business)).toBe(false);
    expect(canGroceryOrderConfirm(clerk, business)).toBe(false);
    expect(canGroceryEditMinStock(clerk, business)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { APP_ROUTES } from "@/lib/config";
import {
  canEditStockLevels,
  canStockManagerSeeSystemStockDuringCount,
  canViewStockLevels,
  filterInventoryQuickLinksForUser,
  inventoryQuickLinksForUser,
  type InventoryQuickLink,
} from "@/lib/inventory-access";
import type { BusinessRecord, MeResponse } from "@/lib/api";

const businessWithStockEdits: BusinessRecord = {
  name: "Test",
  inventory: {
    stockLevels: {
      allowStockEditForStockManager: true,
      allowStockEditForGroceryClerk: true,
    },
  },
};

const businessHideSystemStock: BusinessRecord = {
  name: "Test",
  inventory: {
    stocktake: {
      showSystemStockToStockManager: false,
    },
  },
};

const businessShowSystemStock: BusinessRecord = {
  name: "Test",
  inventory: {
    stocktake: {
      showSystemStockToStockManager: true,
    },
  },
};

describe("inventory-access", () => {
  it("grants stock manager edit when the business toggle is on", () => {
    const me: MeResponse = {
      role: { key: "stock_manager" },
      permissions: ["inventory.read"],
    };
    expect(canEditStockLevels(me, businessWithStockEdits)).toBe(true);
    expect(canViewStockLevels(me, businessWithStockEdits)).toBe(true);
  });

  it("grants grocery clerk read and edit when the business toggle is on", () => {
    const me: MeResponse = {
      role: { key: "grocery_clerk" },
      permissions: ["catalog.items.read"],
    };
    expect(canViewStockLevels(me, businessWithStockEdits)).toBe(true);
    expect(canEditStockLevels(me, businessWithStockEdits)).toBe(true);
  });

  it("hides irrelevant stock quick links for restricted roles", () => {
    const stockManager: MeResponse = {
      role: { key: "stock_manager" },
      permissions: ["inventory.read"],
    };
    const groceryClerk: MeResponse = {
      role: { key: "grocery_clerk" },
      permissions: [],
    };

    const managerLinks = inventoryQuickLinksForUser(stockManager).map(
      (link) => link.href,
    );
    expect(managerLinks).toEqual([
      APP_ROUTES.inventoryRestock,
      APP_ROUTES.inventoryStockTake,
    ]);
    expect(managerLinks).not.toContain(APP_ROUTES.products);
    expect(managerLinks).not.toContain(APP_ROUTES.inventorySupplyBatches);

    const clerkLinks = inventoryQuickLinksForUser(groceryClerk).map(
      (link) => link.href,
    );
    expect(clerkLinks).toEqual([APP_ROUTES.inventoryRestock]);
  });

  it("hides system stock for stock managers when the toggle is off even with approve", () => {
    const me: MeResponse = {
      role: { key: "stock_manager" },
      permissions: ["stocktake.run", "stocktake.approve"],
    };
    expect(canStockManagerSeeSystemStockDuringCount(me, businessHideSystemStock)).toBe(
      false,
    );
    expect(canStockManagerSeeSystemStockDuringCount(me, businessShowSystemStock)).toBe(
      true,
    );
  });

  it("still shows system stock to admins and other approve roles", () => {
    expect(
      canStockManagerSeeSystemStockDuringCount(
        { role: { key: "admin" }, permissions: [] },
        businessHideSystemStock,
      ),
    ).toBe(true);
    expect(
      canStockManagerSeeSystemStockDuringCount(
        { role: { key: "manager" }, permissions: ["stocktake.approve"] },
        businessHideSystemStock,
      ),
    ).toBe(true);
  });

  it("filters stock take quick links for stock managers", () => {
    const stockManager: MeResponse = {
      role: { key: "stock_manager" },
      permissions: ["inventory.read", "stocktake.approve"],
    };
    const icon = (() => null) as unknown as InventoryQuickLink["icon"];
    const filtered = filterInventoryQuickLinksForUser(stockManager, [
      {
        href: APP_ROUTES.inventoryStock,
        label: "Stock",
        desc: "On-hand",
        icon,
      },
      {
        href: APP_ROUTES.inventorySupplyBatches,
        label: "Supply batches",
        desc: "Cost layers",
        icon,
      },
      {
        href: `${APP_ROUTES.inventoryStockTake}?review=1`,
        label: "Reviews",
        desc: "Pending counts",
        icon,
      },
      {
        href: APP_ROUTES.products,
        label: "Products",
        desc: "Catalog",
        icon,
      },
    ]).map((link) => link.href);

    expect(filtered).toContain(APP_ROUTES.inventoryStock);
    expect(filtered).toContain(`${APP_ROUTES.inventoryStockTake}?review=1`);
    expect(filtered).not.toContain(APP_ROUTES.inventorySupplyBatches);
    expect(filtered).not.toContain(APP_ROUTES.products);
  });
});

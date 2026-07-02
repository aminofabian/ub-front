import { describe, expect, it } from "bun:test";

import { APP_ROUTES } from "@/lib/config";

import {
  buildActionItems,
  expiringBatchCount,
  isHubSalesEmpty,
} from "./build-action-items";

describe("isHubSalesEmpty", () => {
  it("returns true when revenue, orders, and chart are all zero", () => {
    expect(isHubSalesEmpty(0, 0, [0, 0, 0])).toBe(true);
    expect(isHubSalesEmpty(0, null, [])).toBe(true);
  });

  it("returns false when any sales signal exists", () => {
    expect(isHubSalesEmpty(100, 0, [0])).toBe(false);
    expect(isHubSalesEmpty(0, 2, [0])).toBe(false);
    expect(isHubSalesEmpty(0, 0, [0, 50])).toBe(false);
  });
});

describe("expiringBatchCount", () => {
  it("uses the higher of dashboard list and pipeline buckets", () => {
    expect(
      expiringBatchCount(
        { expiringBatches: [{}, {}] } as never,
        { buckets: { due_7d: { batchCount: 1, qtyRemaining: 1 } } },
      ),
    ).toBe(2);

    expect(
      expiringBatchCount(null, {
        buckets: {
          due_7d: { batchCount: 2, qtyRemaining: 1 },
          expired: { batchCount: 1, qtyRemaining: 1 },
        },
      }),
    ).toBe(3);
  });
});

describe("buildActionItems", () => {
  const base = {
    openShifts: 0,
    lowStockCount: 0,
    batchDashboard: null,
    expiryPipeline: null,
    storefrontEnabled: true,
    payablesOpen: 0,
    canViewShifts: true,
    canViewSupplyBatches: true,
    canManageBusinessSettings: true,
    canViewApAging: true,
  };

  it("returns no items when everything is clear", () => {
    expect(buildActionItems(base)).toEqual([]);
  });

  it("includes gated alerts only when permitted", () => {
    const items = buildActionItems({
      ...base,
      openShifts: 2,
      lowStockCount: 3,
      storefrontEnabled: false,
      payablesOpen: 1500,
      canViewShifts: false,
      canViewSupplyBatches: false,
      canManageBusinessSettings: false,
      canViewApAging: false,
    });
    expect(items).toEqual([]);
  });

  it("builds expected alert links", () => {
    const items = buildActionItems({
      ...base,
      openShifts: 1,
      lowStockCount: 4,
      storefrontEnabled: false,
      payablesOpen: 2000,
    });

    expect(items.map((item) => item.id)).toEqual([
      "open-shifts",
      "low-stock",
      "storefront-off",
      "payables",
    ]);
    expect(items[0]?.href).toBe(APP_ROUTES.shifts);
    expect(items[2]?.href).toBe(APP_ROUTES.businessSettings);
  });
});

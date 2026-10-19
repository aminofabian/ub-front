import { describe, expect, it } from "vitest";

import type { ItemVelocityRow } from "@/lib/api";
import {
  coverDays,
  coverPhrase,
  shelfFocusCounts,
  shelfSignal,
} from "@/lib/velocity-shelf";

function row(partial: Partial<ItemVelocityRow>): ItemVelocityRow {
  return {
    itemId: "1",
    itemName: "Hook",
    sku: null,
    currentStock: 0,
    todayQty: 0,
    todayRevenue: 0,
    yesterdayQty: 0,
    yesterdayRevenue: 0,
    last3Qty: 0,
    last3Revenue: 0,
    last7Qty: 0,
    last7Revenue: 0,
    last30Qty: 0,
    last30Revenue: 0,
    buyingPrice: null,
    sellingPrice: null,
    imageKey: null,
    ...partial,
  };
}

describe("shelfSignal", () => {
  it("flags a seller with nothing on the shelf", () => {
    expect(shelfSignal(row({ currentStock: 0, last30Qty: 12 }))).toBe("empty");
    expect(coverPhrase(row({ currentStock: 0, last30Qty: 12 }))).toBe(
      "None on the shelf",
    );
  });

  it("flags stock that runs out inside three days", () => {
    const item = row({ currentStock: 7, last7Qty: 21 });
    expect(coverDays(item)).toBeCloseTo(7 / 3);
    expect(shelfSignal(item)).toBe("short");
    expect(coverPhrase(item)).toBe("2 days left");
  });

  it("leaves a quiet, stocked item alone", () => {
    const item = row({ currentStock: 40, last7Qty: 7 });
    expect(shelfSignal(item)).toBe("steady");
    expect(coverPhrase(item)).toBe("40 days left");
  });

  it("counts each focus once", () => {
    expect(
      shelfFocusCounts([
        row({ currentStock: 0, todayQty: 2 }),
        row({ itemId: "2", currentStock: 2, last7Qty: 14 }),
        row({ itemId: "3", currentStock: 20, todayQty: 4, yesterdayQty: 1 }),
      ]),
    ).toEqual({ empty: 1, short: 1, moving: 1 });
  });
});

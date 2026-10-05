import { describe, expect, test } from "bun:test";

import {
  STOCK_ATTENTION_FILTERS,
  STOCK_LEVEL_FILTERS,
  STOCK_PRICING_FILTERS,
  STOCK_STATUS_FILTERS,
  describeStockFilter,
  stockStatusOption,
  type StockCountKey,
  type StockStatusFilter,
} from "./stock-status-filters";

const STATUS_KEYS: StockStatusFilter[] = [
  "all",
  "in_stock",
  "low",
  "out",
  "loss",
  "poor_margin",
  "no_buy",
  "no_sell",
];

describe("stock-status-filters", () => {
  test("covers every filter exactly once", () => {
    expect(STOCK_STATUS_FILTERS.map((o) => o.key)).toEqual(STATUS_KEYS);
  });

  test("groups partition the full set with no overlap", () => {
    const grouped = [...STOCK_LEVEL_FILTERS, ...STOCK_PRICING_FILTERS];
    expect(grouped).toHaveLength(STOCK_STATUS_FILTERS.length);
    expect(new Set(grouped.map((o) => o.key)).size).toBe(grouped.length);
  });

  test("count keys are unique, so the counts object stays in sync", () => {
    const countKeys = STOCK_STATUS_FILTERS.map((o) => o.countKey);
    expect(new Set(countKeys).size).toBe(countKeys.length);
  });

  test("every option has a label, short label and hint", () => {
    for (const option of STOCK_STATUS_FILTERS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.shortLabel.length).toBeGreaterThan(0);
      expect(option.hint.length).toBeGreaterThan(0);
      // The terse label exists for narrow strips, but never replaces the full one.
      expect(option.shortLabel.length).toBeLessThanOrEqual(option.label.length);
    }
  });

  test("pricing filters are the ones hidden behind the phone panel", () => {
    expect(STOCK_ATTENTION_FILTERS.map((o) => o.key)).toEqual(
      STOCK_PRICING_FILTERS.map((o) => o.key),
    );
  });

  test("looks a filter up by key", () => {
    expect(stockStatusOption("poor_margin")?.shortLabel).toBe("Margin");
    expect(stockStatusOption("out")?.tone).toBe("danger");
    expect(stockStatusOption("nope" as StockStatusFilter)).toBeUndefined();
  });

  test("count keys line up with the keys the page computes", () => {
    // Keeps this module honest against the `stockCounts` memo in the page.
    const pageCountKeys: StockCountKey[] = [
      "total",
      "inStock",
      "low",
      "out",
      "loss",
      "poorMargin",
      "noBuy",
      "noSell",
    ];
    expect(STOCK_STATUS_FILTERS.map((o) => o.countKey).sort()).toEqual(
      [...pageCountKeys].sort(),
    );
  });

  test("only pricing filters get a plain-language description", () => {
    for (const option of STOCK_LEVEL_FILTERS) {
      expect(describeStockFilter(option.key)).toBe("");
    }
    for (const option of STOCK_PRICING_FILTERS) {
      expect(describeStockFilter(option.key)).toStartWith("Showing");
    }
  });
});

import { describe, expect, it } from "bun:test";

import {
  STOCK_COL_WIDTH_DEFAULTS,
  STOCK_COL_WIDTHS_RESTORE_SCRIPT,
  STOCK_COL_WIDTHS_STORAGE_KEY,
  clampStockColWidth,
  parseStockColumnWidths,
  stockTableMinWidthPx,
  STOCK_COLUMN_ORDER,
} from "./stock-column-widths";

describe("stock-column-widths", () => {
  it("clamps to min/max", () => {
    expect(clampStockColWidth("product", 1)).toBe(120);
    expect(clampStockColWidth("product", 9999)).toBe(560);
    expect(clampStockColWidth("inStore", 84)).toBe(84);
  });

  it("parses stored widths and ignores junk", () => {
    expect(parseStockColumnWidths(null)).toBeNull();
    expect(
      parseStockColumnWidths({
        product: 300,
        family: "nope",
        status: 999,
      }),
    ).toEqual({
      ...STOCK_COL_WIDTH_DEFAULTS,
      product: 300,
      status: 120,
    });
  });

  it("sums table min width", () => {
    expect(stockTableMinWidthPx(STOCK_COL_WIDTH_DEFAULTS)).toBe(1244);
  });

  it("covers every column in table order", () => {
    expect(STOCK_COLUMN_ORDER).toHaveLength(13);
    for (const col of STOCK_COLUMN_ORDER) {
      expect(STOCK_COL_WIDTH_DEFAULTS[col]).toBeGreaterThan(0);
    }
  });

  it("restore script paints clamped widths onto its parent element", () => {
    const painted: Array<[string, string]> = [];
    const shell = {
      style: {
        setProperty: (key: string, value: string) => {
          painted.push([key, value]);
        },
      },
    };
    const run = new Function(
      "window",
      "document",
      STOCK_COL_WIDTHS_RESTORE_SCRIPT,
    ) as (w: unknown, d: unknown) => void;
    run(
      {
        localStorage: {
          getItem: (key: string) =>
            key === STOCK_COL_WIDTHS_STORAGE_KEY
              ? JSON.stringify({ product: 400, reorder: 9999, junk: "x" })
              : null,
        },
        matchMedia: () => ({ matches: true }),
      },
      { currentScript: { parentElement: shell } },
    );

    // Stored product kept, reorder clamped to max, junk key falls back to
    // default, min-width sums every track.
    expect(painted).toEqual([
      ["--stock-col-product", "400px"],
      ["--stock-col-family", "112px"],
      ["--stock-col-variant", "96px"],
      ["--stock-col-category", "104px"],
      ["--stock-col-department", "104px"],
      ["--stock-col-shelf", "104px"],
      ["--stock-col-in-store", "84px"],
      ["--stock-col-reorder", "140px"],
      ["--stock-col-buy", "84px"],
      ["--stock-col-sell", "84px"],
      ["--stock-col-unit-cost", "76px"],
      ["--stock-col-status", "68px"],
      ["--stock-col-edit", "84px"],
      ["--stock-table-min-width", "1540px"],
    ]);
  });

  it("restore script skips painting when nothing is stored", () => {
    const painted: Array<[string, string]> = [];
    const shell = {
      style: {
        setProperty: (key: string, value: string) => {
          painted.push([key, value]);
        },
      },
    };
    const run = new Function(
      "window",
      "document",
      STOCK_COL_WIDTHS_RESTORE_SCRIPT,
    ) as (w: unknown, d: unknown) => void;
    run(
      { localStorage: { getItem: () => null }, matchMedia: () => ({ matches: true }) },
      { currentScript: { parentElement: shell } },
    );

    expect(painted).toEqual([]);
  });
});

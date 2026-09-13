import { describe, expect, it } from "bun:test";

import {
  CATALOG_COL_WIDTH_DEFAULTS,
  CATALOG_COL_WIDTHS_RESTORE_SCRIPT,
  CATALOG_COL_WIDTHS_STORAGE_KEY,
  catalogSheetMinWidthPx,
  clampCatalogColWidth,
  parseCatalogColumnWidths,
} from "./catalog-column-widths";

describe("catalog-column-widths", () => {
  it("clamps to min/max", () => {
    expect(clampCatalogColWidth("stock", 1)).toBe(32);
    expect(clampCatalogColWidth("stock", 999)).toBe(200);
    expect(clampCatalogColWidth("product", 280)).toBe(280);
  });

  it("parses stored widths and ignores junk", () => {
    expect(parseCatalogColumnWidths(null)).toBeNull();
    expect(
      parseCatalogColumnWidths({
        check: 30,
        product: 320,
        stock: "nope",
        sell: 80,
        category: 100,
      }),
    ).toEqual({
      ...CATALOG_COL_WIDTH_DEFAULTS,
      check: 30,
      product: 320,
      sell: 80,
      category: 100,
    });
  });

  it("sums sheet min width", () => {
    expect(
      catalogSheetMinWidthPx(
        { check: 22, product: 280, stock: 48, sell: 64, category: 96 },
        true,
      ),
    ).toBe(510);
    expect(
      catalogSheetMinWidthPx(
        { check: 22, product: 280, stock: 48, sell: 64, category: 96 },
        false,
      ),
    ).toBe(414);
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
      CATALOG_COL_WIDTHS_RESTORE_SCRIPT,
    ) as (w: unknown, d: unknown) => void;
    run(
      {
        localStorage: {
          getItem: (key: string) =>
            key === CATALOG_COL_WIDTHS_STORAGE_KEY
              ? JSON.stringify({ product: 400, stock: 9999, junk: "x" })
              : null,
        },
        matchMedia: (query: string) => ({
          matches: query.includes("min-width"),
        }),
      },
      { currentScript: { parentElement: shell } },
    );

    // Stored product kept, stock clamped to max, junk key falls back to
    // default, category included at xl, min-width sums every track.
    expect(painted).toEqual([
      ["--cat-col-check", "22px"],
      ["--cat-col-product", "400px"],
      ["--cat-col-stock", "200px"],
      ["--cat-col-sell", "64px"],
      ["--cat-col-category", "96px"],
      ["--cat-sheet-min-width", "782px"],
    ]);
  });

  it("restore script zeroes category below xl and skips when nothing stored", () => {
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
      CATALOG_COL_WIDTHS_RESTORE_SCRIPT,
    ) as (w: unknown, d: unknown) => void;

    run(
      {
        localStorage: {
          getItem: (key: string) =>
            key === CATALOG_COL_WIDTHS_STORAGE_KEY
              ? JSON.stringify({ category: 150 })
              : null,
        },
        matchMedia: () => ({ matches: false }),
      },
      { currentScript: { parentElement: shell } },
    );

    // Nothing stored → script must leave the CSS defaults untouched.
    const untouched: Array<[string, string]> = [];
    const bare = {
      style: {
        setProperty: (key: string, value: string) => {
          untouched.push([key, value]);
        },
      },
    };
    run(
      { localStorage: { getItem: () => null }, matchMedia: () => ({ matches: false }) },
      { currentScript: { parentElement: bare } },
    );
    expect(untouched).toEqual([]);

    // Category track forced to 0 below xl and excluded from the min-width sum.
    expect(painted).toEqual([
      ["--cat-col-check", "22px"],
      ["--cat-col-product", "280px"],
      ["--cat-col-stock", "48px"],
      ["--cat-col-sell", "64px"],
      ["--cat-col-category", "0px"],
      ["--cat-sheet-min-width", "414px"],
    ]);
  });
});

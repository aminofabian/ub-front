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
    expect(clampCatalogColWidth("product", 240)).toBe(240);
  });

  it("parses stored widths and ignores junk", () => {
    expect(parseCatalogColumnWidths(null)).toBeNull();
    expect(
      parseCatalogColumnWidths({
        check: 30,
        product: 320,
        stock: "nope",
        buy: 70,
        sell: 80,
        margin: 55,
        category: 100,
      }),
    ).toEqual({
      ...CATALOG_COL_WIDTH_DEFAULTS,
      check: 30,
      product: 320,
      buy: 70,
      sell: 80,
      margin: 55,
      category: 100,
    });
  });

  it("sums sheet min width", () => {
    expect(
      catalogSheetMinWidthPx(
        {
          check: 22,
          product: 240,
          stock: 44,
          buy: 64,
          sell: 64,
          margin: 52,
          category: 88,
        },
        true,
      ),
    ).toBe(574);
    expect(
      catalogSheetMinWidthPx(
        {
          check: 22,
          product: 240,
          stock: 44,
          buy: 64,
          sell: 64,
          margin: 52,
          category: 88,
        },
        false,
      ),
    ).toBe(486);
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

    expect(painted).toEqual([
      ["--cat-col-check", "22px"],
      ["--cat-col-product", "400px"],
      ["--cat-col-stock", "200px"],
      ["--cat-col-buy", "64px"],
      ["--cat-col-sell", "64px"],
      ["--cat-col-margin", "52px"],
      ["--cat-col-category", "88px"],
      ["--cat-sheet-min-width", "890px"],
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

    expect(painted).toEqual([
      ["--cat-col-check", "22px"],
      ["--cat-col-product", "240px"],
      ["--cat-col-stock", "44px"],
      ["--cat-col-buy", "64px"],
      ["--cat-col-sell", "64px"],
      ["--cat-col-margin", "52px"],
      ["--cat-col-category", "0px"],
      ["--cat-sheet-min-width", "486px"],
    ]);
  });
});

import { describe, expect, it } from "bun:test";

import {
  CATALOG_COL_WIDTH_DEFAULTS,
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
});

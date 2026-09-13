import { describe, expect, it } from "vitest";

import {
  CATALOG_COL_WIDTH_DEFAULTS,
  buildCatalogGridTemplateColumns,
  clampCatalogColWidth,
  parseCatalogColumnWidths,
} from "./catalog-column-widths";

describe("catalog-column-widths", () => {
  it("clamps to min/max", () => {
    expect(clampCatalogColWidth("stock", 1)).toBe(28);
    expect(clampCatalogColWidth("stock", 999)).toBe(140);
    expect(clampCatalogColWidth("sell", 56)).toBe(56);
  });

  it("parses stored widths and ignores junk", () => {
    expect(parseCatalogColumnWidths(null)).toBeNull();
    expect(
      parseCatalogColumnWidths({
        check: 30,
        stock: "nope",
        sell: 80,
        category: 100,
      }),
    ).toEqual({
      ...CATALOG_COL_WIDTH_DEFAULTS,
      check: 30,
      sell: 80,
      category: 100,
    });
  });

  it("builds shared grid template for every row", () => {
    expect(
      buildCatalogGridTemplateColumns({
        check: 22,
        stock: 40,
        sell: 56,
        category: 72,
      }),
    ).toBe("22px minmax(0, 1fr) 40px 56px 72px");

    expect(
      buildCatalogGridTemplateColumns(
        { check: 22, stock: 40, sell: 56, category: 72 },
        { showCategory: false },
      ),
    ).toBe("22px minmax(0, 1fr) 40px 56px 0px");
  });
});

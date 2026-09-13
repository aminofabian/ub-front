import { describe, expect, it } from "vitest";

import {
  CATALOG_COL_WIDTH_DEFAULTS,
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
});

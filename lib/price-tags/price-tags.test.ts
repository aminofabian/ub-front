import { describe, expect, it } from "vitest";

import { resolveSheet, paginate, tagHeightForRows, tagWidthForColumns, layoutForSheet, SHEET_COUNTS } from "@/lib/price-tags/layout";
import { discountPercent, wasPriceFromCatalog } from "@/lib/price-tags/money";
import { escapeHtml, resolvedWasPrice, TAG_PRINT_CSS, TAG_SCREEN_CSS } from "@/lib/price-tags/markup";
import { duplicateSlot, moveSlot, setCopies } from "@/lib/price-tags/slots";
import { DEFAULT_LAYOUT } from "@/lib/price-tags/templates";
import type { TagProduct } from "@/lib/price-tags/types";

describe("price tag sheet", () => {
  it("fits the shelf preset as 3 columns by 8 rows", () => {
    const sheet = resolveSheet(DEFAULT_LAYOUT);
    expect(sheet.columns).toBe(3);
    expect(sheet.rows).toBe(8);
    expect(sheet.perPage).toBe(24);
    expect(sheet.usedWidthMm).toBeLessThanOrEqual(sheet.usableWidthMm + 0.05);
    expect(sheet.usedHeightMm).toBeLessThanOrEqual(sheet.usableHeightMm + 0.05);
  });

  it("adds pages when the tags exceed one sheet", () => {
    const sheet = resolveSheet(DEFAULT_LAYOUT);
    const pages = paginate(Array.from({ length: 25 }, (_, index) => index), sheet.perPage);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(24);
    expect(pages[1]).toEqual([24]);
  });

  it("derives a width that fills the requested columns", () => {
    const width = tagWidthForColumns(DEFAULT_LAYOUT, 2);
    const sheet = resolveSheet({ ...DEFAULT_LAYOUT, tagWidthMm: width, presetId: "custom" });
    expect(sheet.columns).toBe(2);
    expect(sheet.usedWidthMm).toBeCloseTo(sheet.usableWidthMm, 1);
  });

  it("derives a height that fills the requested rows", () => {
    const height = tagHeightForRows(DEFAULT_LAYOUT, 4);
    const sheet = resolveSheet({ ...DEFAULT_LAYOUT, tagHeightMm: height, presetId: "custom" });
    expect(sheet.rows).toBe(4);
  });

  it("does not let a wide tag spill into a second column", () => {
    const sheet = resolveSheet({ ...DEFAULT_LAYOUT, tagWidthMm: 190, gapXMm: 0, presetId: "custom" });
    expect(sheet.columns).toBe(1);
    expect(sheet.usedWidthMm).toBeLessThanOrEqual(sheet.usableWidthMm + 0.05);
  });

  it("fills an A4 sheet with 24, 48, 72, or 96 tags in either direction", () => {
    for (const count of SHEET_COUNTS) {
      for (const direction of ["portrait", "landscape"] as const) {
        const sheet = resolveSheet(layoutForSheet(DEFAULT_LAYOUT, count, direction));
        expect(sheet.perPage).toBe(count);
        expect(sheet.pageWidthMm).toBe(direction === "landscape" ? 297 : 210);
        expect(sheet.pageHeightMm).toBe(direction === "landscape" ? 210 : 297);
        expect(sheet.usedWidthMm).toBeLessThanOrEqual(sheet.usableWidthMm + 0.05);
        expect(sheet.usedHeightMm).toBeLessThanOrEqual(sheet.usableHeightMm + 0.05);
      }
    }
  });
});

describe("price tag copies", () => {
  it("keeps one product's copies without dropping the others", () => {
    let slots = setCopies([], "milk", 4);
    slots = setCopies(slots, "bread", 2);
    slots = setCopies(slots, "milk", 1);
    expect(slots.map((slot) => slot.itemId)).toEqual(["milk", "bread", "bread"]);
  });

  it("duplicates and reorders a single tag", () => {
    const slots = setCopies([], "sugar", 1);
    const doubled = duplicateSlot(slots, slots[0].key);
    expect(doubled).toHaveLength(2);
    const moved = moveSlot(doubled, 0, 1);
    expect(moved[1].key).toBe(slots[0].key);
  });
});

describe("promotional price", () => {
  const milk: TagProduct = {
    id: "milk",
    name: "Fresh milk 500ml",
    sku: "PM-000125",
    barcode: "",
    categoryName: "Dairy",
    unitType: "piece",
    sellingPrice: 65,
    catalogWasPrice: 75,
    pricePer: "",
  };

  it("uses a higher catalog price as the previous price", () => {
    expect(wasPriceFromCatalog(65, 75)).toBe(75);
    expect(wasPriceFromCatalog(80, 75)).toBeNull();
    expect(discountPercent(65, 75)).toBe(13);
  });

  it("lets a print-job override replace the catalog previous price", () => {
    expect(resolvedWasPrice(milk, {})).toBe(75);
    expect(resolvedWasPrice(milk, { milk: null })).toBeNull();
    expect(resolvedWasPrice(milk, { milk: 90 })).toBe(90);
  });

  it("escapes product names before they enter the sheet", () => {
    expect(escapeHtml(`Milk <script>`)).toBe("Milk &lt;script&gt;");
  });

  it("keeps the A4 page rule out of the on-screen preview", () => {
    expect(TAG_PRINT_CSS).toContain("@page { size: A4 portrait; margin: 0; }");
    expect(TAG_SCREEN_CSS).not.toContain("@page");
  });
});

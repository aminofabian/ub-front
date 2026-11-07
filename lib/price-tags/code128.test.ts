import { describe, expect, it } from "vitest";

import { MIN_PRINT_MODULE_MM, barcodeFitsWidth, code128Modules } from "@/lib/price-tags/code128";
import { layoutForRoll, resolveSheet, tagTypeScale } from "@/lib/price-tags/layout";
import { sheetHtml } from "@/lib/price-tags/markup";
import { DEFAULT_LAYOUT, applyTemplate } from "@/lib/price-tags/templates";
import type { TagProduct } from "@/lib/price-tags/types";

describe("Code 128 width", () => {
  // Checked against JsBarcode's own encoder (bars in its binary output).
  it.each([
    ["6164000726187", 123],
    ["12345678", 79],
    ["PM-0001", 101],
    ["POS-BCF0DEA0A111", 211],
    ["SANITA-10012-14-ULTRA-EXTRA-LONG", 387],
    ["S1", 57],
    ["A", 46],
    ["AB12345C", 123],
    ["ABCD1234", 112],
    ["12A34", 90],
    ["1234567", 90],
    ["x00y0000z", 134],
  ])("counts the modules JsBarcode draws for %s", (code, modules) => {
    expect(code128Modules(code)).toBe(modules);
  });

  it("keeps a 13-digit code on a 1 inch label but not a long SKU", () => {
    const widthMm = 21.4 * 0.96;
    expect(barcodeFitsWidth("6164000726187", widthMm, MIN_PRINT_MODULE_MM)).toBe(false);
    expect(barcodeFitsWidth("6164000726187", 58 - 4, MIN_PRINT_MODULE_MM)).toBe(true);
    // On the 203 dpi label printer every bar needs 2 dots: a long SKU no longer fits a 50 mm label.
    expect(barcodeFitsWidth("6164000726187", (50 - 4) * 0.96, 2 / 8)).toBe(true);
    expect(barcodeFitsWidth("POS-BCF0DEA0A111", (50 - 4) * 0.96, 2 / 8)).toBe(false);
  });
});

describe("small roll labels", () => {
  const product: TagProduct = {
    id: "p",
    name: "Tomatoes",
    sku: "POS-BCF0DEA0A111",
    barcode: "",
    categoryName: "",
    unitType: "",
    sellingPrice: 10,
    catalogWasPrice: null,
    pricePer: "",
  };

  it("sizes type by height on a squarer label instead of shrinking it to a corner", () => {
    const shelf = resolveSheet(DEFAULT_LAYOUT);
    expect(tagTypeScale(shelf, "horizontal")).toBe(1);
    const roll40 = resolveSheet(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 40, heightMm: 30 }));
    expect(tagTypeScale(roll40, "horizontal")).toBeCloseTo(0.94, 2);
    const roll58 = resolveSheet(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 58, heightMm: 40 }));
    expect(tagTypeScale(roll58, "horizontal")).toBeCloseTo(1.25, 2);
  });

  it("leaves off a barcode whose bars would be too thin, keeping the SKU", () => {
    const layout = {
      ...applyTemplate(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 25.4, heightMm: 25.4, across: 2, gapMm: 2.5, edgeMm: 2.5 }), "barcode"),
      fields: ["productName", "sellingPrice", "sku", "barcode"] as const,
    };
    const html = sheetHtml([{ key: "k", itemId: "p" }], {
      layout: { ...layout, fields: layout.fields.slice() },
      geometry: resolveSheet(layout),
      businessName: "",
      currency: "KES",
      products: new Map([["p", product]]),
      wasOverrides: {},
      barcodes: { "POS-BCF0DEA0A111": "<svg></svg>" },
    }, 1, 1);
    expect(html).not.toContain('<div class="ptag-barcode">');
    expect(html).toContain("SKU POS-BCF0DEA0A111");
  });
});

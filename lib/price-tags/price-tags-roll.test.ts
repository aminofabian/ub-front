import { describe, expect, it } from "vitest";

import { alignmentTestHtml } from "@/lib/price-tags/alignment";
import {
  ROLL_LIMITS,
  ROLL_PRESETS,
  cellPosition,
  layoutForRoll,
  layoutForSheet,
  pageCount,
  paginateCells,
  resolveSheet,
  rollLinerWidthMm,
  rollPresetMatches,
  rollSpecOf,
} from "@/lib/price-tags/layout";
import { sheetHtml, tagPrintCssForPage } from "@/lib/price-tags/markup";
import { sanitizeLayout } from "@/lib/price-tags/storage";
import { DEFAULT_LAYOUT, applyTemplate } from "@/lib/price-tags/templates";

describe("label roll", () => {
  it("makes each label its own page at the label size", () => {
    const sheet = resolveSheet(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 50, heightMm: 30 }));
    expect(sheet).toMatchObject({
      columns: 1,
      rows: 1,
      perPage: 1,
      tagWidthMm: 50,
      tagHeightMm: 30,
      pageWidthMm: 50,
      pageHeightMm: 30,
      marginLeftMm: 0,
      gapXMm: 0,
    });
    expect(paginateCells(["a", "b", "c"], sheet.perPage, 5)).toEqual([["a"], ["b"], ["c"]]);
    expect(pageCount(3, sheet.perPage, 5)).toBe(3);
  });

  it("keeps the label inside a 20–108 mm wide printer", () => {
    const narrow = resolveSheet(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 12, heightMm: 4 }));
    expect([narrow.pageWidthMm, narrow.pageHeightMm]).toEqual([20, 10]);
    const wide = resolveSheet(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 150, heightMm: 50 }));
    expect(wide.pageWidthMm).toBe(108);
  });

  it("turns borders off on the roll and keeps the A4 sheet for later", () => {
    const sheet = layoutForSheet(DEFAULT_LAYOUT, 48, "landscape");
    const roll = layoutForRoll(sheet, { widthMm: 58, heightMm: 40 });
    expect(roll.border).toBe("none");
    const back = resolveSheet({ ...roll, media: "a4-sheet" });
    expect(back.perPage).toBe(48);
    expect(back.pageWidthMm).toBe(297);
  });

  it("asks the browser for a page the size of the label", () => {
    expect(tagPrintCssForPage(50, 30)).toContain("@page { size: 50mm 30mm; margin: 0; }");
    expect(tagPrintCssForPage(210, 297)).toContain("@page { size: A4 portrait; margin: 0; }");
    expect(tagPrintCssForPage(297, 210)).toContain("@page { size: A4 landscape; margin: 0; }");
  });

  it("draws the sheet at the label size", () => {
    const layout = layoutForRoll(DEFAULT_LAYOUT, { widthMm: 40, heightMm: 30 });
    const html = sheetHtml([null], {
      layout,
      geometry: resolveSheet(layout),
      businessName: "",
      currency: "KES",
      products: new Map(),
      wasOverrides: {},
      barcodes: {},
    }, 1, 1);
    expect(html).toContain('style="width:40mm;height:30mm"');
    expect(html).toContain("left:0mm;top:0mm;width:40mm;height:30mm");
  });

  it("reads saved roll settings safely", () => {
    expect(sanitizeLayout({ media: "label-roll", rollWidthMm: 500, rollHeightMm: "x" })).toMatchObject({
      media: "label-roll",
      rollWidthMm: 108,
      rollHeightMm: 30,
    });
    expect(sanitizeLayout({ media: "laser" }).media).toBe("a4-sheet");
  });
});

describe("multi-across label rolls", () => {
  const twoAcross = layoutForRoll(DEFAULT_LAYOUT, { widthMm: 32, heightMm: 32, across: 2, gapMm: 2, edgeMm: 2 });

  it("prints one row of 2 × 32 mm labels per page", () => {
    const sheet = resolveSheet(twoAcross);
    expect(sheet).toMatchObject({ columns: 2, rows: 1, perPage: 2, pageWidthMm: 70, pageHeightMm: 32 });
    expect(cellPosition(sheet, 0)).toEqual({ x: 2, y: 0 });
    expect(cellPosition(sheet, 1)).toEqual({ x: 36, y: 0 });
    expect(rollLinerWidthMm(rollSpecOf(twoAcross))).toBe(70);
    expect(paginateCells(["a", "b", "c"], sheet.perPage)).toEqual([["a", "b"], ["c"]]);
  });

  it("knows the 1 inch 2-across roll and moves it onto the sticker face", () => {
    const preset = ROLL_PRESETS.find((row) => row.widthMm === 32 && row.across === 2);
    expect(preset?.suggestSticker).toBe(true);
    expect(rollPresetMatches(twoAcross, preset!)).toBe(true);
  });

  it("flags rolls wider than a 4-inch print head", () => {
    const four = rollSpecOf(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 32, across: 4, gapMm: 2, edgeMm: 2 }));
    expect(rollLinerWidthMm(four)).toBeGreaterThan(ROLL_LIMITS.printWidthMm);
  });

  it("keeps saved across, gap and edge within bounds", () => {
    expect(sanitizeLayout({ rollAcross: 9, rollGapMm: -1, rollEdgeMm: 40 })).toMatchObject({
      rollAcross: 4,
      rollGapMm: 0,
      rollEdgeMm: 10,
    });
  });

  it("outlines and numbers every label on the alignment page, with the nudge applied", () => {
    const html = alignmentTestHtml(resolveSheet(twoAcross), { offsetXMm: 1, offsetYMm: -0.5 });
    expect(html.match(/class="palign-cell"/g)).toHaveLength(2);
    expect(html).toContain("left:3mm;top:-0.5mm;width:32mm;height:32mm");
    expect(html).toContain("left:37mm;top:-0.5mm");
    expect(html).toContain('<span class="palign-number">2</span>');
    expect(html).toContain('style="width:70mm;height:32mm"');
  });
});

describe("sticker template on small labels", () => {
  const sticker = applyTemplate(
    layoutForRoll(DEFAULT_LAYOUT, { widthMm: 25, heightMm: 25, across: 3, gapMm: 2, edgeMm: 2 }),
    "sticker",
  );
  const render = (sellingPrice: number) =>
    sheetHtml([{ key: "k", itemId: "p" }], {
      layout: sticker,
      geometry: resolveSheet(sticker),
      businessName: "Palmart",
      currency: "KES",
      products: new Map([
        ["p", { id: "p", name: "Sugar 1kg", sku: "S1", barcode: "", categoryName: "", unitType: "", sellingPrice, catalogWasPrice: null, pricePer: "" }],
      ]),
      wasOverrides: {},
      barcodes: {},
    }, 1, 1);

  it("shows only the name and price, on the sticker face", () => {
    const html = render(180);
    expect(html).toContain("ptag-sticker");
    expect(html).toContain('class="ptag-name');
    expect(html).not.toContain("ptag-shop");
  });

  it("shrinks a long price to the label instead of clipping it", () => {
    expect(render(180)).not.toContain('<p style="font-size:');
    expect(render(1249999)).toContain('<p style="font-size:');
  });
});

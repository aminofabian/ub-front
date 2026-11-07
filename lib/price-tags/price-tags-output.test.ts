import { describe, expect, it } from "vitest";

import { buildFaceBlocks, type FaceBlock } from "@/lib/price-tags/face";
import {
  cellPosition,
  clampSkip,
  pageCount,
  paginateCells,
  resolveSheet,
  tagHeightForRows,
  tagTypeScale,
  tagWidthForColumns,
} from "@/lib/price-tags/layout";
import { TAG_PRINT_CSS, sheetHtml, type TagRenderContext } from "@/lib/price-tags/markup";
import { fitFaceBlocks, stackHeight, type MeasuredBlock } from "@/lib/price-tags/pdf-fit";
import { tagProductFromSummary } from "@/lib/price-tags/product";
import { refreshTagProducts } from "@/lib/price-tags/refresh";
import { mergeRestored } from "@/lib/price-tags/slots";
import { MAX_QUEUED_TAGS, sanitizeCalibration, sanitizeLayout, sanitizeQueue } from "@/lib/price-tags/storage";
import { DEFAULT_LAYOUT, LABEL_PRESETS, applyPreset, applyTemplate } from "@/lib/price-tags/templates";
import type { TagLayout, TagProduct } from "@/lib/price-tags/types";

function product(overrides: Partial<TagProduct> = {}): TagProduct {
  return {
    id: "sugar",
    name: "Sugar 1kg",
    sku: "PM-0001",
    barcode: "",
    categoryName: "Baking",
    unitType: "piece",
    sellingPrice: 180,
    catalogWasPrice: null,
    pricePer: "",
    ...overrides,
  };
}

function context(layout: TagLayout, products: TagProduct[]): TagRenderContext {
  return {
    layout,
    geometry: resolveSheet(layout),
    businessName: "Palmart",
    currency: "KES",
    products: new Map(products.map((row) => [row.id, row])),
    wasOverrides: {},
    barcodes: {},
  };
}

describe("part-used sticker sheets", () => {
  it("leaves the first labels blank and pushes tags onto the next page", () => {
    const pages = paginateCells(["a", "b", "c"], 4, 2);
    expect(pages).toEqual([[null, null, "a", "b"], ["c"]]);
    expect(pageCount(3, 4, 2)).toBe(2);
    expect(pageCount(3, 4, 0)).toBe(1);
  });

  it("never skips a whole sheet or a negative count", () => {
    expect(clampSkip(30, 24)).toBe(23);
    expect(clampSkip(-3, 24)).toBe(0);
    expect(clampSkip(Number.NaN, 24)).toBe(0);
  });
});

describe("sheet positions", () => {
  it("places cells by column then row from the margins", () => {
    const geo = resolveSheet(DEFAULT_LAYOUT);
    expect(cellPosition(geo, 0)).toEqual({ x: 8, y: 12 });
    expect(cellPosition(geo, 4)).toEqual({ x: 8 + 63 + 2.5, y: 12 + 32 + 2 });
  });

  it("scales type up on big tags and keeps the shelf tag at 1", () => {
    expect(tagTypeScale(resolveSheet(DEFAULT_LAYOUT), "horizontal")).toBe(1);
    const large = resolveSheet(applyPreset(DEFAULT_LAYOUT, "large-2x4"));
    expect(tagTypeScale(large, "horizontal")).toBeGreaterThan(1.4);
    expect(LABEL_PRESETS["large-2x4"].tagWidthMm).toBe(96);
  });
});

describe("tag face content", () => {
  it("quotes a weighed product's price per kg without repeating the unit", () => {
    const row = tagProductFromSummary({ id: "beef", name: "Beef", sku: "B1", isWeighed: true, unitType: "kg", sellingPrice: 750 });
    expect(row?.pricePer).toBe("kg");
    const layout = { ...DEFAULT_LAYOUT, fields: [...DEFAULT_LAYOUT.fields, "unit" as const] };
    const blocks = buildFaceBlocks(row as TagProduct, { layout, businessName: "", currency: "KES", wasOverrides: {} });
    const price = blocks.find((block) => block.kind === "price");
    expect(price && price.kind === "price" ? price.per : "").toBe("kg");
    expect(blocks.some((block) => block.kind === "meta")).toBe(false);
  });

  it("uses the saved shelf price when the payload has no separate selling price", () => {
    const row = tagProductFromSummary({
      id: "omo",
      name: "Omo",
      sku: "O1",
      bundlePrice: "245.00",
    });
    expect(row?.sellingPrice).toBe(245);
  });

  it("prefers an open selling price over the shelf price", () => {
    const row = tagProductFromSummary({
      id: "omo",
      name: "Omo",
      sku: "O1",
      sellingPrice: 199,
      bundlePrice: 245,
    });
    expect(row?.sellingPrice).toBe(199);
  });

  it("skips products that are inactive or cannot be sold", () => {
    expect(tagProductFromSummary({ id: "x", name: "X", sku: "X", active: false })).toBeNull();
    expect(tagProductFromSummary({ id: "y", name: "Y", sku: "Y", isSellable: false })).toBeNull();
  });

  it("marks a missing price instead of printing an empty tag", () => {
    const blocks = buildFaceBlocks(product({ sellingPrice: null, pricePer: "kg" }), {
      layout: DEFAULT_LAYOUT,
      businessName: "",
      currency: "KES",
      wasOverrides: {},
    });
    expect(blocks.find((block) => block.kind === "price")).toMatchObject({ missing: true, per: "", mark: "" });
  });

  it("prints a product barcode and leaves the tag blank of one when there is none", () => {
    const layout = {
      ...DEFAULT_LAYOUT,
      fields: [...DEFAULT_LAYOUT.fields, "barcode" as const],
      generateBarcodeFromSku: true,
    };
    const input = {
      layout,
      businessName: "",
      currency: "KES",
      wasOverrides: {},
    };
    const withCode = buildFaceBlocks(product({ barcode: "6164000726187", sku: "PM-0001" }), input);
    expect(withCode.find((block) => block.kind === "barcode")).toMatchObject({ code: "6164000726187" });
    expect(withCode.some((block) => block.kind === "sku")).toBe(false);
    const without = buildFaceBlocks(product({ barcode: "", sku: "PM-0001" }), input);
    expect(without.some((block) => block.kind === "barcode" || block.kind === "sku")).toBe(false);
  });

  it("leads with the selling price and leaves the shop name and barcode off", () => {
    const blocks = buildFaceBlocks(product(), {
      layout: DEFAULT_LAYOUT,
      businessName: "Palmart",
      currency: "KES",
      wasOverrides: {},
    });
    expect(blocks.map((block) => block.kind)).toEqual(["price", "name"]);
    expect(blocks[0]).toMatchObject({ kind: "price", text: "180", mark: "Ksh" });
  });

  it("drops a saved classic layout's shop name and barcode", () => {
    const layout = sanitizeLayout({
      templateId: "classic",
      fields: ["businessName", "productName", "sellingPrice", "barcode"],
    });
    expect(layout.fields).toEqual(["productName", "sellingPrice"]);
  });
});

describe("print markup", () => {
  it("rotates a vertical face about the cell centre, after centring it", () => {
    expect(TAG_PRINT_CSS).toContain("transform: translate(-50%, -50%) rotate(-90deg);");
  });

  it("does not print borders around blank labels and applies the printer nudge", () => {
    const layout = { ...DEFAULT_LAYOUT, border: "solid" as const };
    const html = sheetHtml([null, { key: "k", itemId: "sugar" }], context(layout, [product()]), 1, 1, {
      offset: { offsetXMm: 1.5, offsetYMm: -1 },
      skipped: 1,
    });
    const cells = html.split('<div class="ptag-cell ').slice(1);
    expect(cells[0].startsWith("ptag-cell-empty ptag-cell-skipped")).toBe(true);
    expect(cells[1].startsWith("ptag-border-solid")).toBe(true);
    expect(cells[0]).toContain("left:9.5mm;top:11mm");
    expect(cells[2].startsWith("ptag-cell-empty\"")).toBe(true);
  });

  it("escapes catalog text and shows the unit after a weighed price", () => {
    const html = sheetHtml(
      [{ key: "k", itemId: "sugar" }],
      context(applyTemplate(DEFAULT_LAYOUT, "promo"), [product({ name: `<img src=x onerror=alert(1)>`, pricePer: "kg" })]),
      1,
      1,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain('<span class="ptag-per">/ kg</span>');
  });
});

describe("PDF fitting", () => {
  const text = (kind: Exclude<FaceBlock["kind"], "price" | "barcode">, heightMm: number, lines = 1): MeasuredBlock => ({
    block: { kind, text: kind },
    sizeMm: heightMm / lines,
    lines: Array.from({ length: lines }, () => kind),
    heightMm,
  });
  const price: MeasuredBlock = {
    block: { kind: "price", text: "180", mark: "KSh", per: "", missing: false },
    sizeMm: 6,
    lines: ["KES 180"],
    heightMm: 7,
  };
  const barcode: MeasuredBlock = { block: { kind: "barcode", code: "PM-0001" }, sizeMm: 8.5, lines: [], heightMm: 8.9 };
  const shorten = (entry: MeasuredBlock): MeasuredBlock => ({ ...entry, lines: entry.lines.slice(0, 1), heightMm: entry.sizeMm });

  it("drops the least useful lines first and keeps name and price", () => {
    const blocks = [text("shop", 3), text("name", 8, 2), price, text("sku", 3), barcode];
    const fitted = fitFaceBlocks(blocks, 26, shorten);
    expect(fitted.dropped).toEqual(["sku", "shop"]);
    expect(fitted.blocks.map((entry) => entry.block.kind)).toEqual(["name", "price", "barcode"]);
    expect(fitted.heightMm).toBeLessThanOrEqual(26);
  });

  it("shortens a two-line name before giving up the barcode", () => {
    const fitted = fitFaceBlocks([text("name", 8, 2), price, barcode], 21, shorten);
    expect(fitted.dropped).toEqual([]);
    expect(fitted.blocks[0].lines).toHaveLength(1);
  });

  it("measures gaps between blocks", () => {
    expect(stackHeight([price, price])).toBeCloseTo(14.4, 5);
    expect(stackHeight([])).toBe(0);
  });
});

describe("price refresh before printing", () => {
  it("retries once, then reports failed, unavailable and changed products", async () => {
    const calls: Record<string, number> = {};
    const current = new Map([
      ["milk", product({ id: "milk", sellingPrice: 65 })],
      ["bread", product({ id: "bread", sellingPrice: 60 })],
    ]);
    const outcome = await refreshTagProducts(["milk", "bread", "gone", "flaky", "down", "milk"], current, async (id) => {
      calls[id] = (calls[id] ?? 0) + 1;
      if (id === "gone") return null;
      if (id === "down") throw new Error("offline");
      if (id === "flaky" && calls[id] === 1) throw new Error("dropped");
      return product({ id, sellingPrice: id === "milk" ? 70 : 60 });
    }, 2);
    expect(calls.milk).toBe(1);
    expect(calls.flaky).toBe(2);
    expect(calls.down).toBe(2);
    expect(outcome.failed).toEqual(["down"]);
    expect(outcome.unavailable).toEqual(["gone"]);
    expect(outcome.changed).toEqual(["milk"]);
    expect(outcome.products.get("milk")?.sellingPrice).toBe(70);
    expect(outcome.products.has("flaky")).toBe(true);
  });
});

describe("stored preferences", () => {
  it("falls back from unknown templates, presets and borders", () => {
    const layout = sanitizeLayout({ templateId: "neon", presetId: "huge", border: "glow", fields: ["sku", "sku", "evil"] });
    expect(layout.templateId).toBe("classic");
    expect(layout.presetId).toBe("custom");
    expect(layout.border).toBe("hairline");
    expect(layout.fields).toEqual(["sku"]);
  });

  it("bounds the printer nudge", () => {
    expect(sanitizeCalibration({ offsetXMm: 40, offsetYMm: "2" })).toEqual({ offsetXMm: 10, offsetYMm: 0 });
  });

  it("keeps only valid ids and their previous prices in the saved sheet", () => {
    const queue = sanitizeQueue({
      itemIds: ["milk", 4, "", "milk"],
      wasOverrides: { milk: 75, bread: 60, sugar: -1 },
    });
    expect(queue.itemIds).toEqual(["milk", "milk"]);
    expect(queue.wasOverrides).toEqual({ milk: 75 });
  });
});

describe("review fixes", () => {
  it("fills exactly the requested columns and rows, never one short", () => {
    for (let columns = 1; columns <= 8; columns += 1) {
      const sheet = resolveSheet({ ...DEFAULT_LAYOUT, presetId: "custom", tagWidthMm: tagWidthForColumns(DEFAULT_LAYOUT, columns) });
      expect(sheet.columns).toBe(columns);
    }
    for (let rows = 1; rows <= 14; rows += 1) {
      const sheet = resolveSheet({ ...DEFAULT_LAYOUT, presetId: "custom", tagHeightMm: tagHeightForRows(DEFAULT_LAYOUT, rows) });
      expect(sheet.rows).toBe(rows);
    }
  });

  it("hides a typed previous price that is not above today's price", () => {
    const input = (was: number | null) => ({
      layout: { ...DEFAULT_LAYOUT, fields: [...DEFAULT_LAYOUT.fields, "previousPrice" as const] },
      businessName: "",
      currency: "KES",
      wasOverrides: { sugar: was },
    });
    const kinds = (was: number | null) => buildFaceBlocks(product(), input(was)).map((block) => block.kind);
    expect(kinds(10)).not.toContain("was");
    expect(kinds(0)).not.toContain("was");
    expect(kinds(180)).not.toContain("was");
    expect(kinds(200)).toContain("was");
  });

  it("merges a restored sheet with picks made during the restore, once each", () => {
    const slot = (itemId: string, key = itemId) => ({ key, itemId });
    const merged = mergeRestored([slot("milk"), slot("milk", "milk-2"), slot("bread")], [slot("milk", "new"), slot("eggs")]);
    expect(merged.map((row) => row.itemId)).toEqual(["milk", "milk", "bread", "eggs"]);
    const big = Array.from({ length: MAX_QUEUED_TAGS }, (_, index) => slot("a", `a${index}`));
    expect(mergeRestored(big, [slot("b")])).toHaveLength(MAX_QUEUED_TAGS);
  });
});

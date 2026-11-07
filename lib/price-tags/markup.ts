import { MIN_PRINT_MODULE_MM, barcodeFitsWidth } from "@/lib/price-tags/code128";
import { TAG_TYPE_MM, blockSizeMm, buildFaceBlocks, type FaceBlock } from "@/lib/price-tags/face";
import { cellPosition, faceSize, tagTypeScale } from "@/lib/price-tags/layout";
import { fitNameLines, type TextMeasure } from "@/lib/price-tags/name-fit";
import { SHELF_PRICE_FLOOR, fitFaceBlocks, type MeasuredBlock } from "@/lib/price-tags/pdf-fit";
import { LABEL_DOTS_PER_MM } from "@/lib/price-tags/tspl";
import type {
  PrinterCalibration,
  SheetCell,
  SheetGeometry,
  TagInstance,
  TagLayout,
  TagProduct,
} from "@/lib/price-tags/types";

export { barcodeValueFor, resolvedWasPrice } from "@/lib/price-tags/face";
export { TAG_PRINT_CSS, TAG_SCREEN_CSS, tagPrintCss, tagPrintCssForPage } from "@/lib/price-tags/css";

export type TagRenderContext = {
  layout: TagLayout;
  geometry: SheetGeometry;
  businessName: string;
  currency: string | null | undefined;
  products: ReadonlyMap<string, TagProduct>;
  wasOverrides: Readonly<Record<string, number | null>>;
  barcodes: Readonly<Record<string, string>>;
};

export type SheetOptions = {
  /** Printer nudge; the on-screen preview leaves it out. */
  offset?: PrinterCalibration;
  /** Leading cells on this page that are already used on the paper. */
  skipped?: number;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function blockHtml(block: FaceBlock, barcodes: TagRenderContext["barcodes"]): string {
  switch (block.kind) {
    case "price": {
      const missing = block.missing ? " ptag-price-missing" : "";
      const mark = block.mark ? `<span class="ptag-mark">${escapeHtml(block.mark)}</span>` : "";
      const per = block.per ? `<span class="ptag-per">/ ${escapeHtml(block.per)}</span>` : "";
      return `<p class="ptag-price${missing}">${mark}<span class="ptag-figure"><span class="ptag-amount">${escapeHtml(block.text)}</span>${per}</span></p>`;
    }
    case "barcode": {
      const svg = barcodes[block.code] ?? "";
      return svg
        ? `<div class="ptag-barcode">${svg}<span class="ptag-barcode-num">${escapeHtml(block.code)}</span></div>`
        : "";
    }
    default:
      return `<p class="ptag-${block.kind}">${escapeHtml(block.text)}</p>`;
  }
}

export function tagFaceHtml(slot: TagInstance, ctx: TagRenderContext): string {
  const product = ctx.products.get(slot.itemId);
  if (!product) {
    return `<article class="ptag-face ptag-missing"><p>Product not loaded</p></article>`;
  }
  const fitted = fitForMarkup(buildFaceBlocks(product, ctx), ctx);
  const align = ctx.layout.align === "center" ? "center" : "left";
  const body = fitted.blocks
    .map((entry) => {
      // A long name is shortened in the middle, as on the label, so its variant shows.
      const block =
        entry.block.kind === "name" && entry.lines.length > 0 ? { ...entry.block, text: entry.lines.join(" ") } : entry.block;
      const html = blockHtml(block, ctx.barcodes);
      if (entry.block.kind === "name" && entry.lines.length === 1) {
        return html.replace('class="ptag-name"', 'class="ptag-name ptag-name-1"');
      }
      if (entry.block.kind === "price" && entry.shrunk) {
        return html.replace('<p class="ptag-price', `<p style="font-size:${entry.sizeMm.toFixed(2)}mm" class="ptag-price`);
      }
      return html;
    })
    .join("");
  return `<article class="ptag-face ptag-${ctx.layout.templateId} ptag-align-${align}">${body}</article>`;
}

/** Rough average glyph width of the tag sans-serif, as a share of its size. */
const GLYPH_WIDTH_EM = 0.56;

/**
 * Apply the PDF's fitting rules to the print markup so a crowded tag drops the
 * same lines in both outputs. Without a layout engine the heights are
 * estimates: line height times size, and name length times average glyph width.
 */
/** Bold tabular figures run wider than average text. */
const PRICE_GLYPH_WIDTH_EM = 0.62;

function fitForMarkup(blocks: FaceBlock[], ctx: TagRenderContext) {
  const scale = tagTypeScale(ctx.geometry, ctx.layout.orientation, ctx.layout.templateId);
  const face = faceSize(ctx.geometry, ctx.layout.orientation);
  const innerW = Math.max(8, face.width - 4);
  const innerH = Math.max(6, face.height - 3);
  const template = ctx.layout.templateId;
  // The print CSS draws the barcode 92% wide. Bars thinner than the printer can make are left
  // off, as in the PDF and the label bitmap, so the preview shows what the roll will get.
  const minModuleMm = ctx.layout.media === "label-roll" ? 2 / LABEL_DOTS_PER_MM : MIN_PRINT_MODULE_MM;
  const drawable = blocks.filter(
    (block) => block.kind !== "barcode" || barcodeFitsWidth(block.code, innerW * 0.92, minModuleMm),
  );
  const measured = drawable.map((block): MeasuredBlock => {
    const missing = block.kind === "price" && block.missing;
    let sizeMm = blockSizeMm(block.kind, template, missing) * scale;
    if (block.kind === "barcode") return { block, sizeMm, lines: [], heightMm: sizeMm + 0.4 + TAG_TYPE_MM.barcodeDigits + 0.3 };
    if (block.kind === "price") {
      // Shrink a long price to the face width, as the PDF does, instead of clipping it.
      const perChars = block.per ? (block.per.length + 2) * 0.48 : 0;
      // The shelf label sets the currency beside the figures (about a third their size).
      const inline = template === "shelf" && block.mark.trim() !== "";
      const markChars = inline ? (block.mark.length + 0.5) * 0.36 : 0;
      const wide = (block.text.length + perChars + markChars) * sizeMm * PRICE_GLYPH_WIDTH_EM;
      if (wide > innerW) sizeMm *= innerW / wide;
      const mark = block.mark && !inline ? sizeMm * 0.42 : 0;
      const shrunk = wide > innerW;
      return { block, sizeMm, lines: [block.text], heightMm: sizeMm * 1.15 + 0.2 + mark, shrunk };
    }
    if (block.kind === "name") {
      const lines = fitNameLines(estimatedMeasure(sizeMm), block.text, innerW);
      return { block, sizeMm, lines, heightMm: lines.length * sizeMm * 1.2 };
    }
    return { block, sizeMm, lines: [""], heightMm: sizeMm * 1.15 };
  });
  return fitFaceBlocks(
    measured,
    innerH,
    (entry) => {
      const text = entry.block.kind === "name" ? entry.block.text : "";
      return { ...entry, lines: fitNameLines(estimatedMeasure(entry.sizeMm), text, innerW, 1), heightMm: entry.sizeMm * 1.2 };
    },
    template === "shelf" ? SHELF_PRICE_FLOOR : 1,
  );
}

/** Text width by average glyph width, wrapped on spaces: the preview's stand-in for a font. */
function estimatedMeasure(sizeMm: number): TextMeasure {
  const widthOf = (text: string) => text.length * sizeMm * GLYPH_WIDTH_EM;
  return {
    getTextWidth: widthOf,
    splitTextToSize(text, width) {
      const lines: string[] = [];
      let line = "";
      for (const word of text.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (!line || widthOf(next) <= width) line = next;
        else {
          lines.push(line);
          line = word;
        }
      }
      if (line) lines.push(line);
      return lines;
    },
  };
}

export function sheetHtml(
  cells: readonly SheetCell[],
  ctx: TagRenderContext,
  pageNumber: number,
  pageTotal: number,
  options: SheetOptions = {},
): string {
  const geo = ctx.geometry;
  const dx = options.offset?.offsetXMm ?? 0;
  const dy = options.offset?.offsetYMm ?? 0;
  const skipped = options.skipped ?? 0;
  const scale = tagTypeScale(geo, ctx.layout.orientation, ctx.layout.templateId);
  const html: string[] = [];
  for (let index = 0; index < geo.perPage; index += 1) {
    const slot = cells[index] ?? null;
    const { x, y } = cellPosition(geo, index);
    const face = slot
      ? orientFace(tagFaceHtml(slot, ctx), ctx.layout.orientation, geo.tagWidthMm, geo.tagHeightMm)
      : "";
    const state = slot
      ? `ptag-border-${ctx.layout.border}`
      : `ptag-cell-empty${index < skipped ? " ptag-cell-skipped" : ""}`;
    html.push(
      `<div class="ptag-cell ${state}" style="left:${x + dx}mm;top:${y + dy}mm;width:${geo.tagWidthMm}mm;height:${geo.tagHeightMm}mm;--ptag-s:${scale}">${face}</div>`,
    );
  }
  return `<section class="ptag-sheet" style="width:${geo.pageWidthMm}mm;height:${geo.pageHeightMm}mm" aria-label="Page ${pageNumber} of ${pageTotal}">${html.join("")}</section>`;
}

function orientFace(
  html: string,
  orientation: TagLayout["orientation"],
  widthMm: number,
  heightMm: number,
): string {
  if (orientation !== "vertical") {
    return `<div class="ptag-orient" style="width:100%;height:100%">${html}</div>`;
  }
  return `<div class="ptag-orient ptag-orient-vertical" style="width:${heightMm}mm;height:${widthMm}mm">${html}</div>`;
}

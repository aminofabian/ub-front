import { canEncodeBarcode, assessBarcodeCode } from "@/lib/barcode-label";
import { discountPercent, tagPriceLabel } from "@/lib/price-tags/money";
import type { SheetGeometry, TagInstance, TagLayout, TagProduct } from "@/lib/price-tags/types";

export type TagRenderContext = {
  layout: TagLayout;
  geometry: SheetGeometry;
  businessName: string;
  currency: string | null | undefined;
  products: ReadonlyMap<string, TagProduct>;
  wasOverrides: Readonly<Record<string, number | null>>;
  barcodes: Readonly<Record<string, string>>;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function barcodeValueFor(product: TagProduct, layout: TagLayout): string {
  const own = product.barcode.trim();
  if (own) {
    const assessed = assessBarcodeCode(own);
    return canEncodeBarcode(assessed.state) ? assessed.code : "";
  }
  if (!layout.generateBarcodeFromSku) return "";
  const assessed = assessBarcodeCode(product.sku);
  return canEncodeBarcode(assessed.state) ? assessed.code : "";
}

export function resolvedWasPrice(
  product: TagProduct,
  overrides: Readonly<Record<string, number | null>>,
): number | null {
  if (Object.prototype.hasOwnProperty.call(overrides, product.id)) {
    return overrides[product.id];
  }
  return product.catalogWasPrice;
}

export function tagFaceHtml(slot: TagInstance, ctx: TagRenderContext): string {
  const product = ctx.products.get(slot.itemId);
  if (!product) {
    return `<article class="ptag-face ptag-missing"><p>Product removed</p></article>`;
  }
  const fields = new Set(ctx.layout.fields);
  const was = resolvedWasPrice(product, ctx.wasOverrides);
  const off = discountPercent(product.sellingPrice, was);
  const code = barcodeValueFor(product, ctx.layout);
  const barcode = code ? ctx.barcodes[code] ?? "" : "";
  const align = ctx.layout.align === "center" ? "center" : "left";
  const template = ctx.layout.templateId;
  const parts: string[] = [];

  if (fields.has("businessName") && ctx.businessName) {
    parts.push(`<p class="ptag-shop">${escapeHtml(ctx.businessName)}</p>`);
  }
  if (fields.has("promoMessage") && ctx.layout.promoMessage.trim()) {
    parts.push(`<p class="ptag-deal">${escapeHtml(ctx.layout.promoMessage.trim())}</p>`);
  }
  if (fields.has("productName")) {
    parts.push(`<p class="ptag-name">${escapeHtml(product.name)}</p>`);
  }
  if (fields.has("sellingPrice")) {
    const missing = product.sellingPrice == null ? " ptag-price-missing" : "";
    parts.push(
      `<p class="ptag-price${missing}">${escapeHtml(tagPriceLabel(product.sellingPrice, ctx.currency))}</p>`,
    );
  }
  if (fields.has("previousPrice") && was != null) {
    parts.push(
      `<p class="ptag-was">${escapeHtml(tagPriceLabel(was, ctx.currency))}</p>`,
    );
  }
  if (fields.has("discountPercent") && off != null) {
    parts.push(`<p class="ptag-off">${off}% off</p>`);
  }
  if (fields.has("unit") && product.unitType) {
    parts.push(`<p class="ptag-meta">${escapeHtml(product.unitType)}</p>`);
  }
  if (fields.has("category") && product.categoryName) {
    parts.push(`<p class="ptag-meta">${escapeHtml(product.categoryName)}</p>`);
  }
  if (fields.has("sku") && product.sku) {
    parts.push(`<p class="ptag-sku">SKU ${escapeHtml(product.sku)}</p>`);
  }
  if (fields.has("barcode") && barcode) {
    parts.push(`<div class="ptag-barcode">${barcode}</div>`);
  }

  return `<article class="ptag-face ptag-${template} ptag-align-${align}">${parts.join("")}</article>`;
}

export function sheetHtml(
  slots: readonly TagInstance[],
  ctx: TagRenderContext,
  pageNumber: number,
  pageTotal: number,
): string {
  const geo = ctx.geometry;
  const cells: string[] = [];
  for (let index = 0; index < geo.perPage; index += 1) {
    const slot = slots[index];
    const col = index % geo.columns;
    const row = Math.floor(index / geo.columns);
    const x = geo.marginLeftMm + col * (geo.tagWidthMm + geo.gapXMm);
    const y = geo.marginTopMm + row * (geo.tagHeightMm + geo.gapYMm);
    const inner = slot ? tagFaceHtml(slot, ctx) : "";
    const face = orientFace(inner, ctx.layout.orientation, geo.tagWidthMm, geo.tagHeightMm);
    cells.push(
      `<div class="ptag-cell ptag-border-${ctx.layout.border}" style="left:${x}mm;top:${y}mm;width:${geo.tagWidthMm}mm;height:${geo.tagHeightMm}mm">${face}</div>`,
    );
  }
  return `<section class="ptag-sheet" aria-label="Page ${pageNumber} of ${pageTotal}">${cells.join("")}</section>`;
}

function orientFace(
  html: string,
  orientation: TagLayout["orientation"],
  widthMm: number,
  heightMm: number,
): string {
  if (!html) return "";
  if (orientation !== "vertical") {
    return `<div class="ptag-orient" style="width:100%;height:100%">${html}</div>`;
  }
  return `<div class="ptag-orient ptag-orient-vertical" style="width:${heightMm}mm;height:${widthMm}mm">${html}</div>`;
}

export const TAG_PRINT_CSS = `
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ptag-sheet {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: #fff;
    page-break-after: always;
    break-after: page;
  }
  .ptag-sheet:last-child { page-break-after: auto; break-after: auto; }
  .ptag-cell {
    position: absolute;
    box-sizing: border-box;
    overflow: hidden;
    background: #fff;
    color: #121A16;
  }
  .ptag-border-hairline { border: 0.2mm solid #121A16; }
  .ptag-border-solid { border: 0.45mm solid #121A16; }
  .ptag-border-dashed { border: 0.35mm dashed #121A16; }
  .ptag-border-ticket { border: 0.4mm solid #121A16; box-shadow: inset 0 0 0 0.45mm #fff, inset 0 0 0 0.7mm #121A16; }
  .ptag-border-none { border: 0; }
  .ptag-orient { box-sizing: border-box; }
  .ptag-orient-vertical {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: rotate(-90deg) translate(-50%, -50%);
    transform-origin: center center;
  }
  .ptag-face {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 1.6mm 2mm 1.4mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.4mm;
    font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
    line-height: 1.15;
    overflow: hidden;
  }
  .ptag-align-center { text-align: center; align-items: center; }
  .ptag-align-left { text-align: left; align-items: flex-start; }
  .ptag-shop {
    margin: 0;
    font-size: 2.4mm;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #1D4B3B;
  }
  .ptag-deal {
    margin: 0;
    font-size: 2.5mm;
    font-weight: 750;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #A55237;
  }
  .ptag-name {
    margin: 0;
    max-width: 100%;
    font-size: 3.3mm;
    font-weight: 650;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ptag-premium .ptag-name { font-size: 3.8mm; font-weight: 550; }
  .ptag-price {
    margin: 0.2mm 0 0;
    font-size: 5.6mm;
    font-weight: 750;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  .ptag-promo .ptag-price { color: #A55237; font-size: 6.2mm; }
  .ptag-premium .ptag-price { font-weight: 650; font-size: 6mm; }
  .ptag-price-missing { font-size: 3.2mm; font-weight: 650; color: #A55237; }
  .ptag-was {
    margin: 0;
    font-size: 2.8mm;
    color: #556159;
    text-decoration: line-through;
    font-variant-numeric: tabular-nums;
  }
  .ptag-off {
    margin: 0;
    font-size: 2.6mm;
    font-weight: 750;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #A55237;
  }
  .ptag-meta, .ptag-sku {
    margin: 0;
    font-size: 2.3mm;
    color: #556159;
    font-variant-numeric: tabular-nums;
  }
  .ptag-barcode { width: 92%; max-height: 11mm; margin-top: 0.4mm; }
  .ptag-align-center .ptag-barcode { margin-left: auto; margin-right: auto; }
  .ptag-barcode svg { width: 100%; height: 10mm; display: block; }
  .ptag-missing { font-size: 2.6mm; color: #556159; }
`;

export const TAG_SCREEN_CSS = TAG_PRINT_CSS.replace(
  "@page { size: A4 portrait; margin: 0; }\n  html, body { margin: 0; padding: 0; background: #fff; }\n  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n",
  "",
);

import { TAG_TYPE_MM } from "@/lib/price-tags/face";
import type { PageDirection } from "@/lib/price-tags/types";

/** Type size in mm, multiplied by the per-sheet scale set on each cell. */
function size(mm: number): string {
  return `calc(${mm}mm * var(--ptag-s, 1))`;
}

const PAGE_RULES = `
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

const SHEET_RULES = `
  .ptag-sheet {
    position: relative;
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
  .ptag-border-hairline,
  .ptag-border-dashed { border: 0.32mm dotted #121A16; }
  .ptag-border-solid { border: 0.45mm solid #121A16; }
  .ptag-border-ticket { border: 0.4mm solid #121A16; box-shadow: inset 0 0 0 0.45mm #fff, inset 0 0 0 0.7mm #121A16; }
  .ptag-border-none { border: 0; box-shadow: none; }
  /* Empty positions keep the same dotted line so the sheet can be cut on a grid. */
  .ptag-cell-empty { border: 0.32mm dotted rgba(18, 26, 22, 0.55); box-shadow: none; }
  .ptag-orient { box-sizing: border-box; }
  .ptag-orient-vertical {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    transform-origin: center center;
  }
  .ptag-face {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: calc(1.35mm * var(--ptag-s, 1)) calc(1.8mm * var(--ptag-s, 1));
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: calc(0.28mm * var(--ptag-s, 1));
    font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
    line-height: 1.15;
    overflow: hidden;
  }
  /* Never squash a line to nothing; an overfull face clips at the bottom instead. */
  .ptag-face > * { flex-shrink: 0; }
  .ptag-align-center { text-align: center; align-items: center; }
  .ptag-align-left { text-align: left; align-items: flex-start; }
  /* Sticker: a small square label, always centred whatever the alignment setting. */
  .ptag-face.ptag-sticker { text-align: center; align-items: center; }
`;

const TYPE_RULES = `
  .ptag-shop {
    margin: 0;
    font-size: ${size(TAG_TYPE_MM.shop)};
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1D4B3B;
  }
  .ptag-deal {
    margin: 0;
    font-size: ${size(TAG_TYPE_MM.deal)};
    font-weight: 750;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #A55237;
  }
  .ptag-name {
    margin: calc(0.7mm * var(--ptag-s, 1)) 0 0;
    max-width: 100%;
    font-size: ${size(TAG_TYPE_MM.name)};
    font-weight: 550;
    line-height: 1.15;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ptag-name.ptag-name-1 { -webkit-line-clamp: 1; }
  .ptag-premium .ptag-name { font-size: ${size(TAG_TYPE_MM.premiumName)}; font-weight: 500; }
  .ptag-price {
    margin: 0;
    padding: 0;
    border: 0;
    width: auto;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    align-items: inherit;
    font-size: ${size(TAG_TYPE_MM.price)};
    font-weight: 750;
    letter-spacing: -0.045em;
    line-height: 0.82;
    font-variant-numeric: tabular-nums;
    color: #121A16;
  }
  .ptag-mark {
    font-size: 0.28em;
    font-weight: 700;
    letter-spacing: 0.16em;
    line-height: 1;
    text-transform: uppercase;
    color: #1D4B3B;
    margin: 0 0 0.12em;
  }
  .ptag-figure {
    display: flex;
    align-items: baseline;
    gap: 0.12em;
    border-bottom: 0.32mm solid #1D4B3B;
    padding-bottom: 0.08em;
    white-space: nowrap;
  }
  .ptag-promo .ptag-price { font-size: ${size(TAG_TYPE_MM.promoPrice)}; }
  .ptag-promo .ptag-mark,
  .ptag-promo .ptag-amount { color: #A55237; }
  .ptag-promo .ptag-figure { border-bottom-color: #A55237; }
  .ptag-premium .ptag-price { font-weight: 650; font-size: ${size(TAG_TYPE_MM.premiumPrice)}; }
  .ptag-sticker .ptag-name { font-size: ${size(TAG_TYPE_MM.stickerName)}; font-weight: 650; line-height: 1.15; }
  .ptag-sticker .ptag-price { font-size: ${size(TAG_TYPE_MM.stickerPrice)}; border-top: 0; padding-top: 0; letter-spacing: -0.04em; }
  /* Shelf label: name on top, a big centred price with the currency beside it. */
  .ptag-face.ptag-shelf { text-align: center; align-items: center; }
  .ptag-shelf .ptag-name { font-size: ${size(TAG_TYPE_MM.shelfName)}; font-weight: 700; line-height: 1.15; }
  .ptag-shelf .ptag-price { font-size: ${size(TAG_TYPE_MM.shelfPrice)}; flex-direction: row; align-items: flex-start; gap: 0.14em; }
  .ptag-shelf .ptag-mark { font-size: 0.32em; letter-spacing: 0.06em; margin: 0.06em 0 0; }
  .ptag-shelf .ptag-figure { border-bottom: 0; padding-bottom: 0; }
  .ptag-price.ptag-price-missing { font-size: ${size(TAG_TYPE_MM.missingPrice)}; font-weight: 650; color: #A55237; letter-spacing: 0; }
  .ptag-price.ptag-price-missing .ptag-figure { border-bottom: 0; }
  .ptag-per { font-size: 0.34em; font-weight: 600; letter-spacing: 0; color: #556159; }
  .ptag-was {
    margin: 0;
    font-size: ${size(TAG_TYPE_MM.was)};
    color: #556159;
    text-decoration: line-through;
    font-variant-numeric: tabular-nums;
  }
  .ptag-off {
    margin: 0;
    font-size: ${size(TAG_TYPE_MM.off)};
    font-weight: 750;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #A55237;
  }
  .ptag-meta, .ptag-sku {
    margin: 0;
    font-size: ${size(TAG_TYPE_MM.meta)};
    color: #556159;
    font-variant-numeric: tabular-nums;
  }
  .ptag-barcode { width: 92%; margin-top: 0.4mm; }
  .ptag-align-center .ptag-barcode { margin-left: auto; margin-right: auto; }
  .ptag-barcode svg { width: 100%; height: ${size(TAG_TYPE_MM.barcodeHeight)}; display: block; }
  .ptag-shelf .ptag-barcode svg { height: ${size(TAG_TYPE_MM.shelfBarcodeHeight)}; }
  .ptag-barcode-num {
    display: block;
    margin: 0.15mm 0 0;
    font-size: ${TAG_TYPE_MM.barcodeDigits}mm;
    line-height: 1;
    letter-spacing: 0.04em;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: #121A16;
  }
  .ptag-missing { font-size: 2.6mm; color: #556159; }
`;

/** Preview-only: show blank and already-used positions without printing them. */
const SCREEN_ONLY_RULES = `
  .ptag-cell-empty { outline: 0.25mm dashed rgba(18, 26, 22, 0.16); outline-offset: -0.25mm; }
  .ptag-cell-skipped {
    background: repeating-linear-gradient(135deg, rgba(18, 26, 22, 0.06) 0 1.2mm, transparent 1.2mm 2.6mm);
  }
`;

export function tagPrintCss(direction: PageDirection): string {
  return `@page { size: A4 ${direction}; margin: 0; }\n` + PAGE_RULES + SHEET_RULES + TYPE_RULES;
}

/**
 * Print rules for a page of any size. A4 keeps its keyword; anything else
 * (one label on a roll) asks for that exact size, so Chrome and Edge preselect
 * it. The printer driver still needs a paper size that matches the label.
 */
export function tagPrintCssForPage(widthMm: number, heightMm: number): string {
  if (widthMm === 210 && heightMm === 297) return tagPrintCss("portrait");
  if (widthMm === 297 && heightMm === 210) return tagPrintCss("landscape");
  return `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }\n` + PAGE_RULES + SHEET_RULES + TYPE_RULES;
}

export const TAG_PRINT_CSS = tagPrintCss("portrait");

export const TAG_SCREEN_CSS = SHEET_RULES + TYPE_RULES + SCREEN_ONLY_RULES;

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
  .ptag-border-hairline { border: 0.2mm solid #121A16; }
  .ptag-border-solid { border: 0.45mm solid #121A16; }
  .ptag-border-dashed { border: 0.35mm dashed #121A16; }
  .ptag-border-ticket { border: 0.4mm solid #121A16; box-shadow: inset 0 0 0 0.45mm #fff, inset 0 0 0 0.7mm #121A16; }
  .ptag-border-none, .ptag-cell-empty { border: 0; box-shadow: none; }
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
    justify-content: flex-start;
    gap: calc(0.28mm * var(--ptag-s, 1));
    font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
    line-height: 1.15;
    overflow: hidden;
  }
  /* Never squash a line to nothing; an overfull face clips at the bottom instead. */
  .ptag-face > * { flex-shrink: 0; }
  .ptag-face > :first-child { margin-top: auto; }
  .ptag-face > :last-child { margin-bottom: auto; }
  .ptag-align-center { text-align: center; align-items: center; }
  .ptag-align-left { text-align: left; align-items: flex-start; }
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
    margin: 0;
    max-width: 100%;
    font-size: ${size(TAG_TYPE_MM.name)};
    font-weight: 650;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ptag-name.ptag-name-1 { -webkit-line-clamp: 1; }
  .ptag-premium .ptag-name { font-size: ${size(TAG_TYPE_MM.premiumName)}; font-weight: 550; }
  .ptag-price {
    margin: calc(0.45mm * var(--ptag-s, 1)) 0 0;
    padding-top: calc(0.45mm * var(--ptag-s, 1));
    border-top: 0.15mm solid #121A16;
    width: 100%;
    font-size: ${size(TAG_TYPE_MM.price)};
    font-weight: 750;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .ptag-promo .ptag-price { color: #A55237; border-top-color: #A55237; font-size: ${size(TAG_TYPE_MM.promoPrice)}; }
  .ptag-premium .ptag-price { font-weight: 650; border-top-color: #1D4B3B; font-size: ${size(TAG_TYPE_MM.premiumPrice)}; }
  .ptag-price.ptag-price-missing { font-size: ${size(TAG_TYPE_MM.missingPrice)}; font-weight: 650; color: #A55237; }
  .ptag-per { font-size: 0.48em; font-weight: 600; letter-spacing: 0; padding-left: 0.6mm; }
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

export const TAG_PRINT_CSS = tagPrintCss("portrait");

export const TAG_SCREEN_CSS = SHEET_RULES + TYPE_RULES + SCREEN_ONLY_RULES;

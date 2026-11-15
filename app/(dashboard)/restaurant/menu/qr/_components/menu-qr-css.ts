import type { MenuQrLayout } from "@/lib/menu-qr";
import { menuQrGrid } from "@/lib/menu-qr";
import { PRINTED_MENU_PAPERS, type PrintedMenuPaper } from "@/lib/printed-menu";

/**
 * The stylesheet of the QR sheets. Like the printed menu it lives in a document of its own.
 * Each page is drawn as a page: a grid of codes the size of the paper's printable area, so the
 * preview shows the pages that will come out.
 *
 * The code itself is always black on white with a clear margin, whatever ink is picked: a phone
 * has to read it under a restaurant's lights.
 */
export function menuQrCss(input: {
  paper: PrintedMenuPaper;
  layout: MenuQrLayout;
  accent: string;
  serif: string;
  sans: string;
  mono: string;
  fontFaces: string;
}): string {
  const paper = PRINTED_MENU_PAPERS.find((p) => p.id === input.paper) ?? PRINTED_MENU_PAPERS[0];
  const small = paper.id === "a5";
  const { columns, rows } = menuQrGrid(input.layout, paper.id);
  const size = {
    poster: { font: small ? "12pt" : "17pt", qr: small ? "70mm" : "104mm" },
    cards: { font: small ? "9pt" : "9.5pt", qr: small ? "44mm" : "48mm" },
    stickers: { font: small ? "5.6pt" : "6pt", qr: small ? "30mm" : "30mm" },
  }[input.layout];
  return `
${input.fontFaces}
@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: ${paper.marginMm}mm; }
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  --accent: ${input.accent};
  --ink: #121a16;
  --muted: #55605a;
  color: var(--ink);
  font-family: ${input.sans};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
p { margin: 0; }
.empty { padding: 4em 1em; color: var(--muted); font-size: 12pt; text-align: center; }

.pg {
  display: grid;
  grid-template-columns: repeat(${columns}, minmax(0, 1fr));
  grid-template-rows: repeat(${rows}, minmax(0, 1fr));
  /* A hair under the printable height, so rounding never pushes a row on to a blank page. */
  height: ${paper.heightMm - 2 * paper.marginMm - 1}mm;
  font-size: ${size.font};
  line-height: 1.3;
  background: #fff;
  break-after: page;
  page-break-after: always;
}
.pg:last-child { break-after: auto; page-break-after: auto; }
@media screen {
  body { background: #e9e6df; padding: 16px 0 12px; }
  .pg {
    width: ${paper.widthMm}mm;
    height: ${paper.heightMm}mm;
    margin: 0 auto 16px;
    padding: ${paper.marginMm}mm;
    box-shadow: 0 1px 2px rgba(18, 26, 22, 0.18), 0 10px 28px rgba(18, 26, 22, 0.12);
    zoom: var(--fit, 1);
  }
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 1.4em 1.2em;
  overflow: hidden;
  text-align: center;
}
/* Cutting lines: each cell is outlined and the outlines overlap, so there is one line between two cells. */
.l-cards .cell, .l-stickers .cell { margin: -0.15mm; border: 0.3mm dashed #b5b0a4; }

.shop { max-width: 100%; font-family: ${input.serif}; font-size: 2.3em; font-style: italic; font-weight: 600; line-height: 1.05; overflow-wrap: break-word; }
.head { margin-top: 0.55em; color: var(--accent); font-size: 1.02em; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
.qr { width: ${size.qr}; max-width: 100%; margin-top: 1.1em; padding: 2.4mm; border: 0.5mm solid var(--ink); background: #fff; }
.qr svg { display: block; width: 100%; height: auto; }
.label { margin-top: 0.7em; font-size: 1.5em; font-weight: 800; letter-spacing: 0.04em; }
.how { margin-top: 0.75em; color: var(--muted); font-size: 0.86em; }
.addr { margin-top: 0.45em; font-family: ${input.mono}; font-size: 0.84em; overflow-wrap: anywhere; }
.line { margin-top: 0.7em; padding-top: 0.6em; border-top: 0.3mm solid rgba(18, 26, 22, 0.28); font-family: ${input.serif}; font-size: 1.15em; font-style: italic; }

.l-poster .shop { font-size: 3em; }
.l-poster .head { margin-top: 0.7em; font-size: 0.95em; }
.l-poster .qr { margin-top: 1.5em; padding: 4mm; border-width: 0.8mm; }
.l-poster .label { font-size: 2em; }

/* A small label has room for the code and a few words, no more. */
.l-stickers .cell { padding: 0.8em 0.6em; }
.l-stickers .shop { font-size: 1.9em; }
.l-stickers .head { margin-top: 0.3em; font-size: 0.95em; letter-spacing: 0.1em; }
.l-stickers .qr { margin-top: 0.7em; padding: 1.4mm; border-width: 0.3mm; }
.l-stickers .label { margin-top: 0.4em; font-size: 1.5em; }
.l-stickers .how, .l-stickers .line { display: none; }
.l-stickers .addr { margin-top: 0.3em; }
`;
}

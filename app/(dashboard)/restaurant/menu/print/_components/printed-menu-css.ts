import type { PrintedMenuPaper } from "@/lib/printed-menu";
import { PRINTED_MENU_PAPERS } from "@/lib/printed-menu";

/**
 * The stylesheet of the printed menu. It lives in its own document (a frame), so nothing from the
 * app's styles reaches it — in particular the app's print rules, which are for 80 mm receipts.
 *
 * Everything is sized in `em` from the sheet's font size, so a smaller paper is the same design
 * drawn smaller. On screen the sheet is shown at paper width; in print the page box and its
 * margins come from `@page` and the sheet is only its contents.
 */
export function printedMenuCss(input: {
  paper: PrintedMenuPaper;
  accent: string;
  serif: string;
  sans: string;
  mono: string;
  fontFaces: string;
}): string {
  const paper = PRINTED_MENU_PAPERS.find((p) => p.id === input.paper) ?? PRINTED_MENU_PAPERS[0];
  const small = paper.id === "a5";
  return `
${input.fontFaces}
@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: ${paper.marginMm}mm; }
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  --accent: ${input.accent};
  --ink: #121a16;
  --muted: #55605a;
  --line: rgba(18, 26, 22, 0.28);
  --serif: ${input.serif};
  --sans: ${input.sans};
  --mono: ${input.mono};
  color: var(--ink);
  font-family: var(--sans);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1, h2, p, ul, li, figure { margin: 0; padding: 0; }
ul { list-style: none; }
img { display: block; }

.sheet { font-size: ${small ? "8.6pt" : "10.5pt"}; line-height: 1.4; background: #fff; }
@media screen {
  body { background: #e9e6df; padding: 16px 0 28px; }
  .sheet {
    width: ${paper.widthMm}mm;
    min-height: ${paper.heightMm}mm;
    margin: 0 auto;
    padding: ${paper.marginMm}mm;
    box-shadow: 0 1px 2px rgba(18, 26, 22, 0.18), 0 10px 28px rgba(18, 26, 22, 0.12);
    zoom: var(--fit, 1);
  }
}
.empty { padding: 3em 0; color: var(--muted); font-size: 1.1em; text-align: center; }

/* What every template shares: a dish is a name, a line to the price, and perhaps a line about it. */
.dish { break-inside: avoid; page-break-inside: avoid; }
.row { display: flex; align-items: baseline; gap: 0.6em; }
.name { font-weight: 600; }
.lead { flex: 1; min-width: 1.2em; border-bottom: 1.2px dotted var(--line); transform: translateY(-0.22em); }
.price { flex-shrink: 0; font-family: var(--mono); font-size: 0.92em; font-variant-numeric: tabular-nums; }
.desc { color: var(--muted); font-size: 0.9em; line-height: 1.35; }
.sec h2 { break-after: avoid; page-break-after: avoid; }
.pic { display: none; }
.foot { break-inside: avoid; page-break-inside: avoid; }

/* ------------------------------------------------------------------ House menu */
.t-house .mast { padding-bottom: 1.1em; border-bottom: 3px double var(--ink); }
.t-house .kicker { color: var(--accent); font-size: 0.78em; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; }
.t-house h1 { margin-top: 0.12em; font-family: var(--serif); font-size: 4.2em; font-style: italic; font-weight: 600; line-height: 1; letter-spacing: -0.01em; }
.t-house .tag { margin-top: 0.5em; color: var(--muted); font-size: 1.05em; }
.t-house .body { margin-top: 1.6em; column-count: 2; column-gap: 3em; column-rule: 1px solid var(--line); }
.t-house .sec { margin-bottom: 1.7em; }
.t-house .sec h2 { padding-bottom: 0.4em; border-bottom: 1.5px solid var(--ink); color: var(--accent); font-size: 0.82em; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
.t-house .dish { padding: 0.62em 0; border-bottom: 1px solid var(--line); }
.t-house .desc { margin-top: 0.12em; }
.t-house .foot { margin-top: 1.4em; padding-top: 0.8em; border-top: 3px double var(--ink); color: var(--muted); font-family: var(--serif); font-size: 1.2em; font-style: italic; text-align: center; }

/* ------------------------------------------------------------------ Card */
.t-card { text-align: center; }
.t-card .mast, .t-card .body, .t-card .foot { max-width: 30em; margin-left: auto; margin-right: auto; }
.t-card .mast { padding: 1.2em 0 1.4em; }
.t-card .kicker { font-family: var(--serif); font-size: 1.25em; font-style: italic; color: var(--accent); }
.t-card h1 { margin-top: 0.2em; font-family: var(--serif); font-size: 3.3em; font-weight: 500; line-height: 1.05; letter-spacing: 0.08em; text-transform: uppercase; }
.t-card .tag { margin-top: 0.7em; color: var(--muted); font-size: 0.86em; letter-spacing: 0.14em; text-transform: uppercase; }
.t-card .mast::after { content: ""; display: block; width: 0.5em; height: 0.5em; margin: 1.5em auto 0; background: var(--accent); transform: rotate(45deg); }
.t-card .sec { margin-top: 1.9em; }
.t-card .sec h2 { display: flex; align-items: center; gap: 0.8em; font-family: var(--serif); font-size: 1.9em; font-style: italic; font-weight: 500; color: var(--accent); }
.t-card .sec h2::before, .t-card .sec h2::after { content: ""; flex: 1; border-top: 1px solid var(--line); }
/* Name, then the line about it, then the price: the row dissolves so the three can be ordered. */
.t-card .dish { display: flex; flex-direction: column; align-items: center; padding: 0.75em 0 0.15em; }
.t-card .row { display: contents; }
.t-card .lead { display: none; }
.t-card .name { order: 1; font-size: 0.86em; letter-spacing: 0.16em; text-transform: uppercase; }
.t-card .desc { order: 2; margin-top: 0.15em; font-family: var(--serif); font-size: 1.12em; font-style: italic; }
.t-card .price { order: 3; margin-top: 0.1em; font-family: var(--serif); font-size: 1.2em; }
.t-card .foot { margin-top: 2.4em; padding-top: 1em; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.86em; letter-spacing: 0.1em; }

/* ------------------------------------------------------------------ With pictures */
.t-pictures .mast { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 0.4em 2em; padding-bottom: 0.9em; border-bottom: 0.5em solid var(--accent); }
.t-pictures .kicker { display: none; }
.t-pictures h1 { font-size: 3.1em; font-weight: 800; line-height: 1; letter-spacing: -0.03em; }
.t-pictures .tag { max-width: 22em; color: var(--muted); font-size: 1em; text-align: right; }
.t-pictures .sec { margin-top: 1.6em; }
.t-pictures .sec h2 { margin-bottom: 0.7em; font-size: 1.5em; font-weight: 800; letter-spacing: -0.01em; }
.t-pictures .sec h2 span { box-shadow: inset 0 -0.42em 0 rgba(18, 26, 22, 0.1); box-shadow: inset 0 -0.42em 0 color-mix(in srgb, var(--accent) 22%, #fff); }
.t-pictures .pics { display: grid; grid-template-columns: repeat(${small ? 2 : 3}, minmax(0, 1fr)); gap: 1.1em 1.2em; }
.t-pictures .pics + .rest { margin-top: 0.9em; border-top: 1px solid var(--line); }
.t-pictures .has-pic .pic { display: block; width: 100%; height: ${small ? "9.5em" : "10.5em"}; margin-bottom: 0.55em; object-fit: cover; border-radius: 2px; }
.t-pictures .has-pic .row { align-items: flex-start; }
.t-pictures .has-pic .lead { border: 0; }
.t-pictures .has-pic .price { color: var(--accent); font-weight: 700; }
.t-pictures .no-pic { padding: 0.5em 0; border-bottom: 1px solid var(--line); }
.t-pictures .desc { margin-top: 0.12em; }
.t-pictures .foot { margin-top: 1.8em; padding: 0.8em 1em; background: var(--accent); color: #fff; font-weight: 600; text-align: center; }

/* ------------------------------------------------------------------ Takeaway sheet */
.t-takeaway { font-size: ${small ? "7.4pt" : "8.6pt"}; }
.t-takeaway .mast { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.2em 1.5em; padding-bottom: 0.6em; border-bottom: 2.5px solid var(--ink); }
.t-takeaway .kicker { display: none; }
.t-takeaway h1 { font-size: 2.5em; font-weight: 800; line-height: 1.05; letter-spacing: -0.02em; text-transform: uppercase; }
.t-takeaway .tag { color: var(--muted); font-size: 1.05em; }
.t-takeaway .body { margin-top: 1.1em; column-count: ${small ? 2 : 3}; column-gap: 1.8em; }
.t-takeaway .sec { margin-bottom: 1.2em; }
.t-takeaway .sec h2 { margin-bottom: 0.25em; padding: 0.3em 0 0.25em; border-top: 2.5px solid var(--accent); color: var(--accent); font-size: 1em; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.t-takeaway .dish { padding: 0.2em 0; }
.t-takeaway .name { font-weight: 500; }
.t-takeaway .price { font-weight: 600; }
.t-takeaway .desc { font-size: 0.86em; }
.t-takeaway .foot { margin-top: 0.6em; padding: 0.7em 1em; border: 2px solid var(--ink); font-size: 1.5em; font-weight: 800; text-align: center; }
`;
}

/**
 * Supplier catalogue PDF (dependency-free A4).
 *
 * Githurai price-list sheet: forest hero, WhatsApp bar, two A–Z columns,
 * mango prices, dotted leaders. No HTML, no product thumbs.
 */
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import {
  catalogPackLabel,
  groupCatalogProducts,
  normalizeCatalogLabel,
  type CatalogProductGroup,
} from "@/lib/marketplace-catalog-groups";

type Rgb = readonly [number, number, number];

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 28;
const CONTENT_W = PAGE_W - MARGIN * 2;
const COLS = 2;
const COL_GAP = 18;
const COL_W = (CONTENT_W - COL_GAP) / 2;
const LETTER_H = 18;
const FAMILY_H = 13;
const ROW_H = 11;
const FAMILY_GAP = 3;
const FOOTER = 40;

const C = {
  ink: [0.141, 0.192, 0.165] as Rgb,
  inkSoft: [0.361, 0.416, 0.373] as Rgb,
  paper: [0.937, 0.949, 0.925] as Rgb,
  paperRaised: [0.973, 0.98, 0.965] as Rgb,
  line: [0.847, 0.871, 0.808] as Rgb,
  forest: [0.184, 0.322, 0.2] as Rgb,
  forestDeep: [0.118, 0.231, 0.149] as Rgb,
  mango: [0.725, 0.412, 0.102] as Rgb,
  tomato: [0.757, 0.271, 0.169] as Rgb,
  heroMuted: [0.796, 0.847, 0.769] as Rgb,
  eyebrow: [0.725, 0.788, 0.706] as Rgb,
  pillInk: [0.906, 0.933, 0.886] as Rgb,
  white: [1, 1, 1] as Rgb,
};

type FontKind = "regular" | "bold" | "mono" | "serif";

class PdfCanvas {
  private ops: string[] = [];

  fill(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${rgb(color)} rg`, `${round(x)} ${round(y)} ${round(w)} ${round(h)} re`, "f");
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = C.line, width = 0.5) {
    this.ops.push(
      `${width} w`,
      `${rgb(color)} RG`,
      `${round(x1)} ${round(y1)} m`,
      `${round(x2)} ${round(y2)} l`,
      "S",
    );
  }

  dashLine(x1: number, y1: number, x2: number, y2: number, color: Rgb = C.line) {
    if (x2 - x1 < 6) return;
    this.ops.push(
      "[0.7 1.5] 0 d",
      "0.4 w",
      `${rgb(color)} RG`,
      `${round(x1)} ${round(y1)} m`,
      `${round(x2)} ${round(y2)} l`,
      "S",
      "[] 0 d",
    );
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, color: Rgb) {
    const rr = Math.min(r, w / 2, h / 2);
    const k = rr * 0.5522847498;
    const x2 = x + w;
    const y2 = y + h;
    this.ops.push(
      `${rgb(color)} rg`,
      `${round(x + rr)} ${round(y)} m`,
      `${round(x2 - rr)} ${round(y)} l`,
      `${round(x2 - rr + k)} ${round(y)} ${round(x2)} ${round(y + rr - k)} ${round(x2)} ${round(y + rr)} c`,
      `${round(x2)} ${round(y2 - rr)} l`,
      `${round(x2)} ${round(y2 - rr + k)} ${round(x2 - rr + k)} ${round(y2)} ${round(x2 - rr)} ${round(y2)} c`,
      `${round(x + rr)} ${round(y2)} l`,
      `${round(x + rr - k)} ${round(y2)} ${round(x)} ${round(y2 - rr + k)} ${round(x)} ${round(y2 - rr)} c`,
      `${round(x)} ${round(y + rr)} l`,
      `${round(x)} ${round(y + rr - k)} ${round(x + rr - k)} ${round(y)} ${round(x + rr)} ${round(y)} c`,
      "f",
    );
  }

  text(
    x: number,
    y: number,
    text: string,
    opts: { font?: FontKind; size?: number; color?: Rgb } = {},
  ) {
    const size = opts.size ?? 10;
    const font =
      opts.font === "bold" ? "/F2" : opts.font === "mono" ? "/F3" : opts.font === "serif" ? "/F4" : "/F1";
    this.ops.push(
      "BT",
      `${rgb(opts.color ?? C.ink)} rg`,
      `${font} ${size} Tf`,
      `1 0 0 1 ${round(x)} ${round(y)} Tm`,
      `(${escapePdfText(text)}) Tj`,
      "ET",
    );
  }

  textRight(
    xRight: number,
    y: number,
    text: string,
    opts: { font?: FontKind; size?: number; color?: Rgb } = {},
  ) {
    const size = opts.size ?? 10;
    this.text(xRight - textWidth(text, size, opts.font === "mono"), y, text, opts);
  }

  textCenter(x: number, y: number, text: string, opts: { font?: FontKind; size?: number; color?: Rgb } = {}) {
    const size = opts.size ?? 10;
    this.text(x - textWidth(text, size, opts.font === "mono") / 2, y, text, opts);
  }

  toStream(): string {
    return this.ops.join("\n");
  }
}

function rgb([r, g, b]: Rgb): string {
  return `${trim(r)} ${trim(g)} ${trim(b)}`;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function trim(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}

function escapePdfText(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code <= 0xff) {
      out += ch;
    } else {
      switch (ch) {
        case "’": out += String.fromCharCode(0x92); break;
        case "‘": out += String.fromCharCode(0x91); break;
        case "”": out += String.fromCharCode(0x94); break;
        case "“": out += String.fromCharCode(0x93); break;
        case "–": out += String.fromCharCode(0x96); break;
        case "—": out += String.fromCharCode(0x97); break;
        case "•": out += String.fromCharCode(0x95); break;
        case "…": out += String.fromCharCode(0x85); break;
        default: out += "?";
      }
    }
  }
  return out.replace(/\\/g, "\\\\").replace(/\(/g, "\\\(").replace(/\)/g, "\\\)");
}

function latin1Encode(s: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) {
    out[i] = s.charCodeAt(i) & 0xff;
  }
  return out;
}

function textWidth(text: string, size: number, mono = false): number {
  if (mono) return text.length * size * 0.6;
  let w = 0;
  for (const ch of text) {
    if (ch >= "A" && ch <= "Z") w += 0.66;
    else if (ch >= "a" && ch <= "z") w += 0.54;
    else if (ch >= "0" && ch <= "9") w += 0.56;
    else if (ch === " " || ch === "." || ch === "," || ch === "-") w += 0.28;
    else if (ch === "·" || ch === "–") w += 0.3;
    else w += 0.62;
  }
  return w * size;
}

function wrapText(text: string, size: number, maxWidth: number, maxLines = 99): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(candidate, size) > maxWidth) {
      lines.push(cur);
      cur = word;
      if (lines.length >= maxLines) break;
    } else {
      cur = candidate;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.slice(0, maxLines);
}

function truncateToWidth(text: string, size: number, maxWidth: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (textWidth(clean, size) <= maxWidth) return clean;
  let s = clean;
  while (s.length > 1 && textWidth(`${s}…`, size) > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("254")) {
    return `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return raw.trim();
}

function pdfPrice(product: MarketplaceCatalogProductPreview, currency: string): string {
  if (product.unitPrice == null) return "Ask";
  const n = Number(product.unitPrice);
  if (!Number.isFinite(n)) return "Ask";
  const code = (product.currency ?? currency).trim().toUpperCase();
  if (code === "KES" || !code) return `Ksh ${n.toFixed(2)}`;
  return `${code} ${n.toFixed(2)}`;
}

function letterOf(label: string): string {
  const ch = label.trim().charAt(0).toUpperCase();
  return ch >= "A" && ch <= "Z" ? ch : "#";
}

function packsListedUnder(group: CatalogProductGroup): boolean {
  return group.items.length > 1;
}

function displayPackLabel(
  product: MarketplaceCatalogProductPreview,
  familyLabel: string,
): string {
  const pack = catalogPackLabel(product, familyLabel);
  if (normalizeCatalogLabel(pack) === normalizeCatalogLabel(familyLabel)) return "Each";
  return pack;
}

function singletonLabel(group: CatalogProductGroup): { name: string; unit?: string } {
  const product = group.items[0];
  const pack = catalogPackLabel(product, group.label);
  if (normalizeCatalogLabel(pack) === normalizeCatalogLabel(group.label)) {
    return { name: group.label };
  }
  return { name: group.label, unit: pack };
}

function itemHeight(group: CatalogProductGroup, prevLetter: string): number {
  const letter = letterOf(group.label) !== prevLetter ? LETTER_H : 0;
  return letter + familyBodyHeight(group);
}

function sequenceHeight(groups: CatalogProductGroup[]): number {
  let h = 0;
  let prev = "";
  for (const group of groups) {
    h += itemHeight(group, prev);
    prev = letterOf(group.label);
  }
  return h;
}

function familyBodyHeight(group: CatalogProductGroup): number {
  if (packsListedUnder(group)) return FAMILY_H + group.items.length * ROW_H + FAMILY_GAP;
  return FAMILY_H + FAMILY_GAP;
}

function colX(col: number): number {
  return MARGIN + col * (COL_W + COL_GAP);
}

type PageBuild = { canvas: PdfCanvas };

export type CataloguePdfInput = {
  detail: MarketplaceSupplierDetail;
  origin?: string;
  includePrices?: boolean;
};

export async function buildMarketplaceCataloguePdf({
  detail,
  origin,
  includePrices = true,
}: CataloguePdfInput): Promise<Blob> {
  const products = detail.products;
  const currency = products.find((p) => p.currency)?.currency ?? "KES";
  const areaLabel = [detail.location, ...detail.locations]
    .map((l) => l?.trim())
    .filter((l): l is string => Boolean(l))
    .filter((l) => !/^(optional|n\/a|na|none|-)$/i.test(l))
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join(" · ");

  const groups = groupCatalogProducts(products);
  const phone = detail.contactPhone?.trim() ? formatPhone(detail.contactPhone) : null;
  const dateLong = new Date().toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateShort = new Date().toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const host = origin?.replace(/^https?:\/\//, "") ?? "";
  const footerLeft = host && host.toLowerCase() !== "kiosk.ke" ? `Kiosk.ke · ${host}` : "Kiosk.ke";

  const dummy = new PdfCanvas();
  const firstTop = paintHero(dummy, detail, {
    areaLabel,
    phone,
    first: true,
    families: groups.length,
    packs: products.length,
    dateShort,
    includePrices,
  });
  const contTop = PAGE_H - 72;
  const packed = packColumns(groups, firstTop - FOOTER, contTop - FOOTER);

  const pages: PageBuild[] = packed.map((cols, index) => {
    const canvas = new PdfCanvas();
    const first = index === 0;
    const listTop = paintHero(canvas, detail, {
      areaLabel,
      phone,
      first,
      families: groups.length,
      packs: products.length,
      dateShort,
      includePrices,
    });
    if (groups.length === 0 && first) {
      canvas.text(MARGIN, listTop - 16, "No products are linked to this catalogue yet.", {
        size: 10,
        color: C.inkSoft,
      });
    } else {
      cols.forEach((column, col) => {
        paintColumn(canvas, column, colX(col), listTop, currency, includePrices);
      });
    }
    canvas.line(MARGIN, 32, PAGE_W - MARGIN, 32, C.line, 0.3);
    canvas.text(MARGIN, 20, footerLeft, { size: 8, color: C.inkSoft });
    canvas.textRight(PAGE_W - MARGIN, 20, `${dateLong}  ·  ${index + 1} / ${packed.length}`, {
      font: "mono",
      size: 8,
      color: C.inkSoft,
    });
    return { canvas };
  });

  return assemblePdf(pages);
}

function paintHero(
  canvas: PdfCanvas,
  detail: MarketplaceSupplierDetail,
  ctx: {
    areaLabel: string;
    phone: string | null;
    first: boolean;
    families: number;
    packs: number;
    dateShort: string;
    includePrices: boolean;
  },
): number {
  canvas.fill(0, 0, PAGE_W, PAGE_H, C.paper);

  if (!ctx.first) {
    canvas.fill(0, PAGE_H - 44, PAGE_W, 44, C.forestDeep);
    canvas.text(MARGIN, PAGE_H - 28, detail.name, { font: "serif", size: 12, color: C.white });
    canvas.textRight(PAGE_W - MARGIN, PAGE_H - 28, ctx.includePrices ? "Price list" : "Catalogue", {
      size: 9,
      color: C.heroMuted,
    });
    paintColumnHeads(canvas, PAGE_H - 58, ctx.includePrices);
    return PAGE_H - 72;
  }

  const listed = detail.listedBy?.trim() || "";
  const nameLines = wrapText(detail.name, 22, CONTENT_W, 2);
  let drop = 28;
  if (ctx.areaLabel) drop += 16;
  drop += nameLines.length * 24;
  if (listed) drop += 16;
  drop += 32;
  if (ctx.phone) drop += 32;
  canvas.fill(0, PAGE_H - drop, PAGE_W, drop, C.forestDeep);

  let y = PAGE_H - 28;
  if (ctx.areaLabel) {
    canvas.text(MARGIN, y, ctx.areaLabel.toUpperCase(), { font: "mono", size: 8, color: C.eyebrow });
    y -= 16;
  }
  for (const line of nameLines) {
    canvas.text(MARGIN, y, line, { font: "serif", size: 22, color: C.paperRaised });
    y -= 24;
  }
  if (listed) {
    canvas.text(MARGIN, y, listed, { size: 10, color: C.heroMuted });
    y -= 16;
  }

  const pills = [
    `${ctx.families} ${ctx.families === 1 ? "family" : "families"} served`,
    `${ctx.packs} ${ctx.packs === 1 ? "pack" : "packs"} on the list`,
    `Updated ${ctx.dateShort}`,
  ];
  let px = MARGIN;
  for (const pill of pills) {
    const w = Math.min(textWidth(pill, 7.5, true) + 14, CONTENT_W - (px - MARGIN) - 4);
    if (w < 20) break;
    canvas.roundRect(px, y - 14, w, 16, 8, [0.2, 0.35, 0.22]);
    canvas.text(px + 7, y - 10, truncateToWidth(pill, 7.5, w - 12), {
      font: "mono",
      size: 7.5,
      color: C.pillInk,
    });
    px += w + 6;
  }
  y -= 32;

  if (ctx.phone) {
    canvas.fill(0, PAGE_H - drop, PAGE_W, 32, C.forest);
    canvas.text(MARGIN, PAGE_H - drop + 12, ctx.phone, {
      font: "mono",
      size: 13,
      color: C.white,
    });
    canvas.textRight(PAGE_W - MARGIN, PAGE_H - drop + 12, "WhatsApp or call with packs & quantities", {
      size: 8,
      color: C.heroMuted,
    });
  }

  const headsY = PAGE_H - drop - 18;
  paintColumnHeads(canvas, headsY, ctx.includePrices);
  return headsY - 14;
}

function paintColumnHeads(canvas: PdfCanvas, y: number, includePrices: boolean) {
  for (let col = 0; col < COLS; col += 1) {
    const x = colX(col);
    canvas.text(x, y, "ITEM", { font: "bold", size: 7.5, color: C.inkSoft });
    if (includePrices) {
      canvas.textRight(x + COL_W, y, "PRICE", { font: "bold", size: 7.5, color: C.inkSoft });
    }
    canvas.line(x, y - 5, x + COL_W, y - 5, C.line, 0.4);
  }
}

function packColumns(
  groups: CatalogProductGroup[],
  firstH: number,
  contH: number,
): CatalogProductGroup[][][] {
  if (groups.length === 0) return [[[], []]];

  const colH = (page: number) => (page === 0 ? firstH : contH);
  const pageBuckets: CatalogProductGroup[][] = [[]];
  let used = 0;
  let prev = "";

  for (const group of groups) {
    const h = itemHeight(group, prev);
    const cap = colH(pageBuckets.length - 1) * COLS - LETTER_H;
    if (used + h > cap && pageBuckets[pageBuckets.length - 1].length > 0) {
      pageBuckets.push([]);
      used = 0;
      prev = "";
    }
    pageBuckets[pageBuckets.length - 1].push(group);
    used += itemHeight(group, prev);
    prev = letterOf(group.label);
  }

  return pageBuckets.map((bucket, page) => splitBalanced(bucket, colH(page) - LETTER_H));
}

function splitBalanced(
  groups: CatalogProductGroup[],
  colH: number,
): CatalogProductGroup[][] {
  if (groups.length === 0) return [[], []];
  if (groups.length === 1) return [groups, []];
  const target = Math.min(colH, sequenceHeight(groups) / 2);
  let used = 0;
  let prev = "";
  let best = Math.ceil(groups.length / 2);
  let bestScore = Infinity;
  for (let i = 0; i < groups.length; i += 1) {
    const h = itemHeight(groups[i], prev);
    if (used + h > colH && i > 0) break;
    used += h;
    prev = letterOf(groups[i].label);
    const next = i + 1 < groups.length ? letterOf(groups[i + 1].label) : "";
    const letterBreak = next !== prev;
    const splitAt = i + 1;
    if (splitAt >= groups.length) break;
    const score = Math.abs(used - target) - (letterBreak ? 40 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = splitAt;
    }
  }
  return [groups.slice(0, best), groups.slice(best)];
}

function paintColumn(
  canvas: PdfCanvas,
  groups: CatalogProductGroup[],
  x: number,
  topY: number,
  currency: string,
  includePrices: boolean,
) {
  let y = topY;
  let currentLetter = "";

  for (const group of groups) {
    const letter = letterOf(group.label);
    if (letter !== currentLetter) {
      paintLetterStamp(canvas, x, y, letter);
      y -= LETTER_H;
      currentLetter = letter;
    }

    if (packsListedUnder(group)) {
      canvas.text(x, y - 10, truncateToWidth(group.label, 9, COL_W), {
        font: "bold",
        size: 9,
        color: C.ink,
      });
      y -= FAMILY_H;
      for (const product of group.items) {
        paintPriceRow(
          canvas,
          x,
          y,
          displayPackLabel(product, group.label),
          includePrices ? pdfPrice(product, currency) : "",
          { indent: 10, size: 8, variant: true, includePrices },
        );
        y -= ROW_H;
      }
    } else {
      const { name, unit } = singletonLabel(group);
      const label = unit ? `${name}  ·  ${unit}` : name;
      paintPriceRow(canvas, x, y, label, includePrices ? pdfPrice(group.items[0], currency) : "", {
        indent: 0,
        size: 9,
        variant: false,
        includePrices,
      });
      y -= FAMILY_H;
    }
    canvas.dashLine(x, y + 1, x + COL_W, y + 1, C.line);
    y -= FAMILY_GAP;
  }
}

function paintLetterStamp(canvas: PdfCanvas, x: number, cursorY: number, letter: string) {
  const s = 14;
  const y = cursorY - 16;
  canvas.roundRect(x, y, s, s, 2.5, C.forest);
  canvas.roundRect(x + 1.4, y + 1.4, s - 2.8, s - 2.8, 1.6, C.paper);
  canvas.textCenter(x + s / 2, y + 3.2, letter, { font: "serif", size: 9, color: C.forest });
  canvas.line(x + s + 5, y + s / 2, x + COL_W, y + s / 2, C.line, 0.3);
}

function paintPriceRow(
  canvas: PdfCanvas,
  x: number,
  cursorY: number,
  title: string,
  price: string,
  opts: { indent: number; size: number; variant: boolean; includePrices: boolean },
) {
  const y = cursorY - (opts.variant ? ROW_H : FAMILY_H);
  const ask = price === "Ask";
  const priceW = opts.includePrices ? textWidth(price, 8.5, true) : 0;
  const titleX = x + opts.indent;
  if (opts.variant) {
    canvas.fill(x + 2, y + 1, 1.5, ROW_H - 2, C.line);
  }
  const label = truncateToWidth(title, opts.size, COL_W - opts.indent - priceW - 10);
  canvas.text(titleX, y + 3, label, {
    font: opts.variant ? "regular" : "bold",
    size: opts.size,
    color: C.ink,
  });
  if (opts.includePrices) {
    canvas.textRight(x + COL_W, y + 3, price, {
      font: "mono",
      size: 8.5,
      color: ask ? C.tomato : C.mango,
    });
    const nameEnd = titleX + textWidth(label, opts.size);
    canvas.dashLine(nameEnd + 4, y + 5, x + COL_W - priceW - 5, y + 5, C.line);
  }
}

function assemblePdf(pages: PageBuild[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [];

  const push = (s: string) => {
    const b = enc.encode(s);
    chunks.push(b);
    length += b.length;
  };
  const writeObject = (body: string) => {
    offsets.push(length);
    push(body);
  };

  const totalObjects = 6 + pages.length * 2;

  push("%PDF-1.4\n");
  writeObject("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  const kids = pages.map((_, i) => `${7 + i * 2} 0 R`).join(" ");
  writeObject(`2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>endobj\n`);
  writeObject("3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  writeObject("4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n");
  writeObject("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>endobj\n");
  writeObject("6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>endobj\n");

  pages.forEach((page, pageIndex) => {
    const pageId = 7 + pageIndex * 2;
    const contentId = pageId + 1;
    writeObject(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R /Resources<< /Font<< /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> >>endobj\n`,
    );
    const streamBytes = latin1Encode(page.canvas.toStream());
    writeObject(`${contentId} 0 obj<< /Length ${streamBytes.length} >>stream\n`);
    chunks.push(streamBytes);
    length += streamBytes.length;
    push("\nendstream\nendobj\n");
  });

  const xrefStart = length;
  push(`xref\n0 ${totalObjects + 1}\n`);
  push("0000000000 65535 f \n");
  for (let i = 1; i <= totalObjects; i += 1) {
    push(`${String(offsets[i - 1]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer<< /Size ${totalObjects + 1} /Root 1 0 R >>\n`);
  push(`startxref\n${xrefStart}\n%%EOF`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return new Blob([out], { type: "application/pdf" });
}

/**
 * Supplier catalogue PDF (dependency-free A4).
 *
 * One sheet: identity + WhatsApp in a compact masthead, then a two-column
 * A–Z price list. Singletons are a name/price row; multi-pack families get a
 * small heading and indented packs. No cover-without-prices, no product thumbs.
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
import { formatMoney } from "@/lib/money";

type Rgb = readonly [number, number, number];

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 32;
const CONTENT_W = PAGE_W - MARGIN * 2; // 531
const COLS = 2;
const COL_GAP = 18;
const COL_W = (CONTENT_W - COL_GAP) / 2;
const BOTTOM_LIMIT = 48;
const LETTER_H = 13;
const FAMILY_H = 11;
const ROW_H = 12;
const FAMILY_GAP = 1;
const BRAND_BAR = 6;

const C = {
  brand: [0.055, 0.455, 0.424] as Rgb, // #0f766e
  brandDark: [0.035, 0.306, 0.286] as Rgb, // #094e48
  green: [0.078, 0.42, 0.29] as Rgb, // #146b4a
  greenInk: [0.84, 0.96, 0.9] as Rgb,
  ink: [0.11, 0.098, 0.082] as Rgb, // #1c1915
  muted: [0.42, 0.395, 0.36] as Rgb,
  paper: [0.945, 0.925, 0.89] as Rgb, // #f1ece3
  line: [0.86, 0.84, 0.8] as Rgb,
  white: [1, 1, 1] as Rgb,
  red: [0.68, 0.2, 0.16] as Rgb,
};

/* ---------------------------------- canvas ---------------------------------- */

class PdfCanvas {
  private ops: string[] = [];

  fill(x: number, y: number, w: number, h: number, color: Rgb = C.ink) {
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

  text(
    x: number,
    y: number,
    text: string,
    opts: { font?: "regular" | "bold" | "mono"; size?: number; color?: Rgb } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.font === "bold" ? "/F2" : opts.font === "mono" ? "/F3" : "/F1";
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
    opts: { font?: "regular" | "bold" | "mono"; size?: number; color?: Rgb } = {},
  ) {
    const size = opts.size ?? 10;
    this.text(xRight - textWidth(text, size, opts.font === "mono"), y, text, opts);
  }

  dashLine(x1: number, y1: number, x2: number, y2: number, color: Rgb = C.line) {
    if (x2 - x1 < 6) return;
    this.ops.push(
      "[0.8 1.6] 0 d",
      "0.45 w",
      `${rgb(color)} RG`,
      `${round(x1)} ${round(y1)} m`,
      `${round(x2)} ${round(y2)} l`,
      "S",
      "[] 0 d",
    );
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

/* ----------------------------------- pages ---------------------------------- */

type PageBuild = { canvas: PdfCanvas };

function pdfPrice(product: MarketplaceCatalogProductPreview, currency: string): string {
  if (product.unitPrice == null) return "Ask";
  return formatMoney(product.unitPrice, product.currency ?? currency)
    .replace(/\u00a0/g, " ")
    .replace(/[—–]/g, "-");
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

function singletonLabel(group: CatalogProductGroup): string {
  const product = group.items[0];
  const pack = catalogPackLabel(product, group.label);
  if (normalizeCatalogLabel(pack) === normalizeCatalogLabel(group.label)) return group.label;
  return `${group.label} · ${pack}`;
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
  return ROW_H + FAMILY_GAP;
}

function colX(col: number): number {
  return MARGIN + col * (COL_W + COL_GAP);
}

export type CataloguePdfInput = {
  detail: MarketplaceSupplierDetail;
  /** Absolute origin to print in the footer (for shared PDFs). */
  origin?: string;
};

export async function buildMarketplaceCataloguePdf({
  detail,
  origin,
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
  const phone = detail.contactPhone?.trim() || null;
  const firstTop = measureListTop(detail, { areaLabel, phone, first: true });
  const contTop = measureListTop(detail, { areaLabel, phone, first: false });
  const packed = packColumns(groups, firstTop - BOTTOM_LIMIT, contTop - BOTTOM_LIMIT);

  const date = new Date().toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const host = origin?.replace(/^https?:\/\//, "") ?? "";
  const footerLeft = host && host.toLowerCase() !== "kiosk.ke" ? `Kiosk.ke · ${host}` : "Kiosk.ke";
  const pages: PageBuild[] = packed.map((cols, index) => {
    const canvas = new PdfCanvas();
    const first = index === 0;
    const listTop = first ? firstTop : contTop;
    paintChrome(canvas, detail, {
      areaLabel,
      phone,
      first,
      page: index + 1,
      of: packed.length,
      date,
      footerLeft,
      groups,
    });
    if (groups.length === 0 && first) {
      canvas.text(MARGIN, listTop - 16, "No products are linked to this catalogue yet.", {
        size: 10,
        color: C.muted,
      });
    } else {
      cols.forEach((column, col) => {
        paintColumn(canvas, column, colX(col), listTop, currency);
      });
      const ruleX = MARGIN + COL_W + COL_GAP / 2;
      canvas.line(ruleX, listTop + 4, ruleX, BOTTOM_LIMIT + 8, C.line, 0.35);
    }
    return { canvas };
  });

  return assemblePdf(pages);
}

/** Baseline where the two-column list begins (below Item/Price rules). */
function measureListTop(
  detail: MarketplaceSupplierDetail,
  ctx: { areaLabel: string; phone: string | null; first: boolean },
): number {
  if (!ctx.first) return PAGE_H - BRAND_BAR - 48;
  const nameLines = wrapText(detail.name, 16, CONTENT_W - (ctx.phone ? 130 : 0), 2);
  let y = PAGE_H - BRAND_BAR - 20;
  y -= nameLines.length * 18;
  y -= 14;
  if (ctx.phone) y -= 30;
  y -= 10;
  return y;
}

function paintChrome(
  canvas: PdfCanvas,
  detail: MarketplaceSupplierDetail,
  ctx: {
    areaLabel: string;
    phone: string | null;
    first: boolean;
    page: number;
    of: number;
    date: string;
    footerLeft: string;
    groups: CatalogProductGroup[];
  },
) {
  canvas.fill(0, 0, PAGE_W, PAGE_H, C.white);
  canvas.fill(0, PAGE_H - BRAND_BAR, PAGE_W, BRAND_BAR, C.brand);

  if (ctx.first) {
    const nameWidth = CONTENT_W - (ctx.phone ? 130 : 0);
    const nameLines = wrapText(detail.name, 16, nameWidth, 2);
    let y = PAGE_H - BRAND_BAR - 20;
    for (const line of nameLines) {
      canvas.text(MARGIN, y, line, { font: "bold", size: 16, color: C.ink });
      y -= 18;
    }
    const meta: string[] = [];
    if (ctx.areaLabel) meta.push(ctx.areaLabel);
    if (detail.listedBy?.trim()) meta.push(detail.listedBy.trim());
    meta.push(`${ctx.groups.length} families · ${detail.products.length} packs`);
    canvas.text(MARGIN, y, meta.join("  ·  "), { size: 8.5, color: C.muted });
    y -= 14;
    if (ctx.phone) {
      canvas.fill(0, y - 20, PAGE_W, 24, C.green);
      canvas.text(MARGIN, y - 12, ctx.phone, { font: "bold", size: 13, color: C.white });
      canvas.textRight(PAGE_W - MARGIN, y - 12, "WhatsApp or call with packs and quantities", {
        size: 8,
        color: C.greenInk,
      });
      y -= 30;
    }
    paintColumnHeads(canvas, y);
  } else {
    const y = PAGE_H - BRAND_BAR - 18;
    canvas.text(MARGIN, y, detail.name, { font: "bold", size: 10, color: C.ink });
    if (ctx.phone) {
      canvas.text(MARGIN + 220, y, ctx.phone, { font: "bold", size: 10, color: C.green });
    }
    canvas.textRight(PAGE_W - MARGIN, y, "Price list", { size: 9, color: C.muted });
    paintColumnHeads(canvas, y - 16);
  }

  canvas.line(MARGIN, 40, PAGE_W - MARGIN, 40, C.line, 0.3);
  canvas.text(MARGIN, 30, ctx.footerLeft, { size: 8, color: C.muted });
  canvas.textRight(PAGE_W - MARGIN, 30, `${ctx.date}  ·  ${ctx.page} / ${ctx.of}`, {
    size: 8,
    color: C.muted,
  });
}

function paintColumnHeads(canvas: PdfCanvas, y: number) {
  for (let col = 0; col < COLS; col += 1) {
    const x = colX(col);
    canvas.text(x, y, "Item", { size: 7.5, color: C.muted });
    canvas.textRight(x + COL_W, y, "Price", { font: "bold", size: 7.5, color: C.muted });
    canvas.line(x, y - 4, x + COL_W, y - 4, C.line, 0.35);
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
    const cap = colH(pageBuckets.length - 1) * COLS;
    if (used + h > cap && pageBuckets[pageBuckets.length - 1].length > 0) {
      pageBuckets.push([]);
      used = 0;
      prev = "";
    }
    pageBuckets[pageBuckets.length - 1].push(group);
    used += itemHeight(group, prev);
    prev = letterOf(group.label);
  }

  return pageBuckets.map((bucket, page) => splitBalanced(bucket, colH(page)));
}

/** Split a page's families so both columns end together, preferring A–Z breaks. */
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
    const score = Math.abs(used - target) - (letterBreak ? 36 : 0);
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
) {
  let y = topY;
  let currentLetter = "";

  for (const group of groups) {
    const letter = letterOf(group.label);
    if (letter !== currentLetter) {
      canvas.text(x, y - 11, letter, { font: "bold", size: 10, color: C.brand });
      canvas.line(x + 12, y - 8, x + COL_W, y - 8, C.line, 0.3);
      y -= LETTER_H;
      currentLetter = letter;
    }

    const listPacks = packsListedUnder(group);
    if (listPacks) {
      canvas.fill(x, y - FAMILY_H, COL_W, FAMILY_H, C.paper);
      canvas.text(x + 2, y - 8, truncateToWidth(group.label, 8, COL_W - 4), {
        font: "bold",
        size: 8,
        color: C.brandDark,
      });
      y -= FAMILY_H;
      for (const product of group.items) {
        paintRow(
          canvas,
          x,
          y,
          displayPackLabel(product, group.label),
          pdfPrice(product, currency),
          { indent: 8, available: product.available, bold: false },
        );
        y -= ROW_H;
      }
    } else {
      paintRow(canvas, x, y, singletonLabel(group), pdfPrice(group.items[0], currency), {
        indent: 0,
        available: group.items[0].available,
        bold: true,
      });
      y -= ROW_H;
    }
    y -= FAMILY_GAP;
  }
}

function paintRow(
  canvas: PdfCanvas,
  x: number,
  cursorY: number,
  title: string,
  price: string,
  opts: { indent: number; available: boolean; bold: boolean },
) {
  const y = cursorY - ROW_H;
  const priceSize = 8;
  const priceW = textWidth(price, priceSize, true);
  const titleX = x + opts.indent;
  const titleMax = COL_W - opts.indent - priceW - 10;
  const label = truncateToWidth(title, 8.5, titleMax);
  canvas.text(titleX, y + 3.2, label, {
    font: opts.bold ? "bold" : "regular",
    size: 8.5,
    color: C.ink,
  });
  canvas.textRight(x + COL_W, y + 3.2, price, {
    font: "mono",
    size: priceSize,
    color: opts.available ? C.ink : C.red,
  });
  const nameEnd = titleX + textWidth(label, 8.5, false);
  canvas.dashLine(nameEnd + 4, y + 5.2, x + COL_W - priceW - 5, y + 5.2);
  canvas.line(x, y, x + COL_W, y, C.line, 0.25);
}

/* ---------------------------------- assembly ---------------------------------- */

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

  const totalObjects = 5 + pages.length * 2;

  push("%PDF-1.4\n");
  writeObject("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  const kids = pages.map((_, i) => `${6 + i * 2} 0 R`).join(" ");
  writeObject(`2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>endobj\n`);
  writeObject("3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  writeObject("4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n");
  writeObject("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>endobj\n");

  pages.forEach((page, pageIndex) => {
    const pageId = 6 + pageIndex * 2;
    const contentId = pageId + 1;
    writeObject(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R /Resources<< /Font<< /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>endobj\n`,
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

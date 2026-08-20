/**
 * Supplier catalogue PDF (dependency-free A4).
 *
 * One sheet matching the Palmart price-list mock: green identity, WhatsApp
 * bar, two ITEM/PRICE columns, letter badges, family thumbs, footer CTA.
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
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";

type Rgb = readonly [number, number, number];

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 28;
const CONTENT_W = PAGE_W - MARGIN * 2;
const COLS = 2;
const COL_GAP = 16;
const COL_W = (CONTENT_W - COL_GAP) / 2;
const LETTER_H = 15;
const FAMILY_H = 14;
const ROW_H = 10;
const FAMILY_GAP = 2;
const THUMB = 11;
const FOOTER_FIRST = 90;
const FOOTER_CONT = 42;

const C = {
  brand: [0.055, 0.455, 0.424] as Rgb, // #0f766e
  brandDark: [0.027, 0.28, 0.255] as Rgb, // #074841
  green: [0.078, 0.42, 0.29] as Rgb, // #146b4a
  greenInk: [0.84, 0.96, 0.9] as Rgb,
  ink: [0.11, 0.098, 0.082] as Rgb,
  muted: [0.42, 0.395, 0.36] as Rgb,
  paper: [0.945, 0.925, 0.89] as Rgb,
  line: [0.82, 0.8, 0.76] as Rgb,
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

  circle(cx: number, cy: number, r: number, color: Rgb) {
    const k = r * 0.5522847498;
    this.ops.push(
      `${rgb(color)} rg`,
      `${round(cx + r)} ${round(cy)} m`,
      `${round(cx + r)} ${round(cy + k)} ${round(cx + k)} ${round(cy + r)} ${round(cx)} ${round(cy + r)} c`,
      `${round(cx - k)} ${round(cy + r)} ${round(cx - r)} ${round(cy + k)} ${round(cx - r)} ${round(cy)} c`,
      `${round(cx - r)} ${round(cy - k)} ${round(cx - k)} ${round(cy - r)} ${round(cx)} ${round(cy - r)} c`,
      `${round(cx + k)} ${round(cy - r)} ${round(cx + r)} ${round(cy - k)} ${round(cx + r)} ${round(cy)} c`,
      "f",
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

  textCenter(x: number, y: number, text: string, opts: { font?: "regular" | "bold" | "mono"; size?: number; color?: Rgb } = {}) {
    const size = opts.size ?? 10;
    this.text(x - textWidth(text, size, opts.font === "mono") / 2, y, text, opts);
  }

  image(name: string, x: number, y: number, w: number, h: number) {
    this.ops.push("q", `${round(w)} 0 0 ${round(h)} ${round(x)} ${round(y)} cm`, `/${name} Do`, "Q");
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

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
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

/* ---------------------------------- images ---------------------------------- */

type EmbeddedImage = { data: Uint8Array; width: number; height: number };

function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 8 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break;
    const len = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (len < 2 || offset + 2 + len > bytes.length) break;
    const sof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (sof && offset + 9 <= bytes.length) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (width > 0 && height > 0) return { width, height };
    }
    offset += 2 + len;
  }
  return null;
}

async function fetchJpeg(url: string): Promise<EmbeddedImage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { cache: "force-cache", signal: controller.signal });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const dim = jpegSize(bytes);
    if (!dim || dim.width > 4096 || dim.height > 4096) return null;
    return { data: bytes, ...dim };
  } finally {
    clearTimeout(timer);
  }
}

async function loadProductImages(
  urls: (string | null)[],
): Promise<(EmbeddedImage | null)[]> {
  const out: (EmbeddedImage | null)[] = new Array(urls.length).fill(null);
  const queue = urls
    .map((url, index) => ({ url, index }))
    .filter((job): job is { url: string; index: number } => Boolean(job.url));
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      try {
        const img = await fetchJpeg(job.url);
        if (img) out[job.index] = img;
      } catch {
        /* tile fallback */
      }
    }
  });
  await Promise.all(workers);
  return out;
}

/* ----------------------------------- pages ---------------------------------- */

type PageBuild = {
  canvas: PdfCanvas;
  images: EmbeddedImage[];
};

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
  return FAMILY_H + FAMILY_GAP;
}

function colX(col: number): number {
  return MARGIN + col * (COL_W + COL_GAP);
}

export type CatalogueSheetPdfInput = {
  detail: MarketplaceSupplierDetail;
  origin?: string;
  includePrices?: boolean;
};

export async function buildMarketplaceCatalogueSheetPdf({
  detail,
  origin,
  includePrices = true,
}: CatalogueSheetPdfInput): Promise<Blob> {
  const products = detail.products;
  const currency = products.find((p) => p.currency)?.currency ?? "KES";
  const areaLabel = [detail.location, ...detail.locations]
    .map((l) => l?.trim())
    .filter((l): l is string => Boolean(l))
    .filter((l) => !/^(optional|n\/a|na|none|-)$/i.test(l))
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join(" · ");

  const groups = groupCatalogProducts(products);
  const thumbs = await loadProductImages(
    groups.map((group) => posTileThumbUrl(group.label, group.thumbnailUrl)),
  );
  const imageByFamily = new Map(groups.map((group, i) => [group.id, thumbs[i] ?? null]));
  const phone = detail.contactPhone?.trim() ? formatPhone(detail.contactPhone) : null;
  const firstTop = measureListTop(detail, { phone, first: true });
  const contTop = measureListTop(detail, { phone, first: false });
  const packed = packColumns(groups, firstTop - FOOTER_FIRST, contTop - FOOTER_CONT);

  const date = new Date().toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const host = origin?.replace(/^https?:\/\//, "") ?? "";
  const footerLeft = host && host.toLowerCase() !== "kiosk.ke" ? `Kiosk.ke · ${host}` : "Kiosk.ke";

  const pages: PageBuild[] = packed.map((cols, index) => {
    const page: PageBuild = { canvas: new PdfCanvas(), images: [] };
    const first = index === 0;
    const listTop = first ? firstTop : contTop;
    const footerH = first ? FOOTER_FIRST : FOOTER_CONT;
    paintChrome(page.canvas, detail, {
      areaLabel,
      phone,
      first,
      page: index + 1,
      of: packed.length,
      date,
      footerLeft,
      groups,
      includePrices,
    });
    if (groups.length === 0 && first) {
      page.canvas.text(MARGIN, listTop - 16, "No products are linked to this catalogue yet.", {
        size: 10,
        color: C.muted,
      });
    } else {
      cols.forEach((column, col) => {
        paintColumn(page, column, colX(col), listTop, currency, imageByFamily, includePrices);
      });
    }
    paintFooter(page.canvas, {
      first,
      phone,
      footerLeft,
      date,
      page: index + 1,
      of: packed.length,
      footerH,
    });
    return page;
  });

  return assemblePdf(pages);
}

function measureListTop(
  detail: MarketplaceSupplierDetail,
  ctx: { phone: string | null; first: boolean },
): number {
  if (!ctx.first) return PAGE_H - 52;
  const nameLines = wrapText(detail.name, 18, CONTENT_W - 92, 2);
  let y = PAGE_H - 28;
  y -= nameLines.length * 20;
  y -= 14;
  if (ctx.phone) y -= 30;
  y -= 18;
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
    includePrices: boolean;
  },
) {
  canvas.fill(0, 0, PAGE_W, PAGE_H, C.white);

  if (ctx.first) {
    paintBagMark(canvas, PAGE_W - MARGIN - 22, PAGE_H - 48);
    canvas.text(PAGE_W - MARGIN - 78, PAGE_H - 40, "palmart", {
      font: "bold",
      size: 8,
      color: C.brand,
    });
    canvas.text(PAGE_W - MARGIN - 78, PAGE_H - 50, "Mini Mart", {
      size: 7,
      color: C.muted,
    });

    const nameLines = wrapText(detail.name, 18, CONTENT_W - 92, 2);
    let y = PAGE_H - 28;
    for (const line of nameLines) {
      canvas.text(MARGIN, y, line, { font: "bold", size: 18, color: C.brand });
      y -= 20;
    }
    const meta: string[] = [];
    if (ctx.areaLabel) meta.push(ctx.areaLabel);
    if (detail.listedBy?.trim()) meta.push(detail.listedBy.trim());
    meta.push(`${ctx.groups.length} families · ${detail.products.length} packs`);
    canvas.text(MARGIN, y, meta.join("  ·  "), { size: 8, color: C.muted });
    y -= 16;
    if (ctx.phone) {
      canvas.fill(0, y - 22, PAGE_W, 28, C.green);
      canvas.text(MARGIN, y - 12, ctx.phone, { font: "bold", size: 14, color: C.white });
      paintWhatsAppMark(canvas, PAGE_W - MARGIN - 212, y - 9, 11);
      canvas.text(PAGE_W - MARGIN - 196, y - 12, "WhatsApp or call with packs and quantities", {
        size: 8,
        color: C.greenInk,
      });
      y -= 32;
    }
    paintColumnHeads(canvas, y, ctx.includePrices);
  } else {
    const y = PAGE_H - 24;
    canvas.text(MARGIN, y, detail.name, { font: "bold", size: 11, color: C.brand });
    if (ctx.phone) {
      canvas.text(MARGIN + 200, y, ctx.phone, { font: "bold", size: 10, color: C.green });
    }
    paintColumnHeads(canvas, y - 16, ctx.includePrices);
  }
}

function paintColumnHeads(canvas: PdfCanvas, y: number, includePrices: boolean) {
  for (let col = 0; col < COLS; col += 1) {
    const x = colX(col);
    canvas.roundRect(x, y - 12, COL_W, 16, 2, C.brandDark);
    canvas.text(x + 8, y - 7, "ITEM", { font: "bold", size: 7.5, color: C.white });
    if (includePrices) {
      canvas.textRight(x + COL_W - 8, y - 7, "PRICE", { font: "bold", size: 7.5, color: C.white });
    }
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
  page: PageBuild,
  groups: CatalogProductGroup[],
  x: number,
  topY: number,
  currency: string,
  imageByFamily: Map<string, EmbeddedImage | null>,
  includePrices: boolean,
) {
  const canvas = page.canvas;
  let y = topY;
  let currentLetter = "";

  for (const group of groups) {
    const letter = letterOf(group.label);
    if (letter !== currentLetter) {
      canvas.circle(x + 6, y - 7, 6, C.brand);
      canvas.textCenter(x + 6, y - 10, letter, { font: "bold", size: 8, color: C.white });
      canvas.line(x + 16, y - 7, x + COL_W, y - 7, C.line, 0.3);
      y -= LETTER_H;
      currentLetter = letter;
    }

    const img = imageByFamily.get(group.id) ?? null;
    const listPacks = packsListedUnder(group);
    paintFamilyRow(
      page,
      group,
      img,
      x,
      y,
      listPacks || !includePrices ? null : pdfPrice(group.items[0], currency),
      listPacks ? true : group.items[0].available,
    );
    y -= FAMILY_H;
    if (listPacks) {
      for (const product of group.items) {
        paintPackRow(
          canvas,
          x,
          y,
          displayPackLabel(product, group.label),
          includePrices ? pdfPrice(product, currency) : "",
          product.available,
          includePrices,
        );
        y -= ROW_H;
      }
    }
    canvas.dashLine(x, y + 1, x + COL_W, y + 1, C.line);
    y -= FAMILY_GAP;
  }
}

function paintFamilyRow(
  page: PageBuild,
  group: CatalogProductGroup,
  image: EmbeddedImage | null,
  x: number,
  cursorY: number,
  price: string | null,
  available: boolean,
) {
  const canvas = page.canvas;
  const y = cursorY - FAMILY_H;
  paintThumb(page, image, group.id, group.label, x, y + (FAMILY_H - THUMB) / 2);
  const title = price ? singletonLabel(group) : group.label;
  const priceW = price ? textWidth(price, 8) : 0;
  canvas.text(
    x + THUMB + 4,
    y + 3.5,
    truncateToWidth(title, 8.5, COL_W - THUMB - 8 - priceW),
    { font: "bold", size: 8.5, color: C.brand },
  );
  if (price) {
    canvas.textRight(x + COL_W, y + 3.5, price, {
      font: "bold",
      size: 8,
      color: available ? C.ink : C.red,
    });
  }
}

function paintPackRow(
  canvas: PdfCanvas,
  x: number,
  cursorY: number,
  title: string,
  price: string,
  available: boolean,
  includePrices: boolean,
) {
  const y = cursorY - ROW_H;
  const priceW = includePrices ? textWidth(price, 8) : 0;
  const titleX = x + THUMB + 4;
  const label = truncateToWidth(title, 7.5, COL_W - THUMB - 14 - priceW);
  canvas.text(titleX, y + 2.4, label, { size: 7.5, color: C.ink });
  if (includePrices) {
    canvas.textRight(x + COL_W, y + 2.4, price, {
      font: "bold",
      size: 8,
      color: available ? C.ink : C.red,
    });
    const nameEnd = titleX + textWidth(label, 7.5);
    canvas.dashLine(nameEnd + 3, y + 4.2, x + COL_W - priceW - 4, y + 4.2);
  }
}

function paintThumb(
  page: PageBuild,
  image: EmbeddedImage | null,
  id: string,
  title: string,
  x: number,
  y: number,
) {
  const { canvas, images } = page;
  const size = THUMB;
  if (image) {
    const scale = Math.min(size / image.width, size / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const name = `Im${images.length + 1}`;
    canvas.roundRect(x, y, size, size, 1.5, C.paper);
    canvas.image(name, x + (size - w) / 2, y + (size - h) / 2, w, h);
    images.push(image);
  } else {
    const hue = hueFromId(id);
    canvas.roundRect(x, y, size, size, 1.5, hslToRgb(hue, 42, 86));
    canvas.textCenter(x + size / 2, y + size / 2 - 3, (title.trim()[0] ?? "?").toUpperCase(), {
      font: "bold",
      size: 7,
      color: hslToRgb(hue, 50, 28),
    });
  }
}

function paintFooter(
  canvas: PdfCanvas,
  ctx: {
    first: boolean;
    phone: string | null;
    footerLeft: string;
    date: string;
    page: number;
    of: number;
    footerH: number;
  },
) {
  if (ctx.first) {
    const badgeY = 50;
    paintTrustBadge(canvas, MARGIN + 10, badgeY, "leaf", "Fresh Produce");
    paintTrustBadge(canvas, MARGIN + 78, badgeY, "shield", "Quality Guaranteed");
    paintTrustBadge(canvas, MARGIN + 158, badgeY, "people", "Supporting Our Community");
    if (ctx.phone) {
      canvas.roundRect(PAGE_W - MARGIN - 248, 42, 248, 40, 6, C.green);
      paintWhatsAppMark(canvas, PAGE_W - MARGIN - 232, 62, 12);
      canvas.text(PAGE_W - MARGIN - 216, 66, "WhatsApp or call with packs and quantities", {
        size: 6.5,
        color: C.greenInk,
      });
      canvas.text(PAGE_W - MARGIN - 216, 52, ctx.phone, { font: "bold", size: 11, color: C.white });
    }
  }

  canvas.line(MARGIN, 28, PAGE_W - MARGIN, 28, C.line, 0.3);
  canvas.text(MARGIN, 18, ctx.footerLeft, { size: 8, color: C.muted });
  canvas.textRight(PAGE_W - MARGIN, 18, `${ctx.date}  ·  ${ctx.page} / ${ctx.of}`, {
    size: 8,
    color: C.muted,
  });
}

function paintBagMark(canvas: PdfCanvas, cx: number, cy: number) {
  canvas.roundRect(cx - 9, cy - 11, 18, 16, 2.5, C.brand);
  canvas.fill(cx - 7, cy + 2, 14, 2.2, C.white);
  canvas.roundRect(cx - 6, cy - 8, 12, 8, 1.2, C.white);
  canvas.circle(cx + 4, cy - 5, 2.2, C.green);
}

function paintWhatsAppMark(canvas: PdfCanvas, cx: number, cy: number, size: number) {
  canvas.circle(cx, cy, size / 2, C.white);
  canvas.circle(cx, cy, size / 2 - 1.4, C.green);
  canvas.roundRect(cx - size * 0.18, cy - size * 0.12, size * 0.36, size * 0.28, 1.2, C.white);
}

function paintTrustBadge(
  canvas: PdfCanvas,
  x: number,
  y: number,
  kind: "leaf" | "shield" | "people",
  label: string,
) {
  canvas.circle(x + 10, y + 14, 9, C.paper);
  canvas.circle(x + 10, y + 14, 8, C.greenInk);
  if (kind === "leaf") {
    canvas.circle(x + 10, y + 15, 3.2, C.brand);
    canvas.fill(x + 9.4, y + 10, 1.2, 5, C.brand);
  } else if (kind === "shield") {
    canvas.roundRect(x + 6.5, y + 11, 7, 8, 1.2, C.brand);
    canvas.fill(x + 9.2, y + 13, 1.6, 4, C.white);
  } else {
    canvas.circle(x + 7.5, y + 16, 1.8, C.brand);
    canvas.circle(x + 12.5, y + 16, 1.8, C.brand);
    canvas.circle(x + 10, y + 12.5, 2, C.brand);
  }
  const lines = wrapText(label, 5.5, 64, 2);
  let ty = y - 2;
  for (const line of lines) {
    canvas.textCenter(x + 10, ty, line, { size: 5.5, color: C.muted });
    ty -= 7;
  }
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
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    length += b.length;
  };
  const writeObject = (body: string) => {
    offsets.push(length);
    push(body);
  };

  const imageIdStart = 6 + pages.length * 2;
  const imageIds: number[][] = [];
  let nextImageId = imageIdStart;
  for (const page of pages) {
    const ids: number[] = [];
    page.images.forEach(() => {
      ids.push(nextImageId);
      nextImageId += 1;
    });
    imageIds.push(ids);
  }
  const totalObjects = imageIdStart + pages.reduce((n, p) => n + p.images.length, 0) - 1;

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
    const xObjects = imageIds[pageIndex].map((id, i) => `/Im${i + 1} ${id} 0 R`).join(" ");
    const resources = `/Font<< /F1 3 0 R /F2 4 0 R /F3 5 0 R >>${
      xObjects ? ` /XObject<< ${xObjects} >>` : ""
    }`;
    writeObject(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R /Resources<< ${resources} >> >>endobj\n`,
    );
    const streamBytes = latin1Encode(page.canvas.toStream());
    writeObject(`${contentId} 0 obj<< /Length ${streamBytes.length} >>stream\n`);
    pushBytes(streamBytes);
    push("\nendstream\nendobj\n");
  });

  pages.forEach((page, pageIndex) => {
    page.images.forEach((image, imageIndex) => {
      const id = imageIds[pageIndex][imageIndex];
      writeObject(
        `${id} 0 obj<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>stream\n`,
      );
      pushBytes(image.data);
      push("\nendstream\nendobj\n");
    });
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

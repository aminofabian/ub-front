/**
 * Supplier catalogue PDF (dependency-free A4).
 *
 * Cover is a directory: identity, WhatsApp, A–Z family index.
 * Following pages are a price list: letter, family, packs, prices in one
 * right-hand column. JPEG thumbs when they load; hue tiles otherwise.
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
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2; // 515
// PDF y grows upward; content flows from near the top (high y) down to this
// bottom limit (leaving room for the running footer).
const TOP_Y = 794;
const CONTENT_START_Y = 752;
const BOTTOM_LIMIT = 58;
const LETTER_H = 20;
const FAMILY_H = 20;
const ROW_H = 18;
const THUMB = 16;
const FAMILY_GAP = 4;

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

  strokeRect(x: number, y: number, w: number, h: number, color: Rgb = C.line, width = 0.5) {
    this.ops.push(
      `${width} w`,
      `${rgb(color)} RG`,
      `${round(x)} ${round(y)} ${round(w)} ${round(h)} re`,
      "S",
    );
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

  textCenter(x: number, y: number, text: string, opts: { font?: "regular" | "bold" | "mono"; size?: number; color?: Rgb } = {}) {
    const size = opts.size ?? 10;
    this.text(x - textWidth(text, size, opts.font === "mono") / 2, y, text, opts);
  }

  image(name: string, x: number, y: number, w: number, h: number) {
    this.ops.push("q", `${round(w)} 0 0 ${round(h)} ${round(x)} ${round(y)} cm`, `/${name} Do`, "Q");
  }

  dashLine(x1: number, y1: number, x2: number, y2: number, color: Rgb = C.line) {
    if (x2 - x1 < 10) return;
    this.ops.push(
      "[1.1 2.4] 0 d",
      "0.4 w",
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
  // Map common Unicode punctuation to WinAnsi (CP1252) codes, sanitize the
  // rest to "?", then escape PDF string specials. Streams are later encoded
  // as Latin-1 bytes so every char here must fit in one byte.
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code <= 0xff) {
      out += ch;
    } else {
      switch (ch) {
        case "’": out += String.fromCharCode(0x92); break; // right single quote
        case "‘": out += String.fromCharCode(0x91); break; // left single quote
        case "”": out += String.fromCharCode(0x94); break; // right double quote
        case "“": out += String.fromCharCode(0x93); break; // left double quote
        case "–": out += String.fromCharCode(0x96); break; // en dash
        case "—": out += String.fromCharCode(0x97); break; // em dash
        case "•": out += String.fromCharCode(0x95); break; // bullet
        case "…": out += String.fromCharCode(0x85); break; // ellipsis
        default: out += "?";
      }
    }
  }
  return out.replace(/\\/g, "\\\\").replace(/\(/g, "\\\(").replace(/\)/g, "\\\)");
}

/** Latin-1 byte encoding — every char ≤ 0xFF (see escapePdfText). */
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

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(0, max - 1))}…`;
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

/* ---------------------------------- images ---------------------------------- */

type EmbeddedImage = { data: Uint8Array; width: number; height: number };

/** Parse JPEG SOF markers for intrinsic dimensions (no decoder needed). */
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

/** Bounded-concurrency image loader; failures degrade to placeholder tiles. */
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
        /* ignore — tile fallback in the PDF */
      }
    }
  });
  await Promise.all(workers);
  return out;
}

/* ----------------------------------- pages ---------------------------------- */

type PageBuild = {
  canvas: PdfCanvas;
  images: { data: Uint8Array; width: number; height: number }[];
};

function startListPage(pages: PageBuild[], label: string): PageBuild {
  const canvas = new PdfCanvas();
  canvas.fill(0, 0, PAGE_W, PAGE_H, C.white);
  canvas.fill(0, PAGE_H - 8, PAGE_W, 8, C.brand);
  canvas.text(MARGIN, TOP_Y, truncate(label, 58), { font: "bold", size: 10, color: C.ink });
  canvas.textRight(PAGE_W - MARGIN, TOP_Y, "Price list", { size: 9, color: C.muted });
  canvas.line(MARGIN, TOP_Y - 10, PAGE_W - MARGIN, TOP_Y - 10);
  canvas.text(MARGIN, TOP_Y - 24, "Item", { size: 8, color: C.muted });
  canvas.textRight(PAGE_W - MARGIN, TOP_Y - 24, "Price", { font: "bold", size: 8, color: C.muted });
  canvas.line(MARGIN, TOP_Y - 30, PAGE_W - MARGIN, TOP_Y - 30, C.line, 0.35);
  const page = { canvas, images: [] as PageBuild["images"] };
  pages.push(page);
  return page;
}

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
  if (group.items.length !== 1) return true;
  const pack = catalogPackLabel(group.items[0], group.label);
  return normalizeCatalogLabel(pack) !== normalizeCatalogLabel(group.label);
}

function familyHeight(group: CatalogProductGroup, withLetter: boolean): number {
  const letter = withLetter ? LETTER_H : 0;
  const rows = packsListedUnder(group) ? group.items.length * ROW_H : 0;
  return letter + FAMILY_H + rows + FAMILY_GAP;
}

export type CataloguePdfInput = {
  detail: MarketplaceSupplierDetail;
  /** Absolute origin to print on the cover (for shared PDFs). */
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
  const images = await loadProductImages(
    products.map((p) => posTileThumbUrl(p.name, p.imageUrl)),
  );
  const imageById = new Map(
    products.map((product, index) => [product.id, images[index] ?? null]),
  );

  const pages: PageBuild[] = [];
  const cover = { canvas: new PdfCanvas(), images: [] as PageBuild["images"] };
  pages.push(cover);
  drawCover(cover.canvas, detail, { areaLabel, origin, groups });
  drawPriceList(pages, detail, { groups, currency, imageById });

  pages.forEach((page, index) => {
    if (index === 0) return;
    page.canvas.line(MARGIN, 44, PAGE_W - MARGIN, 44, C.line, 0.25);
    page.canvas.text(MARGIN, 34, `Catalogue · ${detail.name}`, {
      size: 8,
      color: C.muted,
    });
    page.canvas.textRight(
      PAGE_W - MARGIN,
      34,
      `Page ${index + 1} of ${pages.length}`,
      { size: 8, color: C.muted },
    );
  });

  return assemblePdf(pages);
}

/* ---------------------------------- cover ---------------------------------- */

function drawCover(
  canvas: PdfCanvas,
  detail: MarketplaceSupplierDetail,
  ctx: {
    areaLabel: string;
    origin?: string;
    groups: CatalogProductGroup[];
  },
) {
  canvas.fill(0, 0, PAGE_W, PAGE_H, C.white);
  canvas.fill(0, PAGE_H - 10, PAGE_W, 10, C.brand);

  let y = 800;
  for (const line of wrapText(detail.name, 26, CONTENT_W, 2)) {
    canvas.text(MARGIN, y, line, { font: "bold", size: 26, color: C.ink });
    y -= 32;
  }

  const meta: string[] = [];
  if (ctx.areaLabel) meta.push(ctx.areaLabel);
  if (detail.listedBy?.trim()) meta.push(`Listed by ${detail.listedBy.trim()}`);
  if (meta.length) {
    canvas.text(MARGIN, y, truncate(meta.join("  ·  "), 92), { size: 11, color: C.muted });
    y -= 22;
  }

  const phone = detail.contactPhone?.trim() || null;
  if (phone) {
    canvas.fill(0, y - 50, PAGE_W, 50, C.green);
    canvas.text(MARGIN, y - 30, phone, { font: "bold", size: 18, color: C.white });
    canvas.textRight(
      PAGE_W - MARGIN,
      y - 30,
      `${ctx.groups.length} families  ·  ${detail.products.length} packs`,
      { size: 9, color: C.greenInk },
    );
    y -= 66;
  } else {
    canvas.text(
      MARGIN,
      y,
      `${ctx.groups.length} families  ·  ${detail.products.length} packs`,
      { size: 11, color: C.muted },
    );
    y -= 22;
  }

  canvas.text(
    MARGIN,
    y,
    "Call or WhatsApp this number with the packs and quantities you need.",
    { size: 9.5, color: C.muted },
  );
  y -= 28;

  canvas.line(MARGIN, y, PAGE_W - MARGIN, y, C.line, 0.4);
  y -= 18;

  drawCoverIndex(canvas, ctx.groups, y);

  const footer = `Kiosk.ke${ctx.origin ? ` · ${ctx.origin.replace(/^https?:\/\//, "")}` : ""}`;
  const date = new Date().toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  canvas.line(MARGIN, 44, PAGE_W - MARGIN, 44);
  canvas.text(MARGIN, 34, footer, { size: 8.5, color: C.muted });
  canvas.textRight(PAGE_W - MARGIN, 34, date, { size: 8.5, color: C.muted });
}

function drawCoverIndex(canvas: PdfCanvas, groups: CatalogProductGroup[], topY: number) {
  const cols = 3;
  const colGap = 14;
  const colW = (CONTENT_W - colGap * (cols - 1)) / cols;
  const bottom = 58;
  const lineH = 12;
  const letterH = 16;

  type Line = { kind: "letter" | "family"; text: string; extra?: string };
  const lines: Line[] = [];
  let prev = "";
  for (const group of groups) {
    const letter = letterOf(group.label);
    if (letter !== prev) {
      lines.push({ kind: "letter", text: letter });
      prev = letter;
    }
    lines.push({
      kind: "family",
      text: group.label,
      extra: String(group.items.length),
    });
  }

  const perCol = Math.ceil(lines.length / cols);
  for (let c = 0; c < cols; c += 1) {
    const slice = lines.slice(c * perCol, (c + 1) * perCol);
    const x = MARGIN + c * (colW + colGap);
    let y = topY;
    for (const line of slice) {
      if (y - lineH < bottom) break;
      if (line.kind === "letter") {
        canvas.text(x, y, line.text, { font: "bold", size: 11, color: C.brand });
        y -= letterH;
      } else {
        canvas.text(x, y, truncate(line.text, 28), { size: 8.5, color: C.ink });
        canvas.textRight(x + colW, y, line.extra ?? "", {
          font: "mono",
          size: 8,
          color: C.ink,
        });
        y -= lineH;
      }
    }
  }
}

/* ---------------------------------- price list ---------------------------------- */

function drawPriceList(
  pages: PageBuild[],
  detail: MarketplaceSupplierDetail,
  ctx: {
    groups: CatalogProductGroup[];
    currency: string;
    imageById: Map<string, EmbeddedImage | null>;
  },
) {
  if (ctx.groups.length === 0) {
    const page = startListPage(pages, detail.name);
    page.canvas.text(
      MARGIN,
      CONTENT_START_Y - 24,
      "No products are linked to this catalogue yet.",
      { size: 11, color: C.muted },
    );
    return;
  }

  let page = startListPage(pages, detail.name);
  let cursorY = CONTENT_START_Y;
  let currentLetter = "";

  const newPage = () => {
    page = startListPage(pages, detail.name);
    cursorY = CONTENT_START_Y;
    currentLetter = "";
  };

  const familyImage = (group: CatalogProductGroup): EmbeddedImage | null => {
    for (const item of group.items) {
      const img = ctx.imageById.get(item.id);
      if (img) return img;
    }
    return null;
  };

  for (const group of ctx.groups) {
    const letter = letterOf(group.label);
    const withLetter = letter !== currentLetter;
    const height = familyHeight(group, withLetter);
    if (cursorY - height < BOTTOM_LIMIT) newPage();

    if (letter !== currentLetter) {
      paintLetter(page.canvas, letter, cursorY);
      cursorY -= LETTER_H;
      currentLetter = letter;
    }

    const img = familyImage(group);
    const listPacks = packsListedUnder(group);
    paintFamilyBand(
      page,
      group,
      img,
      cursorY,
      listPacks ? null : pdfPrice(group.items[0], ctx.currency),
    );
    cursorY -= FAMILY_H;
    if (listPacks) {
      group.items.forEach((product, index) => {
        paintPackRow(page.canvas, product, group.label, ctx.currency, cursorY, index);
        cursorY -= ROW_H;
      });
    }
    cursorY -= FAMILY_GAP;
  }
}

function paintLetter(canvas: PdfCanvas, letter: string, cursorY: number) {
  canvas.text(MARGIN, cursorY - 16, letter, { font: "bold", size: 13, color: C.brand });
  canvas.line(MARGIN + 18, cursorY - 12, PAGE_W - MARGIN, cursorY - 12, C.line, 0.35);
}

function paintFamilyBand(
  page: PageBuild,
  group: CatalogProductGroup,
  image: EmbeddedImage | null,
  cursorY: number,
  price: string | null,
) {
  const y = cursorY - FAMILY_H;
  const canvas = page.canvas;
  canvas.fill(MARGIN, y, CONTENT_W, FAMILY_H, C.brandDark);
  const thumbSize = THUMB;
  paintThumb(
    page,
    image,
    group.items[0]?.id ?? group.id,
    group.label,
    MARGIN + 4,
    y + (FAMILY_H - thumbSize) / 2,
    thumbSize,
  );
  canvas.text(MARGIN + 26, y + 6, truncate(group.label.toUpperCase(), 44), {
    font: "bold",
    size: 8.5,
    color: C.white,
  });
  canvas.textRight(PAGE_W - MARGIN - 8, y + 6, price ?? `${group.items.length}`, {
    font: price ? "mono" : "regular",
    size: price ? 9 : 8,
    color: C.white,
  });
}

function paintPackRow(
  canvas: PdfCanvas,
  product: MarketplaceCatalogProductPreview,
  familyLabel: string,
  currency: string,
  cursorY: number,
  index: number,
) {
  const y = cursorY - ROW_H;
  if (index % 2 === 0) {
    canvas.fill(MARGIN, y, CONTENT_W, ROW_H, C.paper);
  }
  const title = truncate(catalogPackLabel(product, familyLabel), 52);
  const titleX = MARGIN + 12;
  const price = pdfPrice(product, currency);
  const priceW = textWidth(price, 9.5, true);
  canvas.text(titleX, y + 6, title, { size: 9, color: C.ink });
  canvas.textRight(PAGE_W - MARGIN, y + 6, price, {
    font: "mono",
    size: 9.5,
    color: product.available ? C.ink : C.red,
  });
  const nameEnd = titleX + textWidth(title, 9);
  canvas.dashLine(nameEnd + 6, y + 8, PAGE_W - MARGIN - priceW - 8, y + 8);
}

function paintThumb(
  page: PageBuild,
  image: EmbeddedImage | null,
  id: string,
  title: string,
  x: number,
  y: number,
  size: number,
) {
  const { canvas, images } = page;
  if (image) {
    const scale = Math.min(size / image.width, size / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const name = `Im${images.length + 1}`;
    canvas.image(name, x + (size - w) / 2, y + (size - h) / 2, w, h);
    images.push(image);
  } else {
    const hue = hueFromId(id);
    const [tileR, tileG, tileB] = hslToRgb(hue, 42, 86);
    const [inkR, inkG, inkB] = hslToRgb(hue, 50, 32);
    canvas.fill(x, y, size, size, [tileR, tileG, tileB]);
    canvas.textCenter(x + size / 2, y + size / 2 - 3, (title.trim()[0] ?? "?").toUpperCase(), {
      font: "bold",
      size: Math.max(8, size * 0.55),
      color: [inkR, inkG, inkB],
    });
  }
  canvas.strokeRect(x, y, size, size, C.line, 0.4);
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

  // Object id layout: 1 catalog, 2 pages, 3-5 fonts, then per page (page, content), then images.
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
    const xObjects = imageIds[pageIndex]
      .map((id, i) => `/Im${i + 1} ${id} 0 R`)
      .join(" ");
    const resources = `/Font<< /F1 3 0 R /F2 4 0 R /F3 5 0 R >>${
      xObjects ? ` /XObject<< ${xObjects} >>` : ""
    }`;
    writeObject(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R /Resources<< ${resources} >> >>endobj\n`,
    );
    const stream = page.canvas.toStream();
    const streamBytes = latin1Encode(stream);
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

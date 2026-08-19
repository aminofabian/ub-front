/**
 * Well-styled supplier catalogue PDF (dependency-free).
 *
 * Builds a multi-page A4 brochure client-side:
 *   - cover page with brand band, supplier identity, stats, WhatsApp strip,
 *     and a short "how to order" guide
 *   - product grid pages grouped by parent/category, embedding product photos
 *     (JPEG only, fetched at runtime with graceful fallback to hue tiles)
 *
 * Mirrors the hand-rolled PDF approach of marketplace-order-pdf.ts.
 */
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
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
const CONTENT_START_Y = 760;
const BOTTOM_LIMIT = 100;
const CARD_W = (CONTENT_W - 12) / 2; // 251.5
const CARD_H = 84;
const IMG_SIZE = 58;

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

function startProductPage(pages: PageBuild[], label: string, pageNo: number): PageBuild {
  const canvas = new PdfCanvas();
  canvas.fill(0, PAGE_H - 8, PAGE_W, 8, C.brand);
  canvas.text(MARGIN, TOP_Y, truncate(label, 74), { font: "bold", size: 10, color: C.ink });
  canvas.textRight(PAGE_W - MARGIN, TOP_Y, `Catalogue · ${pageNo}`, { size: 9, color: C.muted });
  canvas.line(MARGIN, TOP_Y - 10, PAGE_W - MARGIN, TOP_Y - 10);
  const page = { canvas, images: [] };
  pages.push(page);
  return page;
}

type Group = { label: string; items: MarketplaceCatalogProductPreview[] };

function groupProducts(products: MarketplaceCatalogProductPreview[]): Group[] {
  const groups = new Map<string, MarketplaceCatalogProductPreview[]>();
  for (const p of products) {
    const parent = p.parentItemName?.trim();
    const byName = p.name.includes(" · ") ? p.name.split(" · ")[0].trim() : "";
    const raw = parent || byName || p.categoryName?.trim();
    const label = raw || "Products";
    const arr = groups.get(label) ?? [];
    arr.push(p);
    groups.set(label, arr);
  }
  return [...groups.entries()]
    .map(([label, items]) => ({ label, items }))
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
}

function packLabel(product: MarketplaceCatalogProductPreview): string | null {
  const bits: string[] = [];
  if (product.packSize != null && product.packUnit?.trim()) {
    bits.push(`pack of ${product.packSize} ${product.packUnit}`);
  } else if (product.packSize != null) {
    bits.push(`pack of ${product.packSize}`);
  } else if (product.packUnit?.trim()) {
    bits.push(`${product.packUnit}`);
  }
  if (product.minOrderQty != null && product.minOrderQty > 1) {
    bits.push(`min order ${product.minOrderQty}`);
  }
  return bits.length ? bits.join(" · ") : null;
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
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join(" · ");

  const images = await loadProductImages(
    products.map((p) => posTileThumbUrl(p.name, p.imageUrl)),
  );

  const pages: PageBuild[] = [];
  const cover = { canvas: new PdfCanvas(), images: [] as PageBuild["images"] };
  pages.push(cover);
  drawCover(cover.canvas, detail, { currency, areaLabel, origin, productCount: products.length });
  drawProductPages(pages, detail, { products, currency, images });

  // Running footers (page numbers need the final count).
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
  ctx: { currency: string; areaLabel: string; origin?: string; productCount: number },
) {
  // Top brand band
  canvas.fill(0, PAGE_H - 14, PAGE_W, 14, C.brand);

  let y = 806;
  canvas.text(MARGIN, y, "SUPPLIER CATALOGUE", { font: "bold", size: 10, color: C.brand });
  y -= 36;

  for (const line of wrapText(detail.name, 30, CONTENT_W, 2)) {
    canvas.text(MARGIN, y, line, { font: "bold", size: 30, color: C.ink });
    y -= 37;
  }
  y -= 6;

  if (ctx.areaLabel) {
    canvas.text(MARGIN, y, ctx.areaLabel, { size: 12, color: C.muted });
    y -= 24;
  }
  if (detail.description) {
    for (const line of wrapText(detail.description, 10.5, CONTENT_W, 3)) {
      canvas.text(MARGIN, y, line, { size: 10.5, color: C.muted });
      y -= 15;
    }
  }

  // Stats strip
  const priced = detail.products.filter((p) => p.unitPrice != null);
  const prices = priced.map((p) => p.unitPrice as number);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const priceRange =
    minPrice != null && maxPrice != null
      ? minPrice === maxPrice
        ? formatMoney(minPrice, ctx.currency)
        : `${formatMoney(minPrice, ctx.currency)} – ${formatMoney(maxPrice, ctx.currency)}`
      : null;
  const categoryCount = new Set(
    detail.products.map((p) => p.categoryName?.trim()).filter(Boolean),
  ).size;

  const boxW = (CONTENT_W - 24) / 3;
  const boxH = 64;
  const boxTop = 520;
  const stats: { value: string; label: string }[] = [
    { value: String(ctx.productCount), label: "Products" },
    { value: String(categoryCount), label: "Categories" },
    { value: priceRange ?? "Ask", label: priceRange ? "Price range" : "Price" },
  ];
  stats.forEach((stat, i) => {
    const x = MARGIN + i * (boxW + 12);
    canvas.fill(x, boxTop - boxH, boxW, boxH, C.paper);
    canvas.strokeRect(x, boxTop - boxH, boxW, boxH, C.line, 0.5);
    canvas.text(x + 10, boxTop - 40, stat.value, { font: "bold", size: 16, color: C.ink });
    canvas.text(x + 10, boxTop - 24, stat.label.toUpperCase(), { size: 7.5, color: C.muted });
  });

  // WhatsApp / contact strip
  const phone = detail.contactPhone?.trim() || null;
  const bandTop = boxTop - boxH - 34;
  if (phone) {
    canvas.fill(0, bandTop - 62, PAGE_W, 62, C.green);
    canvas.text(MARGIN, bandTop - 22, "ORDER BY WHATSAPP OR CALL", {
      font: "bold",
      size: 9,
      color: C.greenInk,
    });
    canvas.text(MARGIN, bandTop - 44, phone, {
      font: "bold",
      size: 17,
      color: C.white,
    });
    if (detail.listedBy) {
      canvas.textRight(PAGE_W - MARGIN, bandTop - 44, `Listed by ${detail.listedBy}`, {
        size: 9,
        color: C.greenInk,
      });
    }
  } else {
    canvas.fill(MARGIN, bandTop - 62, CONTENT_W, 62, C.paper);
    canvas.strokeRect(MARGIN, bandTop - 62, CONTENT_W, 62, C.line, 0.5);
    canvas.text(MARGIN + 10, bandTop - 24, "ORDER", { font: "bold", size: 9, color: C.muted });
    canvas.text(
      MARGIN + 10,
      bandTop - 44,
      detail.listedBy ? `Listed by ${detail.listedBy}` : "Contact the supplier on the page",
      { size: 11, color: C.ink },
    );
  }

  // How to order
  const stepsY = bandTop - 88;
  canvas.text(MARGIN, stepsY, "HOW TO ORDER", { font: "bold", size: 10, color: C.brand });
  const steps = [
    "1.  Browse the shelf and tap products to build your list",
    "2.  Send the list to the supplier on WhatsApp",
    "3.  Confirm availability, delivery and payment",
  ];
  steps.forEach((step, i) => {
    canvas.text(MARGIN, stepsY - 20 - i * 15, step, { size: 9.5, color: C.muted });
  });

  // Cover footer
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

/* ---------------------------------- products ---------------------------------- */

function drawProductPages(
  pages: PageBuild[],
  detail: MarketplaceSupplierDetail,
  ctx: { products: MarketplaceCatalogProductPreview[]; currency: string; images: (EmbeddedImage | null)[] },
) {
  const groups = groupProducts(ctx.products);
  if (groups.length === 0) {
    const page = startProductPage(pages, detail.name, 2);
    page.canvas.text(
      MARGIN,
      100,
      "No products are linked to this catalogue yet.",
      { size: 11, color: C.muted },
    );
    return;
  }

  let page = startProductPage(pages, detail.name, 2);
  let cursorY = CONTENT_START_Y;

  const newPage = () => {
    page = startProductPage(pages, detail.name, pages.length + 1);
    cursorY = CONTENT_START_Y;
  };
  const ensure = (h: number) => {
    if (cursorY - h < BOTTOM_LIMIT) newPage();
  };

  let col = 0;
  let rowY = 0;
  for (const group of groups) {
    // Keep the section band with at least one card row beneath it.
    ensure(26 + CARD_H + 10);
    page.canvas.fill(MARGIN, cursorY - 20, CONTENT_W, 20, C.brandDark);
    page.canvas.text(MARGIN + 8, cursorY - 7, truncate(group.label.toUpperCase(), 46), {
      font: "bold",
      size: 9,
      color: C.white,
    });
    page.canvas.textRight(
      PAGE_W - MARGIN - 8,
      cursorY - 7,
      `${group.items.length} item${group.items.length === 1 ? "" : "s"}`,
      { size: 8.5, color: C.white },
    );
    cursorY -= 26;

    col = 0;
    for (const product of group.items) {
      if (col === 0) {
        ensure(CARD_H);
        rowY = cursorY - CARD_H;
      }
      const index = ctx.products.indexOf(product);
      drawProductCard(
        page,
        product,
        ctx.images[index] ?? null,
        ctx.currency,
        MARGIN + col * (CARD_W + 12),
        rowY,
        page.images.length + 1,
      );
      col += 1;
      if (col === 2) {
        col = 0;
        cursorY = rowY - 10;
      }
    }
  }
}

function drawProductCard(
  page: PageBuild,
  product: MarketplaceCatalogProductPreview,
  image: EmbeddedImage | null,
  currency: string,
  x: number,
  y: number,
  imageNo: number,
) {
  const { canvas, images } = page;

  // Image or hue-tile placeholder
  if (image) {
    const scale = Math.min(IMG_SIZE / image.width, IMG_SIZE / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    canvas.image(`Im${imageNo}`, x + 6 + (IMG_SIZE - w) / 2, y + 6 + (IMG_SIZE - h) / 2, w, h);
    images.push(image);
  } else {
    const hue = hueFromId(product.id);
    const [tileR, tileG, tileB] = hslToRgb(hue, 62, 82);
    const [inkR, inkG, inkB] = hslToRgb(hue, 55, 34);
    canvas.fill(x + 6, y + 6, IMG_SIZE, IMG_SIZE, [tileR, tileG, tileB]);
    canvas.text(x + 6 + IMG_SIZE / 2, y + 6 + IMG_SIZE / 2 + 9, (product.name.trim()[0] ?? "?").toUpperCase(), {
      font: "bold",
      size: 26,
      color: [inkR, inkG, inkB],
    });
  }
  canvas.strokeRect(x + 6, y + 6, IMG_SIZE, IMG_SIZE, C.line, 0.5);

  // Name (2 lines) then price
  const textX = x + 72;
  const textW = CARD_W - 80;
  const nameLines = wrapText(product.name, 9, textW, 2);
  nameLines.forEach((line, i) => {
    canvas.text(textX, y + 8 + i * 11, line, { font: "bold", size: 9, color: C.ink });
  });
  const priceY = y + 8 + nameLines.length * 11 + 2;
  if (product.unitPrice != null) {
    canvas.text(textX, priceY, formatMoney(product.unitPrice, product.currency ?? currency), {
      font: "bold",
      size: 10.5,
      color: C.ink,
    });
  } else {
    canvas.text(textX, priceY, "Ask for price", { size: 9, color: C.muted });
  }

  if (!product.available) {
    canvas.text(textX, y + 62, "Unavailable", { font: "bold", size: 8, color: C.red });
  } else {
    const meta: string[] = [];
    if (product.sku) meta.push(product.sku);
    const pack = packLabel(product);
    if (pack) meta.push(pack);
    if (product.categoryName) meta.push(product.categoryName);
    const metaLine = truncate(meta.join(" · "), 40);
    canvas.text(textX, y + 62, metaLine, { font: "mono", size: 7, color: C.muted });
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

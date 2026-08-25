/**
 * Supplier catalogue PDF — chalkboard stall sheet.
 *
 * Matches the mini-mart HTML template: chalk-green banner, torn paper,
 * family sections, cream cards, mango price tags. No product photos.
 */
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import {
  catalogPackLabel,
  groupCatalogProducts,
  normalizeCatalogLabel,
} from "@/lib/marketplace-catalog-groups";

type Rgb = readonly [number, number, number];

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 28;
const CONTENT_W = PAGE_W - MARGIN * 2;
const COLS = 3;
const CARD_GAP = 10;
const CARD_W = (CONTENT_W - CARD_GAP * (COLS - 1)) / COLS;
const CARD_H = 78;
const CAT_H = 22;
const BANNER_H = 92;
const TORN_H = 14;
const FOOTER_H = 48;

const C = {
  chalk: [0.122, 0.239, 0.169] as Rgb,
  chalkDark: [0.086, 0.188, 0.122] as Rgb,
  paper: [0.91, 0.863, 0.765] as Rgb,
  cream: [0.965, 0.945, 0.894] as Rgb,
  mango: [0.91, 0.569, 0.176] as Rgb,
  mangoDark: [0.788, 0.463, 0.102] as Rgb,
  tomato: [0.757, 0.267, 0.176] as Rgb,
  ink: [0.169, 0.149, 0.125] as Rgb,
  inkSoft: [0.353, 0.31, 0.259] as Rgb,
  white: [0.965, 0.945, 0.894] as Rgb,
  shadow: [0.75, 0.69, 0.58] as Rgb,
};

type FontKind = "regular" | "bold" | "mono" | "serif";

class PdfCanvas {
  private ops: string[] = [];

  fill(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${rgb(color)} rg`, `${round(x)} ${round(y)} ${round(w)} ${round(h)} re`, "f");
  }

  dashLine(x1: number, y1: number, x2: number, y2: number, color: Rgb) {
    if (x2 - x1 < 6) return;
    this.ops.push(
      "[1.2 2] 0 d",
      "0.7 w",
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

  circle(cx: number, cy: number, r: number, color: Rgb) {
    const k = r * 0.5522847498;
    this.ops.push(
      `${rgb(color)} rg`,
      `${round(cx - r)} ${round(cy)} m`,
      `${round(cx - r)} ${round(cy + k)} ${round(cx - k)} ${round(cy + r)} ${round(cx)} ${round(cy + r)} c`,
      `${round(cx + k)} ${round(cy + r)} ${round(cx + r)} ${round(cy + k)} ${round(cx + r)} ${round(cy)} c`,
      `${round(cx + r)} ${round(cy - k)} ${round(cx + k)} ${round(cy - r)} ${round(cx)} ${round(cy - r)} c`,
      `${round(cx - k)} ${round(cy - r)} ${round(cx - r)} ${round(cy - k)} ${round(cx - r)} ${round(cy)} c`,
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

  textCenter(x: number, y: number, text: string, opts: { font?: FontKind; size?: number; color?: Rgb } = {}) {
    const size = opts.size ?? 10;
    this.text(x - textWidth(text, size, opts.font === "mono") / 2, y, text, opts);
  }

  pathFill(ops: string[], color: Rgb) {
    this.ops.push(`${rgb(color)} rg`, ...ops, "f");
  }

  toStream(): string {
    return this.ops.join("\n");
  }
}

type Card = {
  family: string;
  name: string;
  unit: string;
  price: string;
  flag: string | null;
};

type PageBlock =
  | { kind: "cat"; label: string }
  | { kind: "row"; cards: Card[] };

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
    if (code <= 0xff) out += ch;
    else out += "?";
  }
  return out.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function latin1Encode(s: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
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
    else w += 0.55;
  }
  return w * size;
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
  const whole = Number.isInteger(n) ? String(n) : n.toFixed(0);
  if (code === "KES" || !code) return `KSh ${whole}`;
  return `${code} ${whole}`;
}

function toCards(
  products: MarketplaceCatalogProductPreview[],
  currency: string,
): { family: string; cards: Card[] }[] {
  return groupCatalogProducts(products).map((group) => ({
    family: group.label,
    cards: group.items.map((product) => {
      const pack = catalogPackLabel(product, group.label);
      const unit =
        normalizeCatalogLabel(pack) === normalizeCatalogLabel(group.label) ? "" : pack;
      return {
        family: group.label,
        name: group.items.length === 1 ? group.label : pack,
        unit: group.items.length === 1 ? unit : group.label,
        price: pdfPrice(product, currency),
        flag: product.available === false ? "ASK" : null,
      };
    }),
  }));
}

function packPages(sections: { family: string; cards: Card[] }[]): PageBlock[][] {
  const firstBody = PAGE_H - BANNER_H - TORN_H - FOOTER_H - 18;
  const contBody = PAGE_H - 36 - FOOTER_H - 18;
  const pages: PageBlock[][] = [];
  let page: PageBlock[] = [];
  let used = 0;
  let budget = firstBody;

  const flush = () => {
    if (page.length) pages.push(page);
    page = [];
    used = 0;
    budget = contBody;
  };

  for (const section of sections) {
    const rows: Card[][] = [];
    for (let i = 0; i < section.cards.length; i += COLS) {
      rows.push(section.cards.slice(i, i + COLS));
    }
    const needHead = CAT_H;
    if (used + needHead + CARD_H + 8 > budget && used > 0) flush();
    page.push({ kind: "cat", label: section.family });
    used += needHead;
    for (const row of rows) {
      if (used + CARD_H + 8 > budget) {
        flush();
        page.push({ kind: "cat", label: `${section.family}  ·  cont.` });
        used += CAT_H;
      }
      page.push({ kind: "row", cards: row });
      used += CARD_H + 8;
    }
  }
  flush();
  return pages.length ? pages : [[]];
}

function paintBanner(
  canvas: PdfCanvas,
  detail: MarketplaceSupplierDetail,
  areaLabel: string,
  phone: string | null,
) {
  canvas.fill(0, PAGE_H - BANNER_H, PAGE_W, BANNER_H, C.chalk);
  canvas.fill(10, PAGE_H - BANNER_H + 8, PAGE_W - 20, BANNER_H - 16, C.chalkDark);
  canvas.fill(12, PAGE_H - BANNER_H + 10, PAGE_W - 24, BANNER_H - 20, C.chalk);
  canvas.textCenter(PAGE_W / 2, PAGE_H - 22, "FRESH  ·  LOCAL  ·  EVERYDAY PRICES", {
    font: "bold",
    size: 7,
    color: C.mango,
  });
  const name = truncateToWidth(detail.name || "Wholesale stall", 22, CONTENT_W - 20);
  canvas.textCenter(PAGE_W / 2, PAGE_H - 48, name, {
    font: "serif",
    size: 22,
    color: C.white,
  });
  const tagline = truncateToWidth(
    detail.description?.trim() || "Wholesale packs for shops — tap, list, restock.",
    8,
    CONTENT_W - 40,
  );
  canvas.textCenter(PAGE_W / 2, PAGE_H - 66, tagline, {
    font: "regular",
    size: 8,
    color: C.white,
  });
  const meta = [areaLabel, phone].filter(Boolean).join("    ·    ");
  if (meta) {
    canvas.textCenter(PAGE_W / 2, PAGE_H - 82, truncateToWidth(meta, 8, CONTENT_W - 20), {
      font: "mono",
      size: 8,
      color: C.mango,
    });
  }
}

function paintTorn(canvas: PdfCanvas, yTop: number) {
  const pts: string[] = [`0 ${round(yTop)} m`];
  let x = 0;
  let up = true;
  while (x < PAGE_W) {
    x += 18;
    const y = yTop - (up ? 10 : 3);
    pts.push(`${round(Math.min(x, PAGE_W))} ${round(y)} l`);
    up = !up;
  }
  pts.push(`${PAGE_W} ${round(yTop - TORN_H)} l`, `0 ${round(yTop - TORN_H)} l`);
  canvas.pathFill(pts, C.paper);
}

function paintCard(canvas: PdfCanvas, x: number, y: number, card: Card, tilt: number) {
  canvas.roundRect(x + 1.5, y - 2, CARD_W, CARD_H, 5, C.shadow);
  canvas.roundRect(x, y, CARD_W, CARD_H, 5, C.cream);
  if (card.flag) {
    canvas.roundRect(x - 4, y + CARD_H - 14, 28, 12, 2, C.tomato);
    canvas.text(x - 1, y + CARD_H - 11, card.flag, { font: "mono", size: 6, color: C.white });
  }
  canvas.textCenter(x + CARD_W / 2, y + CARD_H - 28, truncateToWidth(card.name, 9, CARD_W - 16), {
    font: "bold",
    size: 9,
    color: C.ink,
  });
  if (card.unit) {
    canvas.textCenter(x + CARD_W / 2, y + CARD_H - 40, truncateToWidth(card.unit, 7, CARD_W - 18), {
      font: "regular",
      size: 7,
      color: C.inkSoft,
    });
  }
  const tagW = Math.min(CARD_W - 18, Math.max(46, textWidth(card.price, 8, true) + 18));
  const tagX = x + CARD_W - tagW - 8 + tilt;
  const tagY = y - 4;
  canvas.roundRect(tagX, tagY, tagW, 16, 3, C.mangoDark);
  canvas.roundRect(tagX, tagY + 1.2, tagW, 14.5, 3, C.mango);
  canvas.circle(tagX + 6, tagY + 8.5, 2.2, C.cream);
  canvas.text(tagX + 12, tagY + 5, card.price, { font: "mono", size: 8, color: C.white });
}

function paintFooter(canvas: PdfCanvas, name: string, page: number, pages: number) {
  canvas.fill(0, 0, PAGE_W, FOOTER_H, C.chalk);
  canvas.textCenter(PAGE_W / 2, 30, truncateToWidth(name, 11, CONTENT_W), {
    font: "serif",
    size: 11,
    color: C.white,
  });
  canvas.textCenter(PAGE_W / 2, 16, "Prices per pack unless stated. Stock subject to availability.", {
    font: "regular",
    size: 7,
    color: C.white,
  });
  canvas.textCenter(PAGE_W / 2, 6, `kiosk.ke  ·  ${page} / ${pages}`, {
    font: "mono",
    size: 7,
    color: C.mango,
  });
}

export type CatalogueChalkPdfInput = {
  detail: MarketplaceSupplierDetail;
  origin?: string;
  includePrices?: boolean;
};

export async function buildMarketplaceCatalogueChalkPdf({
  detail,
  includePrices = true,
}: CatalogueChalkPdfInput): Promise<Blob> {
  const products = detail.products;
  const currency = products.find((p) => p.currency)?.currency ?? "KES";
  const areaLabel = [detail.location, ...detail.locations]
    .map((l) => l?.trim())
    .filter((l): l is string => Boolean(l))
    .filter((l) => !/^(optional|n\/a|na|none|-)$/i.test(l))
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join(" · ");
  const phone = detail.contactPhone?.trim() ? formatPhone(detail.contactPhone) : null;
  const sections = toCards(products, currency).map((section) => ({
    ...section,
    cards: section.cards.map((card) => ({
      ...card,
      price: includePrices ? card.price : "—",
    })),
  }));
  const packed = packPages(sections);
  const pages = packed.map((blocks, index) => {
    const canvas = new PdfCanvas();
    canvas.fill(0, 0, PAGE_W, PAGE_H, C.paper);
    const first = index === 0;
    if (first) {
      paintBanner(canvas, detail, areaLabel, phone);
      paintTorn(canvas, PAGE_H - BANNER_H);
    }
    let y = first ? PAGE_H - BANNER_H - TORN_H - 8 : PAGE_H - 28;
    for (const block of blocks) {
      if (block.kind === "cat") {
        canvas.text(MARGIN, y - 14, truncateToWidth(block.label, 12, CONTENT_W - 40), {
          font: "serif",
          size: 12,
          color: C.chalk,
        });
        const labelW = Math.min(CONTENT_W - 24, textWidth(block.label, 12) + 10);
        canvas.dashLine(MARGIN + labelW, y - 10, MARGIN + CONTENT_W, y - 10, C.inkSoft);
        y -= CAT_H;
      } else {
        block.cards.forEach((card, i) => {
          const x = MARGIN + i * (CARD_W + CARD_GAP);
          paintCard(canvas, x, y - CARD_H, card, i % 2 === 0 ? 1 : -1);
        });
        y -= CARD_H + 8;
      }
    }
    paintFooter(canvas, detail.name, index + 1, packed.length);
    return canvas;
  });

  return assemblePdf(pages);
}

function assemblePdf(pages: PdfCanvas[]): Blob {
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
  pages.forEach((canvas, pageIndex) => {
    const pageId = 7 + pageIndex * 2;
    const contentId = pageId + 1;
    writeObject(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R /Resources<< /Font<< /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> >>endobj\n`,
    );
    const streamBytes = latin1Encode(canvas.toStream());
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

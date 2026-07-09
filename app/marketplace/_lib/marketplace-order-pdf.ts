import { formatMoney } from "@/lib/utils";

export type MarketplaceOrderLine = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  qty: number;
  unitPrice?: number | null;
  currency?: string | null;
};

export type MarketplaceOrderPdfInput = {
  supplierName: string;
  supplierPhone?: string | null;
  location?: string | null;
  listedBy?: string | null;
  lines: MarketplaceOrderLine[];
  note?: string;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2;

type Rgb = readonly [number, number, number];

const C = {
  brand: [0.04, 0.38, 0.35] as Rgb,
  brandDeep: [0.03, 0.28, 0.26] as Rgb,
  brandLight: [0.93, 0.98, 0.97] as Rgb,
  accent: [0.13, 0.55, 0.52] as Rgb,
  ink: [0.06, 0.09, 0.16] as Rgb,
  muted: [0.39, 0.45, 0.55] as Rgb,
  border: [0.86, 0.89, 0.93] as Rgb,
  zebra: [0.975, 0.98, 0.99] as Rgb,
  white: [1, 1, 1] as Rgb,
  warn: [0.96, 0.97, 0.99] as Rgb,
};

const COL = {
  idx: MARGIN,
  product: MARGIN + 26,
  code: MARGIN + 248,
  qty: MARGIN + 352,
  unit: MARGIN + 392,
  total: MARGIN + 468,
};

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function rgb([r, g, b]: Rgb): string {
  return `${r} ${g} ${b}`;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1))}…`;
}

function orderRef(supplierName: string): string {
  const d = new Date();
  const ymd =
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}` +
    `${String(d.getDate()).padStart(2, "0")}`;
  let hash = 0;
  for (let i = 0; i < supplierName.length; i += 1) {
    hash = (hash * 31 + supplierName.charCodeAt(i)) >>> 0;
  }
  return `ORD-${ymd}-${(hash % 10000).toString().padStart(4, "0")}`;
}

class PdfCanvas {
  private ops: string[] = [];

  fillRect(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${rgb(color)} rg`, `${x} ${y} ${w} ${h} re f`);
  }

  strokeRect(x: number, y: number, w: number, h: number, color: Rgb, width = 0.75) {
    this.ops.push(`${width} w`, `${rgb(color)} RG`, `${x} ${y} ${w} ${h} re S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb, width = 0.5) {
    this.ops.push(`${width} w`, `${rgb(color)} RG`, `${x1} ${y1} m`, `${x2} ${y2} l S`);
  }

  text(
    x: number,
    y: number,
    text: string,
    opts: { font?: "regular" | "bold"; size?: number; color?: Rgb } = {},
  ) {
    const font = opts.font === "bold" ? "/F2" : "/F1";
    const size = opts.size ?? 10;
    const color = opts.color ?? C.ink;
    const safe = escapePdfText(text);
    this.ops.push(
      "BT",
      `${rgb(color)} rg`,
      `${font} ${size} Tf`,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${safe}) Tj`,
      "ET",
    );
  }

  textRight(
    xRight: number,
    y: number,
    text: string,
    opts: { font?: "regular" | "bold"; size?: number; color?: Rgb } = {},
  ) {
    const size = opts.size ?? 10;
    const approxWidth = text.length * size * 0.48;
    this.text(xRight - approxWidth, y, text, opts);
  }

  toStream(): string {
    return this.ops.join("\n");
  }
}

type PageLayout = {
  stream: PdfCanvas;
  cursorY: number;
};

function newPage(ref: string, continued: boolean): PageLayout {
  const stream = new PdfCanvas();
  let cursorY = PAGE_H - MARGIN;

  stream.fillRect(0, PAGE_H - 88, PAGE_W, 88, C.brandDeep);
  stream.fillRect(0, PAGE_H - 90, PAGE_W, 2, C.accent);

  stream.text(MARGIN, PAGE_H - 38, "ORDER REQUEST", {
    font: "bold",
    size: 22,
    color: C.white,
  });
  stream.text(MARGIN, PAGE_H - 56, "Kiosk Marketplace", {
    size: 9,
    color: [0.82, 0.94, 0.92],
  });

  stream.textRight(PAGE_W - MARGIN, PAGE_H - 38, ref, {
    font: "bold",
    size: 11,
    color: C.white,
  });
  stream.textRight(PAGE_W - MARGIN, PAGE_H - 54, continued ? "Continued" : "Purchase order sheet", {
    size: 8,
    color: [0.78, 0.9, 0.88],
  });

  cursorY = PAGE_H - 108;
  return { stream, cursorY };
}

function drawInfoCards(page: PageLayout, input: MarketplaceOrderPdfInput, ref: string) {
  const { stream } = page;
  const cardH = 78;
  const gap = 12;
  const cardW = (CONTENT_W - gap) / 2;
  const y = page.cursorY - cardH;

  stream.fillRect(MARGIN, y, cardW, cardH, C.brandLight);
  stream.strokeRect(MARGIN, y, cardW, cardH, C.border);
  stream.text(MARGIN + 12, y + cardH - 16, "SUPPLIER", {
    font: "bold",
    size: 7,
    color: C.accent,
  });
  stream.text(MARGIN + 12, y + cardH - 34, truncate(input.supplierName, 34), {
    font: "bold",
    size: 12,
  });
  let detailY = y + cardH - 50;
  if (input.location) {
    stream.text(MARGIN + 12, detailY, truncate(`Location · ${input.location}`, 40), {
      size: 8,
      color: C.muted,
    });
    detailY -= 14;
  }
  if (input.supplierPhone) {
    stream.text(MARGIN + 12, detailY, `WhatsApp · ${input.supplierPhone}`, {
      size: 8,
      color: C.muted,
    });
  }

  const rightX = MARGIN + cardW + gap;
  stream.fillRect(rightX, y, cardW, cardH, C.warn);
  stream.strokeRect(rightX, y, cardW, cardH, C.border);
  stream.text(rightX + 12, y + cardH - 16, "ORDER DETAILS", {
    font: "bold",
    size: 7,
    color: C.accent,
  });
  const now = new Date();
  stream.text(rightX + 12, y + cardH - 34, now.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }), { font: "bold", size: 11 });
  stream.text(rightX + 12, y + cardH - 50, now.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  }), { size: 8, color: C.muted });
  stream.text(rightX + 12, y + cardH - 64, `${input.lines.length} line item${input.lines.length === 1 ? "" : "s"}`, {
    size: 8,
    color: C.muted,
  });
  if (input.listedBy) {
    stream.textRight(rightX + cardW - 12, y + cardH - 64, truncate(`Listed by ${input.listedBy}`, 28), {
      size: 7,
      color: C.muted,
    });
  }
  stream.textRight(rightX + cardW - 12, y + cardH - 34, ref, {
    font: "bold",
    size: 8,
    color: C.accent,
  });

  page.cursorY = y - 18;
}

function drawTableHeader(page: PageLayout) {
  const { stream } = page;
  const rowH = 22;
  const y = page.cursorY - rowH;

  stream.fillRect(MARGIN, y, CONTENT_W, rowH, C.brand);
  stream.text(COL.idx + 4, y + 7, "#", { font: "bold", size: 8, color: C.white });
  stream.text(COL.product, y + 7, "PRODUCT", { font: "bold", size: 8, color: C.white });
  stream.text(COL.code, y + 7, "SKU / BARCODE", { font: "bold", size: 8, color: C.white });
  stream.text(COL.qty, y + 7, "QTY", { font: "bold", size: 8, color: C.white });
  stream.text(COL.unit, y + 7, "UNIT", { font: "bold", size: 8, color: C.white });
  stream.textRight(PAGE_W - MARGIN - 4, y + 7, "LINE TOTAL", {
    font: "bold",
    size: 8,
    color: C.white,
  });

  page.cursorY = y;
}

function drawTableRow(
  page: PageLayout,
  index: number,
  line: MarketplaceOrderLine,
  currency: string,
) {
  const { stream } = page;
  const meta = [line.sku, line.barcode].filter(Boolean).join(" · ");
  const rowH = meta ? 34 : 24;
  const y = page.cursorY - rowH;

  if (index % 2 === 0) {
    stream.fillRect(MARGIN, y, CONTENT_W, rowH, C.zebra);
  }
  stream.line(MARGIN, y, MARGIN + CONTENT_W, y, C.border, 0.4);

  const price = line.unitPrice ?? null;
  const lineTotal = price != null ? price * line.qty : null;
  const unitLabel = price != null ? formatMoney(price, currency) : "On request";

  stream.text(COL.idx + 4, y + rowH - 14, String(index), { size: 9, color: C.muted });
  stream.text(COL.product, y + rowH - 14, truncate(line.name, 36), { font: "bold", size: 9 });
  if (meta) {
    stream.text(COL.product, y + rowH - 26, truncate(meta, 42), { size: 7, color: C.muted });
  }
  const codeLabel = [line.sku, line.barcode].filter(Boolean).join("\n");
  stream.text(COL.code, y + rowH - 14, truncate(codeLabel.replace(/\n/g, " · ") || "—", 18), {
    size: 8,
    color: C.muted,
  });
  stream.text(COL.qty, y + rowH - 14, String(line.qty), { font: "bold", size: 9 });
  stream.text(COL.unit, y + rowH - 14, unitLabel, { size: 8 });
  stream.textRight(
    PAGE_W - MARGIN - 4,
    y + rowH - 14,
    lineTotal != null ? formatMoney(lineTotal, currency) : "—",
    { font: "bold", size: 9 },
  );

  page.cursorY = y;
}

function drawSummary(
  page: PageLayout,
  total: number,
  currency: string,
  pricedLineCount: number,
  totalQty: number,
) {
  const { stream } = page;
  const boxW = 220;
  const boxH = 72;
  const x = PAGE_W - MARGIN - boxW;
  const y = page.cursorY - boxH - 8;

  stream.fillRect(x, y, boxW, boxH, C.brandLight);
  stream.strokeRect(x, y, boxW, boxH, C.border);

  stream.text(x + 14, y + boxH - 18, "ORDER SUMMARY", {
    font: "bold",
    size: 7,
    color: C.accent,
  });
  stream.text(x + 14, y + boxH - 36, `Total units · ${totalQty}`, { size: 9, color: C.muted });
  stream.text(x + 14, y + boxH - 52, `Priced lines · ${pricedLineCount}`, { size: 8, color: C.muted });

  stream.text(x + 14, y + 16, "Estimated total", { size: 9, color: C.muted });
  stream.textRight(x + boxW - 14, y + 18, formatMoney(total, currency), {
    font: "bold",
    size: 16,
    color: C.brandDeep,
  });

  page.cursorY = y - 12;
}

function drawNote(page: PageLayout, note: string) {
  const { stream } = page;
  const boxH = 52;
  const y = page.cursorY - boxH;

  stream.fillRect(MARGIN, y, CONTENT_W, boxH, C.warn);
  stream.strokeRect(MARGIN, y, CONTENT_W, boxH, C.border);
  stream.text(MARGIN + 12, y + boxH - 16, "BUYER NOTE", {
    font: "bold",
    size: 7,
    color: C.accent,
  });
  stream.text(MARGIN + 12, y + boxH - 32, truncate(note, 110), { size: 9 });
  page.cursorY = y - 10;
}

function drawFooter(page: PageLayout) {
  const { stream } = page;
  const y = 52;

  stream.line(MARGIN, y + 22, PAGE_W - MARGIN, y + 22, C.border);
  stream.text(MARGIN, y + 8, "Please confirm availability, final pricing, and delivery arrangements.", {
    size: 8,
    color: C.muted,
  });
  stream.textRight(PAGE_W - MARGIN, y + 8, "Kiosk Marketplace · not a tax invoice", {
    size: 7,
    color: C.muted,
  });
}

/** Single/multi-page PDF (Helvetica) — no extra dependencies. */
export function buildMarketplaceOrderPdf(input: MarketplaceOrderPdfInput): Blob {
  const ref = orderRef(input.supplierName);
  const pages: PdfCanvas[] = [];

  let currency = "KES";
  let total = 0;
  let pricedLineCount = 0;
  let totalQty = 0;

  for (const line of input.lines) {
    totalQty += line.qty;
    if (line.currency) currency = line.currency;
    if (line.unitPrice != null) {
      total += line.unitPrice * line.qty;
      pricedLineCount += 1;
    }
  }

  let page = newPage(ref, false);
  drawInfoCards(page, input, ref);
  drawTableHeader(page);

  const minY = 130;

  input.lines.forEach((line, index) => {
    const meta = [line.sku, line.barcode].filter(Boolean).join(" · ");
    const rowH = meta ? 34 : 24;
    if (page.cursorY - rowH < minY) {
      drawFooter(page);
      pages.push(page.stream);
      page = newPage(ref, true);
      drawTableHeader(page);
    }
    drawTableRow(page, index + 1, line, currency);
  });

  const summaryH = 92;
  if (page.cursorY - summaryH < minY) {
    drawFooter(page);
    pages.push(page.stream);
    page = newPage(ref, true);
  }
  drawSummary(page, total, currency, pricedLineCount, totalQty);

  if (input.note) {
    const noteH = 62;
    if (page.cursorY - noteH < minY) {
      drawFooter(page);
      pages.push(page.stream);
      page = newPage(ref, true);
    }
    drawNote(page, input.note);
  }
  drawFooter(page);
  pages.push(page.stream);

  return assemblePdf(pages.map((p) => p.toStream()));
}

function assemblePdf(contentStreams: string[]): Blob {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  // 1: Catalog, 2: Pages, 3-4: fonts
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push(""); // pages placeholder index 1
  objects.push(
    "3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  );
  objects.push(
    "4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n",
  );

  let nextId = 5;
  for (const stream of contentStreams) {
    const pageId = nextId;
    const contentId = nextId + 1;
    pageObjectIds.push(pageId);
    objects.push(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R /Resources<< /Font<< /F1 3 0 R /F2 4 0 R >> >> >>endobj\n`,
    );
    objects.push(
      `${contentId} 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
    );
    nextId += 2;
  }

  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects[1] = `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>endobj\n`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Normalize phone for wa.me (digits only, Kenya 07… → 2547…). */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0") && digits.length >= 9) {
    digits = `254${digits.slice(1)}`;
  }
  if (digits.length < 9) return null;
  return digits;
}

export function buildWhatsAppOrderUrl(opts: {
  phone: string | null | undefined;
  supplierName: string;
  lines: MarketplaceOrderLine[];
  filename: string;
}): string | null {
  const phone = normalizeWhatsAppPhone(opts.phone);
  if (!phone) return null;
  const itemLines = opts.lines
    .map((l) => `• ${l.qty} × ${l.name}`)
    .join("\n");
  const text =
    `Hello ${opts.supplierName},\n\n` +
    `Please find my order request (${opts.filename}):\n\n` +
    `${itemLines}\n\n` +
    `I've attached the PDF order sheet — kindly confirm availability and pricing.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export async function shareOrDownloadOrderPdf(
  blob: Blob,
  filename: string,
  whatsappUrl: string | null,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: "Marketplace order",
        text: "Order request from Kiosk marketplace",
      });
      return "shared";
    } catch {
      // fall through to download
    }
  }
  downloadBlob(blob, filename);
  if (whatsappUrl) {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }
  return "downloaded";
}

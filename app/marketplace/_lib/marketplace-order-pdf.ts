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
const MARGIN = 48;

type Rgb = readonly [number, number, number];

const C = {
  ink: [0.1, 0.1, 0.1] as Rgb,
  muted: [0.45, 0.45, 0.45] as Rgb,
  line: [0.82, 0.82, 0.82] as Rgb,
};

const COL = {
  product: MARGIN,
  qty: MARGIN + 300,
  unit: MARGIN + 340,
  total: MARGIN + 430,
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

class PdfCanvas {
  private ops: string[] = [];

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = C.line, width = 0.5) {
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
    this.ops.push(
      "BT",
      `${rgb(color)} rg`,
      `${font} ${size} Tf`,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${escapePdfText(text)}) Tj`,
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

function newPage(continued: boolean): PageLayout {
  const stream = new PdfCanvas();
  const top = PAGE_H - MARGIN;

  stream.text(MARGIN, top, continued ? "Order request (continued)" : "Order request", {
    font: "bold",
    size: 14,
  });
  stream.textRight(PAGE_W - MARGIN, top, new Date().toLocaleString("en-KE"), {
    size: 9,
    color: C.muted,
  });
  stream.line(MARGIN, top - 10, PAGE_W - MARGIN, top - 10);

  return { stream, cursorY: top - 28 };
}

function drawMeta(page: PageLayout, input: MarketplaceOrderPdfInput) {
  const { stream } = page;
  let y = page.cursorY;

  const rows: [string, string][] = [
    ["Supplier", input.supplierName],
  ];
  if (input.location) rows.push(["Location", input.location]);
  if (input.supplierPhone) rows.push(["Contact", input.supplierPhone]);
  if (input.listedBy) rows.push(["Listed by", input.listedBy]);

  for (const [label, value] of rows) {
    stream.text(MARGIN, y, label, { size: 9, color: C.muted });
    stream.text(MARGIN + 72, y, truncate(value, 64), { size: 9 });
    y -= 14;
  }

  page.cursorY = y - 10;
}

function drawTableHeader(page: PageLayout) {
  const { stream } = page;
  const y = page.cursorY;

  stream.text(COL.product, y, "Item", { font: "bold", size: 9 });
  stream.text(COL.qty, y, "Qty", { font: "bold", size: 9 });
  stream.text(COL.unit, y, "Unit", { font: "bold", size: 9 });
  stream.textRight(PAGE_W - MARGIN, y, "Total", { font: "bold", size: 9 });
  stream.line(MARGIN, y - 6, PAGE_W - MARGIN, y - 6);

  page.cursorY = y - 18;
}

function drawTableRow(page: PageLayout, line: MarketplaceOrderLine, currency: string) {
  const { stream } = page;
  const meta = [line.sku, line.barcode].filter(Boolean).join(" · ");
  const rowH = meta ? 28 : 18;
  const y = page.cursorY - rowH + 10;

  const price = line.unitPrice ?? null;
  const lineTotal = price != null ? price * line.qty : null;
  const unitLabel = price != null ? formatMoney(price, currency) : "—";

  stream.text(COL.product, y, truncate(line.name, 44), { size: 9 });
  if (meta) {
    stream.text(COL.product, y - 12, truncate(meta, 50), { size: 8, color: C.muted });
  }
  stream.text(COL.qty, y, String(line.qty), { size: 9 });
  stream.text(COL.unit, y, unitLabel, { size: 9, color: C.muted });
  stream.textRight(
    PAGE_W - MARGIN,
    y,
    lineTotal != null ? formatMoney(lineTotal, currency) : "—",
    { size: 9 },
  );

  stream.line(MARGIN, y - 16, PAGE_W - MARGIN, y - 16, C.line, 0.25);
  page.cursorY = y - 20;
}

function drawTotal(page: PageLayout, total: number, currency: string) {
  const { stream } = page;
  const y = page.cursorY - 8;

  stream.line(MARGIN, y + 14, PAGE_W - MARGIN, y + 14);
  stream.text(COL.unit, y, "Estimated total", { size: 9, color: C.muted });
  stream.textRight(PAGE_W - MARGIN, y, formatMoney(total, currency), {
    font: "bold",
    size: 10,
  });

  page.cursorY = y - 20;
}

function drawNote(page: PageLayout, note: string) {
  const { stream } = page;
  const y = page.cursorY;

  stream.text(MARGIN, y, "Note", { font: "bold", size: 9 });
  stream.text(MARGIN, y - 14, truncate(note, 120), { size: 9, color: C.muted });
  page.cursorY = y - 30;
}

function drawFooter(page: PageLayout) {
  const { stream } = page;
  stream.text(MARGIN, 40, "Please confirm availability and delivery.", {
    size: 8,
    color: C.muted,
  });
}

/** Minimal single/multi-page PDF — no extra dependencies. */
export function buildMarketplaceOrderPdf(input: MarketplaceOrderPdfInput): Blob {
  const pages: PdfCanvas[] = [];
  const minY = 100;

  let currency = "KES";
  let total = 0;
  for (const line of input.lines) {
    if (line.currency) currency = line.currency;
    if (line.unitPrice != null) total += line.unitPrice * line.qty;
  }

  let page = newPage(false);
  drawMeta(page, input);
  drawTableHeader(page);

  input.lines.forEach((line) => {
    const meta = [line.sku, line.barcode].filter(Boolean).join(" · ");
    const rowH = meta ? 28 : 18;
    if (page.cursorY - rowH < minY) {
      drawFooter(page);
      pages.push(page.stream);
      page = newPage(true);
      drawTableHeader(page);
    }
    drawTableRow(page, line, currency);
  });

  if (page.cursorY < minY + 40) {
    drawFooter(page);
    pages.push(page.stream);
    page = newPage(true);
  }
  drawTotal(page, total, currency);

  if (input.note) {
    if (page.cursorY < minY + 30) {
      drawFooter(page);
      pages.push(page.stream);
      page = newPage(true);
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

  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("");
  objects.push("3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  objects.push("4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n");

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

  const currency =
    opts.lines.find((l) => l.currency)?.currency?.trim() || "KES";
  let estimatedTotal = 0;
  let pricedCount = 0;

  const itemLines = opts.lines
    .map((line, index) => {
      const n = index + 1;
      const name = line.name.trim();
      if (line.unitPrice != null) {
        const lineTotal = line.unitPrice * line.qty;
        estimatedTotal += lineTotal;
        pricedCount += 1;
        return `${n}. ${line.qty} × ${name}\n    ${formatMoney(line.unitPrice, currency)} each`;
      }
      return `${n}. ${line.qty} × ${name}`;
    })
    .join("\n");

  const totalUnits = opts.lines.reduce((sum, l) => sum + l.qty, 0);
  const summaryParts = [
    `${opts.lines.length} item${opts.lines.length === 1 ? "" : "s"}`,
    `${totalUnits} unit${totalUnits === 1 ? "" : "s"}`,
  ];
  if (pricedCount > 0) {
    summaryParts.push(`est. ${formatMoney(estimatedTotal, currency)}`);
  }

  const text = [
    `Hello ${opts.supplierName},`,
    "",
    "I'd like to place this order:",
    "",
    itemLines,
    "",
    `Total: ${summaryParts.join(" · ")}`,
    "",
    `PDF: ${opts.filename}`,
    "",
    "Please confirm availability and pricing. Thank you.",
  ].join("\n");

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

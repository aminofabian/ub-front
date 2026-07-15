import { formatSalePaymentDisplay } from "@/lib/sale-payment-filter";
import { txDisplayNo, type SaleTransaction } from "@/lib/sale-transactions";

export type SalesActivityPdfInput = {
  title: string;
  businessLabel?: string | null;
  branchLabel?: string | null;
  periodLabel: string;
  generatedAt?: Date;
  revenue: number;
  transactionCount: number;
  unitsSold: number;
  transactions: SaleTransaction[];
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 44;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 36;
const MIN_Y = 56;

/** Column x positions for the sales table */
const COL = {
  receipt: MARGIN,
  time: MARGIN + 62,
  payment: MARGIN + 148,
  who: MARGIN + 248,
  total: PAGE_W - MARGIN,
};

type Rgb = readonly [number, number, number];

const C = {
  ink: [0.1, 0.1, 0.1] as Rgb,
  soft: [0.28, 0.28, 0.28] as Rgb,
  muted: [0.48, 0.48, 0.48] as Rgb,
  faint: [0.62, 0.62, 0.62] as Rgb,
  line: [0.88, 0.88, 0.88] as Rgb,
  rule: [0.78, 0.78, 0.78] as Rgb,
  accent: [0.69, 0.55, 0.28] as Rgb,
  wash: [0.98, 0.97, 0.94] as Rgb,
  refund: [0.55, 0.32, 0.28] as Rgb,
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

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function fmtKes(n: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatQty(q: number | string): string {
  const n = toNum(q);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function formatSoldAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRefunded(status: string | undefined): boolean {
  return (status?.toLowerCase() ?? "").includes("refund");
}

function saleWho(tx: SaleTransaction): string {
  const isOnline = tx.channel === "online_store";
  const customer = tx.customerName?.trim() ?? "";
  const cashier = tx.cashierName?.trim() ?? "";
  if (isOnline) return customer || "Online";
  if (cashier && customer && cashier.toLowerCase() !== customer.toLowerCase()) {
    return `${cashier} · ${customer}`;
  }
  return cashier || customer || "—";
}

function salePayment(tx: SaleTransaction): string {
  if (tx.channel === "online_store") return "Online";
  return formatSalePaymentDisplay(tx.paymentMethod, tx.paymentMethods);
}

class PdfCanvas {
  private ops: string[] = [];

  fillRect(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${rgb(color)} rg`, `${x} ${y} ${w} ${h} re`, "f");
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Rgb = C.line,
    width = 0.5,
  ) {
    this.ops.push(
      `${width} w`,
      `${rgb(color)} RG`,
      `${x1} ${y1} m`,
      `${x2} ${y2} l`,
      "S",
    );
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
    const approxWidth = text.length * size * 0.5;
    this.text(xRight - approxWidth, y, text, opts);
  }

  toStream(): string {
    return this.ops.join("\n");
  }
}

type PageLayout = {
  stream: PdfCanvas;
  cursorY: number;
  pageNo: number;
};

function drawPageChrome(
  stream: PdfCanvas,
  pageNo: number,
  input: SalesActivityPdfInput,
  continued: boolean,
): number {
  const top = PAGE_H - MARGIN;
  const business = truncate(input.businessLabel?.trim() || "Palmart", 42);

  stream.text(MARGIN, top, business, { font: "bold", size: 11, color: C.ink });
  stream.textRight(PAGE_W - MARGIN, top, "Sales report", {
    size: 9,
    color: C.muted,
  });

  stream.line(MARGIN, top - 8, PAGE_W - MARGIN, top - 8, C.accent, 1.25);

  let y = top - 26;
  stream.text(MARGIN, y, continued ? `${input.title} (continued)` : input.title, {
    font: "bold",
    size: 16,
  });
  y -= 14;

  const scope = [input.branchLabel?.trim(), input.periodLabel?.trim()]
    .filter(Boolean)
    .join("  ·  ");
  if (scope) {
    stream.text(MARGIN, y, truncate(scope, 90), { size: 9, color: C.muted });
    y -= 12;
  }

  const generated = (input.generatedAt ?? new Date()).toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  stream.text(MARGIN, y, `Generated ${generated}`, {
    size: 8,
    color: C.faint,
  });
  if (pageNo > 1) {
    stream.textRight(PAGE_W - MARGIN, y, `Page ${pageNo}`, {
      size: 8,
      color: C.faint,
    });
  }
  y -= 18;

  return y;
}

function drawSummary(page: PageLayout, input: SalesActivityPdfInput) {
  const { stream } = page;
  const y = page.cursorY;
  const boxH = 44;
  const boxY = y - boxH;

  stream.fillRect(MARGIN, boxY, CONTENT_W, boxH, C.wash);
  stream.line(MARGIN, y, PAGE_W - MARGIN, y, C.rule, 0.6);
  stream.line(MARGIN, boxY, PAGE_W - MARGIN, boxY, C.rule, 0.6);

  const colW = CONTENT_W / 3;
  const metrics = [
    { label: "REVENUE", value: fmtKes(input.revenue) },
    {
      label: "TRANSACTIONS",
      value: input.transactionCount.toLocaleString("en-KE"),
    },
    {
      label: "UNITS SOLD",
      value: input.unitsSold.toLocaleString("en-KE", {
        maximumFractionDigits: 1,
      }),
    },
  ];

  metrics.forEach((m, i) => {
    const x = MARGIN + colW * i + 14;
    if (i > 0) {
      const vx = MARGIN + colW * i;
      stream.line(vx, boxY + 8, vx, y - 8, C.line, 0.5);
    }
    stream.text(x, y - 16, m.label, { size: 7, color: C.muted });
    stream.text(x, y - 32, m.value, { font: "bold", size: 12, color: C.ink });
  });

  page.cursorY = boxY - 18;
}

function drawTableHeader(page: PageLayout) {
  const { stream } = page;
  let y = page.cursorY;

  stream.text(COL.receipt, y, "RECEIPT", { size: 7, color: C.muted });
  stream.text(COL.time, y, "TIME", { size: 7, color: C.muted });
  stream.text(COL.payment, y, "PAYMENT", { size: 7, color: C.muted });
  stream.text(COL.who, y, "CASHIER / CUSTOMER", { size: 7, color: C.muted });
  stream.textRight(COL.total, y, "TOTAL", { size: 7, color: C.muted });
  y -= 6;
  stream.line(MARGIN, y, PAGE_W - MARGIN, y, C.rule, 0.7);
  page.cursorY = y - 12;
}

function drawFooter(page: PageLayout, businessLabel?: string | null) {
  const { stream } = page;
  stream.line(MARGIN, FOOTER_Y + 12, PAGE_W - MARGIN, FOOTER_Y + 12, C.line, 0.5);
  stream.text(
    MARGIN,
    FOOTER_Y,
    truncate(`${businessLabel?.trim() || "Palmart"} · Confidential`, 50),
    { size: 7, color: C.faint },
  );
  stream.textRight(PAGE_W - MARGIN, FOOTER_Y, `Page ${page.pageNo}`, {
    size: 7,
    color: C.faint,
  });
}

function newPage(
  pageNo: number,
  input: SalesActivityPdfInput,
  opts: { summary: boolean; tableHeader: boolean },
): PageLayout {
  const stream = new PdfCanvas();
  const y = drawPageChrome(stream, pageNo, input, pageNo > 1);
  const page: PageLayout = { stream, cursorY: y, pageNo };

  if (opts.summary) {
    drawSummary(page, input);
  }
  if (opts.tableHeader) {
    drawTableHeader(page);
  }
  return page;
}

function ensureSpace(
  pages: PdfCanvas[],
  page: PageLayout,
  need: number,
  input: SalesActivityPdfInput,
): PageLayout {
  if (page.cursorY - need >= MIN_Y) return page;
  drawFooter(page, input.businessLabel);
  pages.push(page.stream);
  return newPage(page.pageNo + 1, input, {
    summary: false,
    tableHeader: true,
  });
}

function assemblePdf(contentStreams: string[]): Blob {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("");
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
  objects[1] =
    `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>endobj\n`;

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

/** Build a multi-page A4 PDF of the current sales activity / transactions view. */
export function buildSalesActivityPdf(input: SalesActivityPdfInput): Blob {
  const pages: PdfCanvas[] = [];
  let page = newPage(1, input, { summary: true, tableHeader: true });

  if (input.transactions.length === 0) {
    page.stream.text(MARGIN, page.cursorY, "No sales in this period.", {
      size: 10,
      color: C.muted,
    });
    drawFooter(page, input.businessLabel);
    pages.push(page.stream);
    return assemblePdf(pages.map((p) => p.toStream()));
  }

  for (const tx of input.transactions) {
    const lineCount = Math.max(tx.lines.length, 0);
    const blockH = 22 + (lineCount > 0 ? 4 + lineCount * 11 : 0) + 10;
    page = ensureSpace(pages, page, blockH, input);

    let y = page.cursorY;
    const s = page.stream;
    const refunded = isRefunded(tx.status);
    const receipt = `#${txDisplayNo(tx)}`;
    const total = fmtKes(Math.abs(tx.total));
    const totalLabel = refunded ? `−${total}` : total;

    s.text(COL.receipt, y, receipt, { font: "bold", size: 9, color: C.ink });
    s.text(COL.time, y, formatSoldAt(tx.soldAt), { size: 8, color: C.soft });
    s.text(COL.payment, y, truncate(salePayment(tx), 16), {
      size: 8,
      color: C.soft,
    });
    s.text(COL.who, y, truncate(saleWho(tx), 28), { size: 8, color: C.soft });
    s.textRight(COL.total, y, totalLabel, {
      font: "bold",
      size: 9,
      color: refunded ? C.refund : C.ink,
    });
    y -= 12;

    if (tx.lines.length > 0) {
      for (const line of tx.lines) {
        page.cursorY = y;
        page = ensureSpace(pages, page, 12, input);
        y = page.cursorY;
        const item = truncate(
          `${formatQty(line.quantity)} × ${line.itemName}`,
          62,
        );
        page.stream.text(COL.time, y, item, { size: 8, color: C.faint });
        page.stream.textRight(
          COL.total,
          y,
          fmtKes(toNum(line.lineTotal)),
          { size: 8, color: C.faint },
        );
        y -= 11;
      }
    }

    y -= 4;
    page.stream.line(MARGIN, y, PAGE_W - MARGIN, y, C.line, 0.4);
    page.cursorY = y - 10;
  }

  drawFooter(page, input.businessLabel);
  pages.push(page.stream);
  return assemblePdf(pages.map((p) => p.toStream()));
}

export function salesActivityPdfFilename(opts: {
  title: string;
  from?: string;
  to?: string;
}): string {
  const slug = opts.title.toLowerCase().replace(/\s+/g, "-");
  const range =
    opts.from && opts.to
      ? opts.from === opts.to
        ? opts.from
        : `${opts.from}_to_${opts.to}`
      : new Date().toISOString().slice(0, 10);
  return `${slug}-${range}.pdf`;
}

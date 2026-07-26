import { formatMoney } from "@/lib/utils";

export type SupplierPortalCatalogPdfProduct = {
  name: string;
  barcode?: string | null;
  sku?: string | null;
  categoryName?: string | null;
  packSize?: number | null;
  packUnit?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  available?: boolean;
};

export type SupplierPortalCatalogPdfInput = {
  supplierName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  username?: string | null;
  products: SupplierPortalCatalogPdfProduct[];
  generatedAt?: Date;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const FOOTER_Y = 28;
const MIN_Y = 52;

type Rgb = readonly [number, number, number];

const C = {
  ink: [0.11, 0.1, 0.08] as Rgb,
  soft: [0.3, 0.28, 0.24] as Rgb,
  muted: [0.48, 0.45, 0.4] as Rgb,
  line: [0.86, 0.83, 0.78] as Rgb,
  paper: [0.97, 0.95, 0.92] as Rgb,
  teal: [0.06, 0.46, 0.43] as Rgb,
  tealSoft: [0.9, 0.95, 0.94] as Rgb,
  cream: [0.97, 0.95, 0.91] as Rgb,
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

function packLabel(p: SupplierPortalCatalogPdfProduct): string {
  if (p.packSize != null && p.packUnit) {
    return `${p.packSize} ${p.packUnit}`;
  }
  if (p.packUnit) return p.packUnit;
  return "—";
}

function codeLabel(p: SupplierPortalCatalogPdfProduct): string {
  return (p.barcode ?? p.sku ?? "—").trim() || "—";
}

class PdfCanvas {
  private ops: string[] = [];

  fillRect(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${rgb(color)} rg`, `${x} ${y} ${w} ${h} re`, "f");
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = C.line, width = 0.6) {
    this.ops.push(`${width} w`, `${rgb(color)} RG`, `${x1} ${y1} m`, `${x2} ${y2} l`, "S");
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
  pageIndex: number;
};

function drawHeader(page: PageLayout, input: SupplierPortalCatalogPdfInput, continued: boolean) {
  const { stream } = page;
  const generated = (input.generatedAt ?? new Date()).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  stream.fillRect(0, PAGE_H - 92, PAGE_W, 92, C.teal);
  stream.fillRect(0, PAGE_H - 96, PAGE_W, 4, C.cream);

  stream.text(MARGIN, PAGE_H - 34, "KIOSK", {
    font: "bold",
    size: 9,
    color: [0.85, 0.95, 0.93],
  });
  stream.text(MARGIN, PAGE_H - 56, continued ? "Catalogue (continued)" : "Wholesale catalogue", {
    font: "bold",
    size: 18,
    color: [1, 1, 1],
  });
  stream.text(MARGIN, PAGE_H - 74, truncate(input.supplierName, 48), {
    size: 10,
    color: [0.85, 0.95, 0.93],
  });

  stream.textRight(PAGE_W - MARGIN, PAGE_H - 34, generated, {
    size: 8,
    color: [0.85, 0.95, 0.93],
  });
  stream.textRight(PAGE_W - MARGIN, PAGE_H - 50, `${input.products.length} products`, {
    font: "bold",
    size: 10,
    color: [1, 1, 1],
  });
  if (input.username) {
    stream.textRight(PAGE_W - MARGIN, PAGE_H - 66, `@${input.username}`, {
      size: 8,
      color: [0.85, 0.95, 0.93],
    });
  }

  page.cursorY = PAGE_H - 118;

  if (!continued) {
    const bits = [input.contactPhone, input.contactEmail].filter(Boolean);
    if (bits.length > 0) {
      stream.text(MARGIN, page.cursorY, bits.join("  ·  "), {
        size: 9,
        color: C.muted,
      });
      page.cursorY -= 18;
    }
    stream.text(
      MARGIN,
      page.cursorY,
      "Prices shown are current wholesale list prices for connected shops.",
      { size: 8, color: C.muted },
    );
    page.cursorY -= 16;
  }
}

function drawTableHeader(page: PageLayout) {
  const y = page.cursorY;
  page.stream.fillRect(MARGIN - 4, y - 6, PAGE_W - MARGIN * 2 + 8, 18, C.tealSoft);
  page.stream.text(MARGIN, y, "PRODUCT", { font: "bold", size: 7, color: C.teal });
  page.stream.text(MARGIN + 228, y, "CODE", { font: "bold", size: 7, color: C.teal });
  page.stream.text(MARGIN + 330, y, "PACK", { font: "bold", size: 7, color: C.teal });
  page.stream.textRight(PAGE_W - MARGIN, y, "PRICE", {
    font: "bold",
    size: 7,
    color: C.teal,
  });
  page.cursorY = y - 20;
}

function drawFooter(page: PageLayout, totalPages: number) {
  const { stream, pageIndex } = page;
  stream.line(MARGIN, FOOTER_Y + 12, PAGE_W - MARGIN, FOOTER_Y + 12, C.line, 0.5);
  stream.text(MARGIN, FOOTER_Y, "kiosk.ke/supplier-portal", {
    size: 7,
    color: C.muted,
  });
  stream.textRight(PAGE_W - MARGIN, FOOTER_Y, `${pageIndex + 1} / ${totalPages}`, {
    size: 7,
    color: C.muted,
  });
}

function ensureSpace(pages: PageLayout[], page: PageLayout, need: number, input: SupplierPortalCatalogPdfInput) {
  if (page.cursorY - need >= MIN_Y) return page;
  pages.push(page);
  const next: PageLayout = {
    stream: new PdfCanvas(),
    cursorY: 0,
    pageIndex: page.pageIndex + 1,
  };
  drawHeader(next, input, true);
  drawTableHeader(next);
  return next;
}

function groupByCategory(products: SupplierPortalCatalogPdfProduct[]) {
  const map = new Map<string, SupplierPortalCatalogPdfProduct[]>();
  for (const product of products) {
    const key = (product.categoryName?.trim() || "Uncategorised").toUpperCase();
    const list = map.get(key) ?? [];
    list.push(product);
    map.set(key, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function buildSupplierPortalCatalogPdf(input: SupplierPortalCatalogPdfInput): Blob {
  const pages: PageLayout[] = [];
  let page: PageLayout = {
    stream: new PdfCanvas(),
    cursorY: 0,
    pageIndex: 0,
  };
  drawHeader(page, input, false);
  drawTableHeader(page);

  const groups = groupByCategory(input.products);
  for (const [category, rows] of groups) {
    page = ensureSpace(pages, page, 36, input);
    page.stream.fillRect(MARGIN - 4, page.cursorY - 4, 3, 12, C.teal);
    page.stream.text(MARGIN + 6, page.cursorY, category, {
      font: "bold",
      size: 9,
      color: C.teal,
    });
    page.stream.textRight(PAGE_W - MARGIN, page.cursorY, `${rows.length}`, {
      size: 8,
      color: C.muted,
    });
    page.cursorY -= 16;

    for (const product of rows) {
      page = ensureSpace(pages, page, 18, input);
      const y = page.cursorY;
      if ((rows.indexOf(product) % 2) === 0) {
        page.stream.fillRect(MARGIN - 4, y - 4, PAGE_W - MARGIN * 2 + 8, 16, C.paper);
      }
      page.stream.text(MARGIN, y, truncate(product.name, 34), {
        font: "bold",
        size: 9,
      });
      page.stream.text(MARGIN + 228, y, truncate(codeLabel(product), 14), {
        size: 8,
        color: C.soft,
      });
      page.stream.text(MARGIN + 330, y, truncate(packLabel(product), 12), {
        size: 8,
        color: C.soft,
      });
      const price =
        product.unitPrice != null
          ? formatMoney(product.unitPrice, product.currency ?? "KES")
          : "Ask";
      page.stream.textRight(PAGE_W - MARGIN, y, price, {
        font: "bold",
        size: 9,
        color: product.available === false ? C.muted : C.ink,
      });
      page.cursorY -= 16;
    }
    page.cursorY -= 8;
  }

  if (input.products.length === 0) {
    page.stream.text(MARGIN, page.cursorY, "No products in this catalogue yet.", {
      size: 10,
      color: C.muted,
    });
  }

  pages.push(page);
  const totalPages = pages.length;
  for (const p of pages) {
    drawFooter(p, totalPages);
  }

  return assemblePdf(pages.map((p) => p.stream.toStream()));
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

export function downloadSupplierPortalCatalogPdf(
  input: SupplierPortalCatalogPdfInput,
  filename?: string,
) {
  const blob = buildSupplierPortalCatalogPdf(input);
  const safe = (input.supplierName || "catalogue")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  downloadBlob(blob, filename ?? `${safe || "catalogue"}-lookbook.pdf`);
}

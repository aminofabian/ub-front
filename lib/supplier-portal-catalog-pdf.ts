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
const MARGIN = 42;
const FOOTER_Y = 30;
const MIN_Y = 58;

type Rgb = readonly [number, number, number];

/** Packing-slip wholesale book — matches supplier portal ink / teal / mango. */
const C = {
  ink: [0.11, 0.1, 0.08] as Rgb,
  soft: [0.32, 0.3, 0.26] as Rgb,
  muted: [0.5, 0.47, 0.42] as Rgb,
  line: [0.84, 0.81, 0.75] as Rgb,
  paper: [0.98, 0.965, 0.94] as Rgb,
  paperDeep: [0.94, 0.91, 0.86] as Rgb,
  teal: [0.059, 0.463, 0.431] as Rgb,
  tealDeep: [0.04, 0.35, 0.33] as Rgb,
  tealSoft: [0.88, 0.94, 0.93] as Rgb,
  mango: [0.725, 0.412, 0.102] as Rgb,
  mangoSoft: [0.97, 0.92, 0.84] as Rgb,
  white: [1, 1, 1] as Rgb,
  tealMist: [0.82, 0.93, 0.91] as Rgb,
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

function fmtGenerated(d: Date): string {
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

class PdfCanvas {
  private ops: string[] = [];

  fillRect(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${rgb(color)} rg`, `${x} ${y} ${w} ${h} re`, "f");
  }

  strokeRect(x: number, y: number, w: number, h: number, color: Rgb, width = 0.8) {
    this.ops.push(`${width} w`, `${rgb(color)} RG`, `${x} ${y} ${w} ${h} re`, "S");
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = C.line, width = 0.6) {
    this.ops.push(`${width} w`, `${rgb(color)} RG`, `${x1} ${y1} m`, `${x2} ${y2} l`, "S");
  }

  dashLine(
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
      "[2.5 2] 0 d",
      `${x1} ${y1} m`,
      `${x2} ${y2} l`,
      "S",
      "[] 0 d",
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
  isCover: boolean;
};

function drawCover(page: PageLayout, input: SupplierPortalCatalogPdfInput) {
  const { stream } = page;
  const generated = fmtGenerated(input.generatedAt ?? new Date());
  const categories = new Set(
    input.products.map((p) => (p.categoryName?.trim() || "Uncategorised").toUpperCase()),
  );

  // Paper wash
  stream.fillRect(0, 0, PAGE_W, PAGE_H, C.paper);

  // Left ink rail
  stream.fillRect(0, 0, 10, PAGE_H, C.tealDeep);

  // Top teal banner
  stream.fillRect(0, PAGE_H - 210, PAGE_W, 210, C.teal);
  stream.fillRect(0, PAGE_H - 214, PAGE_W, 4, C.mango);

  // Soft mist block under banner
  stream.fillRect(MARGIN, PAGE_H - 280, PAGE_W - MARGIN * 2, 48, C.tealSoft);

  stream.text(MARGIN + 8, PAGE_H - 48, "KIOSK  ·  SUPPLIER PORTAL", {
    font: "bold",
    size: 9,
    color: C.tealMist,
  });
  stream.textRight(PAGE_W - MARGIN, PAGE_H - 48, generated, {
    size: 8,
    color: C.tealMist,
  });

  stream.text(MARGIN + 8, PAGE_H - 92, "Wholesale", {
    font: "bold",
    size: 28,
    color: C.white,
  });
  stream.text(MARGIN + 8, PAGE_H - 126, "price list", {
    font: "bold",
    size: 28,
    color: C.white,
  });

  stream.text(MARGIN + 8, PAGE_H - 160, truncate(input.supplierName, 42), {
    font: "bold",
    size: 14,
    color: C.tealMist,
  });

  if (input.username) {
    stream.text(MARGIN + 8, PAGE_H - 180, `@${input.username}`, {
      size: 10,
      color: C.tealMist,
    });
  }

  // Stamp
  stream.strokeRect(PAGE_W - MARGIN - 92, PAGE_H - 188, 88, 52, C.mango, 1.4);
  stream.text(PAGE_W - MARGIN - 80, PAGE_H - 158, "TRADE", {
    font: "bold",
    size: 11,
    color: C.mangoSoft,
  });
  stream.text(PAGE_W - MARGIN - 80, PAGE_H - 174, "LIST", {
    font: "bold",
    size: 11,
    color: C.mangoSoft,
  });

  // Stats strip
  const statY = PAGE_H - 262;
  stream.text(MARGIN + 12, statY, `${input.products.length}`, {
    font: "bold",
    size: 16,
    color: C.teal,
  });
  stream.text(MARGIN + 12 + 48, statY + 2, "products", {
    size: 9,
    color: C.soft,
  });
  stream.text(MARGIN + 160, statY, `${categories.size}`, {
    font: "bold",
    size: 16,
    color: C.teal,
  });
  stream.text(MARGIN + 160 + 36, statY + 2, "categories", {
    size: 9,
    color: C.soft,
  });

  // Contact block
  let y = PAGE_H - 340;
  stream.text(MARGIN, y, "FOR CONNECTED SHOPS", {
    font: "bold",
    size: 8,
    color: C.teal,
  });
  y -= 18;
  stream.text(
    MARGIN,
    y,
    "Prices are current wholesale list prices. Confirm pack and availability when ordering.",
    { size: 9, color: C.soft },
  );
  y -= 28;

  const bits = [input.contactPhone, input.contactEmail].filter(Boolean) as string[];
  if (bits.length > 0) {
    stream.fillRect(MARGIN - 4, y - 22, PAGE_W - MARGIN * 2 + 8, 40, C.paperDeep);
    stream.text(MARGIN + 4, y, bits.join("   ·   "), {
      font: "bold",
      size: 10,
      color: C.ink,
    });
    y -= 50;
  } else {
    y -= 12;
  }

  // Preview of first few category names
  const groupNames = [...categories].sort((a, b) => a.localeCompare(b)).slice(0, 8);
  if (groupNames.length > 0) {
    stream.text(MARGIN, y, "INSIDE", {
      font: "bold",
      size: 8,
      color: C.muted,
    });
    y -= 16;
    for (const name of groupNames) {
      stream.fillRect(MARGIN, y - 2, 3, 10, C.teal);
      stream.text(MARGIN + 10, y, name, { size: 9, color: C.ink });
      y -= 16;
    }
  }

  stream.text(MARGIN, 48, "kiosk.ke  ·  Turn the page for the full list", {
    size: 8,
    color: C.muted,
  });

  page.cursorY = MIN_Y;
  page.isCover = true;
}

function drawContinuedHeader(page: PageLayout, input: SupplierPortalCatalogPdfInput) {
  const { stream } = page;
  const generated = fmtGenerated(input.generatedAt ?? new Date());

  stream.fillRect(0, 0, PAGE_W, PAGE_H, C.paper);
  stream.fillRect(0, 0, 6, PAGE_H, C.teal);

  stream.fillRect(0, PAGE_H - 64, PAGE_W, 64, C.teal);
  stream.fillRect(0, PAGE_H - 68, PAGE_W, 4, C.mango);

  stream.text(MARGIN, PAGE_H - 28, "Wholesale price list  ·  continued", {
    font: "bold",
    size: 12,
    color: C.white,
  });
  stream.text(MARGIN, PAGE_H - 46, truncate(input.supplierName, 40), {
    size: 9,
    color: C.tealMist,
  });
  stream.textRight(PAGE_W - MARGIN, PAGE_H - 28, generated, {
    size: 8,
    color: C.tealMist,
  });
  stream.textRight(PAGE_W - MARGIN, PAGE_H - 46, `${input.products.length} products`, {
    font: "bold",
    size: 9,
    color: C.white,
  });

  page.cursorY = PAGE_H - 92;
}

function drawTableHeader(page: PageLayout) {
  const y = page.cursorY;
  page.stream.fillRect(MARGIN - 4, y - 8, PAGE_W - MARGIN * 2 + 8, 20, C.tealDeep);
  page.stream.text(MARGIN, y - 2, "PRODUCT", { font: "bold", size: 7, color: C.white });
  page.stream.text(MARGIN + 228, y - 2, "CODE", { font: "bold", size: 7, color: C.white });
  page.stream.text(MARGIN + 330, y - 2, "PACK", { font: "bold", size: 7, color: C.white });
  page.stream.textRight(PAGE_W - MARGIN, y - 2, "PRICE", {
    font: "bold",
    size: 7,
    color: C.white,
  });
  page.cursorY = y - 24;
}

function drawFooter(page: PageLayout, totalPages: number) {
  if (page.isCover) return;
  const { stream, pageIndex } = page;
  stream.dashLine(MARGIN, FOOTER_Y + 14, PAGE_W - MARGIN, FOOTER_Y + 14, C.line, 0.5);
  stream.text(MARGIN, FOOTER_Y, "kiosk.ke/supplier-portal  ·  Wholesale list", {
    size: 7,
    color: C.muted,
  });
  // Cover is page 1 in human terms when present — pageIndex already counts cover as 0
  stream.textRight(PAGE_W - MARGIN, FOOTER_Y, `${pageIndex + 1} / ${totalPages}`, {
    size: 7,
    color: C.muted,
  });
}

function ensureSpace(
  pages: PageLayout[],
  page: PageLayout,
  need: number,
  input: SupplierPortalCatalogPdfInput,
) {
  if (page.cursorY - need >= MIN_Y) return page;
  pages.push(page);
  const next: PageLayout = {
    stream: new PdfCanvas(),
    cursorY: 0,
    pageIndex: page.pageIndex + 1,
    isCover: false,
  };
  drawContinuedHeader(next, input);
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

  // Cover
  const cover: PageLayout = {
    stream: new PdfCanvas(),
    cursorY: 0,
    pageIndex: 0,
    isCover: true,
  };
  drawCover(cover, input);
  pages.push(cover);

  // Content starts on page 2
  let page: PageLayout = {
    stream: new PdfCanvas(),
    cursorY: 0,
    pageIndex: 1,
    isCover: false,
  };
  drawContinuedHeader(page, input);
  drawTableHeader(page);

  const groups = groupByCategory(input.products);
  let rowIndex = 0;

  for (const [category, rows] of groups) {
    page = ensureSpace(pages, page, 34, input);
    const bandY = page.cursorY;
    page.stream.fillRect(MARGIN - 4, bandY - 6, PAGE_W - MARGIN * 2 + 8, 18, C.tealSoft);
    page.stream.fillRect(MARGIN - 4, bandY - 6, 4, 18, C.mango);
    page.stream.text(MARGIN + 8, bandY, category, {
      font: "bold",
      size: 9,
      color: C.tealDeep,
    });
    page.stream.textRight(PAGE_W - MARGIN, bandY, `${rows.length} lines`, {
      size: 8,
      color: C.soft,
    });
    page.cursorY = bandY - 20;

    for (let i = 0; i < rows.length; i += 1) {
      const product = rows[i]!;
      page = ensureSpace(pages, page, 20, input);
      const y = page.cursorY;

      if (rowIndex % 2 === 0) {
        page.stream.fillRect(MARGIN - 4, y - 5, PAGE_W - MARGIN * 2 + 8, 17, C.paperDeep);
      }

      const idx = String(rowIndex + 1).padStart(2, "0");
      page.stream.text(MARGIN, y, idx, {
        size: 7,
        color: C.muted,
      });
      page.stream.text(MARGIN + 22, y, truncate(product.name, 30), {
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
        color: product.available === false ? C.muted : C.mango,
      });

      if (product.available === false) {
        page.stream.text(MARGIN + 22, y - 9, "unavailable", {
          size: 6,
          color: C.muted,
        });
        page.cursorY -= 22;
      } else {
        page.cursorY -= 17;
      }
      rowIndex += 1;
    }
    page.cursorY -= 6;
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
  downloadBlob(blob, filename ?? `${safe || "catalogue"}-price-list.pdf`);
}

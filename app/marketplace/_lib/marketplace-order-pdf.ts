export type MarketplaceOrderLine = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  qty: number;
  unitPrice?: number | null;
  currency?: string | null;
  /** Optional displayed line total, used when this item was rounded. */
  totalOverride?: number;
};

export type MarketplaceOrderPdfInput = {
  supplierName: string;
  supplierPhone?: string | null;
  location?: string | null;
  listedBy?: string | null;
  lines: MarketplaceOrderLine[];
  note?: string;
  /** When false, names and quantities only — no unit or line totals. */
  includePrices?: boolean;
  /**
   * When set, the printed order total uses this value instead of the computed
   * line total (e.g. the total rounded to the nearest 10).
   */
  totalOverride?: number;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 32;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ROW_H = 22;
const FOOTER_H = 48;

type Rgb = readonly [number, number, number];

const C = {
  ink: [0.141, 0.192, 0.165] as Rgb, // #24312A
  inkSoft: [0.361, 0.416, 0.373] as Rgb, // #5C6A5F
  paper: [0.937, 0.949, 0.925] as Rgb, // #EFF2EC
  paperRaised: [0.973, 0.98, 0.965] as Rgb, // #F8FAF6
  line: [0.847, 0.871, 0.808] as Rgb, // #D8DECE
  forest: [0.184, 0.322, 0.2] as Rgb, // #2F5233
  forestDeep: [0.118, 0.231, 0.149] as Rgb, // #1E3B26
  mango: [0.725, 0.412, 0.102] as Rgb, // #B9691A
  tomato: [0.757, 0.271, 0.169] as Rgb, // #C1452B
  heroMuted: [0.796, 0.847, 0.769] as Rgb, // #CBD8C4
  eyebrow: [0.725, 0.788, 0.706] as Rgb, // #B9C9B4
  pillInk: [0.906, 0.933, 0.886] as Rgb, // #E7EEE2
  white: [1, 1, 1] as Rgb,
};

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

function rgb([r, g, b]: Rgb): string {
  return `${trim(r)} ${trim(g)} ${trim(b)}`;
}

function trim(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function textWidth(text: string, size: number, mono = false): number {
  if (mono) return text.length * size * 0.6;
  let w = 0;
  for (const ch of text) {
    if (ch >= "A" && ch <= "Z") w += 0.66;
    else if (ch >= "a" && ch <= "z") w += 0.54;
    else if (ch >= "0" && ch <= "9") w += 0.56;
    else if (ch === " " || ch === "." || ch === "," || ch === "-") w += 0.28;
    else if (ch === "·" || ch === "–" || ch === "×") w += 0.3;
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

/** WhatsApp / PDF money: "Ksh 6.66" with a normal space and two decimals. */
function waMoney(amount: number, currency: string): string {
  const code = currency.trim().toUpperCase() === "KES" || !currency.trim() ? "Ksh" : currency.trim();
  return `${code} ${amount.toFixed(2)}`;
}

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("254")) {
    return `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return raw.trim();
}

type FontKind = "regular" | "bold" | "mono" | "serif";

class PdfCanvas {
  private ops: string[] = [];

  fill(x: number, y: number, w: number, h: number, color: Rgb) {
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
    if (x2 - x1 < 8) return;
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

  textRight(
    xRight: number,
    y: number,
    text: string,
    opts: { font?: FontKind; size?: number; color?: Rgb } = {},
  ) {
    const size = opts.size ?? 10;
    const mono = opts.font === "mono";
    this.text(xRight - textWidth(text, size, mono), y, text, opts);
  }

  toStream(): string {
    return this.ops.join("\n");
  }
}

type PageLayout = {
  stream: PdfCanvas;
  cursorY: number;
};

function paintHero(
  stream: PdfCanvas,
  input: MarketplaceOrderPdfInput,
  ctx: {
    first: boolean;
    dateShort: string;
    items: number;
    units: number;
  },
): number {
  stream.fill(0, 0, PAGE_W, PAGE_H, C.paper);

  if (!ctx.first) {
    stream.fill(0, PAGE_H - 44, PAGE_W, 44, C.forestDeep);
    stream.text(MARGIN, PAGE_H - 28, input.supplierName, { font: "serif", size: 12, color: C.white });
    stream.textRight(PAGE_W - MARGIN, PAGE_H - 28, "Order (continued)", {
      size: 9,
      color: C.heroMuted,
    });
    paintColumnHeads(stream, PAGE_H - 58, input.includePrices !== false);
    return PAGE_H - 72;
  }

  const nameLines = wrapText(input.supplierName, 22, CONTENT_W, 2);
  const listed = Boolean(input.listedBy?.trim());
  const phone = input.supplierPhone?.trim() || "";
  const loc = input.location?.trim() || "";

  let drop = 28;
  if (loc) drop += 16;
  drop += nameLines.length * 24;
  if (listed) drop += 16;
  drop += 32;
  if (phone) drop += 32;
  stream.fill(0, PAGE_H - drop, PAGE_W, drop, C.forestDeep);

  let y = PAGE_H - 28;
  if (loc) {
    stream.text(MARGIN, y, loc.toUpperCase(), { font: "mono", size: 8, color: C.eyebrow });
    y -= 16;
  }
  for (const line of nameLines) {
    stream.text(MARGIN, y, line, { font: "serif", size: 22, color: C.paperRaised });
    y -= 24;
  }
  if (listed) {
    stream.text(MARGIN, y, input.listedBy!.trim(), { size: 10, color: C.heroMuted });
    y -= 16;
  }

  const pills = [
    `${ctx.items} ${ctx.items === 1 ? "item" : "items"}`,
    `${ctx.units} ${ctx.units === 1 ? "unit" : "units"}`,
    ctx.dateShort,
  ];
  let px = MARGIN;
  for (const pill of pills) {
    const w = textWidth(pill, 8, true) + 16;
    stream.roundRect(px, y - 14, w, 16, 8, [0.2, 0.35, 0.22]);
    stream.text(px + 8, y - 10, pill, { font: "mono", size: 8, color: C.pillInk });
    px += w + 6;
  }
  y -= 32;

  if (phone) {
    stream.fill(0, PAGE_H - drop, PAGE_W, 32, C.forest);
    stream.text(MARGIN, PAGE_H - drop + 12, formatPhoneDisplay(phone), {
      font: "mono",
      size: 13,
      color: C.white,
    });
    stream.textRight(PAGE_W - MARGIN, PAGE_H - drop + 12, "WhatsApp or call with packs & quantities", {
      size: 8,
      color: C.heroMuted,
    });
  }

  const headsY = PAGE_H - drop - 18;
  paintColumnHeads(stream, headsY, input.includePrices !== false);
  return headsY - 14;
}

function paintColumnHeads(stream: PdfCanvas, y: number, includePrices: boolean) {
  stream.text(MARGIN, y, "ITEM", { font: "bold", size: 7.5, color: C.inkSoft });
  if (includePrices) {
    stream.textRight(PAGE_W - MARGIN, y, "TOTAL", { font: "bold", size: 7.5, color: C.inkSoft });
  }
  stream.line(MARGIN, y - 5, PAGE_W - MARGIN, y - 5, C.line, 0.4);
}

function newPage(
  input: MarketplaceOrderPdfInput,
  continued: boolean,
  ctx: { dateShort: string; items: number; units: number },
): PageLayout {
  const stream = new PdfCanvas();
  const cursorY = paintHero(stream, input, { first: !continued, ...ctx });
  return { stream, cursorY };
}

function drawTableRow(
  page: PageLayout,
  line: MarketplaceOrderLine,
  currency: string,
  includePrices: boolean,
) {
  const { stream } = page;
  const y = page.cursorY - ROW_H;
  const qty = `× ${line.qty}`;
  const price =
    includePrices
      ? line.unitPrice != null
        ? waMoney(
            line.totalOverride ?? line.unitPrice * line.qty,
            line.currency ?? currency,
          )
        : "Ask"
      : "";
  const ask = includePrices && line.unitPrice == null;
  const priceW = includePrices ? textWidth(price, 10, true) : 0;
  const qtyW = textWidth(qty, 9);
  const nameMax = CONTENT_W - priceW - qtyW - 28;
  const name = truncateToWidth(line.name, 10, nameMax);

  stream.text(MARGIN, y + 6, name, { font: "bold", size: 10, color: C.ink });
  const nameEnd = MARGIN + textWidth(name, 10);
  stream.text(nameEnd + 6, y + 6, qty, { size: 9, color: C.inkSoft });
  const qtyEnd = nameEnd + 6 + qtyW;
  if (includePrices) {
    stream.dashLine(qtyEnd + 6, y + 8, PAGE_W - MARGIN - priceW - 8, y + 8, C.line);
    stream.textRight(PAGE_W - MARGIN, y + 6, price, {
      font: "mono",
      size: 10,
      color: ask ? C.tomato : C.mango,
    });
  }
  stream.line(MARGIN, y, PAGE_W - MARGIN, y, C.line, 0.3);
  page.cursorY = y;
}

function drawTotal(
  page: PageLayout,
  total: number,
  currency: string,
  priced: boolean,
  items: number,
  units: number,
  includePrices: boolean,
) {
  const { stream } = page;
  const y = page.cursorY - 36;
  stream.roundRect(MARGIN, y, CONTENT_W, 32, 6, C.forestDeep);
  stream.text(MARGIN + 12, y + 12, includePrices ? "TOTAL" : "ORDER", {
    font: "bold",
    size: 9,
    color: C.heroMuted,
  });
  stream.textRight(
    PAGE_W - MARGIN - 12,
    y + 11,
    includePrices
      ? priced
        ? waMoney(total, currency)
        : "Ask"
      : `${items} ${items === 1 ? "item" : "items"}`,
    {
      font: "mono",
      size: 13,
      color: C.white,
    },
  );
  stream.text(
    MARGIN,
    y - 14,
    `${items} ${items === 1 ? "item" : "items"} · ${units} ${units === 1 ? "unit" : "units"}`,
    { font: "mono", size: 8, color: C.inkSoft },
  );
  page.cursorY = y - 22;
}

function drawNote(page: PageLayout, note: string) {
  const { stream } = page;
  const y = page.cursorY - 4;
  stream.text(MARGIN, y, truncateToWidth(note, 9, CONTENT_W), { size: 9, color: C.inkSoft });
  page.cursorY = y - 16;
}

function drawFooter(
  page: PageLayout,
  dateLong: string,
  pageNo: number,
  of: number,
  includePrices: boolean,
) {
  const { stream } = page;
  stream.line(MARGIN, 32, PAGE_W - MARGIN, 32, C.line, 0.3);
  stream.text(
    MARGIN,
    20,
    includePrices
      ? "Kiosk.ke · Please confirm availability and pricing."
      : "Kiosk.ke · Please confirm availability.",
    {
      size: 8,
      color: C.inkSoft,
    },
  );
  stream.textRight(PAGE_W - MARGIN, 20, `${dateLong}  ·  ${pageNo} / ${of}`, {
    font: "mono",
    size: 8,
    color: C.inkSoft,
  });
}

/** Minimal single/multi-page PDF — Githurai price-list colours, no extra dependencies. */
export function buildMarketplaceOrderPdf(input: MarketplaceOrderPdfInput): Blob {
  const now = new Date();
  const dateShort = now.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dateLong = now.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let currency = "KES";
  let total = 0;
  let pricedCount = 0;
  for (const line of input.lines) {
    if (line.currency) currency = line.currency;
    if (line.unitPrice != null) {
      total += line.totalOverride ?? line.unitPrice * line.qty;
      pricedCount += 1;
    }
  }
  if (input.totalOverride != null) {
    total = input.totalOverride;
  }
  const items = input.lines.length;
  const units = input.lines.reduce((sum, line) => sum + line.qty, 0);
  const includePrices = input.includePrices !== false;
  const ctx = { dateShort, items, units };

  const pages: PageLayout[] = [];
  let page = newPage(input, false, ctx);

  input.lines.forEach((line) => {
    if (page.cursorY - ROW_H < FOOTER_H + 40) {
      pages.push(page);
      page = newPage(input, true, ctx);
    }
    drawTableRow(page, line, currency, includePrices);
  });

  if (page.cursorY < FOOTER_H + 70) {
    pages.push(page);
    page = newPage(input, true, ctx);
  }
  drawTotal(page, total, currency, pricedCount > 0, items, units, includePrices);

  if (input.note) {
    if (page.cursorY < FOOTER_H + 24) {
      pages.push(page);
      page = newPage(input, true, ctx);
    }
    drawNote(page, input.note);
  }

  pages.push(page);
  pages.forEach((p, i) => drawFooter(p, dateLong, i + 1, pages.length, includePrices));

  return assemblePdf(pages.map((p) => p.stream.toStream()));
}

function assemblePdf(contentStreams: string[]): Blob {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("");
  objects.push("3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  objects.push("4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n");
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>endobj\n");
  objects.push("6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>endobj\n");

  let nextId = 7;
  for (const stream of contentStreams) {
    const pageId = nextId;
    const contentId = nextId + 1;
    pageObjectIds.push(pageId);
    objects.push(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R /Resources<< /Font<< /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> >>endobj\n`,
    );
    const bytes = latin1Encode(stream);
    objects.push(`${contentId} 0 obj<< /Length ${bytes.length} >>stream\n${stream}\nendstream\nendobj\n`);
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

  return new Blob([latin1Encode(pdf)], { type: "application/pdf" });
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

const WA_RULE = "━━━━━━━━━━━━";

/** Compact amount for WhatsApp lines: 25, 6.67 — no trailing zeros. */
function waAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function waCurrencyLabel(currency: string): string {
  const code = currency.trim().toUpperCase();
  return code === "KES" || !code ? "Ksh" : currency.trim();
}

/**
 * Plain-text order list shared between the WhatsApp URL and clipboard copy.
 */
export function buildMarketplaceOrderText(
  lines: MarketplaceOrderLine[],
  opts: {
    supplierName: string;
    filename?: string;
    catalogueUrl?: string;
    /** When set, the TOTAL line uses this value instead of the computed total. */
    totalOverride?: number;
  },
): string {
  const currency = lines.find((l) => l.currency)?.currency?.trim() || "KES";
  const currencyLabel = waCurrencyLabel(currency);
  let estimatedTotal = 0;
  let pricedCount = 0;

  const itemLines = lines.map((line, index) => {
    const name = line.name.trim();
    const n = `${index + 1}. ${name}`;
    if (line.unitPrice != null) {
      const lineTotal = line.totalOverride ?? line.unitPrice * line.qty;
      estimatedTotal += lineTotal;
      pricedCount += 1;
      return `${n} — ${line.qty} × ${waAmount(line.unitPrice)} = *${waAmount(lineTotal)}*`;
    }
    return `${n} — ${line.qty}`;
  });

  const totalUnits = lines.reduce((sum, l) => sum + l.qty, 0);
  const itemWord = lines.length === 1 ? "item" : "items";
  const unitWord = totalUnits === 1 ? "unit" : "units";
  const totalValue = opts.totalOverride ?? estimatedTotal;
  const totalLine =
    pricedCount > 0
      ? `*ORDER TOTAL: ${currencyLabel} ${waAmount(totalValue)}*`
      : "*ORDER TOTAL: Ask*";

  const text = [
    `🛒 *NEW ORDER — ${opts.supplierName}*`,
    "",
    "*Items:*",
    ...itemLines,
    "",
    WA_RULE,
    totalLine,
    `📦 ${lines.length} ${itemWord} • ${totalUnits} ${unitWord}`,
    WA_RULE,
  ];
  if (opts.filename || opts.catalogueUrl) {
    text.push("");
    if (opts.filename) text.push(`📄 Order PDF: ${opts.filename}`);
    if (opts.catalogueUrl) text.push(`🔗 Catalogue: ${opts.catalogueUrl}`);
  }
  text.push("", "✅ Please confirm availability & pricing.", "Thank you! 🙏");

  return text.join("\n");
}

export function buildWhatsAppOrderUrl(opts: {
  phone: string | null | undefined;
  supplierName: string;
  lines: MarketplaceOrderLine[];
  filename?: string;
  catalogueUrl?: string;
  /** When set, the TOTAL line uses this value instead of the computed total. */
  totalOverride?: number;
}): string | null {
  const phone = normalizeWhatsAppPhone(opts.phone);
  if (!phone) return null;

  const text = buildMarketplaceOrderText(opts.lines, {
    supplierName: opts.supplierName,
    filename: opts.filename,
    catalogueUrl: opts.catalogueUrl,
    totalOverride: opts.totalOverride,
  });

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
      /* fall through to download */
    }
  }
  downloadBlob(blob, filename);
  if (whatsappUrl) {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }
  return "downloaded";
}

/**
 * Print-ready A4 inventory price list.
 *
 * Selling-only is a two-column shop sheet. Buying and selling is a
 * single-column staff ledger. Both are black-on-white so they photocopy.
 */

export type InventoryPriceListMode = "sell" | "both";

export type InventoryPriceListItem = {
  name: string;
  category: string | null;
  buyPrice: number | null;
  sellPrice: number | null;
};

export type InventoryPriceListInput = {
  mode: InventoryPriceListMode;
  businessName: string;
  branchName?: string | null;
  scope?: string | null;
  currency?: string;
  generatedAt?: Date;
  items: InventoryPriceListItem[];
};

type Rgb = readonly [number, number, number];
type FontKind = "regular" | "bold" | "mono";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 32;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const CONTENT_FLOOR = 36;
const TOP_INSET = 28;
const BAR_H = 5;
const NAME_SIZE = 16;
const TITLE_SIZE = 10;
const META_SIZE = 8;
const COL_HEAD_H = 16;
const RULE_GAP = 14;
const ROW_H = 15;
const CATEGORY_H = 18;
const SELL_GAP = 22;
const SELL_COL_W = (CONTENT_W - SELL_GAP) / 2;
const PRICE_COL_W = 72;
const OTHER_CATEGORY = "Other";
const NAME_FONT = 9;
const PRICE_FONT = 9;

const INK: Rgb = [0.09, 0.11, 0.1];
const SOFT: Rgb = [0.28, 0.32, 0.3];
const MUTED: Rgb = [0.42, 0.45, 0.43];
const HAIR: Rgb = [0.78, 0.8, 0.77];
const BAND: Rgb = [0.93, 0.94, 0.92];
const ZEBRA: Rgb = [0.965, 0.97, 0.962];
const FOREST: Rgb = [0.059, 0.463, 0.431];
const RULE: Rgb = [0.1, 0.12, 0.11];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type Section = {
  label: string;
  items: InventoryPriceListItem[];
};

type Block =
  | { kind: "category"; label: string; count: number; continued: boolean; height: number }
  | { kind: "sell"; left: InventoryPriceListItem; right: InventoryPriceListItem | null; height: number; stripe: boolean }
  | { kind: "both"; item: InventoryPriceListItem; height: number; stripe: boolean };

class PdfCanvas {
  private ops: string[] = [];

  fill(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${rgb(color)} rg`, `${n(x)} ${n(y)} ${n(w)} ${n(h)} re`, "f");
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb, width: number) {
    this.ops.push(
      `${width} w`,
      `${rgb(color)} RG`,
      `${n(x1)} ${n(y1)} m`,
      `${n(x2)} ${n(y2)} l`,
      "S",
    );
  }

  dash(x1: number, y1: number, x2: number, y2: number, color: Rgb) {
    if (x2 - x1 < 8) return;
    this.ops.push(
      "[0.6 1.6] 0 d",
      "0.4 w",
      `${rgb(color)} RG`,
      `${n(x1)} ${n(y1)} m`,
      `${n(x2)} ${n(y2)} l`,
      "S",
      "[] 0 d",
    );
  }

  text(x: number, y: number, value: string, opts: { font?: FontKind; size?: number; color?: Rgb }) {
    const size = opts.size ?? 10;
    const font = opts.font === "bold" ? "/F2" : opts.font === "mono" ? "/F3" : "/F1";
    this.ops.push(
      "BT",
      `${rgb(opts.color ?? INK)} rg`,
      `${font} ${size} Tf`,
      `1 0 0 1 ${n(x)} ${n(y)} Tm`,
      `(${escapePdfText(value)}) Tj`,
      "ET",
    );
  }

  textRight(xRight: number, y: number, value: string, opts: { font?: FontKind; size?: number; color?: Rgb }) {
    const size = opts.size ?? 10;
    this.text(xRight - textWidth(value, size, opts.font ?? "regular"), y, value, opts);
  }

  toStream(): string {
    return this.ops.join("\n");
  }
}

function rgb([r, g, b]: Rgb): string {
  return `${trim(r)} ${trim(g)} ${trim(b)}`;
}

function n(value: number): number {
  return Math.round(value * 100) / 100;
}

function trim(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function escapePdfText(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    out += code <= 0xff ? ch : "?";
  }
  return out.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function textWidth(text: string, size: number, font: FontKind): number {
  if (font === "mono") return text.length * size * 0.6;
  let width = 0;
  for (const ch of text) {
    if (ch >= "A" && ch <= "Z") width += 0.66;
    else if (ch >= "a" && ch <= "z") width += 0.52;
    else if (ch >= "0" && ch <= "9") width += 0.56;
    else if (ch === " " || ch === "." || ch === ",") width += 0.28;
    else width += 0.5;
  }
  return width * size * (font === "bold" ? 1.05 : 1);
}

function truncateToWidth(text: string, size: number, font: FontKind, maxWidth: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (textWidth(clean, size, font) <= maxWidth) return clean;
  let sliced = clean;
  while (sliced.length > 1 && textWidth(`${sliced}...`, size, font) > maxWidth) {
    sliced = sliced.slice(0, -1);
  }
  return `${sliced}...`;
}

function formatPrintDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  const rounded = Math.round(value * 100) / 100;
  const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.001;
  return rounded.toLocaleString("en-KE", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function compareLabel(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function groupSections(items: InventoryPriceListItem[]): Section[] {
  const buckets = new Map<string, InventoryPriceListItem[]>();
  for (const item of items) {
    const label = item.category?.trim() || OTHER_CATEGORY;
    const list = buckets.get(label) ?? [];
    list.push(item);
    buckets.set(label, list);
  }
  const sections = [...buckets.entries()].map(([label, rows]) => ({
    label,
    items: [...rows].sort((a, b) => compareLabel(a.name, b.name)),
  }));
  const named = sections.filter((section) => section.label !== OTHER_CATEGORY);
  if (named.length === 0) {
    const loose = sections[0]?.items ?? [];
    return [{ label: "", items: loose }];
  }
  named.sort((a, b) => compareLabel(a.label, b.label));
  const other = sections.find((section) => section.label === OTHER_CATEGORY);
  return other ? [...named, other] : named;
}

function buildBlocks(input: InventoryPriceListInput): Block[] {
  const blocks: Block[] = [];
  for (const section of groupSections(input.items)) {
    if (section.label) {
      blocks.push({
        kind: "category",
        label: section.label,
        count: section.items.length,
        continued: false,
        height: CATEGORY_H,
      });
    }
    if (input.mode === "sell") {
      pushSellRows(blocks, section.items);
    } else {
      pushBothRows(blocks, section.items);
    }
  }
  return blocks;
}

function pushSellRows(blocks: Block[], items: InventoryPriceListItem[]) {
  for (let index = 0; index < items.length; index += 2) {
    blocks.push({
      kind: "sell",
      left: items[index],
      right: items[index + 1] ?? null,
      height: ROW_H,
      stripe: Math.floor(index / 2) % 2 === 1,
    });
  }
}

function pushBothRows(blocks: Block[], items: InventoryPriceListItem[]) {
  items.forEach((item, index) => {
    blocks.push({
      kind: "both",
      item,
      height: ROW_H,
      stripe: index % 2 === 1,
    });
  });
}

function hasScope(input: InventoryPriceListInput): boolean {
  return Boolean(input.scope?.trim());
}

function firstListTop(scoped: boolean): number {
  const barBottom = PAGE_H - TOP_INSET - BAR_H;
  const metaY = barBottom - 20 - 18 - 14;
  const ruleY = metaY - (scoped ? 24 : 10);
  return ruleY - 3 - RULE_GAP - COL_HEAD_H;
}

function runningListTop(): number {
  return PAGE_H - 30 - RULE_GAP - COL_HEAD_H;
}

function packPages(blocks: Block[], firstLimit: number, nextLimit: number): Block[][] {
  const pages: Block[][] = [];
  let page: Block[] = [];
  let used = 0;
  let limit = firstLimit;
  let category = "";

  const flush = () => {
    if (page.length === 0) return;
    pages.push(page);
    page = [];
    used = 0;
    limit = nextLimit;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.kind === "category" && !block.continued) category = block.label;
    const follower = block.kind === "category" ? (blocks[index + 1]?.height ?? 0) : 0;
    if (page.length > 0 && used + block.height + follower > limit) flush();
    if (page.length === 0 && block.kind !== "category" && category) {
      page.push({
        kind: "category",
        label: category,
        count: 0,
        continued: true,
        height: CATEGORY_H,
      });
      used += CATEGORY_H;
    }
    page.push(block);
    used += block.height;
  }
  flush();
  return pages.length > 0 ? pages : [[]];
}

function usableHeight(top: number): number {
  return top - CONTENT_FLOOR;
}

function modeTitle(mode: InventoryPriceListMode): string {
  return mode === "both" ? "Buying and selling prices" : "Selling prices";
}

function paintFirstMasthead(canvas: PdfCanvas, input: InventoryPriceListInput, when: Date): number {
  const scoped = hasScope(input);
  const barBottom = PAGE_H - TOP_INSET - BAR_H;
  canvas.fill(MARGIN_X, barBottom, CONTENT_W, BAR_H, FOREST);

  const nameY = barBottom - 20;
  const title = truncateToWidth(input.businessName.trim() || "Shop", NAME_SIZE, "bold", CONTENT_W - 90);
  canvas.text(MARGIN_X, nameY, title, { font: "bold", size: NAME_SIZE, color: INK });
  canvas.textRight(PAGE_W - MARGIN_X, nameY + 2, formatPrintDate(when), {
    size: META_SIZE,
    color: MUTED,
  });

  const titleY = nameY - 18;
  canvas.text(MARGIN_X, titleY, modeTitle(input.mode), { font: "bold", size: TITLE_SIZE, color: FOREST });

  const metaY = titleY - 14;
  const branch = input.branchName?.trim();
  const count = input.items.length.toLocaleString("en-KE");
  const currency = (input.currency?.trim() || "KES").toUpperCase();
  const meta = [branch, `${count} ${input.items.length === 1 ? "item" : "items"}`, currency, "By category"]
    .filter(Boolean)
    .join("   ·   ");
  canvas.text(MARGIN_X, metaY, truncateToWidth(meta, META_SIZE, "regular", CONTENT_W), {
    size: META_SIZE,
    color: SOFT,
  });

  let ruleY = metaY - 10;
  const scope = input.scope?.trim();
  if (scope) {
    const scopeY = metaY - 14;
    canvas.text(MARGIN_X, scopeY, truncateToWidth(scope, META_SIZE, "regular", CONTENT_W), {
      size: META_SIZE,
      color: MUTED,
    });
    ruleY = scopeY - 10;
  }

  canvas.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY, RULE, 1);
  canvas.line(MARGIN_X, ruleY - 3, PAGE_W - MARGIN_X, ruleY - 3, HAIR, 0.4);
  return firstListTop(scoped);
}

function paintRunningHead(
  canvas: PdfCanvas,
  input: InventoryPriceListInput,
  when: Date,
): number {
  const y = PAGE_H - 22;
  const left = truncateToWidth(
    `${input.businessName.trim() || "Shop"}   ·   ${modeTitle(input.mode)}`,
    8,
    "bold",
    CONTENT_W - 80,
  );
  canvas.text(MARGIN_X, y, left, { font: "bold", size: 8, color: INK });
  canvas.textRight(PAGE_W - MARGIN_X, y, formatPrintDate(when), { size: 8, color: MUTED });
  canvas.line(MARGIN_X, PAGE_H - 30, PAGE_W - MARGIN_X, PAGE_H - 30, RULE, 0.8);
  return runningListTop();
}

function paintColumnHeads(canvas: PdfCanvas, mode: InventoryPriceListMode, top: number) {
  const baseline = top + 5;
  canvas.text(MARGIN_X, baseline, "ITEM", { size: 7, color: MUTED });
  if (mode === "sell") {
    paintSellColumnHead(canvas, baseline, 0);
    paintSellColumnHead(canvas, baseline, 1);
  } else {
    const sellRight = PAGE_W - MARGIN_X;
    const buyRight = sellRight - PRICE_COL_W;
    canvas.textRight(buyRight, baseline, "BUYING", { size: 7, color: MUTED });
    canvas.textRight(sellRight, baseline, "SELLING", { size: 7, color: MUTED });
  }
  canvas.line(MARGIN_X, top + 1, PAGE_W - MARGIN_X, top + 1, HAIR, 0.6);
}

function paintSellColumnHead(canvas: PdfCanvas, baseline: number, column: number) {
  const x = MARGIN_X + column * (SELL_COL_W + SELL_GAP);
  if (column === 1) {
    canvas.text(x, baseline, "ITEM", { size: 7, color: MUTED });
  }
  canvas.textRight(x + SELL_COL_W, baseline, "PRICE", { size: 7, color: MUTED });
}

function paintCategory(canvas: PdfCanvas, top: number, block: Extract<Block, { kind: "category" }>) {
  const bottom = top - block.height;
  canvas.fill(MARGIN_X, bottom + 3, CONTENT_W, block.height - 5, BAND);
  canvas.fill(MARGIN_X, bottom + 3, 3, block.height - 5, FOREST);
  const title = block.continued
    ? `${block.label.toUpperCase()}   ·   continued`
    : `${block.label.toUpperCase()}   ·   ${block.count}`;
  canvas.text(MARGIN_X + 10, bottom + 7, truncateToWidth(title, 8, "bold", CONTENT_W - 24), {
    font: "bold",
    size: 8,
    color: FOREST,
  });
}

function paintSellRow(canvas: PdfCanvas, top: number, block: Extract<Block, { kind: "sell" }>) {
  const baseline = top - 11;
  if (block.stripe) paintSellStripe(canvas, top);
  paintSellCell(canvas, MARGIN_X, baseline, block.left);
  if (block.right) paintSellCell(canvas, MARGIN_X + SELL_COL_W + SELL_GAP, baseline, block.right);
  canvas.line(MARGIN_X, top - ROW_H + 1, PAGE_W - MARGIN_X, top - ROW_H + 1, HAIR, 0.3);
}

function paintSellStripe(canvas: PdfCanvas, top: number) {
  const y = top - ROW_H + 1;
  const h = ROW_H - 1;
  canvas.fill(MARGIN_X, y, SELL_COL_W, h, ZEBRA);
  canvas.fill(MARGIN_X + SELL_COL_W + SELL_GAP, y, SELL_COL_W, h, ZEBRA);
}

function paintSellCell(canvas: PdfCanvas, x: number, baseline: number, item: InventoryPriceListItem) {
  const price = formatPrice(item.sellPrice);
  const priceW = textWidth(price, PRICE_FONT, "mono");
  const name = truncateToWidth(item.name, NAME_FONT, "regular", SELL_COL_W - priceW - 14);
  canvas.text(x, baseline, name, { size: NAME_FONT, color: INK });
  const nameEnd = x + textWidth(name, NAME_FONT, "regular");
  canvas.dash(nameEnd + 4, baseline + 2, x + SELL_COL_W - priceW - 5, baseline + 2, HAIR);
  canvas.textRight(x + SELL_COL_W, baseline, price, {
    font: "mono",
    size: PRICE_FONT,
    color: INK,
  });
}

function paintBothRow(canvas: PdfCanvas, top: number, block: Extract<Block, { kind: "both" }>) {
  const baseline = top - 11;
  if (block.stripe) {
    canvas.fill(MARGIN_X, top - ROW_H + 1, CONTENT_W, ROW_H - 1, ZEBRA);
  }
  const sellRight = PAGE_W - MARGIN_X;
  const buyRight = sellRight - PRICE_COL_W;
  const nameMax = buyRight - MARGIN_X - 12;
  canvas.text(MARGIN_X, baseline, truncateToWidth(block.item.name, NAME_FONT, "regular", nameMax), {
    size: NAME_FONT,
    color: INK,
  });
  canvas.textRight(buyRight, baseline, formatPrice(block.item.buyPrice), {
    font: "mono",
    size: PRICE_FONT,
    color: SOFT,
  });
  canvas.textRight(sellRight, baseline, formatPrice(block.item.sellPrice), {
    font: "mono",
    size: PRICE_FONT,
    color: INK,
  });
  canvas.line(MARGIN_X, top - ROW_H + 1, PAGE_W - MARGIN_X, top - ROW_H + 1, HAIR, 0.3);
}

function paintFooter(canvas: PdfCanvas, input: InventoryPriceListInput, pageNo: number, pageCount: number) {
  canvas.line(MARGIN_X, 32, PAGE_W - MARGIN_X, 32, HAIR, 0.5);
  const note = input.mode === "both" ? "Staff copy  ·  buying prices stay in the shop" : "Shop copy  ·  selling prices";
  canvas.text(MARGIN_X, 20, note, { size: 7.5, color: MUTED });
  canvas.textRight(PAGE_W - MARGIN_X, 20, `${pageNo}  /  ${pageCount}`, {
    font: "mono",
    size: 8,
    color: SOFT,
  });
}

function paintGutter(canvas: PdfCanvas, top: number) {
  const x = MARGIN_X + SELL_COL_W + SELL_GAP / 2;
  canvas.line(x, CONTENT_FLOOR + 8, x, top, HAIR, 0.4);
}

function paintPage(
  input: InventoryPriceListInput,
  blocks: Block[],
  pageIndex: number,
  pageCount: number,
  when: Date,
): PdfCanvas {
  const canvas = new PdfCanvas();
  const first = pageIndex === 0;
  const top = first
    ? paintFirstMasthead(canvas, input, when)
    : paintRunningHead(canvas, input, when);
  paintColumnHeads(canvas, input.mode, top);
  if (input.mode === "sell" && (blocks.length > 0 || input.items.length > 0)) {
    paintGutter(canvas, top);
  }
  let cursor = top;
  if (blocks.length === 0 && first) {
    canvas.text(MARGIN_X, cursor - 16, "No items match this view.", { size: 10, color: SOFT });
  }
  for (const block of blocks) {
    if (block.kind === "category") paintCategory(canvas, cursor, block);
    else if (block.kind === "sell") paintSellRow(canvas, cursor, block);
    else paintBothRow(canvas, cursor, block);
    cursor -= block.height;
  }
  paintFooter(canvas, input, pageIndex + 1, pageCount);
  return canvas;
}

function latin1(value: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function assemblePdf(pages: PdfCanvas[]): Blob {
  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [];
  const encoder = new TextEncoder();

  const push = (value: string) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    length += bytes.length;
  };
  const writeObject = (body: string) => {
    offsets.push(length);
    push(body);
  };

  const totalObjects = 5 + pages.length * 2;
  push("%PDF-1.4\n");
  writeObject("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  const kids = pages.map((_, index) => `${6 + index * 2} 0 R`).join(" ");
  writeObject(`2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>endobj\n`);
  writeObject("3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  writeObject("4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n");
  writeObject("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>endobj\n");

  pages.forEach((page, pageIndex) => {
    const pageId = 6 + pageIndex * 2;
    const contentId = pageId + 1;
    writeObject(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R /Resources<< /Font<< /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>endobj\n`,
    );
    const stream = latin1(page.toStream());
    writeObject(`${contentId} 0 obj<< /Length ${stream.length} >>stream\n`);
    chunks.push(stream);
    length += stream.length;
    push("\nendstream\nendobj\n");
  });

  const xrefStart = length;
  push(`xref\n0 ${totalObjects + 1}\n`);
  push("0000000000 65535 f \n");
  for (let index = 1; index <= totalObjects; index += 1) {
    push(`${String(offsets[index - 1]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer<< /Size ${totalObjects + 1} /Root 1 0 R >>\n`);
  push(`startxref\n${xrefStart}\n%%EOF`);

  const blob = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    blob.set(chunk, offset);
    offset += chunk.length;
  }
  return new Blob([blob], { type: "application/pdf" });
}

export function inventoryPriceListFilename(
  businessName: string,
  mode: InventoryPriceListMode,
  when: Date,
): string {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "inventory";
  const kind = mode === "both" ? "buy-sell" : "selling";
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  return `${slug}-${kind}-prices-${when.getFullYear()}-${month}-${day}.pdf`;
}

/** A4 price list for the current stock view. `sell` omits buying prices. */
export function buildInventoryPriceListPdf(input: InventoryPriceListInput): Blob {
  const when = input.generatedAt ?? new Date();
  const blocks = buildBlocks(input);
  const scoped = hasScope(input);
  const pages = packPages(
    blocks,
    usableHeight(firstListTop(scoped)),
    usableHeight(runningListTop()),
  );
  return assemblePdf(pages.map((page, index) => paintPage(input, page, index, pages.length, when)));
}

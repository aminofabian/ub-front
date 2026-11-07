import { barcodePngDataUrl } from "@/lib/price-tags/barcode";
import { MIN_PRINT_MODULE_MM, barcodeFitsWidth, code128Modules } from "@/lib/price-tags/code128";
import { TAG_TYPE_MM, blockSizeMm, buildFaceBlocks, type FaceBlock } from "@/lib/price-tags/face";
import { cellPosition, faceSize, tagTypeScale } from "@/lib/price-tags/layout";
import { BLOCK_GAP_MM, SHELF_PRICE_FLOOR, fitFaceBlocks, type MeasuredBlock } from "@/lib/price-tags/pdf-fit";
import type {
  PrinterCalibration,
  SheetCell,
  SheetGeometry,
  TagLayout,
  TagProduct,
} from "@/lib/price-tags/types";

export type TagDrawJob = Omit<PdfJob, "fileName">;

type PdfJob = {
  layout: TagLayout;
  geometry: SheetGeometry;
  pages: SheetCell[][];
  products: ReadonlyMap<string, TagProduct>;
  wasOverrides: Readonly<Record<string, number | null>>;
  businessName: string;
  currency: string | null | undefined;
  calibration: PrinterCalibration;
  fileName: string;
};

type Rgb = [number, number, number];
const INK: Rgb = [18, 26, 22];
const MUTED: Rgb = [85, 97, 89];
const ACCENT: Rgb = [165, 82, 55];
const BRAND: Rgb = [29, 75, 59];

const PT_PER_MM = 72 / 25.4;
const PAD_X = 2;
const PAD_Y = 1.5;

/** Share of the face width a barcode may take. */
const BARCODE_WIDTH_SHARE = 0.96;

/** The drawing calls a tag needs. jsPDF provides them; so does the label-printer canvas. */
export type TagDoc = {
  /** Set by a bitmap doc: barcodes snap to whole dots and need 2 dots per bar. */
  dotsPerMm?: number;
  setDrawColor: (...args: number[]) => void;
  setLineWidth: (width: number) => void;
  setLineDashPattern: (pattern: number[], phase: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  setTextColor: (...args: number[]) => void;
  setFont: (font: string, style: string) => void;
  setFontSize: (size: number) => void;
  getTextWidth: (text: string) => number;
  text: (text: string, x: number, y: number, options?: { angle?: number }) => void;
  splitTextToSize: (text: string, width: number) => string[];
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
};

export async function downloadPriceTagsPdf(job: PdfJob): Promise<void> {
  const { jsPDF } = await import("jspdf");
  // The page is the geometry's page: A4 either way round, or one roll label.
  const format = [job.geometry.pageWidthMm, job.geometry.pageHeightMm];
  const direction = format[0] > format[1] ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "mm", format, orientation: direction, compress: true });
  const images = new Map<string, string>();
  job.pages.forEach((cells, pageIndex) => {
    if (pageIndex > 0) doc.addPage(format, direction);
    drawPageCells(doc, job, cells, images);
  });
  doc.save(job.fileName);
}

/** Draw one page (an A4 sheet or one row of a label roll) onto any TagDoc. */
export function drawPageCells(
  doc: TagDoc,
  job: TagDrawJob,
  cells: readonly SheetCell[],
  images: Map<string, string>,
): void {
  cells.forEach((slot, index) => {
    const { x, y } = cellPosition(job.geometry, index);
    const px = x + job.calibration.offsetXMm;
    const py = y + job.calibration.offsetYMm;
    if (!slot) {
      if (job.layout.media !== "label-roll" && job.layout.border !== "none") {
        strokeBorder(doc, "dashed", px, py, job.geometry.tagWidthMm, job.geometry.tagHeightMm);
      }
      return;
    }
    const product = job.products.get(slot.itemId);
    if (!product) return;
    drawTag(doc, job, product, px, py, images);
  });
}

function setFontMm(doc: TagDoc, sizeMm: number, bold: boolean) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(sizeMm * PT_PER_MM);
}

function blockStyle(block: FaceBlock, template: TagLayout["templateId"]): { bold: boolean; color: Rgb } {
  switch (block.kind) {
    case "shop":
      return { bold: true, color: BRAND };
    case "deal":
    case "off":
      return { bold: true, color: ACCENT };
    case "name":
      return { bold: template !== "premium", color: INK };
    case "price":
      return { bold: true, color: block.missing || template === "promo" ? ACCENT : INK };
    default:
      return { bold: false, color: MUTED };
  }
}

/**
 * Intl puts a no-break space in "Ksh 65". jsPDF's built-in Helvetica measures
 * it wider than it draws it, which pushes centred prices and strike-throughs
 * off, so the PDF uses a plain space.
 */
function plainSpaces(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, " ");
}

function displayText(block: FaceBlock): string {
  if (block.kind === "barcode") return "";
  if (block.kind === "shop" || block.kind === "deal" || block.kind === "off") {
    return block.text.toUpperCase();
  }
  return block.text;
}

/** Up to two lines, with an ellipsis when the name runs longer. */
function nameLines(doc: TagDoc, text: string, width: number): string[] {
  const lines = doc.splitTextToSize(text, width);
  if (lines.length <= 2) return lines;
  let second = lines[1];
  while (second.length > 1 && doc.getTextWidth(`${second}…`) > width) second = second.slice(0, -1);
  return [lines[0], `${second.trimEnd()}…`];
}

/** Narrowest bar this doc can print legibly. */
function minModuleMm(doc: TagDoc): number {
  return doc.dotsPerMm ? 2 / doc.dotsPerMm : MIN_PRINT_MODULE_MM;
}

/**
 * Barcode width for the face: most of it, and on a bitmap doc a whole number
 * of dots per bar so no bar is a dot wider than its neighbour.
 */
function barcodeWidthMm(doc: TagDoc, code: string, innerW: number): number {
  const wanted = innerW * BARCODE_WIDTH_SHARE;
  if (!doc.dotsPerMm) return wanted;
  const dotsPerModule = Math.max(2, Math.floor((wanted * doc.dotsPerMm) / code128Modules(code)));
  return (code128Modules(code) * dotsPerModule) / doc.dotsPerMm;
}

function measure(doc: TagDoc, blocks: FaceBlock[], job: TagDrawJob, scale: number, innerW: number) {
  const template = job.layout.templateId;
  const drawable = blocks.filter(
    (block) => block.kind !== "barcode" || barcodeFitsWidth(block.code, innerW * BARCODE_WIDTH_SHARE, minModuleMm(doc)),
  );
  return drawable.map((block): MeasuredBlock => {
    const missing = block.kind === "price" && block.missing;
    let sizeMm = blockSizeMm(block.kind, template, missing) * scale;
    if (block.kind === "barcode") return { block, sizeMm, lines: [], heightMm: sizeMm + 0.4 + TAG_TYPE_MM.barcodeDigits + 0.3 };
    const style = blockStyle(block, template);
    setFontMm(doc, sizeMm, style.bold);
    if (block.kind === "price") {
      // Shrink a long price to the face width rather than run off the tag.
      const per = block.per ? ` / ${block.per}` : "";
      const text = plainSpaces(block.text);
      const inline = markBesidePrice(template, block.mark);
      let markW = 0;
      if (inline) {
        setFontMm(doc, sizeMm * INLINE_MARK_SHARE, true);
        markW = doc.getTextWidth(inlineMarkText(block.mark)) + sizeMm * INLINE_MARK_GAP;
        setFontMm(doc, sizeMm, style.bold);
      }
      const wide = doc.getTextWidth(text) + doc.getTextWidth(per) * 0.48 + markW;
      if (wide > innerW) sizeMm *= innerW / wide;
      const mark = block.mark && !inline ? sizeMm * 0.42 : 0;
      return { block, sizeMm, lines: [text], heightMm: sizeMm * 1.18 + mark };
    }
    const text = plainSpaces(displayText(block));
    const lines = block.kind === "name" ? nameLines(doc, text, innerW) : [text];
    return { block, sizeMm, lines, heightMm: lines.length * sizeMm * 1.18 };
  });
}

function drawTag(
  doc: TagDoc,
  job: TagDrawJob,
  product: TagProduct,
  x: number,
  y: number,
  images: Map<string, string>,
) {
  const geo = job.geometry;
  const vertical = job.layout.orientation === "vertical";
  strokeBorder(doc, job.layout.border, x, y, geo.tagWidthMm, geo.tagHeightMm);

  const face = faceSize(geo, job.layout.orientation);
  const scale = tagTypeScale(geo, job.layout.orientation, job.layout.templateId);
  const innerW = Math.max(8, face.width - PAD_X * 2);
  const innerH = Math.max(6, face.height - PAD_Y * 2);
  const blocks = buildFaceBlocks(product, job);
  const fitted = fitFaceBlocks(measure(doc, blocks, job, scale, innerW), innerH, (entry) => ({
    ...entry,
    lines: entry.lines.slice(0, 1),
    heightMm: entry.sizeMm * 1.18,
  }), job.layout.templateId === "shelf" ? SHELF_PRICE_FLOOR : 1);
  // The sticker template is always centred, like its print CSS.
  const center =
    job.layout.align === "center" || job.layout.templateId === "sticker" || job.layout.templateId === "shelf";

  // Face coordinates (fx, fy) are read left-to-right, top-to-bottom. A vertical
  // face is the same face turned a quarter anticlockwise, like the print CSS.
  const toPage = (fx: number, fy: number) =>
    vertical ? { px: x + fy, py: y + geo.tagHeightMm - fx } : { px: x + fx, py: y + fy };
  const angle = vertical ? 90 : 0;
  const lineX = (width: number) => (center ? (face.width - width) / 2 : PAD_X);

  let cursor = PAD_Y + Math.max(0, (innerH - fitted.heightMm) / 2);
  for (const entry of fitted.blocks) {
    const { block } = entry;
    if (block.kind === "barcode") {
      const barW = barcodeWidthMm(doc, block.code, innerW);
      const barH = entry.sizeMm;
      const data = barcodeImage(images, block.code, vertical, doc.dotsPerMm ? 1 : 2);
      if (data) {
        const fx = center ? (face.width - barW) / 2 : PAD_X;
        const top = toPage(fx, cursor + 0.4);
        if (vertical) doc.addImage(data, "PNG", top.px, top.py - barW, barH, barW);
        else doc.addImage(data, "PNG", top.px, top.py, barW, barH);
        const digits = block.code;
        const digitMm = TAG_TYPE_MM.barcodeDigits;
        setFontMm(doc, digitMm, false);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        const digitW = doc.getTextWidth(digits);
        const digitAt = toPage(fx + Math.max(0, (barW - digitW) / 2), cursor + 0.4 + barH + digitMm * 0.9);
        doc.text(digits, digitAt.px, digitAt.py, { angle });
      }
      cursor += entry.heightMm + BLOCK_GAP_MM;
      continue;
    }
    const style = blockStyle(block, job.layout.templateId);
    doc.setTextColor(style.color[0], style.color[1], style.color[2]);
    const inlineMark = block.kind === "price" && markBesidePrice(job.layout.templateId, block.mark);
    if (block.kind === "price" && block.mark && !inlineMark) {
      const markSize = entry.sizeMm * 0.3;
      const markColor = job.layout.templateId === "promo" ? ACCENT : BRAND;
      setFontMm(doc, markSize, true);
      doc.setTextColor(markColor[0], markColor[1], markColor[2]);
      const mark = plainSpaces(block.mark).toUpperCase();
      const markAt = toPage(lineX(doc.getTextWidth(mark)), cursor + markSize * 0.82);
      doc.text(mark, markAt.px, markAt.py, { angle });
      cursor += entry.sizeMm * 0.42;
      doc.setTextColor(style.color[0], style.color[1], style.color[2]);
    }
    const lineH = entry.sizeMm * 1.18;
    for (const line of entry.lines) {
      const baseline = cursor + entry.sizeMm * 0.86;
      setFontMm(doc, entry.sizeMm, style.bold);
      if (block.kind === "price" && inlineMark) {
        drawPriceWithMark(doc, {
          figure: line,
          mark: inlineMarkText(block.mark),
          per: block.per ? ` / ${block.per}` : "",
          sizeMm: entry.sizeMm,
          bold: style.bold,
          baseline,
          lineX,
          toPage,
          angle,
          figureColor: style.color,
        });
      } else if (block.kind === "price" && block.per) {
        const per = ` / ${block.per}`;
        const mainW = doc.getTextWidth(line);
        setFontMm(doc, entry.sizeMm * 0.48, true);
        const perW = doc.getTextWidth(per);
        const start = lineX(mainW + perW);
        setFontMm(doc, entry.sizeMm, style.bold);
        const main = toPage(start, baseline);
        doc.text(line, main.px, main.py, { angle });
        setFontMm(doc, entry.sizeMm * 0.48, true);
        const tail = toPage(start + mainW, baseline);
        doc.text(per, tail.px, tail.py, { angle });
      } else {
        const at = toPage(lineX(doc.getTextWidth(line)), baseline);
        doc.text(line, at.px, at.py, { angle });
      }
      if (block.kind === "was") {
        const width = doc.getTextWidth(line);
        const strikeY = baseline - entry.sizeMm * 0.3;
        const from = toPage(lineX(width), strikeY);
        const to = toPage(lineX(width) + width, strikeY);
        doc.setDrawColor(style.color[0], style.color[1], style.color[2]);
        doc.setLineWidth(0.15);
        doc.line(from.px, from.py, to.px, to.py);
      }
      cursor += lineH;
    }
    cursor += BLOCK_GAP_MM;
  }
}

/** The shelf label sets "KSH" beside the figures, cap-high, so the price can be taller. */
const INLINE_MARK_SHARE = 0.32;
const INLINE_MARK_GAP = 0.14;

function markBesidePrice(template: TagLayout["templateId"], mark: string): boolean {
  return template === "shelf" && mark.trim() !== "";
}

function inlineMarkText(mark: string): string {
  return plainSpaces(mark).toUpperCase();
}

/** Mark, figures and "/ kg" centred as one unit; the mark's top lines up with the figures' tops. */
function drawPriceWithMark(
  doc: TagDoc,
  part: {
    figure: string;
    mark: string;
    per: string;
    sizeMm: number;
    bold: boolean;
    baseline: number;
    lineX: (width: number) => number;
    toPage: (fx: number, fy: number) => { px: number; py: number };
    angle: number;
    figureColor: Rgb;
  },
) {
  const markSize = part.sizeMm * INLINE_MARK_SHARE;
  const gap = part.sizeMm * INLINE_MARK_GAP;
  setFontMm(doc, markSize, true);
  const markW = doc.getTextWidth(part.mark);
  setFontMm(doc, part.sizeMm * 0.48, true);
  const perW = part.per ? doc.getTextWidth(part.per) : 0;
  setFontMm(doc, part.sizeMm, part.bold);
  const figureW = doc.getTextWidth(part.figure);
  const start = part.lineX(markW + gap + figureW + perW);
  // Cap height of Helvetica is about 0.72 em: align the mark's caps with the figures'.
  const capTop = part.baseline - part.sizeMm * 0.72;
  setFontMm(doc, markSize, true);
  doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
  const markAt = part.toPage(start, capTop + markSize * 0.72);
  doc.text(part.mark, markAt.px, markAt.py, { angle: part.angle });
  doc.setTextColor(part.figureColor[0], part.figureColor[1], part.figureColor[2]);
  setFontMm(doc, part.sizeMm, part.bold);
  const figureAt = part.toPage(start + markW + gap, part.baseline);
  doc.text(part.figure, figureAt.px, figureAt.py, { angle: part.angle });
  if (part.per) {
    setFontMm(doc, part.sizeMm * 0.48, true);
    const perAt = part.toPage(start + markW + gap + figureW, part.baseline);
    doc.text(part.per, perAt.px, perAt.py, { angle: part.angle });
  }
}

/** PNG data URL for a barcode, cached in `images` under a key the label printer can prefill. */
export function barcodeImage(images: Map<string, string>, code: string, rotated: boolean, modulePx = 2): string {
  const key = `${rotated ? "r" : "h"}${modulePx}:${code}`;
  let data = images.get(key);
  if (data == null) {
    data = barcodePngDataUrl(code, rotated, modulePx);
    images.set(key, data);
  }
  return data;
}

function strokeBorder(doc: TagDoc, border: TagLayout["border"], x: number, y: number, w: number, h: number) {
  if (border === "none") return;
  doc.setDrawColor(INK[0], INK[1], INK[2]);
  if (border === "dashed" || border === "hairline") {
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([0.35, 0.75], 0);
    doc.rect(x, y, w, h);
    doc.setLineDashPattern([], 0);
    return;
  }
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h);
  if (border === "ticket") {
    doc.setLineWidth(0.15);
    doc.rect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }
}

import { barcodePngDataUrl } from "@/lib/price-tags/barcode";
import { blockSizeMm, buildFaceBlocks, type FaceBlock } from "@/lib/price-tags/face";
import { cellPosition, faceSize, tagTypeScale } from "@/lib/price-tags/layout";
import { BLOCK_GAP_MM, fitFaceBlocks, type MeasuredBlock } from "@/lib/price-tags/pdf-fit";
import type {
  PrinterCalibration,
  SheetCell,
  SheetGeometry,
  TagLayout,
  TagProduct,
} from "@/lib/price-tags/types";

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

type Doc = {
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
    cells.forEach((slot, index) => {
      if (!slot) return;
      const product = job.products.get(slot.itemId);
      if (!product) return;
      const { x, y } = cellPosition(job.geometry, index);
      drawTag(doc, job, product, x + job.calibration.offsetXMm, y + job.calibration.offsetYMm, images);
    });
  });
  doc.save(job.fileName);
}

function setFontMm(doc: Doc, sizeMm: number, bold: boolean) {
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
function nameLines(doc: Doc, text: string, width: number): string[] {
  const lines = doc.splitTextToSize(text, width);
  if (lines.length <= 2) return lines;
  let second = lines[1];
  while (second.length > 1 && doc.getTextWidth(`${second}…`) > width) second = second.slice(0, -1);
  return [lines[0], `${second.trimEnd()}…`];
}

function measure(doc: Doc, blocks: FaceBlock[], job: PdfJob, scale: number, innerW: number) {
  const template = job.layout.templateId;
  return blocks.map((block): MeasuredBlock => {
    const missing = block.kind === "price" && block.missing;
    let sizeMm = blockSizeMm(block.kind, template, missing) * scale;
    if (block.kind === "barcode") return { block, sizeMm, lines: [], heightMm: sizeMm + 0.4 };
    const style = blockStyle(block, template);
    setFontMm(doc, sizeMm, style.bold);
    if (block.kind === "price") {
      // Shrink a long price to the face width rather than run off the tag.
      const per = block.per ? ` / ${block.per}` : "";
      const text = plainSpaces(block.text);
      const wide = doc.getTextWidth(text) + doc.getTextWidth(per) * 0.48;
      if (wide > innerW) sizeMm *= innerW / wide;
      const mark = block.mark ? sizeMm * 0.42 : 0;
      return { block, sizeMm, lines: [text], heightMm: sizeMm * 1.18 + mark };
    }
    const text = plainSpaces(displayText(block));
    const lines = block.kind === "name" ? nameLines(doc, text, innerW) : [text];
    return { block, sizeMm, lines, heightMm: lines.length * sizeMm * 1.18 };
  });
}

function drawTag(
  doc: Doc,
  job: PdfJob,
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
  }));
  // The sticker template is always centred, like its print CSS.
  const center = job.layout.align === "center" || job.layout.templateId === "sticker";

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
      const barW = innerW * 0.96;
      const barH = entry.sizeMm;
      const data = barcodeImage(images, block.code, vertical);
      if (data) {
        const fx = center ? (face.width - barW) / 2 : PAD_X;
        const top = toPage(fx, cursor + 0.4);
        if (vertical) doc.addImage(data, "PNG", top.px, top.py - barW, barH, barW);
        else doc.addImage(data, "PNG", top.px, top.py, barW, barH);
      }
      cursor += entry.heightMm + BLOCK_GAP_MM;
      continue;
    }
    const style = blockStyle(block, job.layout.templateId);
    doc.setTextColor(style.color[0], style.color[1], style.color[2]);
    if (block.kind === "price" && block.mark) {
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
      if (block.kind === "price" && block.per) {
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

function barcodeImage(images: Map<string, string>, code: string, rotated: boolean): string {
  const key = `${rotated ? "r" : "h"}:${code}`;
  let data = images.get(key);
  if (data == null) {
    data = barcodePngDataUrl(code, rotated);
    images.set(key, data);
  }
  return data;
}

function strokeBorder(doc: Doc, border: TagLayout["border"], x: number, y: number, w: number, h: number) {
  if (border === "none") return;
  doc.setDrawColor(INK[0], INK[1], INK[2]);
  if (border === "dashed") {
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.1, 0.7], 0);
    doc.rect(x, y, w, h);
    doc.setLineDashPattern([], 0);
    return;
  }
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(border === "hairline" ? 0.15 : 0.4);
  doc.rect(x, y, w, h);
  if (border === "ticket") {
    doc.setLineWidth(0.15);
    doc.rect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }
}

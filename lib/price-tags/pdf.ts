import { barcodePngDataUrl } from "@/lib/price-tags/barcode";
import { discountPercent, tagPriceLabel } from "@/lib/price-tags/money";
import { barcodeValueFor, resolvedWasPrice } from "@/lib/price-tags/markup";
import type { SheetGeometry, TagInstance, TagLayout, TagProduct } from "@/lib/price-tags/types";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/price-tags/types";

type PdfJob = {
  layout: TagLayout;
  geometry: SheetGeometry;
  pages: TagInstance[][];
  products: ReadonlyMap<string, TagProduct>;
  wasOverrides: Readonly<Record<string, number | null>>;
  businessName: string;
  currency: string | null | undefined;
  fileName: string;
};

export async function downloadPriceTagsPdf(job: PdfJob): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const geo = job.geometry;
  const images = new Map<string, string>();

  job.pages.forEach((slots, pageIndex) => {
    if (pageIndex > 0) doc.addPage([A4_WIDTH_MM, A4_HEIGHT_MM], "portrait");
    slots.forEach((slot, index) => {
      const product = job.products.get(slot.itemId);
      if (!product) return;
      const col = index % geo.columns;
      const row = Math.floor(index / geo.columns);
      const x = geo.marginLeftMm + col * (geo.tagWidthMm + geo.gapXMm);
      const y = geo.marginTopMm + row * (geo.tagHeightMm + geo.gapYMm);
      drawTag(doc, job, product, x, y, images);
    });
  });

  doc.save(job.fileName);
}

type Doc = {
  setDrawColor: (...args: number[]) => void;
  setLineWidth: (width: number) => void;
  setLineDashPattern: (pattern: number[], phase: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  setTextColor: (...args: number[]) => void;
  setFont: (font: string, style: string) => void;
  setFontSize: (size: number) => void;
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: "left" | "center" | "right"; angle?: number },
  ) => void;
  splitTextToSize: (text: string, width: number) => string[];
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
  setFillColor: (...args: number[]) => void;
};

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
  const boxW = geo.tagWidthMm;
  const boxH = geo.tagHeightMm;
  strokeBorder(doc, job.layout.border, x, y, boxW, boxH);

  const pad = 2;
  const innerW = (vertical ? boxH : boxW) - pad * 2;
  let cursor = vertical ? x + pad + 3.2 : y + pad + 3.2;
  const align = job.layout.align === "center" ? "center" : "left";
  const textX = align === "center" ? x + boxW / 2 : x + pad;
  const fields = new Set(job.layout.fields);
  const was = resolvedWasPrice(product, job.wasOverrides);
  const off = discountPercent(product.sellingPrice, was);

  const write = (text: string, size: number, style: "normal" | "bold", color: [number, number, number]) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    if (vertical) {
      doc.text(text, cursor, y + boxH - pad, { angle: -90, align: "left" });
      cursor += size * 0.42;
      return;
    }
    doc.text(text, textX, cursor, { align });
    cursor += size * 0.38;
  };

  if (fields.has("businessName") && job.businessName) {
    write(job.businessName.toUpperCase(), 7, "bold", [29, 75, 59]);
  }
  if (fields.has("promoMessage") && job.layout.promoMessage.trim()) {
    write(job.layout.promoMessage.trim().toUpperCase(), 7.5, "bold", [165, 82, 55]);
  }
  if (fields.has("productName")) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(product.name, Math.max(12, innerW)).slice(0, 2);
    for (const line of lines) write(line, 9, "bold", [18, 26, 22]);
  }
  if (fields.has("sellingPrice")) {
    const label = tagPriceLabel(product.sellingPrice, job.currency);
    const missing = product.sellingPrice == null;
    write(label, missing ? 8 : 14, "bold", missing ? [165, 82, 55] : job.layout.templateId === "promo" ? [165, 82, 55] : [18, 26, 22]);
  }
  if (fields.has("previousPrice") && was != null) {
    write(tagPriceLabel(was, job.currency), 8, "normal", [85, 97, 89]);
  }
  if (fields.has("discountPercent") && off != null) {
    write(`${off}% OFF`, 8, "bold", [165, 82, 55]);
  }
  if (fields.has("unit") && product.unitType) write(product.unitType, 7, "normal", [85, 97, 89]);
  if (fields.has("category") && product.categoryName) write(product.categoryName, 7, "normal", [85, 97, 89]);
  if (fields.has("sku") && product.sku) write(`SKU ${product.sku}`, 7, "normal", [85, 97, 89]);
  if (fields.has("barcode")) {
    const code = barcodeValueFor(product, job.layout);
    if (code) {
      let data = images.get(code);
      if (!data) {
        data = barcodePngDataUrl(code);
        if (data) images.set(code, data);
      }
      if (data) {
        const bw = Math.min(innerW, vertical ? boxH - pad * 2 : boxW - pad * 2);
        const bh = 8;
        if (vertical) {
          doc.addImage(data, "PNG", x + 1.5, y + pad, bh, Math.min(bw, boxH - pad * 2));
        } else {
          const bx = align === "center" ? x + (boxW - bw) / 2 : x + pad;
          doc.addImage(data, "PNG", bx, Math.min(y + boxH - bh - 1.4, cursor), bw, bh);
        }
      }
    }
  }
}

function strokeBorder(doc: Doc, border: TagLayout["border"], x: number, y: number, w: number, h: number) {
  if (border === "none") return;
  doc.setDrawColor(18, 26, 22);
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

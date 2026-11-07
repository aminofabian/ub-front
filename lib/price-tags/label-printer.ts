import { barcodeValueFor } from "@/lib/price-tags/face";
import { cellPosition, clamp } from "@/lib/price-tags/layout";
import { CanvasTagDoc } from "@/lib/price-tags/canvas-doc";
import { barcodeImage, drawPageCells, type TagDrawJob } from "@/lib/price-tags/pdf";
import {
  LABEL_DOTS_PER_MM,
  chunkTsplRows,
  tsplHeader,
  tsplRow,
  type TsplMedia,
} from "@/lib/price-tags/tspl";
import type { SheetCell } from "@/lib/price-tags/types";
import { TILL_PRINT_TIMEOUT_ERROR, printEscPosViaTillBridge } from "@/lib/till-print-bridge";

/** This computer's label printer. Device-local: another till has its own printer. */
export type LabelPrinterSettings = {
  /** CUPS / Windows queue name the print bridge sends raw bytes to. */
  queueName: string;
  flip: boolean;
};

const SETTINGS_KEY = "kiosk.label-printer.v1";

export function readLabelPrinter(): LabelPrinterSettings {
  const fallback: LabelPrinterSettings = { queueName: "", flip: false };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object") return fallback;
    const row = raw as { queueName?: unknown; flip?: unknown };
    return {
      queueName: typeof row.queueName === "string" ? row.queueName.slice(0, 200) : "",
      flip: row.flip === true,
    };
  } catch {
    return fallback;
  }
}

export function writeLabelPrinter(settings: LabelPrinterSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing: the choice lasts for this visit only.
  }
}

/** Decode the barcode PNGs once, so drawing each row stays synchronous. */
async function prepareBarcodes(job: TagDrawJob, rows: readonly SheetCell[][]) {
  const urls = new Map<string, string>();
  const decoded = new Map<string, CanvasImageSource>();
  if (!job.layout.fields.includes("barcode")) return { urls, decoded };
  const vertical = job.layout.orientation === "vertical";
  const codes = new Set<string>();
  for (const row of rows) {
    for (const slot of row) {
      const product = slot ? job.products.get(slot.itemId) : undefined;
      const code = product ? barcodeValueFor(product, job.layout) : "";
      if (code) codes.add(code);
    }
  }
  await Promise.all(
    Array.from(codes).map(async (code) => {
      const url = barcodeImage(urls, code, vertical);
      if (!url || decoded.has(url)) return;
      const image = new Image();
      image.src = url;
      await image.decode();
      decoded.set(url, image);
    }),
  );
  return { urls, decoded };
}

export type LabelPrintProgress = { rowsSent: number; rowsTotal: number };

export class LabelPrintError extends Error {
  constructor(
    message: string,
    /** Rows the printer already has; resend only what follows them. */
    readonly rowsSent: number,
    /** True when the last batch timed out and may or may not have printed. */
    readonly uncertain: boolean,
  ) {
    super(message);
    this.name = "LabelPrintError";
  }
}

/**
 * Draw each row of a label roll at 203 dpi and send it to the printer as TSPL
 * through the local print bridge. Batches go one after another; a timeout
 * stops the run so nothing is printed twice.
 */
export async function printRowsToLabelPrinter(
  job: TagDrawJob,
  rows: readonly SheetCell[][],
  rowGapMm: number,
  printer: LabelPrinterSettings,
  onProgress?: (progress: LabelPrintProgress) => void,
): Promise<LabelPrintProgress> {
  const queueName = printer.queueName.trim();
  if (!queueName) throw new LabelPrintError("Choose the label printer first.", 0, false);
  const geometry = job.geometry;
  const media: TsplMedia = {
    widthMm: geometry.pageWidthMm,
    heightMm: geometry.pageHeightMm,
    rowGapMm: clamp(rowGapMm, 0, 10),
    flip: printer.flip,
  };
  const { urls, decoded } = await prepareBarcodes(job, rows);
  const encoded = rows.map((cells) => {
    const doc = new CanvasTagDoc(media.widthMm, media.heightMm, LABEL_DOTS_PER_MM, decoded);
    drawPageCells(doc, job, cells, urls);
    const { bytesPerRow, black } = doc.toMonochrome();
    return tsplRow({ bytesPerRow, heightDots: doc.heightDots, black });
  });

  const chunks = chunkTsplRows(tsplHeader(media), encoded);
  let rowsSent = 0;
  for (const chunk of chunks) {
    try {
      await printEscPosViaTillBridge(new Blob([chunk.bytes], { type: "application/octet-stream" }), {
        name: queueName,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === TILL_PRINT_TIMEOUT_ERROR;
      const reason = error instanceof Error ? error.message : "The print bridge did not answer.";
      throw new LabelPrintError(reason, rowsSent, timedOut);
    }
    rowsSent += chunk.rowCount;
    onProgress?.({ rowsSent, rowsTotal: rows.length });
  }
  return { rowsSent, rowsTotal: rows.length };
}

/**
 * The alignment page as TSPL: each label's outline, a centre cross and its
 * number, drawn at 203 dpi with the printer nudge applied.
 */
export async function printAlignmentToLabelPrinter(
  geometry: TagDrawJob["geometry"],
  offset: TagDrawJob["calibration"],
  rowGapMm: number,
  printer: LabelPrinterSettings,
): Promise<void> {
  const queueName = printer.queueName.trim();
  if (!queueName) throw new LabelPrintError("Choose the label printer first.", 0, false);
  const doc = new CanvasTagDoc(geometry.pageWidthMm, geometry.pageHeightMm, LABEL_DOTS_PER_MM, new Map());
  doc.setDrawColor(0);
  doc.setTextColor(0);
  for (let index = 0; index < geometry.perPage; index += 1) {
    const { x: cellX, y: cellY } = cellPosition(geometry, index);
    const x = cellX + offset.offsetXMm;
    const y = cellY + offset.offsetYMm;
    const w = geometry.tagWidthMm;
    const h = geometry.tagHeightMm;
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1, 0.8], 0);
    doc.rect(x + 0.15, y + 0.15, w - 0.3, h - 0.3);
    doc.setLineDashPattern([], 0);
    doc.line(x + w / 2 - 2, y + h / 2, x + w / 2 + 2, y + h / 2);
    doc.line(x + w / 2, y + h / 2 - 2, x + w / 2, y + h / 2 + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(String(index + 1), x + 1.2, y + h - 1.2);
  }
  const { bytesPerRow, black } = doc.toMonochrome();
  const media: TsplMedia = {
    widthMm: geometry.pageWidthMm,
    heightMm: geometry.pageHeightMm,
    rowGapMm: clamp(rowGapMm, 0, 10),
    flip: printer.flip,
  };
  const [chunk] = chunkTsplRows(tsplHeader(media), [tsplRow({ bytesPerRow, heightDots: doc.heightDots, black })]);
  try {
    await printEscPosViaTillBridge(new Blob([chunk.bytes], { type: "application/octet-stream" }), { name: queueName });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === TILL_PRINT_TIMEOUT_ERROR;
    throw new LabelPrintError(error instanceof Error ? error.message : "The print bridge did not answer.", 0, timedOut);
  }
}

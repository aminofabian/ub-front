import { barcodeValueFor } from "@/lib/price-tags/face";
import { cellPosition, clamp } from "@/lib/price-tags/layout";
import { CanvasTagDoc } from "@/lib/price-tags/canvas-doc";
import { barcodeImage, drawPageCells, type TagDrawJob } from "@/lib/price-tags/pdf";
import {
  LABEL_DOTS_PER_MM,
  chunkTsplRows,
  tsplGapDetect,
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
  /** The roll last taught with GAPDETECT; printing another size makes the printer lose the gaps. */
  taughtRoll: TaughtRoll | null;
};

export type TaughtRoll = { labelWidthMm: number; labelHeightMm: number; across: number };

export function taughtRollOf(geometry: TagDrawJob["geometry"]): TaughtRoll {
  return { labelWidthMm: geometry.tagWidthMm, labelHeightMm: geometry.tagHeightMm, across: geometry.perPage };
}

function rollName(roll: TaughtRoll): string {
  const across = roll.across > 1 ? `, ${roll.across} across` : "";
  return `${roll.labelWidthMm} × ${roll.labelHeightMm} mm${across}`;
}

/**
 * A warning when this job's labels differ from the roll the printer was
 * taught: it then expects gaps in the wrong places, prints across them and
 * usually stops after a few labels. Null when they match or nothing was taught.
 */
export function rollMismatchWarning(
  settings: LabelPrinterSettings,
  geometry: TagDrawJob["geometry"],
): string | null {
  const taught = settings.taughtRoll;
  if (!taught) return null;
  const now = taughtRollOf(geometry);
  const same =
    Math.abs(taught.labelWidthMm - now.labelWidthMm) < 0.3 &&
    Math.abs(taught.labelHeightMm - now.labelHeightMm) < 0.3 &&
    taught.across === now.across;
  if (same) return null;
  return `The printer was taught ${rollName(taught)} labels, but these tags are set up for ${rollName(now)}. They will land across the stickers and the printer may stop. Print anyway?`;
}

const SETTINGS_KEY = "kiosk.label-printer.v1";

export function readLabelPrinter(): LabelPrinterSettings {
  const fallback: LabelPrinterSettings = { queueName: "", flip: false, taughtRoll: null };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object") return fallback;
    const row = raw as { queueName?: unknown; flip?: unknown; taughtRoll?: unknown };
    return {
      queueName: typeof row.queueName === "string" ? row.queueName.slice(0, 200) : "",
      flip: row.flip === true,
      taughtRoll: sanitizeTaughtRoll(row.taughtRoll),
    };
  } catch {
    return fallback;
  }
}

function sanitizeTaughtRoll(raw: unknown): TaughtRoll | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : NaN);
  const roll = { labelWidthMm: num(row.labelWidthMm), labelHeightMm: num(row.labelHeightMm), across: num(row.across) };
  return Object.values(roll).every((value) => value > 0) ? roll : null;
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

/** Send the gap calibration (see tsplGapDetect) to this computer's label printer. */
export async function calibrateLabelPrinter(
  printer: LabelPrinterSettings,
  media: Omit<TsplMedia, "flip">,
): Promise<void> {
  const queueName = printer.queueName.trim();
  if (!queueName) throw new LabelPrintError("Choose the label printer first.", 0, false);
  const bytes = tsplGapDetect({ ...media, rowGapMm: clamp(media.rowGapMm, 0, 10), flip: printer.flip });
  try {
    await printEscPosViaTillBridge(new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }), {
      name: queueName,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === TILL_PRINT_TIMEOUT_ERROR;
    throw new LabelPrintError(error instanceof Error ? error.message : "The print bridge did not answer.", 0, timedOut);
  }
}

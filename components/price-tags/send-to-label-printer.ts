"use client";

import { toast } from "sonner";

import {
  LabelPrintError,
  printRowsToLabelPrinter,
  type LabelPrinterSettings,
} from "@/lib/price-tags/label-printer";
import type { TagDrawJob } from "@/lib/price-tags/pdf";
import type { SheetCell } from "@/lib/price-tags/types";

function rows(count: number): string {
  return count === 1 ? "1 row" : `${count.toLocaleString("en-KE")} rows`;
}

/**
 * Send checked rows to the label printer with live progress. On failure the
 * message says how many rows already went, so the rest can be printed with
 * the page range instead of starting over and printing labels twice.
 */
export async function sendToLabelPrinter({
  job,
  rows: cells,
  rowGapMm,
  printer,
}: {
  job: TagDrawJob;
  rows: SheetCell[][];
  rowGapMm: number;
  printer: LabelPrinterSettings;
}): Promise<void> {
  const toastId = toast.loading(`Preparing ${rows(cells.length)} of labels…`);
  try {
    const done = await printRowsToLabelPrinter(job, cells, rowGapMm, printer, (progress) => {
      toast.loading(`Sent ${progress.rowsSent} of ${rows(progress.rowsTotal)}…`, { id: toastId });
    });
    toast.success(`Sent ${rows(done.rowsTotal)} to ${printer.queueName}.`, { id: toastId });
  } catch (error) {
    if (!(error instanceof LabelPrintError)) {
      toast.error("Could not prepare the labels.", { id: toastId });
      return;
    }
    const sent = error.rowsSent > 0 ? ` ${rows(error.rowsSent)} already went to the printer.` : "";
    const unsure = error.uncertain
      ? " The last batch may also have printed; check the labels before sending the rest."
      : "";
    toast.error(`${error.message}${sent}${unsure}`, { id: toastId, duration: 15_000 });
  }
}

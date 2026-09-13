/** Persisted spreadsheet-style column widths for the transactions list. */

import {
  buildColumnWidthsRestoreScript,
  clampColumnWidth,
  columnSheetMinWidthPx,
  parseColumnWidths,
  readColumnWidths,
  writeColumnWidths,
  type ColumnWidthsConfig,
} from "@/lib/column-widths";

export const TX_COL_WIDTHS_STORAGE_KEY = "ub_tx_table_col_widths_v1";

export type TxResizableCol =
  | "chevron"
  | "receipt"
  | "time"
  | "items"
  | "person"
  | "payment"
  | "status"
  | "total";

export type TxColumnWidths = Record<TxResizableCol, number>;

/**
 * Defaults match the previous Tailwind tracks
 * (`2rem 7rem 8rem minmax(12rem,1.8fr) minmax(8rem,1fr) 7rem 7rem 8rem`),
 * with the two flexible tracks pinned to their share of a ~1000px sheet.
 */
export const TX_COL_WIDTH_DEFAULTS: TxColumnWidths = {
  chevron: 32,
  receipt: 112,
  time: 128,
  items: 240,
  person: 144,
  payment: 112,
  status: 112,
  total: 128,
};

export const TX_COL_WIDTH_MIN: TxColumnWidths = {
  chevron: 24,
  receipt: 80,
  time: 96,
  items: 160,
  person: 96,
  payment: 72,
  status: 72,
  total: 80,
};

export const TX_COL_WIDTH_MAX: TxColumnWidths = {
  chevron: 48,
  receipt: 240,
  time: 240,
  items: 640,
  person: 400,
  payment: 200,
  status: 200,
  total: 240,
};

export const TX_COL_CSS_VARS: Record<TxResizableCol, string> = {
  chevron: "--tx-col-chevron",
  receipt: "--tx-col-receipt",
  time: "--tx-col-time",
  items: "--tx-col-items",
  person: "--tx-col-person",
  payment: "--tx-col-payment",
  status: "--tx-col-status",
  total: "--tx-col-total",
};

/** Table column order — matches the header cell order. */
export const TX_COLUMN_ORDER: readonly TxResizableCol[] = [
  "chevron",
  "receipt",
  "time",
  "items",
  "person",
  "payment",
  "status",
  "total",
];

export const TX_COLUMN_LABELS: Record<TxResizableCol, string> = {
  chevron: "Expand",
  receipt: "Receipt",
  time: "Time",
  items: "Items",
  person: "Customer / staff",
  payment: "Payment",
  status: "Status",
  total: "Total",
};

/** Shared width engine config for the transactions sheet. */
export const TX_COLUMN_WIDTHS_CONFIG: ColumnWidthsConfig<TxResizableCol> = {
  storageKey: TX_COL_WIDTHS_STORAGE_KEY,
  defaults: TX_COL_WIDTH_DEFAULTS,
  min: TX_COL_WIDTH_MIN,
  max: TX_COL_WIDTH_MAX,
  cssVars: TX_COL_CSS_VARS,
  sheetMinVar: "--tx-table-min-width",
};

export function clampTxColWidth(col: TxResizableCol, px: number): number {
  return clampColumnWidth(TX_COLUMN_WIDTHS_CONFIG, col, px);
}

export function parseTxColumnWidths(raw: unknown): TxColumnWidths | null {
  return parseColumnWidths(TX_COLUMN_WIDTHS_CONFIG, raw);
}

export function readTxColumnWidths(): TxColumnWidths {
  return readColumnWidths(TX_COLUMN_WIDTHS_CONFIG);
}

export function writeTxColumnWidths(widths: TxColumnWidths): void {
  writeColumnWidths(TX_COLUMN_WIDTHS_CONFIG, widths);
}

export function txTableMinWidthPx(widths: TxColumnWidths): number {
  return columnSheetMinWidthPx(TX_COLUMN_WIDTHS_CONFIG, widths, true);
}

/**
 * Inline script rendered as the sheet shell's first child: restores persisted
 * widths before the sheet's first paint, so a reload never flashes default
 * widths. See `buildColumnWidthsRestoreScript`.
 */
export const TX_COL_WIDTHS_RESTORE_SCRIPT = buildColumnWidthsRestoreScript(
  TX_COLUMN_WIDTHS_CONFIG,
);

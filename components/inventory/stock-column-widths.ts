/** Persisted spreadsheet-style column widths for the stock levels table. */

import {
  buildColumnWidthsRestoreScript,
  clampColumnWidth,
  columnSheetMinWidthPx,
  parseColumnWidths,
  readColumnWidths,
  writeColumnWidths,
  type ColumnWidthsConfig,
} from "@/lib/column-widths";

export const STOCK_COL_WIDTHS_STORAGE_KEY = "ub_stock_table_col_widths_v1";

export type StockResizableCol =
  | "product"
  | "family"
  | "variant"
  | "category"
  | "department"
  | "shelf"
  | "inStore"
  | "reorder"
  | "buy"
  | "sell"
  | "unitCost"
  | "status"
  | "edit";

export type StockColumnWidths = Record<StockResizableCol, number>;

/** Defaults match the previous Tailwind tracks on the stock table. */
export const STOCK_COL_WIDTH_DEFAULTS: StockColumnWidths = {
  product: 176,
  family: 112,
  variant: 96,
  category: 104,
  department: 104,
  shelf: 104,
  inStore: 84,
  reorder: 68,
  buy: 84,
  sell: 84,
  unitCost: 76,
  status: 68,
  edit: 84,
};

export const STOCK_COL_WIDTH_MIN: StockColumnWidths = {
  product: 120,
  family: 72,
  variant: 64,
  category: 72,
  department: 72,
  shelf: 72,
  inStore: 48,
  reorder: 44,
  buy: 56,
  sell: 56,
  unitCost: 56,
  // Hard floors: the status badge and the edit save/cancel pair have
  // fixed-size content — shrinking below them would bleed into neighbors.
  status: 68,
  edit: 84,
};

export const STOCK_COL_WIDTH_MAX: StockColumnWidths = {
  product: 560,
  family: 280,
  variant: 240,
  category: 240,
  department: 240,
  shelf: 240,
  inStore: 160,
  reorder: 140,
  buy: 160,
  sell: 160,
  unitCost: 160,
  status: 120,
  edit: 120,
};

export const STOCK_COL_CSS_VARS: Record<StockResizableCol, string> = {
  product: "--stock-col-product",
  family: "--stock-col-family",
  variant: "--stock-col-variant",
  category: "--stock-col-category",
  department: "--stock-col-department",
  shelf: "--stock-col-shelf",
  inStore: "--stock-col-in-store",
  reorder: "--stock-col-reorder",
  buy: "--stock-col-buy",
  sell: "--stock-col-sell",
  unitCost: "--stock-col-unit-cost",
  status: "--stock-col-status",
  edit: "--stock-col-edit",
};

/** Table column order — matches the `<colgroup>` and header cell order. */
export const STOCK_COLUMN_ORDER: readonly StockResizableCol[] = [
  "product",
  "family",
  "variant",
  "category",
  "department",
  "shelf",
  "inStore",
  "reorder",
  "buy",
  "sell",
  "unitCost",
  "status",
  "edit",
];

export const STOCK_COLUMN_LABELS: Record<StockResizableCol, string> = {
  product: "Product",
  family: "Family",
  variant: "Variant",
  category: "Category",
  department: "Department",
  shelf: "Shelf",
  inStore: "In store",
  reorder: "Reorder",
  buy: "Buy",
  sell: "Sell",
  unitCost: "Unit cost",
  status: "Status",
  edit: "Edit",
};

/** Shared width engine config for the stock table. */
export const STOCK_COLUMN_WIDTHS_CONFIG: ColumnWidthsConfig<StockResizableCol> =
  {
    storageKey: STOCK_COL_WIDTHS_STORAGE_KEY,
    defaults: STOCK_COL_WIDTH_DEFAULTS,
    min: STOCK_COL_WIDTH_MIN,
    max: STOCK_COL_WIDTH_MAX,
    cssVars: STOCK_COL_CSS_VARS,
    sheetMinVar: "--stock-table-min-width",
  };

export function clampStockColWidth(
  col: StockResizableCol,
  px: number,
): number {
  return clampColumnWidth(STOCK_COLUMN_WIDTHS_CONFIG, col, px);
}

export function parseStockColumnWidths(raw: unknown): StockColumnWidths | null {
  return parseColumnWidths(STOCK_COLUMN_WIDTHS_CONFIG, raw);
}

export function readStockColumnWidths(): StockColumnWidths {
  return readColumnWidths(STOCK_COLUMN_WIDTHS_CONFIG);
}

export function writeStockColumnWidths(widths: StockColumnWidths): void {
  writeColumnWidths(STOCK_COLUMN_WIDTHS_CONFIG, widths);
}

export function stockTableMinWidthPx(widths: StockColumnWidths): number {
  return columnSheetMinWidthPx(STOCK_COLUMN_WIDTHS_CONFIG, widths, true);
}

/**
 * Inline script rendered as the table shell's first child: restores persisted
 * widths before the table's first paint, so a reload never flashes default
 * widths. See `buildColumnWidthsRestoreScript`.
 */
export const STOCK_COL_WIDTHS_RESTORE_SCRIPT = buildColumnWidthsRestoreScript(
  STOCK_COLUMN_WIDTHS_CONFIG,
);

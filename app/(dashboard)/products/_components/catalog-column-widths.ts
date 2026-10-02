/** Persisted spreadsheet-style column widths for the catalog list. */

import {
  applyColumnWidthsToElement,
  buildColumnWidthsRestoreScript,
  clampColumnWidth,
  columnSheetMinWidthPx,
  parseColumnWidths,
  readColumnWidths,
  writeColumnWidths,
  type ColumnWidthsConfig,
} from "@/lib/column-widths";

/** v3: Price split into Buy / Sell / Margin. */
export const CATALOG_COL_WIDTHS_STORAGE_KEY = "ub_catalog_list_col_widths_v3";

export type CatalogResizableCol =
  | "check"
  | "product"
  | "stock"
  | "buy"
  | "sell"
  | "margin"
  | "category";

export type CatalogColumnWidths = Record<CatalogResizableCol, number>;

/** Defaults match a dense shop spreadsheet: money columns stay readable. */
export const CATALOG_COL_WIDTH_DEFAULTS: CatalogColumnWidths = {
  check: 22,
  product: 240,
  stock: 44,
  buy: 64,
  sell: 64,
  margin: 52,
  category: 88,
};

export const CATALOG_COL_WIDTH_MIN: CatalogColumnWidths = {
  check: 16,
  product: 120,
  stock: 32,
  buy: 44,
  sell: 44,
  margin: 40,
  category: 56,
};

export const CATALOG_COL_WIDTH_MAX: CatalogColumnWidths = {
  check: 64,
  product: 720,
  stock: 200,
  buy: 160,
  sell: 160,
  margin: 120,
  category: 360,
};

export const CATALOG_COL_CSS_VARS: Record<CatalogResizableCol, string> = {
  check: "--cat-col-check",
  product: "--cat-col-product",
  stock: "--cat-col-stock",
  buy: "--cat-col-buy",
  sell: "--cat-col-sell",
  margin: "--cat-col-margin",
  category: "--cat-col-category",
};

/** Shared width engine config for the catalog sheet. */
export const CATALOG_COLUMN_WIDTHS_CONFIG: ColumnWidthsConfig<CatalogResizableCol> =
  {
    storageKey: CATALOG_COL_WIDTHS_STORAGE_KEY,
    defaults: CATALOG_COL_WIDTH_DEFAULTS,
    min: CATALOG_COL_WIDTH_MIN,
    max: CATALOG_COL_WIDTH_MAX,
    cssVars: CATALOG_COL_CSS_VARS,
    sheetMinVar: "--cat-sheet-min-width",
    xlOnlyCols: ["category"],
  };

export function clampCatalogColWidth(
  col: CatalogResizableCol,
  px: number,
): number {
  return clampColumnWidth(CATALOG_COLUMN_WIDTHS_CONFIG, col, px);
}

export function parseCatalogColumnWidths(
  raw: unknown,
): CatalogColumnWidths | null {
  return parseColumnWidths(CATALOG_COLUMN_WIDTHS_CONFIG, raw);
}

export function readCatalogColumnWidths(): CatalogColumnWidths {
  return readColumnWidths(CATALOG_COLUMN_WIDTHS_CONFIG);
}

export function writeCatalogColumnWidths(widths: CatalogColumnWidths): void {
  writeColumnWidths(CATALOG_COLUMN_WIDTHS_CONFIG, widths);
}

export function catalogSheetMinWidthPx(
  widths: CatalogColumnWidths,
  showCategory: boolean,
): number {
  return columnSheetMinWidthPx(
    CATALOG_COLUMN_WIDTHS_CONFIG,
    widths,
    showCategory,
  );
}

/** Paint column tracks onto a shell element — inherited by every row grid. */
export function applyCatalogColumnWidthsToElement(
  el: HTMLElement,
  widths: CatalogColumnWidths,
  showCategory: boolean,
): void {
  applyColumnWidthsToElement(
    el,
    CATALOG_COLUMN_WIDTHS_CONFIG,
    widths,
    showCategory,
  );
}

/**
 * Inline script rendered as the list shell's first child: restores persisted
 * widths before the sheet's first paint, so a reload never flashes default
 * widths. See `buildColumnWidthsRestoreScript`.
 */
export const CATALOG_COL_WIDTHS_RESTORE_SCRIPT =
  buildColumnWidthsRestoreScript(CATALOG_COLUMN_WIDTHS_CONFIG);

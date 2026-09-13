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

export const CATALOG_COL_WIDTHS_STORAGE_KEY = "ub_catalog_list_col_widths_v2";

export type CatalogResizableCol =
  | "check"
  | "product"
  | "stock"
  | "sell"
  | "category";

export type CatalogColumnWidths = Record<CatalogResizableCol, number>;

/** Defaults match the previous Tailwind tracks, with Product as a real column. */
export const CATALOG_COL_WIDTH_DEFAULTS: CatalogColumnWidths = {
  check: 22,
  product: 280,
  stock: 48,
  sell: 64,
  category: 96,
};

export const CATALOG_COL_WIDTH_MIN: CatalogColumnWidths = {
  check: 16,
  product: 120,
  stock: 32,
  sell: 40,
  category: 56,
};

export const CATALOG_COL_WIDTH_MAX: CatalogColumnWidths = {
  check: 64,
  product: 720,
  stock: 200,
  sell: 240,
  category: 360,
};

export const CATALOG_COL_CSS_VARS: Record<CatalogResizableCol, string> = {
  check: "--cat-col-check",
  product: "--cat-col-product",
  stock: "--cat-col-stock",
  sell: "--cat-col-sell",
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

/** Persisted spreadsheet-style column widths for the catalog list. */

export const CATALOG_COL_WIDTHS_STORAGE_KEY = "ub_catalog_list_col_widths_v1";

export type CatalogResizableCol = "check" | "stock" | "sell" | "category";

export type CatalogColumnWidths = Record<CatalogResizableCol, number>;

/** Defaults match the previous Tailwind tracks (~1.35 / 2.5 / 3.5 / 4.5 rem). */
export const CATALOG_COL_WIDTH_DEFAULTS: CatalogColumnWidths = {
  check: 22,
  stock: 40,
  sell: 56,
  category: 72,
};

export const CATALOG_COL_WIDTH_MIN: CatalogColumnWidths = {
  check: 16,
  stock: 28,
  sell: 36,
  category: 48,
};

export const CATALOG_COL_WIDTH_MAX: CatalogColumnWidths = {
  check: 56,
  stock: 140,
  sell: 180,
  category: 280,
};

export function clampCatalogColWidth(
  col: CatalogResizableCol,
  px: number,
): number {
  const min = CATALOG_COL_WIDTH_MIN[col];
  const max = CATALOG_COL_WIDTH_MAX[col];
  if (!Number.isFinite(px)) return CATALOG_COL_WIDTH_DEFAULTS[col];
  return Math.round(Math.min(max, Math.max(min, px)));
}

export function parseCatalogColumnWidths(
  raw: unknown,
): CatalogColumnWidths | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const next = { ...CATALOG_COL_WIDTH_DEFAULTS };
  let any = false;
  for (const key of Object.keys(CATALOG_COL_WIDTH_DEFAULTS) as CatalogResizableCol[]) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      next[key] = clampCatalogColWidth(key, value);
      any = true;
    }
  }
  return any ? next : null;
}

export function readCatalogColumnWidths(): CatalogColumnWidths {
  if (typeof window === "undefined") return { ...CATALOG_COL_WIDTH_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(CATALOG_COL_WIDTHS_STORAGE_KEY);
    if (!raw) return { ...CATALOG_COL_WIDTH_DEFAULTS };
    return (
      parseCatalogColumnWidths(JSON.parse(raw)) ?? {
        ...CATALOG_COL_WIDTH_DEFAULTS,
      }
    );
  } catch {
    return { ...CATALOG_COL_WIDTH_DEFAULTS };
  }
}

export function writeCatalogColumnWidths(widths: CatalogColumnWidths): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CATALOG_COL_WIDTHS_STORAGE_KEY,
      JSON.stringify(widths),
    );
  } catch {
    // private mode / quota — preference just won't persist
  }
}

/** CSS custom properties consumed by `catalogListGridClass`. */
export function catalogColumnWidthVars(
  widths: CatalogColumnWidths,
): Record<string, string> {
  return {
    "--cat-col-check": `${widths.check}px`,
    "--cat-col-stock": `${widths.stock}px`,
    "--cat-col-sell": `${widths.sell}px`,
    "--cat-col-category": `${widths.category}px`,
  };
}

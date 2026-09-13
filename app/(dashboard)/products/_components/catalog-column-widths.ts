/** Persisted spreadsheet-style column widths for the catalog list. */

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
  for (const key of Object.keys(
    CATALOG_COL_WIDTH_DEFAULTS,
  ) as CatalogResizableCol[]) {
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

export function catalogSheetMinWidthPx(
  widths: CatalogColumnWidths,
  showCategory: boolean,
): number {
  return (
    widths.check +
    widths.product +
    widths.stock +
    widths.sell +
    (showCategory ? widths.category : 0)
  );
}

/** Paint column tracks onto a shell element — inherited by every row grid. */
export function applyCatalogColumnWidthsToElement(
  el: HTMLElement,
  widths: CatalogColumnWidths,
  showCategory: boolean,
): void {
  el.style.setProperty(CATALOG_COL_CSS_VARS.check, `${widths.check}px`);
  el.style.setProperty(CATALOG_COL_CSS_VARS.product, `${widths.product}px`);
  el.style.setProperty(CATALOG_COL_CSS_VARS.stock, `${widths.stock}px`);
  el.style.setProperty(CATALOG_COL_CSS_VARS.sell, `${widths.sell}px`);
  el.style.setProperty(
    CATALOG_COL_CSS_VARS.category,
    showCategory ? `${widths.category}px` : "0px",
  );
  el.style.setProperty(
    "--cat-sheet-min-width",
    `${catalogSheetMinWidthPx(widths, showCategory)}px`,
  );
}

/**
 * Inline script rendered as the list shell's first child: restores persisted
 * widths before the sheet's first paint, so a reload never flashes default
 * widths. Runs synchronously at DOM insertion (SSR parse or client mount);
 * built from the constants above so it cannot drift from the hook's logic.
 */
export const CATALOG_COL_WIDTHS_RESTORE_SCRIPT = `(function(){
try{
var el=document.currentScript&&document.currentScript.parentElement;
if(!el)return;
var raw=window.localStorage.getItem(${JSON.stringify(CATALOG_COL_WIDTHS_STORAGE_KEY)});
if(!raw)return;
var w=JSON.parse(raw);
if(!w||typeof w!=="object")return;
var d=${JSON.stringify(CATALOG_COL_WIDTH_DEFAULTS)};
var min=${JSON.stringify(CATALOG_COL_WIDTH_MIN)};
var max=${JSON.stringify(CATALOG_COL_WIDTH_MAX)};
var vars=${JSON.stringify(CATALOG_COL_CSS_VARS)};
var xl=window.matchMedia("(min-width: 1280px)").matches;
var s=el.style,total=0;
for(var k in vars){
var v=w[k];
if(typeof v!=="number"||!isFinite(v))v=d[k];
v=Math.round(Math.min(max[k],Math.max(min[k],v)));
var track=(k==="category"&&!xl)?0:v;
s.setProperty(vars[k],track+"px");
total+=track;
}
s.setProperty("--cat-sheet-min-width",total+"px");
}catch(e){}
})();`;

/**
 * Spreadsheet-style column width engine shared by sheet-like tables
 * (catalog list, stock levels). A feature declares a `ColumnWidthsConfig`;
 * this module handles clamping, persistence, CSS-var painting and the
 * pre-paint restore script. Drag interaction lives in `use-column-widths`.
 */

export type ColumnWidths<K extends string> = Record<K, number>;

export type ColumnWidthsConfig<K extends string> = {
  storageKey: string;
  defaults: Record<K, number>;
  min: Record<K, number>;
  max: Record<K, number>;
  /** CSS custom property per column, set on the list shell element. */
  cssVars: Record<K, string>;
  /** CSS custom property holding the summed sheet min-width. */
  sheetMinVar: string;
  /** Columns whose track collapses to 0 below the xl (1280px) breakpoint. */
  xlOnlyCols?: readonly K[];
};

/** Hard clamp to [min, max] — Excel-style stop, no rubber-band. */
export function clampColumnWidth<K extends string>(
  config: ColumnWidthsConfig<K>,
  col: K,
  px: number,
): number {
  const min = config.min[col];
  const max = config.max[col];
  if (!Number.isFinite(px)) return config.defaults[col];
  return Math.round(Math.min(max, Math.max(min, px)));
}

export function parseColumnWidths<K extends string>(
  config: ColumnWidthsConfig<K>,
  raw: unknown,
): ColumnWidths<K> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const next = { ...config.defaults };
  let any = false;
  for (const key of Object.keys(config.defaults) as K[]) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      next[key] = clampColumnWidth(config, key, value);
      any = true;
    }
  }
  return any ? next : null;
}

export function readColumnWidths<K extends string>(
  config: ColumnWidthsConfig<K>,
): ColumnWidths<K> {
  if (typeof window === "undefined") return { ...config.defaults };
  try {
    const raw = window.localStorage.getItem(config.storageKey);
    if (!raw) return { ...config.defaults };
    return parseColumnWidths(config, JSON.parse(raw)) ?? { ...config.defaults };
  } catch {
    return { ...config.defaults };
  }
}

export function writeColumnWidths<K extends string>(
  config: ColumnWidthsConfig<K>,
  widths: ColumnWidths<K>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(config.storageKey, JSON.stringify(widths));
  } catch {
    // private mode / quota — preference just won't persist
  }
}

export function columnSheetMinWidthPx<K extends string>(
  config: ColumnWidthsConfig<K>,
  widths: ColumnWidths<K>,
  isXl: boolean,
): number {
  let total = 0;
  for (const col of Object.keys(config.cssVars) as K[]) {
    if (config.xlOnlyCols?.includes(col) && !isXl) continue;
    total += widths[col];
  }
  return total;
}

/** Paint column tracks onto a shell element — inherited by every row. */
export function applyColumnWidthsToElement<K extends string>(
  el: HTMLElement,
  config: ColumnWidthsConfig<K>,
  widths: ColumnWidths<K>,
  isXl: boolean,
): void {
  let total = 0;
  for (const col of Object.keys(config.cssVars) as K[]) {
    const collapsed = config.xlOnlyCols?.includes(col) && !isXl;
    const track = collapsed ? 0 : widths[col];
    el.style.setProperty(config.cssVars[col], `${track}px`);
    total += track;
  }
  el.style.setProperty(config.sheetMinVar, `${total}px`);
}

/**
 * Inline script rendered as a sheet shell's first child: restores persisted
 * widths before the sheet's first paint, so a reload never flashes default
 * widths. Runs synchronously at DOM insertion (SSR parse or client mount);
 * built from the config so it cannot drift from the hook's logic.
 */
export function buildColumnWidthsRestoreScript<K extends string>(
  config: ColumnWidthsConfig<K>,
): string {
  const storageKey = JSON.stringify(config.storageKey);
  const defaults = JSON.stringify(config.defaults);
  const min = JSON.stringify(config.min);
  const max = JSON.stringify(config.max);
  const vars = JSON.stringify(config.cssVars);
  const sheetMinVar = JSON.stringify(config.sheetMinVar);
  const xlOnly = JSON.stringify(config.xlOnlyCols ?? []);
  return `(function(){
try{
var el=document.currentScript&&document.currentScript.parentElement;
if(!el)return;
var raw=window.localStorage.getItem(${storageKey});
if(!raw)return;
var w=JSON.parse(raw);
if(!w||typeof w!=="object")return;
var d=${defaults};
var min=${min};
var max=${max};
var vars=${vars};
var xlOnly=${xlOnly};
var xl=xlOnly.length?window.matchMedia("(min-width: 1280px)").matches:true;
var s=el.style,total=0;
for(var k in vars){
var v=w[k];
if(typeof v!=="number"||!isFinite(v))v=d[k];
v=Math.round(Math.min(max[k],Math.max(min[k],v)));
var track=(xlOnly.indexOf(k)>=0&&!xl)?0:v;
s.setProperty(vars[k],track+"px");
total+=track;
}
s.setProperty(${sheetMinVar},total+"px");
}catch(e){}
})();`;
}

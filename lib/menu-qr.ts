import { PRINTED_MENU_INKS, PRINTED_MENU_PAPERS, type PrintedMenuPaper } from "@/lib/printed-menu";

/**
 * QR codes on paper: one that opens the restaurant's menu page, or one per table that opens
 * ordering from that table. Pure, so what lands on each page can be tested without a browser.
 * The sheets are drawn by `app/(dashboard)/restaurant/menu/qr`.
 */

export type MenuQrTarget = "menu" | "tables";
export type MenuQrLayout = "poster" | "cards" | "stickers";

export const MENU_QR_LAYOUTS: { id: MenuQrLayout; name: string; blurb: string }[] = [
  { id: "poster", name: "Poster", blurb: "One large code to a page, for the door, the counter or a wall." },
  { id: "cards", name: "Table cards", blurb: "Several to a page with cutting lines, to stand on tables or slip into a menu holder." },
  { id: "stickers", name: "Small labels", blurb: "Many small codes to a page, for bags, receipts or the corner of a table." },
];

/** How many codes fit a page, as columns by rows. */
export function menuQrGrid(layout: MenuQrLayout, paper: PrintedMenuPaper): { columns: number; rows: number } {
  if (layout === "poster") return { columns: 1, rows: 1 };
  if (layout === "cards") return paper === "a5" ? { columns: 1, rows: 2 } : { columns: 2, rows: 2 };
  return paper === "a5" ? { columns: 2, rows: 3 } : { columns: 3, rows: 4 };
}

export type MenuQrOptions = {
  target: MenuQrTarget;
  layout: MenuQrLayout;
  paper: PrintedMenuPaper;
  ink: string;
  title: string;
  /** What to tell the customer; empty uses the usual wording for the target. */
  headline: string;
  /** A small line under the code: a Wi-Fi name, opening hours. */
  line: string;
  /** Print the web address under the code, for a phone that will not scan. Menu page only. */
  address: boolean;
};

export function defaultMenuQrOptions(shopName: string): MenuQrOptions {
  return { target: "menu", layout: "cards", paper: "a4", ink: "ink", title: shopName.trim(), headline: "", line: "", address: true };
}

const LAYOUT_IDS = new Set(MENU_QR_LAYOUTS.map((l) => l.id));
const PAPER_IDS = new Set(PRINTED_MENU_PAPERS.map((p) => p.id));
const INK_IDS = new Set(PRINTED_MENU_INKS.map((i) => i.id));

/** What was saved last time, with anything unknown or the wrong shape replaced by the default. */
export function readMenuQrOptions(saved: unknown, shopName: string): MenuQrOptions {
  const base = defaultMenuQrOptions(shopName);
  if (!saved || typeof saved !== "object") return base;
  const s = saved as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
  return {
    target: s.target === "tables" ? "tables" : "menu",
    layout: LAYOUT_IDS.has(s.layout as MenuQrLayout) ? (s.layout as MenuQrLayout) : base.layout,
    paper: PAPER_IDS.has(s.paper as PrintedMenuPaper) ? (s.paper as PrintedMenuPaper) : base.paper,
    ink: INK_IDS.has(s.ink as string) ? (s.ink as string) : base.ink,
    title: text(s.title, 80) || base.title,
    headline: text(s.headline, 60),
    line: text(s.line, 120),
    address: typeof s.address === "boolean" ? s.address : base.address,
  };
}

export function menuQrHeadline(options: Pick<MenuQrOptions, "target" | "headline">): string {
  return options.headline.trim() || (options.target === "tables" ? "Scan to order from your table" : "Scan for our menu");
}

/** The address of the restaurant's own page, where the menu is shown. */
export function menuPageUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/`;
}

/** The address a table's code opens. The same one the Tables list shows. */
export function tableOrderUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/shop/table?t=${encodeURIComponent(token)}`;
}

/** An address as a person would type it: no scheme, no trailing slash. */
export function readableAddress(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export type MenuQrCell = {
  key: string;
  url: string;
  /** The table's name on a table code; null on the menu code. */
  label: string | null;
  /** The address in words, when it is to be printed. */
  address: string | null;
};

export type MenuQrTable = { id: string; name: string; active: boolean; qrToken?: string | null };

/** Tables that have a code to print: in use, and given one. */
export function tablesWithCodes(tables: MenuQrTable[]): MenuQrTable[] {
  return tables.filter((t) => t.active && Boolean(t.qrToken));
}

/**
 * The codes, page by page. The menu code is repeated to fill one page, since every copy is the
 * same. Table codes are one per table, in the order given, over as many pages as they need.
 */
export function menuQrPages(input: {
  options: MenuQrOptions;
  origin: string;
  tables: MenuQrTable[];
}): MenuQrCell[][] {
  const { options, origin } = input;
  const { columns, rows } = menuQrGrid(options.layout, options.paper);
  const perPage = columns * rows;
  let cells: MenuQrCell[];
  if (options.target === "menu") {
    const url = menuPageUrl(origin);
    cells = Array.from({ length: perPage }, (_, i) => ({
      key: `menu-${i}`,
      url,
      label: null,
      address: options.address ? readableAddress(url) : null,
    }));
  } else {
    // A table's address carries its secret and is far too long to type; it is never printed in words.
    cells = tablesWithCodes(input.tables).map((t) => ({
      key: t.id,
      url: tableOrderUrl(origin, t.qrToken!),
      label: t.name,
      address: null,
    }));
  }
  const pages: MenuQrCell[][] = [];
  for (let i = 0; i < cells.length; i += perPage) pages.push(cells.slice(i, i + perPage));
  return pages;
}

import type { MenuRecord } from "@/lib/restaurant-api";

/**
 * The menu as a sheet of paper: which template, which paper, and what goes on it. Pure, so the
 * choices can be tested without a browser. The sheet itself is drawn by
 * `app/(dashboard)/restaurant/menu/print`.
 */

export type PrintedMenuTemplate = "house" | "card" | "pictures" | "takeaway";
export type PrintedMenuPaper = "a4" | "a5";

export const PRINTED_MENU_TEMPLATES: { id: PrintedMenuTemplate; name: string; blurb: string }[] = [
  { id: "house", name: "House menu", blurb: "Two columns with dotted lines to the price. Reads well on a table." },
  { id: "card", name: "Card", blurb: "One centred column, like a card in a frame. Best for a short menu." },
  { id: "pictures", name: "With pictures", blurb: "Dishes that have a picture are shown large; the rest are listed." },
  { id: "takeaway", name: "Takeaway sheet", blurb: "Everything small and close, to fit one page for the counter or a bag." },
];

export const PRINTED_MENU_PAPERS: { id: PrintedMenuPaper; name: string; widthMm: number; heightMm: number; marginMm: number }[] = [
  { id: "a4", name: "A4", widthMm: 210, heightMm: 297, marginMm: 14 },
  { id: "a5", name: "A5 (half of A4)", widthMm: 148, heightMm: 210, marginMm: 10 },
];

export const PRINTED_MENU_INKS: { id: string; name: string; hex: string }[] = [
  { id: "ink", name: "Black", hex: "#121a16" },
  { id: "forest", name: "Forest", hex: "#1d4b3b" },
  { id: "terracotta", name: "Terracotta", hex: "#a55237" },
  { id: "oxblood", name: "Oxblood", hex: "#6e1f24" },
  { id: "navy", name: "Navy", hex: "#1f2f55" },
];

export type PrintedMenuOptions = {
  template: PrintedMenuTemplate;
  paper: PrintedMenuPaper;
  ink: string;
  title: string;
  /** A line under the title: where you are, what you cook. */
  line: string;
  /** A line at the foot: a phone number, opening hours, a note about tax. */
  foot: string;
  descriptions: boolean;
  /** "KES 350" instead of "350". */
  currency: boolean;
  /** Headings left off the sheet, by id; `NO_HEADING` stands for dishes filed under none. */
  hidden: string[];
};

export const NO_HEADING = "__none__";

export function defaultPrintedMenuOptions(shopName: string): PrintedMenuOptions {
  return {
    template: "house",
    paper: "a4",
    ink: "ink",
    title: shopName.trim(),
    line: "",
    foot: "",
    descriptions: true,
    currency: false,
    hidden: [],
  };
}

const TEMPLATE_IDS = new Set(PRINTED_MENU_TEMPLATES.map((t) => t.id));
const PAPER_IDS = new Set(PRINTED_MENU_PAPERS.map((p) => p.id));
const INK_IDS = new Set(PRINTED_MENU_INKS.map((i) => i.id));

/** What was saved last time, with anything unknown or the wrong shape replaced by the default. */
export function readPrintedMenuOptions(saved: unknown, shopName: string): PrintedMenuOptions {
  const base = defaultPrintedMenuOptions(shopName);
  if (!saved || typeof saved !== "object") return base;
  const s = saved as Record<string, unknown>;
  const text = (value: unknown, fallback: string, max: number) =>
    typeof value === "string" ? value.slice(0, max) : fallback;
  return {
    template: TEMPLATE_IDS.has(s.template as PrintedMenuTemplate) ? (s.template as PrintedMenuTemplate) : base.template,
    paper: PAPER_IDS.has(s.paper as PrintedMenuPaper) ? (s.paper as PrintedMenuPaper) : base.paper,
    ink: INK_IDS.has(s.ink as string) ? (s.ink as string) : base.ink,
    title: text(s.title, base.title, 80) || base.title,
    line: text(s.line, "", 140),
    foot: text(s.foot, "", 200),
    descriptions: typeof s.descriptions === "boolean" ? s.descriptions : base.descriptions,
    currency: typeof s.currency === "boolean" ? s.currency : base.currency,
    hidden: Array.isArray(s.hidden) ? s.hidden.filter((h): h is string => typeof h === "string").slice(0, 200) : [],
  };
}

/** A price as a menu prints it: no cents unless there are some, thousands separated. */
export function printedPrice(amount: number, currencyCode: string | null): string {
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  const digits = (whole ? Math.round(amount).toString() : amount.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return currencyCode ? `${currencyCode} ${digits}` : digits;
}

export type PrintedDish = { id: string; name: string; description: string | null; price: string; imageUrl: string | null };
export type PrintedSection = { id: string; title: string | null; dishes: PrintedDish[] };
export type PrintedHeading = { id: string; name: string; count: number };

/** Something goes on the sheet when it is switched on and has a price to print. */
function printable(item: MenuRecord["items"][number]): boolean {
  return item.active && item.price != null && item.price > 0;
}

/** Every heading that has something to print under it, in the menu's order, for the tick list. */
export function printedHeadings(menu: MenuRecord): PrintedHeading[] {
  const items = menu.items.filter(printable);
  const known = new Set(menu.categories.filter((c) => c.active).map((c) => c.id));
  const out: PrintedHeading[] = [];
  for (const category of menu.categories) {
    if (!category.active) continue;
    const count = items.filter((i) => i.categoryId === category.id).length;
    if (count > 0) out.push({ id: category.id, name: category.name, count });
  }
  const loose = items.filter((i) => i.categoryId == null || !known.has(i.categoryId)).length;
  if (loose > 0) out.push({ id: NO_HEADING, name: out.length > 0 ? "Everything else" : "The whole menu", count: loose });
  return out;
}

/**
 * The sheet's sections: the headings left on, in the menu's order, each with its dishes in the
 * menu's order. On the picture template the dishes with a picture come first under each heading,
 * so the pictures sit together and the rest follow as a list.
 */
export function printedSections(menu: MenuRecord, options: PrintedMenuOptions, currencyCode = "KES"): PrintedSection[] {
  const hidden = new Set(options.hidden);
  const items = menu.items.filter(printable);
  const known = new Set(menu.categories.filter((c) => c.active).map((c) => c.id));
  const dish = (item: MenuRecord["items"][number]): PrintedDish => ({
    id: item.id,
    name: item.name,
    description: options.descriptions ? item.description?.trim() || null : null,
    // The ordinary price: a sheet of paper outlives happy hour.
    price: printedPrice(item.regularPrice ?? item.price ?? 0, options.currency ? currencyCode : null),
    imageUrl: options.template === "pictures" ? item.imageUrl || null : null,
  });
  const arrange = (dishes: PrintedDish[]) =>
    options.template === "pictures" ? [...dishes.filter((d) => d.imageUrl), ...dishes.filter((d) => !d.imageUrl)] : dishes;

  const sections: PrintedSection[] = [];
  for (const category of menu.categories) {
    if (!category.active || hidden.has(category.id)) continue;
    const dishes = items.filter((i) => i.categoryId === category.id).map(dish);
    if (dishes.length > 0) sections.push({ id: category.id, title: category.name, dishes: arrange(dishes) });
  }
  if (!hidden.has(NO_HEADING)) {
    const loose = items.filter((i) => i.categoryId == null || !known.has(i.categoryId)).map(dish);
    if (loose.length > 0) {
      const anyHeadings = menu.categories.some((c) => c.active && items.some((i) => i.categoryId === c.id));
      sections.push({ id: NO_HEADING, title: anyHeadings ? "Also" : null, dishes: arrange(loose) });
    }
  }
  return sections;
}

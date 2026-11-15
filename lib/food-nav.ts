import { APP_ROUTES } from "./config";

/**
 * The sidebar of a shop that only sells food and drink (restaurant, café, fast-food counter,
 * bar). The full sidebar is built for a shop with shelves. A kitchen still buys and counts what
 * it cooks with, so Buying and Stock stay; what goes is the shelf itself — price tags, shelf
 * zones, shelf prices, the product till, goods on a tab — and the Restaurant section comes
 * straight after Business, because the floor, the counter and the kitchen are the day's work.
 *
 * This only tidies the menu. Every page still checks its own permission, and a page left out of
 * the menu still opens from its address. A shop that also picked a retail format keeps the full
 * sidebar.
 */

type NavItemLike = { href: string; label: string; group?: string };
type NavSectionLike<I extends NavItemLike> = { id: string; entryHref: string; items: readonly I[] };

/** Whole sections with nothing in them for a food-only shop. */
export const FOOD_ONLY_HIDDEN_SECTIONS: readonly string[] = [
  "catalog", // price tags, departments, shelf zones, categories; the product list moves under Restaurant
  "store", // the hand-kept store-room register; the kitchen asks the store from Menu and the kitchen board
  "credits", // goods on a tab; in a restaurant a tab is an open order
];

/** Single pages, inside sections that stay, that are about shelves and a product till. */
export const FOOD_ONLY_HIDDEN_ROUTES: readonly string[] = [
  APP_ROUTES.businessMobile, // the shopping app for a product catalogue
  APP_ROUTES.promoCampaigns, // product promotions
  APP_ROUTES.pricing, // shelf prices; dish prices are on the menu
  APP_ROUTES.discounts, // product discounts
  APP_ROUTES.airtime,
  APP_ROUTES.onlineAirtime,
  APP_ROUTES.analyticsCustomers, // storefront shoppers
  APP_ROUTES.salesPendingCarts, // unfinished product sales
  APP_ROUTES.salesQuick, // the product quick sale
  APP_ROUTES.storefrontWebOrders, // online pickups from the product shop
];

/** How the Restaurant section reads once it is the heart of the sidebar. */
const RESTAURANT_GROUPS: Record<string, string> = {
  [APP_ROUTES.restaurantFloor]: "Service",
  [APP_ROUTES.restaurantCounter]: "Service",
  [APP_ROUTES.restaurantKitchen]: "Service",
  [APP_ROUTES.restaurantMenu]: "Your menu",
  [APP_ROUTES.restaurantReports]: "Your menu",
};

/** The product list is where ingredients and packaged goods are added; it sits with the menu. */
const INGREDIENTS_PAGE = { href: APP_ROUTES.products, label: "Ingredients", group: "Your menu" };

/**
 * Trims sections that are already filtered by permission. Returns them unchanged for a shop
 * that is not food-only.
 *
 * @param tableService the shop seats people (a restaurant, a bar): its Restaurant section opens
 *     on the floor; a café or fast-food counter opens on the counter
 */
export function trimNavForFoodOnly<I extends NavItemLike, S extends NavSectionLike<I>>(
  sections: readonly S[],
  foodOnly: boolean,
  tableService: boolean,
): S[] {
  if (!foodOnly) return [...sections];
  const allowed = new Set(sections.flatMap((s) => s.items.map((i) => i.href)));
  const out: S[] = [];
  for (const section of sections) {
    if (FOOD_ONLY_HIDDEN_SECTIONS.includes(section.id)) continue;
    let items: NavItemLike[] = section.items.filter((item) => !FOOD_ONLY_HIDDEN_ROUTES.includes(item.href));
    let entryHref = section.entryHref;
    if (section.id === "restaurant") {
      items = items.map((item) => ({ ...item, group: RESTAURANT_GROUPS[item.href] ?? item.group }));
      // Only if this person could already open the product list in the full sidebar.
      if (allowed.has(INGREDIENTS_PAGE.href)) {
        const reports = items.findIndex((item) => item.href === APP_ROUTES.restaurantReports);
        items.splice(reports === -1 ? items.length : reports, 0, INGREDIENTS_PAGE);
      }
      const home = tableService ? APP_ROUTES.restaurantFloor : APP_ROUTES.restaurantCounter;
      if (items.some((item) => item.href === home)) entryHref = home;
    }
    if (items.length === 0) continue;
    if (!items.some((item) => item.href === entryHref)) entryHref = items[0]!.href;
    out.push({ ...section, items: items as unknown as readonly I[], entryHref });
  }
  // Business first, then the restaurant, then everything that supports it.
  const rank = (id: string) => (id === "overview" ? 0 : id === "restaurant" ? 1 : 2);
  return out
    .map((section, index) => ({ section, index }))
    .sort((a, b) => rank(a.section.id) - rank(b.section.id) || a.index - b.index)
    .map(({ section }) => section);
}

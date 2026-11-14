import { APP_ROUTES } from "./config";

/**
 * The sidebar of a shop that only sells services (barbershop, salon, spa, nail studio, beauty
 * parlour). The full sidebar is built for a shop with shelves: products, buying, stock, a store
 * room, shelf prices. None of that is this shop's work, so it is left out here, and the Services
 * section comes straight after Business. A shop that sells goods as well keeps the full sidebar.
 *
 * This only tidies the menu. Every page still checks its own permission, and a page left out of
 * the menu still opens from its address.
 */

type NavItemLike = { href: string; label: string; group?: string };
type NavSectionLike<I extends NavItemLike> = { id: string; entryHref: string; items: readonly I[] };

/** Whole sections with nothing in them for a service-only shop. */
export const SERVICE_ONLY_HIDDEN_SECTIONS: readonly string[] = [
  "catalog", // products, price tags, departments, shelf zones, categories
  "procurement", // ordering and receiving stock, suppliers
  "inventory", // counts, deliveries, stock levels
  "store", // the store room
  "credits", // goods on a tab; a visit is paid when it ends
];

/** Single pages, inside sections that stay, that are about shelves and goods. */
export const SERVICE_ONLY_HIDDEN_ROUTES: readonly string[] = [
  APP_ROUTES.businessMobile, // the shopping app for a product catalogue
  APP_ROUTES.promoCampaigns, // product promotions
  APP_ROUTES.businessImport, // bringing in a product list
  APP_ROUTES.inventoryStockTakeDailyAuditReview, // stock count review
  APP_ROUTES.pricing, // shelf prices
  APP_ROUTES.discounts, // product discounts
  APP_ROUTES.airtime,
  APP_ROUTES.onlineAirtime,
  APP_ROUTES.analyticsCustomers, // storefront shoppers
  APP_ROUTES.salesPendingCarts, // unfinished product sales
  APP_ROUTES.salesReports, // sales by product category
  APP_ROUTES.storefrontWebOrders, // online pickups
  APP_ROUTES.salesQuick, // the product quick sale
];

/** How the Services section is grouped once it is the heart of the sidebar. */
const SERVICE_GROUPS: Record<string, string> = {
  [APP_ROUTES.servicesFloor]: "Today",
  [APP_ROUTES.servicesAppointments]: "Today",
  [APP_ROUTES.servicesCalendar]: "Today",
  [APP_ROUTES.servicesSell]: "Today",
  [APP_ROUTES.services]: "Your menu and team",
  [APP_ROUTES.commissions]: "Your menu and team",
  [APP_ROUTES.myEarnings]: "Your menu and team",
};

/**
 * The Setup menu, regrouped for a service shop by what the owner is trying to do: the shop
 * itself, its page on the web, its people, its money, talking to customers, and the record of
 * what happened. Groups appear in this order; a page not listed keeps its place at the end.
 */
const SETUP_GROUPS: readonly (readonly [string, readonly string[]])[] = [
  ["Your shop", [APP_ROUTES.business, APP_ROUTES.businessSettings, APP_ROUTES.businessConfiguration, APP_ROUTES.branches]],
  ["Your page online", [APP_ROUTES.businessBranding, APP_ROUTES.businessThemes, APP_ROUTES.businessDomains]],
  ["Your people", [APP_ROUTES.users, APP_ROUTES.payroll, APP_ROUTES.myProfile]],
  ["Getting paid", [APP_ROUTES.paymentsSettings, APP_ROUTES.integrationsEasyTax]],
  [
    "Talking to customers",
    [
      APP_ROUTES.inbox,
      APP_ROUTES.messages,
      APP_ROUTES.inboxBroadcasts,
      APP_ROUTES.inboxAutomations,
      APP_ROUTES.inboxSettings,
      APP_ROUTES.support,
    ],
  ],
  ["Records", [APP_ROUTES.businessLogs]],
];

function regroupSetup(items: readonly NavItemLike[]): NavItemLike[] {
  const placed = new Set<string>();
  const out: NavItemLike[] = [];
  for (const [group, hrefs] of SETUP_GROUPS) {
    for (const href of hrefs) {
      const item = items.find((candidate) => candidate.href === href);
      if (item && !placed.has(href)) {
        placed.add(href);
        out.push({ ...item, group });
      }
    }
  }
  return [...out, ...items.filter((item) => !placed.has(item.href))];
}

/**
 * The few goods a salon does sell over the counter (hair food, oils) are added to a visit at the
 * till. These two pages are all that needs: what the products are, and how many are left. They
 * move into the Services section, under their own heading, when the person may open them.
 */
const SHELF_PAGES: readonly { href: string; label: string }[] = [
  { href: APP_ROUTES.products, label: "Products you sell" },
  { href: APP_ROUTES.inventoryStock, label: "Stock levels" },
];

/**
 * Trims sections that are already filtered by permission. Returns them unchanged for a shop
 * that is not service-only.
 */
export function trimNavForServiceOnly<I extends NavItemLike, S extends NavSectionLike<I>>(
  sections: readonly S[],
  serviceOnly: boolean,
): S[] {
  if (!serviceOnly) return [...sections];
  const allowed = new Set(sections.flatMap((s) => s.items.map((i) => i.href)));
  const out: S[] = [];
  for (const section of sections) {
    if (SERVICE_ONLY_HIDDEN_SECTIONS.includes(section.id)) continue;
    let items: NavItemLike[] = section.items.filter((item) => !SERVICE_ONLY_HIDDEN_ROUTES.includes(item.href));
    if (section.id === "services") {
      items = [
        ...items.map((item) => ({ ...item, group: SERVICE_GROUPS[item.href] ?? item.group })),
        // Only pages this person could already open in the full sidebar.
        ...SHELF_PAGES.filter((page) => allowed.has(page.href)).map((page) => ({ ...page, group: "Products on the shelf" })),
      ];
    }
    if (section.id === "org") {
      items = regroupSetup(items);
    }
    if (items.length === 0) continue;
    const entryHref = items.some((item) => item.href === section.entryHref) ? section.entryHref : items[0]!.href;
    out.push({ ...section, items: items as unknown as readonly I[], entryHref });
  }
  // Business first, then the floor, then everything that supports it.
  const rank = (id: string) => (id === "overview" ? 0 : id === "services" ? 1 : 2);
  return out
    .map((section, index) => ({ section, index }))
    .sort((a, b) => rank(a.section.id) - rank(b.section.id) || a.index - b.index)
    .map(({ section }) => section);
}

/**
 * A cashier in a shop that only sells services works at the till and nowhere else: the till, and
 * their own profile. Starting, finishing and paying visits, opening and closing the shift and
 * registering the till all happen on the till itself, so no other page is needed.
 *
 * This is where the menu and the page guard get the rule from. It decides what the app shows
 * and where it sends them; what the server lets a cashier do is decided by the role's permissions.
 */
export const SERVICE_CASHIER_ROUTES: readonly string[] = [APP_ROUTES.cashier, APP_ROUTES.myProfile];

export function isServiceCashier(roleKey: string | null | undefined, serviceOnly: boolean): boolean {
  return serviceOnly && (roleKey ?? "").trim().toLowerCase() === "cashier";
}

/** True for the till, the profile page, and anything beneath them. */
export function serviceCashierMayOpen(pathname: string): boolean {
  const path = pathname.split("?")[0]!.replace(/\/+$/, "") || "/";
  return SERVICE_CASHIER_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

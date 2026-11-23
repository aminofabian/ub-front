"use client";

import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

/**
 * The one line of navigation across a supplier's own pages. Five places, in the order a supplier's day runs:
 * what needs doing, the orders, who buys and what they owe, the shops supplied, and the supplier's own page.
 * The same line sits on every one of them, so a supplier always sees where they are and what else there is.
 */
export type SupplierPlace = "today" | "orders" | "money" | "shops" | "page";

const TRADE_DESK = APP_ROUTES.storefrontTradeOrders;

export const SUPPLIER_PLACES: { place: SupplierPlace; label: string; title: string; href: string }[] = [
  { place: "today", label: "Today", title: "What needs your attention now", href: TRADE_DESK },
  { place: "orders", label: "Orders", title: "Trade orders, from placed to dispatched", href: `${TRADE_DESK}?view=orders` },
  { place: "money", label: "Buyers and money", title: "Buyer accounts, invoices and what is owed", href: `${TRADE_DESK}?view=money` },
  { place: "shops", label: "Shops you supply", title: "The shops that buy from you", href: `${TRADE_DESK}?view=shops` },
  { place: "page", label: "Your page", title: "Your marketplace page, how you are paid and your team", href: APP_ROUTES.storefrontSupplierPage },
];

/** Reads `?view=` once, on arrival from another page. Null when it names nothing known. */
export function supplierPlaceFromLocation(): SupplierPlace | null {
  if (typeof window === "undefined") return null;
  const view = new URLSearchParams(window.location.search).get("view");
  return SUPPLIER_PLACES.some((p) => p.place === view) ? (view as SupplierPlace) : null;
}

export function SupplierNav({
  current,
  onSelect,
  waiting,
}: {
  current: SupplierPlace;
  /** On the trade desk the places are views of one page, so choosing one does not reload it. */
  onSelect?: (place: SupplierPlace) => void;
  /** Orders waiting for the supplier's answer, shown beside "Orders" when there are any. */
  waiting?: number;
}) {
  const { me } = useDashboard();
  const canSeeMoney = hasPermission(me?.permissions, Permission.CreditsCustomersRead);
  const canManagePage = hasPermission(me?.permissions, Permission.BusinessManageSettings);

  const places = SUPPLIER_PLACES.filter(
    (p) => (p.place !== "money" || canSeeMoney) && (p.place !== "page" || canManagePage),
  );
  const tab = (active: boolean) =>
    `-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-1 text-[14px] font-medium ${
      active ? "border-[var(--kiosk-gold,#1D4B3B)] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  // On a wide screen the side menu lists these same places, so the line would say it twice.
  return (
    <nav aria-label="Supplier" className="flex gap-5 overflow-x-auto border-b border-border xl:hidden">
      {places.map((p) => {
        const active = p.place === current;
        const label =
          p.place === "orders" && waiting && waiting > 0 ? `${p.label} (${waiting} to answer)` : p.label;
        // A place on this page switches the view; a place on another page is a link to it.
        return onSelect && p.place !== "page" ? (
          <button
            key={p.place}
            type="button"
            title={p.title}
            aria-current={active ? "page" : undefined}
            className={tab(active)}
            onClick={() => onSelect(p.place)}
          >
            {label}
          </button>
        ) : (
          <a key={p.place} href={p.href} title={p.title} aria-current={active ? "page" : undefined} className={tab(active)}>
            {label}
          </a>
        );
      })}
    </nav>
  );
}

/** The title of a supplier page and the one line saying what it is for. The same on every one of them. */
export function SupplierHeading({ title, purpose }: { title: string; purpose?: string }) {
  return (
    <header>
      <h1 className="font-serif text-[1.7rem] leading-tight tracking-tight text-foreground">{title}</h1>
      {purpose ? <p className="mt-1 max-w-[70ch] text-[13px] text-muted-foreground">{purpose}</p> : null}
    </header>
  );
}

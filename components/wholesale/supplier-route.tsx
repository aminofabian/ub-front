"use client";

import { Check, Flag, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { fetchCatalogListStats, fetchShopSupplierPage, fetchShopSupplierPayout, type SalesOrder } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

type StopState = "done" | "todo" | "unknown";

type Stop = {
  key: string;
  /** Under the marker on the route. */
  short: string;
  title: string;
  why: string;
  href: string;
  action: string;
  state: StopState;
};

const FOREST = "var(--kiosk-gold,#1D4B3B)";

/**
 * A supplier's way from an empty shop to goods on the road, drawn as a delivery route: seven stops, a truck
 * standing at the next one, and the one thing to do there. Every stop is a real fact about the shop (the page
 * is filled in, an order was dispatched); nothing is scored or invented, and nobody is ranked against anyone.
 * It stays on Today as the record of how far the supplier has come.
 */
export function SupplierRoute({ orders }: { orders: SalesOrder[] }) {
  const { me } = useDashboard();
  const canManagePage = hasPermission(me?.permissions, Permission.BusinessManageSettings);
  const [page, setPage] = useState<StopState>("unknown");
  const [products, setProducts] = useState<StopState>("unknown");
  const [payout, setPayout] = useState<StopState>("unknown");
  const [listed, setListed] = useState<StopState>("unknown");
  // The truck starts at the depot and drives to its stop once, when the page opens.
  const [driven, setDriven] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setDriven(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let alive = true;
    const set = (apply: () => void) => {
      if (alive) apply();
    };
    // Each answer is asked for on its own: one that cannot be read leaves its stop open, not the whole route.
    fetchCatalogListStats(undefined)
      .then((stats) => set(() => setProducts(stats.parents + stats.variants + stats.standalones > 0 ? "done" : "todo")))
      .catch(() => undefined);
    if (canManagePage) {
      fetchShopSupplierPage()
        .then((record) =>
          set(() => {
            const filled = Boolean(record.profile.contactPhone?.trim()) && record.profile.deliveryRegions.length > 0;
            setPage(filled ? "done" : "todo");
            setListed(record.listed ? "done" : "todo");
          }),
        )
        .catch(() => undefined);
      fetchShopSupplierPayout()
        .then((record) =>
          set(() =>
            setPayout(
              [record.mobileMoney, record.tillNumber, record.paybill, record.bankAccountNumber].some((value) => Boolean(value?.trim()))
                ? "done"
                : "todo",
            ),
          ),
        )
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [canManagePage]);

  const anyOrder = orders.length > 0;
  const anyAccepted = orders.some((o) => o.status === "accepted" || o.status === "part_accepted" || o.status === "dispatched");
  const anyDispatched = orders.some((o) => o.status === "dispatched");
  const ordersHref = `${APP_ROUTES.storefrontTradeOrders}?view=orders`;
  const fact = (yes: boolean): StopState => (yes ? "done" : "todo");

  const stops: Stop[] = [
    {
      key: "page",
      short: "Your page",
      title: "Say who you are and where you deliver",
      why: "Buyers read this before they order: what you sell, a phone number, and the areas you deliver to.",
      href: APP_ROUTES.storefrontSupplierPage,
      action: "Fill in your page",
      state: page,
    },
    {
      key: "products",
      short: "Products",
      title: "Add what you sell, with prices",
      why: "A buyer can only order a product that has a price and stock.",
      href: APP_ROUTES.products,
      action: "Add products",
      state: products,
    },
    {
      key: "payout",
      short: "Payout",
      title: "Say how you are paid",
      why: "A mobile money number, a till, a paybill or a bank account.",
      href: APP_ROUTES.storefrontSupplierPage,
      action: "Add payout details",
      state: payout,
    },
    {
      key: "listed",
      short: "Listed",
      title: "Put your page on the marketplace",
      why: "Until you list it, no buyer can find you.",
      href: APP_ROUTES.storefrontSupplierPage,
      action: "List your page",
      state: listed,
    },
    {
      key: "first_order",
      short: "First order",
      title: "Get your first order",
      why: "It shows on this page the moment a buyer places it. Tell the shops you already sell to that they can order here.",
      href: APP_ROUTES.storefrontSupplierPage,
      action: "See your page",
      state: fact(anyOrder),
    },
    {
      key: "first_yes",
      short: "First yes",
      title: "Answer your first order",
      why: "Say how much of each line you can supply. The buyer hears at once.",
      href: ordersHref,
      action: "Open your orders",
      state: fact(anyAccepted),
    },
    {
      key: "first_dispatch",
      short: "On the road",
      title: "Dispatch your first order",
      why: "Mark it dispatched when it leaves. That raises the invoice.",
      href: ordersHref,
      action: "Open your orders",
      state: fact(anyDispatched),
    },
  ];

  const reached = stops.filter((stop) => stop.state === "done").length;
  const nextIndex = stops.findIndex((stop) => stop.state !== "done");
  const complete = nextIndex === -1;
  const next = complete ? null : stops[nextIndex];
  const truckAt = complete ? stops.length - 1 : nextIndex;
  const setUp = stops.slice(0, 4).every((stop) => stop.state === "done");
  const level = anyDispatched
    ? { number: 4, name: "Delivering" }
    : anyAccepted
      ? { number: 3, name: "Trading" }
      : setUp
        ? { number: 2, name: "Open for orders" }
        : { number: 1, name: "Setting up" };
  const last = stops.length - 1;
  const percent = (index: number) => `${(index / last) * 100}%`;

  return (
    <section aria-label="Your route" className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-serif text-[1.5rem] leading-tight text-foreground">
          Level {level.number}: {level.name}
        </h2>
        <p className="text-[13px] tabular-nums text-muted-foreground">
          {reached} of {stops.length} stops reached
        </p>
      </div>

      {/* The route. The markers are spaced evenly; the road behind them fills as stops are reached. */}
      <div className="mt-8 px-4" aria-hidden>
        <div className="relative h-8">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-foreground/25" />
          <div
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ width: driven ? percent(truckAt) : "0%", background: FOREST }}
          />
          {stops.map((stop, index) => {
            const done = stop.state === "done";
            return (
              <span
                key={stop.key}
                className="absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-[var(--op-bg,#F4F1EA)]"
                style={{
                  left: percent(index),
                  borderColor: done || index === truckAt ? FOREST : "color-mix(in srgb, currentColor 25%, transparent)",
                  background: done ? FOREST : undefined,
                }}
              >
                {done ? (
                  <Check className="size-3.5 text-[#F4F1EA]" strokeWidth={3} />
                ) : index === last ? (
                  <Flag className="size-3 text-muted-foreground" />
                ) : null}
              </span>
            );
          })}
          {complete ? null : (
            <span
              className="absolute -top-6 flex -translate-x-1/2 items-center justify-center transition-[left] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ left: driven ? percent(truckAt) : "0%", color: FOREST }}
            >
              <Truck className="size-6" strokeWidth={1.75} />
            </span>
          )}
        </div>
        <div className="relative mt-2 hidden h-5 sm:block">
          {stops.map((stop, index) => (
            <span
              key={stop.key}
              className={`absolute -translate-x-1/2 whitespace-nowrap text-[12px] ${
                stop.state === "done" ? "text-muted-foreground" : index === truckAt ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
              style={{ left: percent(index) }}
            >
              {stop.short}
            </span>
          ))}
        </div>
      </div>

      {/* The one thing to do now. */}
      {next ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-y border-border py-4">
          <div className="min-w-0 max-w-[62ch]">
            <p className="text-[15px] font-semibold text-foreground">
              Stop {nextIndex + 1}: {next.title}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{next.why}</p>
          </div>
          <Link
            href={next.href}
            className="inline-flex min-h-11 shrink-0 items-center rounded-[2px] px-4 text-[14px] font-medium text-[#F4F1EA] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none sm:min-h-10"
            style={{ background: FOREST }}
          >
            {next.action}
          </Link>
        </div>
      ) : (
        <p className="mt-6 border-y border-border py-4 text-[14px] text-foreground">
          Every stop reached. Your goods are on the road; from here it is the orders below.
        </p>
      )}

      {/* Every stop by name, for a narrow screen and for anyone who wants the list. */}
      <details className="mt-3 text-[13px]" open={!anyOrder}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium underline underline-offset-4 sm:min-h-0">
          All seven stops
        </summary>
        <ol className="mt-2 divide-y divide-border border-y border-border">
          {stops.map((stop, index) => (
            <li key={stop.key} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5">
              <span
                aria-hidden
                className={`font-serif text-[1.25rem] leading-none tabular-nums ${stop.state === "done" ? "text-muted-foreground" : "text-foreground"}`}
              >
                {index + 1}
              </span>
              <span className={stop.state === "done" ? "text-muted-foreground" : index === nextIndex ? "font-medium text-foreground" : "text-foreground"}>
                {stop.title}
              </span>
              {stop.state === "done" ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Check className="size-3.5" style={{ color: FOREST }} strokeWidth={3} aria-hidden />
                  Reached
                </span>
              ) : (
                <Link href={stop.href} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 sm:min-h-0">
                  {stop.action}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

"use client";

import Link from "next/link";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { tryPostSaleWithRetries, type SaleRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import {
  fetchMenu,
  fetchOrderForSale,
  fetchOrdersInProgress,
  fetchUnprintedTickets,
  handOverOrder,
  reprintKitchenTicket,
  type MenuItemRecord,
  type MenuRecord,
  type OrderSummaryRecord,
  type UnprintedTicketRecord,
} from "@/lib/restaurant-api";
import { withoutCanMake } from "@/lib/restaurant-can-make";
import {
  addToCart,
  buildOrderSalePayload,
  cashSuggestions,
  cartProblem,
  cartTotal,
  elapsedLabel,
  groupsFor,
  tileState,
  type OrderCartLine,
} from "@/lib/restaurant-cart";
import { enqueuePendingSale, flushSaleOutbox, isSaleOutboxSupported } from "@/lib/sale-outbox";
import { COUNTER_VOICES, type CounterVoice } from "@/lib/food-till";
import { requestSetup } from "@/lib/setup-requirements";

import { OpenForTheDay } from "../../_components/open-for-the-day";
import { useRestaurantLive } from "@/lib/use-restaurant-live";
import { cn } from "@/lib/utils";

import { MENU_TILE as TILE, MENU_TILE_ON as TILE_ON, MenuPicker } from "../../_components/menu-picker";
import { MpesaRequest, mpesaRequestAmount } from "../../_components/mpesa-request";
import { ModifierSheet } from "../../_components/modifier-sheet";
import { NoBranch } from "../../_components/no-branch";

const kes = (n: number) => formatMoney(n, "KES");

type Done =
  | { kind: "paid"; sale: SaleRecord; total: number; change: number | null; orderNumber: number | null }
  | { kind: "queued"; total: number; lines: OrderCartLine[] };

/**
 * Counter service: ring from the menu, take payment, give the customer a number. Paying is
 * what sends the order to the kitchen, so there is nothing to "send" separately.
 */
export function CounterScreen({
  canManageMenu,
  voice = COUNTER_VOICES.restaurant,
  bare = false,
}: {
  canManageMenu: boolean;
  /** The words this house uses at the counter: a bar rings rounds, a kitchen cooks orders. */
  voice?: CounterVoice;
  /** On the till page the till's own header names the screen, so the page title is left off. */
  bare?: boolean;
}) {
  const { branchId } = useDashboard();
  const [menu, setMenu] = useState<MenuRecord | null>(null);
  const [menuFromCache, setMenuFromCache] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<OrderCartLine[]>([]);
  const [choosing, setChoosing] = useState<MenuItemRecord | null>(null);
  const [orders, setOrders] = useState<OrderSummaryRecord[]>([]);
  const [ordersStale, setOrdersStale] = useState(false);
  const [unprinted, setUnprinted] = useState<UnprintedTicketRecord[]>([]);
  const [reprinting, setReprinting] = useState<string | null>(null);
  const [handingOver, setHandingOver] = useState<string | null>(null);
  const [outboxProblem, setOutboxProblem] = useState<string | null>(null);
  const [method, setMethod] = useState<"cash" | "mpesa_manual">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsShift, setNeedsShift] = useState(false);
  const [paying, setPaying] = useState(false);
  // True while a payment request is on the customer's phone: the order must not change under it.
  const [phoneAsked, setPhoneAsked] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // One key per order: retrying after a dropped connection must not ring it twice.
  const saleKeyRef = useRef<string>(nextIdempotencyKey());
  const lineSeq = useRef(0);

  const loadMenu = useCallback(async () => {
    if (!branchId) return;
    const cacheKey = `kiosk:restaurant:menu:${branchId}:v1`;
    try {
      const fresh = await fetchMenu(branchId);
      setMenu(fresh);
      setMenuFromCache(false);
      setLoadError(null);
      try {
        // The stock counts are true only now; a menu read back offline must not repeat them.
        window.localStorage.setItem(cacheKey, JSON.stringify(withoutCanMake(fresh)));
      } catch {
        // no room, or private mode: the counter simply cannot start offline
      }
    } catch {
      // Keep a menu already on screen, or the last one this device loaded: the counter must go on
      // selling through a blip, and must be able to start with the connection down. Prices may be
      // old; a sale queued for later keeps the price the customer paid.
      let cached: MenuRecord | null = null;
      try {
        const raw = window.localStorage.getItem(cacheKey);
        cached = raw ? (JSON.parse(raw) as MenuRecord) : null;
      } catch {
        cached = null;
      }
      setMenu((current) => {
        if (current != null) return current;
        if (cached != null && Array.isArray(cached.items)) {
          setMenuFromCache(true);
          return cached;
        }
        setLoadError("Could not load the menu. Check your connection and try again.");
        return current;
      });
    }
  }, [branchId]);

  const loadOrders = useCallback(async () => {
    if (!branchId) return;
    try {
      setOrders(await fetchOrdersInProgress(branchId));
      setOrdersStale(false);
    } catch {
      setOrdersStale(true);
    }
    // Kitchen tickets that have not printed anywhere, so the counter can warn and reprint. A
    // failure here is quiet: it never blocks the order list, which is the screen's real job.
    try {
      setUnprinted(await fetchUnprintedTickets(branchId));
    } catch {
      // leave the last known list; the next poll tries again
    }
    setNow(Date.now());
  }, [branchId]);

  async function reprint(ticket: UnprintedTicketRecord) {
    setReprinting(ticket.ticketId);
    try {
      await reprintKitchenTicket(ticket.ticketId);
      // Drop it from the warning at once; if it still does not print, the next poll brings it back.
      setUnprinted((prev) => prev.filter((t) => t.ticketId !== ticket.ticketId));
    } catch {
      // the button can be tapped again
    } finally {
      setReprinting(null);
    }
  }

  useEffect(() => {
    void loadMenu();
    void loadOrders();
  }, [loadMenu, loadOrders]);

  useRestaurantLive(() => void loadOrders(), 6000, Boolean(branchId));
  // The menu changes rarely; this picks up a dish that ran out.
  useRestaurantLive(() => void loadMenu(), 30000, Boolean(branchId));

  // Send anything this device saved while offline, now and whenever the connection returns.
  useEffect(() => {
    if (!isSaleOutboxSupported()) return;
    const flush = () =>
      void flushSaleOutbox()
        .then((result) => {
          setOutboxProblem(result.status === "blocked" ? result.message : null);
          void loadOrders();
        })
        .catch(() => undefined);
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [loadOrders]);

  const total = cartTotal(cart);
  const cashNumber = cashReceived.trim() === "" ? null : Number(cashReceived);
  const change = method === "cash" && cashNumber != null && cashNumber >= total ? cashNumber - total : null;

  const ASKED = "A payment request is on the customer's phone. Wait for it, or stop waiting, before changing the order.";

  function ring(item: MenuItemRecord) {
    if (!menu || !tileState(item).canRing) return;
    if (phoneAsked) return setError(ASKED);
    setError(null);
    const groups = groupsFor(item, menu.modifierGroups);
    if (item.kind === "DISH" && groups.length > 0) {
      setChoosing(item);
      return;
    }
    lineSeq.current += 1;
    setCart((prev) =>
      addToCart(prev, {
        key: `l${lineSeq.current}`,
        menuItemId: item.id,
        kind: item.kind,
        itemId: item.itemId,
        name: item.name,
        quantity: 1,
        unitPrice: item.price ?? 0,
        optionIds: [],
        optionNames: [],
        note: "",
      }),
    );
  }

  function changeQuantity(key: string, by: number) {
    if (phoneAsked) return setError(ASKED);
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + by } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function reset() {
    saleKeyRef.current = nextIdempotencyKey();
    setCart([]);
    setCashReceived("");
    setReference("");
    setError(null);
    setNeedsShift(false);
    setDone(null);
    void loadOrders();
  }

  /** M-Pesa has confirmed a request for {@code asked}: record the order against its code. */
  function mpesaReceived(receipt: string, asked: number) {
    setReference(receipt);
    if (asked < mpesaRequestAmount(total)) {
      // Cannot happen while the order is locked during the request; kept so money is never lost quietly.
      return setError(
        `M-Pesa received ${kes(asked)} (code ${receipt}) but the order is ${kes(total)}. Take off what was added, then take payment.`,
      );
    }
    void pay(receipt);
  }

  async function pay(confirmedReference?: string, setupTries = 0) {
    const problem = cartProblem(cart);
    if (problem) return setError(problem);
    if (!branchId) return setError("Choose a branch at the top of the page first");
    if (method === "cash" && cashNumber != null && cashNumber < total) {
      return setError(`That is less than ${kes(total)}`);
    }
    setError(null);
    setNeedsShift(false);
    setPaying(true);
    const payload = buildOrderSalePayload({
      branchId,
      cart,
      method: confirmedReference ? "mpesa_manual" : method,
      reference: confirmedReference ?? reference,
      cashReceived: cashNumber,
      soldAt: new Date(),
    });
    const key = saleKeyRef.current;
    try {
      const result = await tryPostSaleWithRetries(payload, key, 3, 400);
      if (result.ok) {
        const order = await fetchOrderForSale(result.sale.id);
        setDone({ kind: "paid", sale: result.sale, total, change, orderNumber: order?.orderNumber ?? null });
        return;
      }
      // Only a server that could not be reached is saved for later. A sale the server refused
      // (a price that changed, a dish that ran out) would be refused again and block the queue.
      const unreachable =
        result.status === 0 || result.status === 502 || result.status === 503 || result.status === 504;
      if (unreachable && isSaleOutboxSupported()) {
        await enqueuePendingSale(key, payload);
        setDone({ kind: "queued", total, lines: cart });
        return;
      }
      // A new shop's first order meets two walls: this device is not a till yet, and no shift is
      // open. The shell's dialog fixes each on the spot; then the same order is tried again with
      // the same key, so nothing is rung twice. Two tries cover a till and then a shift.
      if (result.setup && setupTries < 2 && (await requestSetup(result.setup))) {
        return await pay(confirmedReference, setupTries + 1);
      }
      // Offer "Open a shift" only when a shift is what is missing. An unregistered till is refused
      // too, and there the fix is the owner approving this device, not a shift.
      setNeedsShift(result.setup ? result.setup.requirement === "shift" : /shift/i.test(result.message));
      setError(result.message || "The sale was not recorded. Try again.");
      if (result.status === 409 || result.status === 400) void loadMenu();
    } catch {
      setError("The sale was not recorded. Try again.");
    } finally {
      setPaying(false);
    }
  }

  async function handOver(order: OrderSummaryRecord) {
    setHandingOver(order.orderId);
    try {
      await handOverOrder(order.orderId);
    } catch {
      setError(`Order ${order.orderNumber} could not be marked as handed over. Try again.`);
    } finally {
      setHandingOver(null);
      void loadOrders();
    }
  }

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX}>
        <NoBranch message="Choose a branch at the top of the page to take orders." />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoadError title="Counter" message={loadError} onRetry={() => void loadMenu()} />
      </div>
    );
  }
  if (menu == null) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoading label="Loading the menu…" />
      </div>
    );
  }

  if (done) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className="mx-auto mt-8 w-full max-w-sm px-3">
          <div className="[filter:drop-shadow(0_22px_26px_rgba(18,26,22,0.13))_drop-shadow(0_1px_1px_rgba(18,26,22,0.1))]">
            <div className="kiosk-setup-slip food-paper relative bg-[var(--op-paper,#FFFEFA)] px-6 pb-10 pt-7 text-center">
              {done.kind === "paid" ? (
                <>
                  <p className="font-mono text-[11px] text-[var(--op-muted,#556159)]">
                    {done.sale.receiptNo ? `Receipt ${done.sale.receiptNo} · ` : ""}
                    {kes(done.total)}
                  </p>
                  {done.orderNumber != null ? (
                    <>
                      <p className="mt-4 text-sm text-[var(--op-muted,#556159)]">Order number</p>
                      <p className="font-mono text-[5.5rem] font-semibold leading-none tabular-nums text-[var(--op-ink,#121A16)]">
                        {done.orderNumber}
                      </p>
                      <p className="mx-auto mt-3 max-w-[16rem] text-sm text-[var(--op-ink,#121A16)]">
                        {voice.sent}
                      </p>
                    </>
                  ) : (
                    <p className="mx-auto mt-4 max-w-[16rem] text-sm text-[var(--op-ink,#121A16)]">
                      Nothing on this sale needed the kitchen.
                    </p>
                  )}
                  {done.change != null && done.change > 0 ? (
                    <p className="mt-4 border-t border-dashed border-[rgba(18,26,22,0.28)] pt-3 text-sm">
                      Change <span className="font-mono text-lg font-semibold tabular-nums">{kes(done.change)}</span>
                    </p>
                  ) : null}
                  <span
                    className="kiosk-setup-stamp absolute right-4 top-5 border-[1.5px] border-[var(--kiosk-highlight,#A55237)] px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-highlight,#A55237)]"
                    role="status"
                  >
                    Paid
                  </span>
                </>
              ) : (
                <div className="text-left">
                  <p className="font-mono text-[11px] text-[var(--op-muted,#556159)]">Saved on this device · {kes(done.total)}</p>
                  <p className="mt-3 text-sm text-[var(--op-ink,#121A16)]">
                    The server could not be reached, so <strong>the kitchen has not been told</strong>. Take this
                    order to the kitchen yourself:
                  </p>
                  <ul className="mt-3 grid gap-1 border-y border-dashed border-[rgba(18,26,22,0.28)] py-3 font-mono text-[12.5px] text-[var(--op-ink,#121A16)]">
                    {done.lines.map((l) => (
                      <li key={l.key}>
                        <span className="tabular-nums">{l.quantity} ×</span> {l.name}
                        {l.optionNames.length > 0 ? ` (${l.optionNames.join(", ")})` : ""}
                        {l.note ? ` — ${l.note}` : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-[var(--op-muted,#556159)]">
                    The sale is kept here and is sent once when the connection is back. Keep this device on.
                  </p>
                </div>
              )}
            </div>
          </div>
          <Button className="mt-5 h-14 w-full text-base" autoFocus onClick={reset}>
            {voice.next}
          </Button>
        </div>
      </div>
    );
  }

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const onOrder: Record<string, number> = {};
  for (const line of cart) onOrder[line.menuItemId] = (onOrder[line.menuItemId] ?? 0) + line.quantity;
  const ready = orders.filter((order) => order.ready).length;
  const cashHints = cashSuggestions(total);

  return (
    <div className={DASHBOARD_MAX}>
      {bare ? null : (
        <DashboardPageHero icon={UtensilsCrossed} title="Counter" description="Ring the order, take payment, give a number." />
      )}

      <OpenForTheDay branchId={branchId} />

      {menuFromCache ? (
        <p role="status" className={cn(DASHBOARD_SECTION_SURFACE, "text-sm")}>
          Not connected. This is the menu from the last time this device was online, so a price or what has run
          out may be out of date. Sales are kept on this device and sent when the connection is back.
        </p>
      ) : null}
      {outboxProblem ? (
        <p role="alert" className={cn(DASHBOARD_SECTION_SURFACE, "text-sm text-red-700")}>
          A sale saved on this device could not be sent: {outboxProblem} Sales saved after it are waiting
          behind it. Open the cashier screen to clear it, or call support.
        </p>
      ) : null}

      {menu.items.filter((i) => i.active).length === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Your menu is empty</p>
          <p className={dashboardHintClass()}>Add what you sell, with its price, and it appears here to ring.</p>
          {canManageMenu ? (
            <Link className="mt-2 inline-block text-sm font-medium underline" href={APP_ROUTES.restaurantMenu}>
              Go to the menu
            </Link>
          ) : (
            <p className={cn("mt-2", dashboardHintClass())}>Ask the owner or a manager to set up the menu.</p>
          )}
        </div>
      ) : (
        <>
          {/*
            One sheet, three columns, read left to right the way an order travels: what the kitchen
            is making (the pass), what can be rung (the board), what is being rung now (the docket).
            Narrower than a wide tablet the pass lies down as a rail above the other two.
          */}
          <div
            className={cn(
              DASHBOARD_TABLE_SURFACE,
              "grid grid-cols-[minmax(0,1fr)] lg:grid-cols-12",
              // On the till page the sheet is the whole screen under the rail.
              bare && "xl:min-h-[calc(100dvh-7.5rem)]",
            )}
          >
            <section
              aria-label="Orders being made"
              className={cn("min-w-0 p-4 sm:p-5 lg:col-span-12 xl:col-span-3 xl:border-r", COLUMN_RULE)}
            >
              <header className="flex items-baseline justify-between gap-3">
                <h2 className={SHEET_TITLE}>{voice.pass}</h2>
                <span className="font-mono text-[12px] tabular-nums text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
                  {orders.length === 0 ? "clear" : ready > 0 ? `${ready} ready` : `${orders.length} ${voice.making}`}
                </span>
              </header>
              <span aria-hidden className="mt-2.5 block h-px w-7 bg-[var(--pos-primary,#1D4B3B)]" />
              {ordersStale ? (
                <p role="status" className="mt-2 text-xs text-red-700">
                  Not connected — this list may be out of date
                </p>
              ) : null}
              {unprinted.length > 0 ? (
                <div role="alert" className="mt-2 rounded-[2px] border border-red-700 bg-[color-mix(in_srgb,#b91c1c_6%,transparent)] p-2">
                  <p className="text-xs font-semibold text-red-700">
                    {unprinted.length === 1 ? "A kitchen ticket has not printed" : `${unprinted.length} kitchen tickets have not printed`}.
                    Check the kitchen, or print again here.
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {unprinted.map((t) => (
                      <li key={t.jobId} className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          Order {t.orderNumber}
                          {t.ticketType === "VOID" ? " · cancelled" : ""}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
                          disabled={reprinting === t.ticketId}
                          onClick={() => void reprint(t)}
                        >
                          Print again
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {orders.length === 0 ? (
                <p className={cn("mt-3", dashboardHintClass())}>
                  {voice.passEmpty}
                </p>
              ) : (
                <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
                  {/* Ready first: those are the ones somebody is standing at the counter for. */}
                  {[...orders]
                    .sort((x, y) => Number(y.ready) - Number(x.ready))
                    .map((order) => (
                      <li
                        key={order.orderId}
                        className={cn(
                          "flex w-[11.5rem] shrink-0 flex-col rounded-[2px] border bg-[var(--op-paper,#FFFEFA)] p-3 xl:w-auto",
                          order.ready
                            ? "border-[var(--kiosk-highlight,#A55237)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]",
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "font-mono text-3xl font-semibold leading-none tabular-nums",
                              order.ready && "text-[var(--kiosk-highlight,#A55237)]",
                            )}
                          >
                            {order.orderNumber}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-[var(--op-muted,#556159)]">
                            {order.sentAt ? elapsedLabel(order.sentAt, now) : ""}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 min-h-[2.5em] text-xs leading-snug text-[var(--op-ink,#121A16)] xl:min-h-0">
                          {order.lineNames.join(", ")}
                        </p>
                        {order.ready ? (
                          <Button
                            size="sm"
                            className="mt-2 h-10 w-full"
                            disabled={handingOver === order.orderId}
                            onClick={() => void handOver(order)}
                          >
                            Handed over
                          </Button>
                        ) : (
                          <p className="mt-2 flex h-10 items-center text-xs text-[var(--op-muted,#556159)] xl:h-auto">
                            {order.linesReady} of {order.linesTotal} ready
                          </p>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </section>

            <section
              aria-label="Menu"
              className={cn("min-w-0 border-t p-4 sm:p-5 lg:col-span-7 xl:col-span-5 xl:border-t-0", COLUMN_RULE)}
            >
              <header className="mb-3">
                <h2 className={SHEET_TITLE}>{voice.board}</h2>
                <span aria-hidden className="mt-2.5 block h-px w-7 bg-[var(--pos-primary,#1D4B3B)]" />
              </header>
              <MenuPicker menu={menu} onRing={ring} counts={onOrder} />
            </section>

            {/* The docket: the order as the slip it will become, then how it is paid. */}
            <section
              id="counter-docket"
              aria-label="This order"
              className={cn(
                "min-w-0 scroll-mt-4 border-t bg-[var(--kiosk-panel,#EFEBE2)] p-4 sm:p-5 lg:col-span-5 lg:border-l xl:col-span-4 xl:border-t-0",
                COLUMN_RULE,
              )}
            >
              <div className="[filter:drop-shadow(0_18px_22px_rgba(18,26,22,0.11))_drop-shadow(0_1px_1px_rgba(18,26,22,0.1))]">
                <div className="kiosk-setup-slip food-paper bg-[var(--op-paper,#FFFEFA)] px-4 pb-8 pt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className={SHEET_TITLE}>{voice.order}</h2>
                    <span className="font-mono text-[11px] tabular-nums text-[var(--op-muted,#556159)]">
                      {itemCount === 0 ? "nothing yet" : itemCount === 1 ? "1 item" : `${itemCount} items`}
                    </span>
                  </div>
                  <div className="my-3 border-t border-dashed border-[rgba(18,26,22,0.28)]" aria-hidden />
                  {cart.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--op-muted,#556159)]">{voice.orderEmpty}</p>
                  ) : (
                    <ul className="grid gap-3">
                      {cart.map((line) => (
                        <li
                          key={line.key}
                          className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200"
                        >
                          <div className="flex items-baseline gap-2 font-mono text-[13px] text-[var(--op-ink,#121A16)]">
                            <span className="min-w-0 truncate font-sans text-sm font-semibold">{line.name}</span>
                            <span
                              className="min-w-3 flex-1 translate-y-[-3px] border-b border-dotted border-[rgba(18,26,22,0.28)]"
                              aria-hidden
                            />
                            <span className="shrink-0 tabular-nums">{kes(line.quantity * line.unitPrice)}</span>
                          </div>
                          {line.optionNames.length > 0 ? (
                            <p className="text-xs text-[var(--op-muted,#556159)]">{line.optionNames.join(", ")}</p>
                          ) : null}
                          {line.note ? <p className="text-xs italic text-[var(--op-ink,#121A16)]">“{line.note}”</p> : null}
                          <div className="mt-1.5 flex items-center gap-1">
                            <button
                              type="button"
                              className={STEP}
                              aria-label={`One fewer ${line.name}`}
                              onClick={() => changeQuantity(line.key, -1)}
                            >
                              <Minus className="size-4" aria-hidden />
                            </button>
                            <span className="w-8 text-center font-mono text-sm font-semibold tabular-nums">{line.quantity}</span>
                            <button
                              type="button"
                              className={STEP}
                              aria-label={`One more ${line.name}`}
                              onClick={() => changeQuantity(line.key, 1)}
                            >
                              <Plus className="size-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="ml-auto min-h-10 rounded-[2px] px-2 text-xs text-[var(--op-muted,#556159)] underline underline-offset-2 hover:text-[var(--op-ink,#121A16)]"
                              onClick={() =>
                                phoneAsked ? setError(ASKED) : setCart((prev) => prev.filter((l) => l.key !== line.key))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="my-3 border-t border-dashed border-[rgba(18,26,22,0.28)]" aria-hidden />
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-[var(--op-muted,#556159)]">To pay</span>
                    <span className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-[var(--op-ink,#121A16)]">
                      {kes(total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How they are paying">
                  {(["cash", "mpesa_manual"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={method === m}
                      className={cn(TILE, "min-h-12 py-2 text-center text-sm font-semibold", method === m && TILE_ON)}
                      disabled={phoneAsked}
                      onClick={() => setMethod(m)}
                    >
                      {m === "cash" ? "Cash" : "M-Pesa"}
                    </button>
                  ))}
                </div>
                {method === "cash" ? (
                  <div className="grid gap-2">
                    <label className="grid gap-1">
                      <span className={dashboardLabelClass()}>Cash received (optional)</span>
                      <input
                        className={dashboardInputClass(false, "h-12 font-mono text-base sm:h-12")}
                        inputMode="decimal"
                        value={cashReceived}
                        onChange={(e) => {
                          setCashReceived(e.target.value.replace(/[^0-9.]/g, ""));
                          setError(null);
                        }}
                      />
                    </label>
                    {cashHints.length > 0 ? (
                      <div className="flex flex-wrap gap-2" aria-label="Common amounts">
                        {cashHints.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            className={cn(TILE, "min-h-10 px-3 py-1 font-mono text-sm tabular-nums", cashNumber === amount && TILE_ON)}
                            onClick={() => {
                              setCashReceived(String(amount));
                              setError(null);
                            }}
                          >
                            {amount.toLocaleString("en-KE")}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {change != null && change > 0 ? (
                      <p role="status" className="flex items-baseline justify-between text-sm">
                        <span>Change to give</span>
                        <span className="font-mono text-xl font-semibold tabular-nums">{kes(change)}</span>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <MpesaRequest
                      amount={total}
                      disabled={paying || cart.length === 0}
                      onReceived={mpesaReceived}
                      onWaitingChange={setPhoneAsked}
                    />
                    <label className="grid gap-1">
                      <span className={dashboardLabelClass()}>M-Pesa code (optional)</span>
                      <input
                        className={dashboardInputClass(false, "h-12 font-mono text-base uppercase sm:h-12")}
                        value={reference}
                        maxLength={20}
                        disabled={phoneAsked}
                        onChange={(e) => setReference(e.target.value)}
                      />
                      <span className={dashboardHintClass()}>
                        If they paid to your till themselves, check the payment on your phone before you confirm.
                      </span>
                    </label>
                  </div>
                )}

                {error ? (
                  <p role="alert" className="text-sm text-red-700">
                    {error}{" "}
                    {needsShift ? (
                      <Link className="underline" href={APP_ROUTES.shifts}>
                        Open a shift
                      </Link>
                    ) : null}
                  </p>
                ) : null}

                <Button
                  className="h-14 w-full text-base"
                  disabled={paying || phoneAsked || cart.length === 0}
                  onClick={() => void pay()}
                >
                  {paying ? "Recording…" : cart.length === 0 ? "Take payment" : `Take ${kes(total)}`}
                </Button>
              </div>
            </section>
          </div>

          {/* On a phone the docket is below the menu: keep the running total within thumb reach. */}
          {cart.length > 0 ? (
            <a
              href="#counter-docket"
              className="sticky bottom-2 z-10 mx-1 mt-2 flex min-h-12 items-center justify-between gap-3 rounded-[2px] bg-[var(--pos-primary,#1D4B3B)] px-4 text-sm font-semibold text-[var(--pos-on-primary,#F4F1EA)] shadow-[0_10px_24px_-10px_rgba(18,26,22,0.55)] lg:hidden"
            >
              <span>{itemCount === 1 ? "1 item" : `${itemCount} items`}</span>
              <span className="font-mono tabular-nums">{kes(total)} · Pay</span>
            </a>
          ) : null}
        </>
      )}

      {choosing ? (
        <ModifierSheet
          item={choosing}
          groups={groupsFor(choosing, menu.modifierGroups)}
          onClose={() => setChoosing(null)}
          onAdd={(choice) => {
            lineSeq.current += 1;
            const item = choosing;
            setCart((prev) =>
              addToCart(prev, {
                key: `l${lineSeq.current}`,
                menuItemId: item.id,
                kind: "DISH",
                itemId: null,
                name: item.name,
                quantity: choice.quantity,
                unitPrice: choice.unitPrice,
                optionIds: choice.optionIds,
                optionNames: choice.optionNames,
                note: choice.note,
              }),
            );
            setChoosing(null);
          }}
        />
      ) : null}
    </div>
  );
}

const SHEET_TITLE =
  "font-serif text-[1.45rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]";
const COLUMN_RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";

const STEP =
  "flex size-10 items-center justify-center rounded-[2px] border border-[color-mix(in_srgb,var(--order-ink,#121A16)_14%,transparent)] " +
  "bg-[var(--op-paper,#FFFEFA)] text-[var(--op-ink,#121A16)] transition-colors duration-200 hover:border-[var(--pos-primary,#1D4B3B)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]";

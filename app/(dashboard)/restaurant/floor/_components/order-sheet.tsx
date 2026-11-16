"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { getBusinessStoreTypes } from "@/lib/business-store-type";
import { COUNTER_VOICES, foodTillKind } from "@/lib/food-till";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  addOrderLines,
  cancelOrder,
  cancelOrderLine,
  markNoShow,
  changeOrderLine,
  closeBillWithoutSale,
  createBill,
  discardBill,
  fetchFloor,
  fetchMenu,
  fetchOpenOrder,
  fetchServers,
  markOrderServed,
  mergeOrder,
  moveOrder,
  payBill,
  seatBooking,
  sendOrder,
  setBillRequested,
  setOrderDelivery,
  updateOrderDetails,
  type MenuItemRecord,
  type MenuRecord,
  type OpenOrderRecord,
  type OrderBillRecord,
  type OrderCardRecord,
  type OrderLineRecord,
  type RestaurantTableRecord,
} from "@/lib/restaurant-api";
import { equalShares, groupsFor, round2, splitRemainder, tileState } from "@/lib/restaurant-cart";
import { buildBillEscPos, printOnThisDevice } from "@/lib/restaurant-print";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";
import { useRestaurantLive } from "@/lib/use-restaurant-live";
import { cn } from "@/lib/utils";

import { MenuPicker } from "../../_components/menu-picker";
import { ModifierSheet } from "../../_components/modifier-sheet";
import { MpesaRequest, mpesaRequestAmount } from "../../_components/mpesa-request";

import { ReasonDialog, type ReasonRequest } from "../../_components/reason-dialog";
import type { FloorRights } from "./floor-screen";

const kes = (n: number) => formatMoney(n, "KES");

const STAGE_WORDS: Record<string, string> = {
  DRAFT: "Not sent",
  NEW: "In the kitchen",
  PREPARING: "Being made",
  READY: "Ready to carry",
  SERVED: "Served",
  VOIDED: "Cancelled",
};

const BILL_WORDS: Record<OrderBillRecord["status"], string> = {
  OPEN: "Not paid",
  PAID: "Paid",
  COMP: "On the house",
  UNPAID: "Left unpaid",
  VOIDED: "Sale voided",
};

/** ", Mon 16 Nov at 19:00" for a booking's time, in the shop's own time; empty when there is none. */
function bookedFor(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
  const time = d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
  return `, ${day} at ${time}`;
}

function message(e: unknown, fallback: string): string {
  return e instanceof ApiRequestError && e.message ? e.message : fallback;
}

/**
 * One order: what is on it, what the kitchen has, and its bills. Lines are added from the menu
 * and stay "not sent" until Send; after that a line is not edited, only cancelled with a reason.
 */
export function OrderSheet({
  orderId,
  rights,
  tables,
  onBack,
}: {
  orderId: string;
  rights: FloorRights;
  tables: RestaurantTableRecord[];
  onBack: () => void;
}) {
  const { business } = useDashboard();
  // House wording: a bar sends a round to the bar; a kitchen gets food. Picked by resolved kind.
  const voice = COUNTER_VOICES[foodTillKind(getBusinessStoreTypes(business))];
  const [order, setOrder] = useState<OpenOrderRecord | null>(null);
  const [menu, setMenu] = useState<MenuRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<ReasonRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState<MenuItemRecord | null>(null);
  const [seat, setSeat] = useState(0);
  const [paying, setPaying] = useState<OrderBillRecord | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [joining, setJoining] = useState<OrderCardRecord[] | null>(null);
  const [servers, setServers] = useState<{ staffProfileId: string; name: string }[]>([]);
  const lineSeq = useRef(0);
  const sessionKey = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOpenOrder(orderId));
      setStale(false);
      setLoadError(null);
    } catch {
      setStale(true);
      setOrder((current) => {
        if (current == null) setLoadError("Could not load the order. Check your connection and try again.");
        return current;
      });
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const branchId = order?.branchId;
  useEffect(() => {
    if (!branchId) return;
    void fetchMenu(branchId)
      .then(setMenu)
      .catch(() => setMenu(null));
  }, [branchId]);

  useEffect(() => {
    // Names for "served by"; the order works without the list.
    void fetchServers()
      .then(setServers)
      .catch(() => setServers([]));
  }, []);

  async function startJoining() {
    if (!order) return;
    try {
      const floor = await fetchFloor(order.branchId);
      const others = [...floor.tables.flatMap((t) => t.orders), ...floor.otherOrders].filter(
        (o) => o.orderId !== order.id && !o.booked,
      );
      if (others.length === 0) return setError("There is no other open order to join with");
      setJoining(others);
    } catch {
      setError("Could not load the other orders. Try again.");
    }
  }

  // Kitchen progress arrives by polling; a dialog being open pauses nothing but is not interrupted.
  useRestaurantLive(() => void load(), 6000, !busy && paying == null && !splitting);

  /** Runs one change to the order and shows its result, or says plainly why it was refused. */
  async function act(run: () => Promise<OpenOrderRecord>, fallback: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      setOrder(await run());
      return true;
    } catch (e) {
      setError(message(e, fallback));
      void load();
      return false;
    } finally {
      setBusy(false);
    }
  }

  function ring(item: MenuItemRecord, choice?: { optionIds: string[]; note: string; quantity: number }) {
    if (!menu || !tileState(item).canRing) return;
    if (!choice && item.kind === "DISH" && groupsFor(item, menu.modifierGroups).length > 0) {
      setChoosing(item);
      return;
    }
    lineSeq.current += 1;
    // Made once per tap: if the request is retried the line is not added twice.
    const clientLineId = `${sessionKey.current}-${lineSeq.current}`;
    void act(
      () =>
        addOrderLines(orderId, [
          {
            clientLineId,
            menuItemId: item.id,
            modifierOptionIds: choice?.optionIds ?? [],
            quantity: choice?.quantity ?? 1,
            ...(choice?.note ? { note: choice.note } : {}),
            ...(seat > 0 ? { seatNo: seat } : {}),
          },
        ]),
      `${item.name} was not added. Try again.`,
    );
  }

  function cancelLine(line: OrderLineRecord) {
    if (line.stage === "DRAFT") {
      void act(() => cancelOrderLine(orderId, line.id), "That was not removed. Try again.");
      return;
    }
    setAsking({
      title: `Cancel ${line.name}?`,
      hint: "It has gone to the kitchen, so the kitchen is told to stop. If it was already cooked it is recorded as wasted.",
      confirm: "Cancel the dish",
      required: true,
      run: (reason) => void act(() => cancelOrderLine(orderId, line.id, reason), "That was not cancelled. Try again."),
    });
  }

  if (loadError) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardLoadError title="Order" message={loadError} onRetry={() => void load()} />
        <Button variant="outline" className="mt-2" onClick={onBack}>
          Back to the floor
        </Button>
      </div>
    );
  }
  if (order == null) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardLoading label="Loading the order…" />
      </div>
    );
  }

  const open = order.status === "pending";
  const canAdd = open && rights.canTakeOrders && !order.booked;
  const live = order.lines.filter((l) => l.stage !== "VOIDED");
  const unsent = live.filter((l) => l.stage === "DRAFT");
  // Lines a customer added from the table's QR code that nobody on the staff has sent yet. Anyone
  // holding a picture of the code can add these, so they are called out before they are sent.
  const fromPhone = unsent.filter((l) => l.fromCustomer).length;
  const ready = live.filter((l) => l.stage === "READY");
  const seats = Math.min(order.guestCount ?? 0, 12);
  const usesSeats = live.some((l) => l.seatNo != null);
  // Where a sent round goes, in the house's own words: a bar's drinks go to the bar, a kitchen's food
  // to the kitchen. Derived from the voice, not from the store type by name.
  const sendTo = voice.making === "pouring" ? "the bar" : "the kitchen";
  // A dine-in order with no table and a name is a tab; show the name as its heading, not "No table".
  const isTab = order.channel === "DINE_IN" && !order.tableName && !order.booked && Boolean(order.customerName);
  const where =
    order.channel === "TAKEAWAY"
      ? "Takeaway"
      : order.channel === "DELIVERY"
        ? "Delivery"
        : isTab
          ? `${order.customerName}`
          : (order.tableName ?? "No table");

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to the floor
        </Button>
        <h1 className="text-lg font-semibold">
          {where} · order <span className="font-mono tabular-nums">{order.orderNumber}</span>
        </h1>
        <span className={dashboardHintClass()}>
          {[
            isTab ? "Tab" : "",
            order.guestCount ? `${order.guestCount} ${order.guestCount === 1 ? "guest" : "guests"}` : "",
            order.servedByName ? `served by ${order.servedByName}` : "",
            isTab ? "" : (order.customerName ?? ""),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {open && rights.canTakeOrders && !order.booked ? (
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {servers.length > 0 ? (
              <select
                className="min-h-9 rounded-[2px] border px-2 text-sm"
                aria-label="Served by"
                value={order.servedByStaffProfileId ?? ""}
                disabled={busy}
                onChange={(e) =>
                  void act(
                    () => updateOrderDetails(orderId, { servedByStaffProfileId: e.target.value }),
                    "The server was not changed. Try again.",
                  )
                }
              >
                <option value="">Served by…</option>
                {/* Whoever opened the order may not be in the list of people marked as serving. */}
                {order.servedByStaffProfileId && !servers.some((p) => p.staffProfileId === order.servedByStaffProfileId) ? (
                  <option value={order.servedByStaffProfileId}>{order.servedByName ?? "Staff"}</option>
                ) : null}
                {servers.map((p) => (
                  <option key={p.staffProfileId} value={p.staffProfileId}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : null}
            {order.channel === "DINE_IN" && tables.length > 0 ? (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setMoving(true)}>
                Move table
              </Button>
            ) : null}
            {order.bills.every((b) => b.status === "VOIDED") ? (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void startJoining()}>
                Join with another order
              </Button>
            ) : null}
          </span>
        ) : null}
      </div>

      {open && fromPhone > 0 ? (
        <p role="status" className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 text-sm")}>
          {fromPhone === 1 ? "1 item was" : `${fromPhone} items were`} ordered from a phone using this table&rsquo;s QR
          code. Check with the table that {fromPhone === 1 ? "it is" : "they are"} theirs, then send or remove{" "}
          {fromPhone === 1 ? "it" : "them"}.
        </p>
      ) : order.source === "QR" && open ? (
        <p className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 text-sm")}>
          The customer started this order from the table&rsquo;s QR code.
        </p>
      ) : null}
      {order.channel === "DELIVERY" ? (
        <DeliveryPanel order={order} canChange={rights.canTakeOrders} busy={busy} onAct={act} />
      ) : null}

      {order.status === "completed" ? (
        <p className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 text-sm font-semibold")}>This order is settled.</p>
      ) : order.status === "cancelled" ? (
        <p className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 text-sm font-semibold")}>This order was cancelled.</p>
      ) : order.booked ? (
        <div className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 flex flex-wrap items-center gap-3")}>
          <p className="text-sm">
            Booked{order.customerName ? ` for ${order.customerName}` : ""}
            {order.customerPhone ? ` (${order.customerPhone})` : ""}
            {bookedFor(order.scheduledStart)}. Seat it when the guests arrive.
            {order.depositState === "HELD" && order.depositAmount ? (
              <span className="font-semibold"> Deposit held: {kes(order.depositAmount)}.</span>
            ) : null}
          </p>
          {rights.canTakeOrders ? (
            <>
              <Button size="sm" disabled={busy} onClick={() => void act(() => seatBooking(orderId), "Could not seat the booking.")}>
                Guests have arrived
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  const held = order.depositState === "HELD";
                  // With a deposit held, decide up front where it goes; without one, just the reason.
                  let depositArg: { refundsDeposit: boolean; depositBack?: "cash" | "mpesa_manual" } | undefined;
                  if (held) {
                    const hand = window.confirm(
                      `Hand the ${kes(order.depositAmount ?? 0)} deposit back now? OK = give it back · Cancel = keep it as the customer's credit.`,
                    );
                    if (hand) {
                      const byMpesa = window.confirm("How is it handed back? OK = M-Pesa · Cancel = cash.");
                      depositArg = { refundsDeposit: true, depositBack: byMpesa ? "mpesa_manual" : "cash" };
                    } else {
                      depositArg = { refundsDeposit: false };
                    }
                  }
                  setAsking({
                    title: "Cancel this booking?",
                    hint: held
                      ? "The table is freed. The deposit goes where you just chose."
                      : "The table is freed for that time.",
                    confirm: "Cancel the booking",
                    required: false,
                    run: (reason) =>
                      void act(
                        () => cancelOrder(orderId, reason || undefined, depositArg),
                        "Could not cancel the booking.",
                      ).then((ok) => ok && onBack()),
                  });
                }}
              >
                Cancel booking
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  const held = order.depositState === "HELD";
                  const message = held
                    ? `Mark this booking as a no-show? The table is freed. Keep the ${kes(order.depositAmount ?? 0)} deposit as the customer's credit? OK = credit them · Cancel = keep it as income.`
                    : "Mark this booking as a no-show? The table is freed.";
                  const answer = window.confirm(message);
                  if (!held && !answer) return; // without a deposit, Cancel means "don't"
                  void act(() => markNoShow(orderId, held && answer), "Could not close the booking.").then(
                    (ok) => ok && onBack(),
                  );
                }}
              >
                Did not come
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      {stale ? (
        <p role="alert" className="mb-2 text-sm font-semibold text-red-700">
          Not connected — this order may be out of date.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid content-start gap-2">
          {canAdd ? (
            <section className={DASHBOARD_SECTION_SURFACE} aria-label="Menu">
              {seats > 1 ? (
                <div className="mb-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Who is this for">
                  <span className={dashboardLabelClass()}>For</span>
                  {[0, ...Array.from({ length: seats }, (_, i) => i + 1)].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={seat === n}
                      className={cn(
                        "min-h-9 rounded-[2px] border px-3 text-sm font-semibold",
                        "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]",
                        seat === n &&
                          "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]",
                      )}
                      onClick={() => setSeat(n)}
                    >
                      {n === 0 ? "The table" : `Seat ${n}`}
                    </button>
                  ))}
                </div>
              ) : null}
              {menu == null ? (
                <DashboardLoading label="Loading the menu…" />
              ) : menu.items.filter((i) => i.active).length === 0 ? (
                <p className={dashboardHintClass()}>The menu is empty. Add dishes under Menu first.</p>
              ) : (
                <MenuPicker menu={menu} onRing={(item) => ring(item)} />
              )}
            </section>
          ) : null}

          <BillsSection
            order={order}
            rights={rights}
            busy={busy}
            usesSeats={usesSeats}
            seats={seats}
            hasUnsent={unsent.length > 0}
            onAct={act}
            onPay={setPaying}
            onSplit={() => setSplitting(true)}
          />
        </div>

        <section className={cn(DASHBOARD_SECTION_SURFACE, "content-start")} aria-label="On this order">
          <h2 className={dashboardLabelClass()}>On this order</h2>
          {order.lines.length === 0 ? (
            <p className={cn("mt-2", dashboardHintClass())}>
              {canAdd ? "Tap the menu to add to the order." : "Nothing has been ordered yet."}
            </p>
          ) : (
            <ul className="mt-1 divide-y">
              {order.lines.map((line) => (
                <li key={line.id} className="py-2">
                  <div className="flex items-start gap-2">
                    <div className={cn("min-w-0 flex-1", line.stage === "VOIDED" && "opacity-60")}>
                      <div className={cn("text-sm font-medium", line.stage === "VOIDED" && "line-through")}>
                        <span className="font-mono tabular-nums">{line.quantity} ×</span> {line.name}
                      </div>
                      {line.modifiers.length > 0 ? (
                        <div className={dashboardHintClass()}>{line.modifiers.map((m) => m.option).join(", ")}</div>
                      ) : null}
                      {line.note ? <div className="text-xs italic">{line.note}</div> : null}
                      <div className={dashboardHintClass()}>
                        {line.fromCustomer && line.stage === "DRAFT"
                          ? "Ordered from the customer's phone · not sent"
                          : (STAGE_WORDS[line.stage] ?? line.stage)}
                        {line.fromCustomer && line.stage !== "DRAFT" ? " · from the customer's phone" : ""}
                        {line.seatNo ? ` · seat ${line.seatNo}` : ""}
                        {line.stage === "VOIDED" && line.voidReason ? ` · ${line.voidReason}` : ""}
                        {line.stage !== "VOIDED" && line.settledQuantity >= line.quantity
                          ? " · settled"
                          : line.billedQuantity > 0
                            ? " · on a bill"
                            : ""}
                      </div>
                    </div>
                    <span className="font-mono text-sm tabular-nums">{line.stage === "VOIDED" ? "" : kes(line.lineTotal)}</span>
                  </div>
                  {open && rights.canTakeOrders && line.stage === "DRAFT" ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-9"
                        aria-label={`One fewer ${line.name}`}
                        disabled={busy}
                        onClick={() =>
                          void act(() => changeOrderLine(orderId, line.id, { quantity: line.quantity - 1 }), "Not changed. Try again.")
                        }
                      >
                        −
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-9"
                        aria-label={`One more ${line.name}`}
                        disabled={busy}
                        onClick={() =>
                          void act(() => changeOrderLine(orderId, line.id, { quantity: line.quantity + 1 }), "Not changed. Try again.")
                        }
                      >
                        +
                      </Button>
                      <button type="button" className="ml-auto px-2 py-1 text-sm underline" disabled={busy} onClick={() => cancelLine(line)}>
                        Remove
                      </button>
                    </div>
                  ) : open &&
                    rights.canTakeOrders &&
                    rights.canCancelSent &&
                    line.stage !== "VOIDED" &&
                    line.billedQuantity === 0 ? (
                    <button type="button" className="mt-1 text-sm underline" disabled={busy} onClick={() => cancelLine(line)}>
                      Cancel this
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-2 grid gap-0.5 border-t pt-2 text-sm">
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="font-mono tabular-nums">{kes(order.total)}</dd>
            </div>
            {order.settled > 0 ? (
              <div className="flex justify-between">
                <dt>Paid or closed</dt>
                <dd className="font-mono tabular-nums">{kes(order.settled)}</dd>
              </div>
            ) : null}
          </dl>

          {open && rights.canTakeOrders && !order.booked ? (
            <div className="mt-3 grid gap-2">
              <Button
                className="h-12 text-base"
                disabled={busy || unsent.length === 0}
                onClick={() => void act(() => sendOrder(orderId), "The order was not sent. Try again.")}
              >
                {unsent.length === 0 ? "Nothing to send" : `Send ${unsent.length} to ${sendTo}`}
              </Button>
              {ready.length > 0 ? (
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={busy}
                  onClick={() => void act(() => markOrderServed(orderId), "Not marked as served. Try again.")}
                >
                  {ready.length} ready — mark as served
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="h-11"
                disabled={busy}
                onClick={() =>
                  void act(() => setBillRequested(orderId, !order.billRequestedAt), "Not changed. Try again.")
                }
              >
                {order.billRequestedAt ? "Bill no longer wanted" : "Customer wants the bill"}
              </Button>
              {live.every((l) => l.stage === "DRAFT") && order.bills.every((b) => b.status === "VOIDED") ? (
                <button
                  type="button"
                  className="text-sm underline"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm("Cancel this order? Nothing has been sent to the kitchen.")) return;
                    void act(() => cancelOrder(orderId, "Cancelled before anything was sent"), "Not cancelled. Try again.").then(
                      (ok) => ok && onBack(),
                    );
                  }}
                >
                  Cancel the order
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {choosing && menu ? (
        <ModifierSheet
          item={choosing}
          groups={groupsFor(choosing, menu.modifierGroups)}
          onClose={() => setChoosing(null)}
          onAdd={(choice) => {
            const item = choosing;
            setChoosing(null);
            ring(item, choice);
          }}
        />
      ) : null}
      {asking ? <ReasonDialog request={asking} onClose={() => setAsking(null)} /> : null}
      {paying ? (
        <PayDialog
          order={order}
          bill={paying}
          onClose={() => setPaying(null)}
          onPaid={(updated) => {
            setPaying(null);
            setOrder(updated);
          }}
          onChanged={() => void load()}
        />
      ) : null}
      {splitting ? (
        <SplitDialog
          order={order}
          onClose={() => setSplitting(false)}
          onMade={(updated) => {
            setSplitting(false);
            setOrder(updated);
          }}
        />
      ) : null}
      {joining ? (
        <Dialog open onOpenChange={(o) => (o ? undefined : setJoining(null))}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Join with another order</DialogTitle>
              <DialogDescription>
                Everything on this order moves onto the one you choose, and this one is closed. It cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <ul className="grid gap-2">
              {joining.map((o) => (
                <li key={o.orderId}>
                  <Button
                    variant="outline"
                    className="h-auto min-h-11 w-full justify-between py-2"
                    disabled={busy}
                    onClick={() => {
                      setJoining(null);
                      void act(() => mergeOrder(orderId, o.orderId), "The orders were not joined. Try again.").then(
                        (ok) => ok && onBack(),
                      );
                    }}
                  >
                    <span>
                      Order {o.orderNumber}
                      {tables.find((t) => t.id === o.tableId) ? ` · ${tables.find((t) => t.id === o.tableId)!.name}` : ""}
                      {o.customerName ? ` · ${o.customerName}` : ""}
                    </span>
                    <span className="font-mono tabular-nums">{kes(o.total)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
      {moving ? (
        <Dialog open onOpenChange={(o) => (o ? undefined : setMoving(false))}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Move to another table</DialogTitle>
              <DialogDescription>The order and everything on it moves with the guests.</DialogDescription>
            </DialogHeader>
            <ul className="grid grid-cols-2 gap-2">
              {tables
                .filter((t) => t.id !== order.tableId)
                .map((t) => (
                  <li key={t.id}>
                    <Button
                      variant="outline"
                      className="h-11 w-full"
                      disabled={busy}
                      onClick={() => {
                        setMoving(false);
                        void act(() => moveOrder(orderId, t.id), "The order was not moved. Try again.");
                      }}
                    >
                      {t.name}
                    </Button>
                  </li>
                ))}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

/** A delivery order: where it is going, what the delivery costs, who is taking it and whether it has left. */
function DeliveryPanel({
  order,
  canChange,
  busy,
  onAct,
}: {
  order: OpenOrderRecord;
  canChange: boolean;
  busy: boolean;
  onAct: (run: () => Promise<OpenOrderRecord>, fallback: string) => Promise<boolean>;
}) {
  const [rider, setRider] = useState(order.riderName ?? "");
  const [fee, setFee] = useState(order.deliveryFee != null ? String(order.deliveryFee) : "");
  const open = order.status === "pending";
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });

  return (
    <section className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 grid gap-2")} aria-label="Delivery">
      <p className="text-sm">
        <span className={dashboardLabelClass()}>Deliver to</span> {order.deliveryAddress ?? "No address given"}
        {order.customerPhone ? ` · ${order.customerPhone}` : ""}
      </p>
      <p className={dashboardHintClass()}>
        {order.deliveredAt
          ? `Delivered at ${time(order.deliveredAt)}`
          : order.dispatchedAt
            ? `Left at ${time(order.dispatchedAt)}`
            : "Not sent out yet"}
        {order.riderName ? ` · ${order.riderName}` : ""}
      </p>
      {canChange ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Rider</span>
            <input className={dashboardInputClass(false, "w-40")} value={rider} maxLength={120} onChange={(e) => setRider(e.target.value)} />
          </label>
          {open ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Delivery fee</span>
              <input
                className={dashboardInputClass(false, "w-28 font-mono")}
                inputMode="decimal"
                value={fee}
                onChange={(e) => setFee(cleanMoneyText(e.target.value))}
              />
            </label>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              void onAct(
                () =>
                  setOrderDelivery(order.id, {
                    riderName: rider.trim(),
                    ...(open && parseMoney(fee) != null ? { deliveryFee: parseMoney(fee)! } : {}),
                  }),
                "The delivery details were not saved. Try again.",
              )
            }
          >
            Save
          </Button>
          {!order.dispatchedAt ? (
            <Button size="sm" disabled={busy} onClick={() => void onAct(() => setOrderDelivery(order.id, { dispatched: true }), "Not saved. Try again.")}>
              It has left
            </Button>
          ) : !order.deliveredAt ? (
            <Button size="sm" disabled={busy} onClick={() => void onAct(() => setOrderDelivery(order.id, { delivered: true }), "Not saved. Try again.")}>
              It was delivered
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function BillsSection({
  order,
  rights,
  busy,
  usesSeats,
  seats,
  hasUnsent,
  onAct,
  onPay,
  onSplit,
}: {
  order: OpenOrderRecord;
  rights: FloorRights;
  busy: boolean;
  usesSeats: boolean;
  seats: number;
  hasUnsent: boolean;
  onAct: (run: () => Promise<OpenOrderRecord>, fallback: string) => Promise<boolean>;
  onPay: (bill: OrderBillRecord) => void;
  onSplit: () => void;
}) {
  const [printProblem, setPrintProblem] = useState<string | null>(null);
  const [asking, setAsking] = useState<ReasonRequest | null>(null);
  const open = order.status === "pending" && !order.booked;
  const canBill = open && (rights.canTakeOrders || rights.canTakeMoney);
  if (order.bills.length === 0 && (!canBill || order.total <= 0)) return null;

  function close(bill: OrderBillRecord, outcome: "COMP" | "UNPAID") {
    setAsking({
      title: outcome === "COMP" ? `Bill ${bill.billNo} on the house?` : `Bill ${bill.billNo} left unpaid?`,
      hint:
        outcome === "COMP"
          ? "No money is taken. The bill is closed and the reason is kept with it."
          : "The customer left without paying. The bill is closed with no sale and the reason is kept with it.",
      confirm: outcome === "COMP" ? "Put it on the house" : "Close as unpaid",
      required: true,
      run: (reason) =>
        void onAct(() => closeBillWithoutSale(order.id, bill.id, outcome, reason), "The bill was not closed. Try again."),
    });
  }

  async function printBill(bill: OrderBillRecord) {
    setPrintProblem(null);
    try {
      await printOnThisDevice(buildBillEscPos(order, bill, null));
    } catch (e) {
      setPrintProblem(e instanceof Error && e.message ? e.message : "The bill did not print.");
    }
  }

  return (
    <section className={DASHBOARD_SECTION_SURFACE} aria-label="Bills">
      {asking ? <ReasonDialog request={asking} onClose={() => setAsking(null)} /> : null}
      <h2 className={dashboardLabelClass()}>Bills</h2>
      {printProblem ? (
        <p role="alert" className="text-sm text-red-700">
          {printProblem}
        </p>
      ) : null}
      {order.bills.length === 0 ? (
        <p className={dashboardHintClass()}>No bill yet.</p>
      ) : (
        <ul className="mt-1 divide-y">
          {order.bills.map((bill) => (
            <li key={bill.id} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Bill {bill.billNo}</span>
                <span className={dashboardHintClass()}>
                  {BILL_WORDS[bill.status]}
                  {bill.receiptNo ? ` · receipt ${bill.receiptNo}` : ""}
                  {bill.reason && bill.status !== "PAID" ? ` · ${bill.reason}` : ""}
                </span>
                <span className="ml-auto font-mono text-sm tabular-nums">{kes(bill.toPay)}</span>
              </div>
              <div className={dashboardHintClass()}>
                {bill.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}
                {bill.serviceCharge > 0 ? ` · service charge ${kes(bill.serviceCharge)}` : ""}
                {bill.packagingCharge > 0 ? ` · packaging ${kes(bill.packagingCharge)}` : ""}
                {bill.deliveryFee > 0 ? ` · delivery ${kes(bill.deliveryFee)}` : ""}
              </div>
              {bill.status === "OPEN" && order.status === "pending" ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {rights.canTakeMoney ? (
                    <Button size="sm" disabled={busy} onClick={() => onPay(bill)}>
                      Take payment
                    </Button>
                  ) : (
                    <span className={dashboardHintClass()}>Payment is taken at the till.</span>
                  )}
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void printBill(bill)}>
                    Print bill
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onAct(() => discardBill(order.id, bill.id), "The bill was not removed. Try again.")}
                  >
                    Tear up
                  </Button>
                  {rights.canComp ? (
                    <>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => close(bill, "COMP")}>
                        On the house
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => close(bill, "UNPAID")}>
                        Left unpaid
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canBill && order.unbilled > 0 ? (
        <div className="mt-2 grid gap-2 border-t pt-2">
          <p className="text-sm">
            Not on a bill yet: <span className="font-mono tabular-nums">{kes(order.unbilled)}</span>
          </p>
          {hasUnsent ? (
            <p className={dashboardHintClass()}>Send or remove the items that have not gone to the kitchen before making a bill.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => void onAct(() => createBill(order.id), "The bill was not made. Try again.")}>
                One bill for all of it
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={onSplit}>
                Split by items
              </Button>
              {usesSeats
                ? Array.from({ length: seats }, (_, i) => i + 1)
                    .filter((n) => order.lines.some((l) => l.seatNo === n && l.stage !== "VOIDED" && l.billedQuantity < l.quantity))
                    .map((n) => (
                      <Button
                        key={n}
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void onAct(() => createBill(order.id, { seatNo: n }), "The bill was not made. Try again.")
                        }
                      >
                        Bill for seat {n}
                      </Button>
                    ))
                : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

/** Choose how many of each line go on a new bill. */
function SplitDialog({
  order,
  onClose,
  onMade,
}: {
  order: OpenOrderRecord;
  onClose: () => void;
  onMade: (order: OpenOrderRecord) => void;
}) {
  const free = order.lines
    .filter((l) => l.stage !== "VOIDED" && l.quantity - l.billedQuantity > 0)
    .map((l) => ({ line: l, left: round2(l.quantity - l.billedQuantity) }));
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = round2(free.reduce((sum, f) => sum + (picked[f.line.id] ?? 0) * f.line.unitPrice, 0));

  async function make() {
    const lines = free
      .filter((f) => (picked[f.line.id] ?? 0) > 0)
      .map((f) => ({ orderLineId: f.line.id, quantity: picked[f.line.id]! }));
    if (lines.length === 0) return setError("Choose what goes on this bill");
    setBusy(true);
    setError(null);
    try {
      onMade(await createBill(order.id, { lines }));
    } catch (e) {
      setError(message(e, "The bill was not made. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Split by items</DialogTitle>
          <DialogDescription>Choose what one person is paying for. Make another bill for the rest.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {free.map(({ line, left }) => {
            const n = picked[line.id] ?? 0;
            return (
              <li key={line.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{line.name}</div>
                  <div className={dashboardHintClass()}>
                    {left} left · {kes(line.unitPrice)} each{line.seatNo ? ` · seat ${line.seatNo}` : ""}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9"
                  aria-label={`One fewer ${line.name}`}
                  disabled={n <= 0}
                  onClick={() => setPicked((p) => ({ ...p, [line.id]: Math.max(0, n - 1) }))}
                >
                  −
                </Button>
                <span className="w-6 text-center font-mono tabular-nums">{n}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9"
                  aria-label={`One more ${line.name}`}
                  disabled={n + 1 > left}
                  onClick={() => setPicked((p) => ({ ...p, [line.id]: Math.min(left, n + 1) }))}
                >
                  +
                </Button>
              </li>
            );
          })}
        </ul>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void make()} disabled={busy || total <= 0}>
            Make bill · {kes(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Takes payment for one bill: cash, M-Pesa, or part in each, with an optional tip for whoever
 * served the order. Paying the same bill twice rings one sale, so a retry is safe.
 */
function PayDialog({
  order,
  bill,
  onClose,
  onPaid,
  onChanged,
}: {
  order: OpenOrderRecord;
  bill: OrderBillRecord;
  onClose: () => void;
  onPaid: (order: OpenOrderRecord) => void;
  onChanged: () => void;
}) {
  const [method, setMethod] = useState<"cash" | "mpesa_manual" | "both">("cash");
  const [cashPart, setCashPart] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [reference, setReference] = useState("");
  const [tipText, setTipText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True while a payment request is on the customer's phone: nothing here may change under it.
  const [phoneAsked, setPhoneAsked] = useState(false);

  // Splitting one bill between several payers. The bill is still one sale with its real dishes,
  // stock and tax; only the money is divided, and each share is recorded as its own tender. A
  // share taken is a tender already collected; `shares` are the amounts still to collect.
  const [split, setSplit] = useState(false);
  const [ways, setWays] = useState(2);
  const [custom, setCustom] = useState(false);
  const [taken, setTaken] = useState<{ method: "cash" | "mpesa_manual"; amount: number; reference?: string }[]>([]);
  const [shareText, setShareText] = useState("");

  const tip = order.servedByStaffProfileId ? (parseMoney(tipText) ?? 0) : 0;
  const toPay = round2(bill.toPay + tip);
  // What is left to collect right now: the whole bill, or just this share while splitting.
  const { left: splitLeft } = splitRemainder(toPay, taken.map((t) => t.amount));
  const equalNext = equalShares(splitLeft, Math.max(1, ways - taken.length))[0] ?? splitLeft;
  const shareAmount = split ? (custom ? (parseMoney(shareText) ?? 0) : round2(Math.min(equalNext, splitLeft))) : toPay;
  const due = round2(split ? shareAmount : toPay);

  const cashAmount = method === "cash" ? due : method === "both" ? (parseMoney(cashPart) ?? 0) : 0;
  const mpesaAmount = round2(due - cashAmount);
  const received = parseMoney(cashReceived);
  const change = method === "cash" && received != null && received >= due ? round2(received - due) : null;

  /** M-Pesa has confirmed a request for {@code asked}: record the bill against its code. */
  function mpesaReceived(receipt: string, asked: number) {
    setReference(receipt);
    if (asked < mpesaRequestAmount(mpesaAmount)) {
      return setError(`M-Pesa received ${kes(asked)} (code ${receipt}) but ${kes(mpesaAmount)} is owed by M-Pesa. Check the amounts, then take payment.`);
    }
    void pay(receipt);
  }

  /** The tender(s) for the amount being collected now (the whole bill, or one share). */
  function tendersNow(confirmedReference?: string): { method: "cash" | "mpesa_manual"; amount: number; reference?: string }[] {
    const payments: { method: "cash" | "mpesa_manual"; amount: number; reference?: string }[] = [];
    if (cashAmount > 0) payments.push({ method: "cash", amount: round2(cashAmount) });
    if (mpesaAmount > 0) {
      const code = (confirmedReference ?? reference).trim().toUpperCase();
      payments.push({ method: "mpesa_manual", amount: mpesaAmount, ...(code ? { reference: code } : {}) });
    }
    return payments;
  }

  async function pay(confirmedReference?: string) {
    setError(null);
    if (method === "both" && (cashAmount <= 0 || mpesaAmount <= 0)) {
      return setError(`Type the cash part: more than zero and less than ${kes(due)}`);
    }
    if (method === "cash" && received != null && received < due) return setError(`That is less than ${kes(due)}`);

    if (split) {
      if (due <= 0) return setError("Type how much this person is paying");
      if (due > round2(splitLeft + 0.001)) return setError(`Only ${kes(splitLeft)} is left on this bill`);
      const share = tendersNow(confirmedReference);
      const after = [...taken, ...share];
      const { settled } = splitRemainder(toPay, after.map((t) => t.amount));
      if (!settled) {
        // Not the last share: remember it and reset for the next person.
        setTaken(after);
        setReference("");
        setCashReceived("");
        setShareText("");
        setMethod("cash");
        return;
      }
      // The last share covers the bill: ring one sale with every share as its own tender.
      await submit(after);
      return;
    }
    await submit(tendersNow(confirmedReference));
  }

  async function submit(payments: { method: "cash" | "mpesa_manual"; amount: number; reference?: string }[]) {
    setBusy(true);
    try {
      onPaid(
        await payBill(order.id, bill.id, {
          payments,
          ...(tip > 0 ? { tip } : {}),
          ...(!split && method === "cash" && received != null && received >= toPay ? { cashReceived: received } : {}),
          clientSoldAt: new Date().toISOString(),
        }),
      );
    } catch (e) {
      setError(message(e, "The payment was not recorded. Try again."));
      // A price that moved changes the bill itself; show the new figure before trying again.
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const TAB =
    "min-h-11 rounded-[2px] border px-2 text-sm font-semibold border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";
  const TAB_ON = "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]";

  return (
    <Dialog open onOpenChange={(o) => (o || phoneAsked ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Bill {bill.billNo} · {kes(bill.toPay)}
          </DialogTitle>
          <DialogDescription>
            {bill.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}
            {bill.serviceCharge > 0 ? ` · service charge ${kes(bill.serviceCharge)}` : ""}
            {bill.packagingCharge > 0 ? ` · packaging ${kes(bill.packagingCharge)}` : ""}
            {bill.deliveryFee > 0 ? ` · delivery ${kes(bill.deliveryFee)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {order.servedByStaffProfileId ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Tip for {order.servedByName ?? "the waiter"} (optional)</span>
              <input
                className={dashboardInputClass(false, "w-32 font-mono")}
                inputMode="decimal"
                placeholder="0"
                value={tipText}
                disabled={phoneAsked}
                onChange={(e) => setTipText(cleanMoneyText(e.target.value))}
              />
            </label>
          ) : null}
          <div className="flex justify-between text-base font-semibold">
            <span>To pay</span>
            <span className="font-mono tabular-nums">{kes(toPay)}</span>
          </div>

          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={split}
              disabled={phoneAsked || taken.length > 0}
              onChange={(e) => {
                setSplit(e.target.checked);
                setCustom(false);
                setShareText("");
              }}
            />
            Split this bill between people
          </label>

          {split ? (
            <div className="grid gap-2 rounded-[2px] border border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] p-3">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How to split">
                <button type="button" role="radio" aria-checked={!custom} disabled={phoneAsked} className={cn(TAB, !custom && TAB_ON)} onClick={() => setCustom(false)}>
                  Equal shares
                </button>
                <button type="button" role="radio" aria-checked={custom} disabled={phoneAsked} className={cn(TAB, custom && TAB_ON)} onClick={() => setCustom(true)}>
                  By agreed amount
                </button>
              </div>
              {!custom ? (
                <div className="flex items-center gap-2 text-sm">
                  <span>Split</span>
                  <Button type="button" variant="outline" className="h-9 w-9" aria-label="Fewer ways" disabled={phoneAsked || ways <= taken.length + 1} onClick={() => setWays((w) => Math.max(taken.length + 1, w - 1))}>
                    −
                  </Button>
                  <span className="w-6 text-center font-mono tabular-nums">{ways}</span>
                  <Button type="button" variant="outline" className="h-9 w-9" aria-label="More ways" disabled={phoneAsked || ways >= 20} onClick={() => setWays((w) => Math.min(20, w + 1))}>
                    +
                  </Button>
                  <span className="text-[color-mix(in_srgb,var(--order-ink,#121A16)_68%,transparent)]">ways</span>
                </div>
              ) : (
                <label className="grid gap-1">
                  <span className={dashboardLabelClass()}>This person pays</span>
                  <input
                    className={dashboardInputClass(false, "w-36 font-mono")}
                    inputMode="decimal"
                    placeholder="0"
                    value={shareText}
                    disabled={phoneAsked}
                    onChange={(e) => setShareText(cleanMoneyText(e.target.value))}
                  />
                </label>
              )}
              {taken.length > 0 ? (
                <ul className="grid gap-0.5 text-sm">
                  {taken.map((t, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        Share {i + 1} · {t.method === "cash" ? "cash" : "M-Pesa"}
                        {t.reference ? ` ${t.reference}` : ""}
                      </span>
                      <span className="font-mono tabular-nums">{kes(t.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex justify-between border-t border-dashed border-[color-mix(in_srgb,var(--order-ink,#121A16)_20%,transparent)] pt-1 text-sm font-semibold">
                <span>{taken.length > 0 ? "Still owed" : custom ? "Bill total" : "Each pays"}</span>
                <span className="font-mono tabular-nums">
                  {kes(taken.length > 0 ? splitLeft : custom ? toPay : round2(toPay / Math.max(1, ways)))}
                </span>
              </div>
              <p className={dashboardHintClass()}>
                One receipt for the table; each share is recorded as its own payment. Charges and any tip are on the final share.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="How they are paying">
            {(["cash", "mpesa_manual", "both"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={method === m} disabled={phoneAsked} className={cn(TAB, method === m && TAB_ON)} onClick={() => setMethod(m)}>
                {m === "cash" ? "Cash" : m === "mpesa_manual" ? "M-Pesa" : "Both"}
              </button>
            ))}
          </div>
          {split ? (
            <div className="flex justify-between text-sm">
              <span>{custom ? "This share" : `Share ${taken.length + 1} of ${ways}`}</span>
              <span className="font-mono tabular-nums">{kes(due)}</span>
            </div>
          ) : null}
          {method === "both" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Cash part</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="decimal"
                value={cashPart}
                disabled={phoneAsked}
                onChange={(e) => setCashPart(cleanMoneyText(e.target.value))}
              />
              <span className="text-sm">
                M-Pesa part <span className="font-mono tabular-nums">{kes(Math.max(0, mpesaAmount))}</span>
              </span>
            </label>
          ) : null}
          {method === "cash" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Cash received (optional)</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="decimal"
                value={cashReceived}
                onChange={(e) => setCashReceived(cleanMoneyText(e.target.value))}
              />
              {change != null && change > 0 ? (
                <span className="text-sm">
                  Change <span className="font-mono tabular-nums">{kes(change)}</span>
                </span>
              ) : null}
            </label>
          ) : (
            <>
              {mpesaAmount > 0 ? (
                <MpesaRequest
                  amount={mpesaAmount}
                  phone={order.customerPhone}
                  disabled={busy}
                  onReceived={mpesaReceived}
                  onWaitingChange={setPhoneAsked}
                />
              ) : null}
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>M-Pesa code (optional)</span>
                <input
                  className={dashboardInputClass(false, "font-mono uppercase")}
                  value={reference}
                  maxLength={20}
                  disabled={phoneAsked}
                  onChange={(e) => setReference(e.target.value)}
                />
                <span className={dashboardHintClass()}>
                  If they paid to your till themselves, check the payment on your phone before you confirm.
                </span>
              </label>
            </>
          )}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy || phoneAsked}>
            Cancel
          </Button>
          <Button className="h-12 text-base" onClick={() => void pay()} disabled={busy || phoneAsked}>
            {busy
              ? "Recording…"
              : split
                ? round2(splitLeft - due) <= 0
                  ? `Take last ${kes(due)}`
                  : `Take share ${kes(due)}`
                : `Take ${kes(toPay)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

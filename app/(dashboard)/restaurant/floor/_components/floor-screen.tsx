"use client";

import { Bike, CalendarClock, LayoutGrid, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import {
  createTable,
  fetchFloor,
  openOrder,
  setTableQr,
  updateTable,
  type FloorRecord,
  type OrderCardRecord,
  type RestaurantTableRecord,
} from "@/lib/restaurant-api";
import { elapsedLabel } from "@/lib/restaurant-cart";
import { useRestaurantLive } from "@/lib/use-restaurant-live";
import { cn } from "@/lib/utils";

import { OrderSheet } from "./order-sheet";
import { NoBranch } from "../../_components/no-branch";
import { OpenForTheDay } from "../../_components/open-for-the-day";

const kes = (n: number) => formatMoney(n, "KES");

export type FloorRights = {
  canTakeOrders: boolean;
  canTakeMoney: boolean;
  canCancelSent: boolean;
  canComp: boolean;
  canManage: boolean;
};

function timeOfDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-KE", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
}

const FLOOR_TITLE = "font-serif text-[1.45rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]";
const FLOOR_RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";

/** True when an order is waiting on a member of staff: the bill, food to carry, or lines to send. */
function needsSomeone(card: OrderCardRecord): boolean {
  if (card.booked || card.settled) return false;
  return Boolean(card.billRequestedAt) || card.ready > 0 || card.unsent > 0;
}

function cardState(card: OrderCardRecord): string {
  if (card.booked) return card.scheduledStart ? `Booked for ${timeOfDay(card.scheduledStart)}` : "Booked";
  // A delivery paid up front: nothing is owed, but it is not done until it reaches the customer.
  if (card.settled) {
    const left = card.dispatchedAt ? new Date(card.dispatchedAt) : null;
    return left && !Number.isNaN(left.getTime())
      ? `Paid · left at ${left.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })}`
      : "Paid · not sent out yet";
  }
  if (card.billRequestedAt) return "Wants the bill";
  // A table can need two things at once (food to carry and a customer's order to confirm),
  // so show every state that needs someone, not only the first.
  const parts: string[] = [];
  if (card.ready > 0) parts.push(`${card.ready} ready to carry`);
  if (card.unsent > 0) parts.push(`${card.unsent} not sent yet`);
  if (parts.length > 0) return parts.join(" · ");
  if (card.inKitchen > 0) return `${card.inKitchen} in the kitchen`;
  return "Eating";
}

/**
 * The restaurant floor: every table and what is happening at it, plus orders with no table
 * (takeaway, delivery). Tapping a free table seats it; tapping a busy one opens its order.
 * It polls, and says so when it cannot reach the server.
 */
export function FloorScreen(rights: FloorRights) {
  const { branchId } = useDashboard();
  const [floor, setFloor] = useState<FloorRecord | null>(null);
  const [stale, setStale] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [seating, setSeating] = useState<RestaurantTableRecord | null>(null);
  const [starting, setStarting] = useState<"TAKEAWAY" | "DELIVERY" | "BOOKING" | null>(null);
  const [managing, setManaging] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setFloor(await fetchFloor(branchId));
      setStale(false);
    } catch {
      setStale(true);
      setFloor((current) => current ?? { branchId, asOf: "", tables: [], otherOrders: [] });
    }
    setNow(Date.now());
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);
  useRestaurantLive(() => void load(), 6000, Boolean(branchId) && openId == null);

  const areas = useMemo(() => {
    const groups = new Map<string, FloorRecord["tables"]>();
    for (const entry of floor?.tables ?? []) {
      const key = entry.table.area ?? "";
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    return Array.from(groups.entries());
  }, [floor]);

  /** The room at a glance: how many tables are seated, booked or free, and how many are waiting on staff. */
  const tally = useMemo(() => {
    let seated = 0;
    let booked = 0;
    let free = 0;
    let attention = 0;
    for (const { orders } of floor?.tables ?? []) {
      const live = orders.filter((o) => !o.booked);
      if (live.length > 0) seated += 1;
      else if (orders.length > 0) booked += 1;
      else free += 1;
      if (live.some(needsSomeone)) attention += 1;
    }
    attention += (floor?.otherOrders ?? []).filter(needsSomeone).length;
    return { seated, booked, free, attention };
  }, [floor]);

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <NoBranch message="Choose a branch at the top of the page to see its floor." />
      </div>
    );
  }

  if (openId) {
    return (
      <OrderSheet
        orderId={openId}
        rights={rights}
        tables={(floor?.tables ?? []).map((t) => t.table).filter((t) => t.active)}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <DashboardPageHero icon={LayoutGrid} title="Floor" description="Tap a table to seat it or to open its order.">
        {rights.canTakeOrders ? (
          <span className="flex flex-wrap gap-2 lg:hidden">
            <Button variant="outline" size="sm" onClick={() => setStarting("TAKEAWAY")}>
              Takeaway
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStarting("DELIVERY")}>
              Delivery
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStarting("BOOKING")}>
              Book a table
            </Button>
          </span>
        ) : null}
        {rights.canManage ? (
          <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
            Tables
          </Button>
        ) : null}
      </DashboardPageHero>

      {rights.canTakeOrders ? <OpenForTheDay branchId={branchId} className="mb-2" /> : null}

      {stale ? (
        <p role="alert" className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 text-sm font-semibold text-red-700")}>
          Not connected — the floor may be out of date.
        </p>
      ) : null}

      {floor == null ? (
        <DashboardLoading label="Loading the floor…" />
      ) : stale && floor.asOf === "" ? (
        // Nothing has loaded yet: say nothing about tables rather than claim there are none.
        <p className={DASHBOARD_SECTION_SURFACE}>The floor will appear when the connection is back.</p>
      ) : floor.tables.length === 0 && floor.otherOrders.length === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">No tables yet</p>
          <p className={dashboardHintClass()}>
            Add your tables to seat customers at them. Takeaway and delivery orders need none.
          </p>
          {rights.canManage ? (
            <Button className="mt-3" size="sm" onClick={() => setManaging(true)}>
              Add tables
            </Button>
          ) : (
            <p className={cn("mt-2", dashboardHintClass())}>Ask the owner or a manager to add the tables.</p>
          )}
        </div>
      ) : (
        <div className={cn(DASHBOARD_TABLE_SURFACE, "grid grid-cols-[minmax(0,1fr)] lg:grid-cols-12")}>
          {/* The room: every table, by the part of the restaurant it stands in. */}
          <div className="lg:col-span-8 xl:col-span-9">
          <div className={cn("flex flex-wrap gap-x-4 gap-y-1 border-b px-4 py-2.5 text-[12px] sm:px-5", FLOOR_RULE)}>
            <span className="text-[#1D4B3B]">{tally.seated} seated</span>
            {tally.attention > 0 ? <span className="text-[#8f3f2f]">{tally.attention} need someone</span> : null}
            {tally.booked > 0 ? <span>{tally.booked} booked</span> : null}
            <span className="text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">{tally.free} free</span>
          </div>
          {areas.map(([area, entries], areaIndex) => (
            <section
              key={area || "floor"}
              aria-label={area || "Tables"}
              className={cn("p-4 sm:p-5", areaIndex > 0 && "border-t", FLOOR_RULE)}
            >
              <header className="mb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className={FLOOR_TITLE}>{area || (areas.length > 1 ? "Everywhere else" : "The room")}</h2>
                  <span className="font-mono text-[12px] tabular-nums text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
                    {entries.length}
                  </span>
                </div>
                <span aria-hidden className="mt-2.5 block h-px w-7 bg-[#1D4B3B]" />
              </header>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {entries.map(({ table, orders }) => {
                  const busy = orders.filter((o) => !o.booked);
                  const first = busy[0] ?? orders[0];
                  return (
                    <li key={table.id}>
                      <button
                        type="button"
                        disabled={!first && !rights.canTakeOrders}
                        className={cn(
                          "grid min-h-[6.5rem] w-full content-start gap-0.5 rounded-[2px] border px-3 py-2 text-left",
                          "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] bg-[var(--op-surface,#FCFAF5)]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
                          busy.length > 0 &&
                            "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]",
                        )}
                        onClick={() => (first ? setOpenId(first.orderId) : setSeating(table))}
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-base font-semibold">{table.name}</span>
                          {table.capacity ? <span className={dashboardHintClass()}>seats {table.capacity}</span> : null}
                        </span>
                        {first ? (
                          <>
                            <span className={cn("text-sm", needsSomeone(first) && "font-semibold text-[#8f3f2f]")}>
                              {cardState(first)}
                            </span>
                            <span className="font-mono text-sm tabular-nums">
                              {first.booked ? (first.customerName ?? "") : kes(first.total)}
                            </span>
                            <span className={dashboardHintClass()}>
                              {first.booked ? "" : `${elapsedLabel(first.openedAt, now)}`}
                              {first.servedByName && !first.booked ? ` · ${first.servedByName}` : ""}
                              {orders.length > 1 ? ` · +${orders.length - 1} more` : ""}
                            </span>
                          </>
                        ) : (
                          <span className={dashboardHintClass()}>Free</span>
                        )}
                      </button>
                      {orders.length > 1 ? (
                        <ul className="mt-1 grid gap-1">
                          {orders.slice(1).map((o) => (
                            <li key={o.orderId}>
                              <button type="button" className="text-sm underline" onClick={() => setOpenId(o.orderId)}>
                                Order {o.orderNumber}: {cardState(o)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {first && !first.booked && rights.canTakeOrders ? (
                        <button type="button" className="mt-1 text-sm underline" onClick={() => setSeating(table)}>
                          Another order here
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {floor.tables.length === 0 ? (
            <p className={cn("p-4 sm:p-5", dashboardHintClass())}>No tables yet. Takeaway and delivery orders need none.</p>
          ) : null}
          </div>

          {/* Off the floor: orders nobody is sitting down for, and where a new one is started. */}
          <aside
            aria-label="Orders with no table"
            className={cn(
              "border-t bg-[var(--kiosk-panel,#EFEBE2)] p-4 sm:p-5 lg:col-span-4 lg:border-l lg:border-t-0 xl:col-span-3",
              FLOOR_RULE,
            )}
          >
            <header>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={FLOOR_TITLE}>Off the floor</h2>
                <span className="font-mono text-[12px] tabular-nums text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
                  {floor.otherOrders.length}
                </span>
              </div>
              <span aria-hidden className="mt-2.5 block h-px w-7 bg-[#1D4B3B]" />
            </header>
            {rights.canTakeOrders ? (
              <div className="mt-3 hidden gap-2 lg:grid">
                <Button variant="outline" className="h-11 justify-start bg-[#FFFEFA]" onClick={() => setStarting("TAKEAWAY")}>
                  <ShoppingBag className="size-4" aria-hidden /> New takeaway
                </Button>
                <Button variant="outline" className="h-11 justify-start bg-[#FFFEFA]" onClick={() => setStarting("DELIVERY")}>
                  <Bike className="size-4" aria-hidden /> New delivery
                </Button>
                <Button variant="outline" className="h-11 justify-start bg-[#FFFEFA]" onClick={() => setStarting("BOOKING")}>
                  <CalendarClock className="size-4" aria-hidden /> Book a table
                </Button>
              </div>
            ) : null}
            {floor.otherOrders.length === 0 ? (
              <p className={cn("mt-4", dashboardHintClass())}>
                Takeaway and delivery orders wait here until they are paid and, for a delivery, handed to the customer.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {floor.otherOrders.map((o) => (
                  <li key={o.orderId}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[2px] border bg-[#FFFEFA] px-3 py-2 text-left",
                        "transition-colors duration-200 hover:border-[var(--pos-primary,#1D4B3B)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
                        FLOOR_RULE,
                      )}
                      onClick={() => setOpenId(o.orderId)}
                    >
                      <span className="w-12 font-mono text-2xl font-semibold tabular-nums">{o.orderNumber}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {o.channel === "TAKEAWAY" ? "Takeaway" : o.channel === "DELIVERY" ? "Delivery" : "Table order"}
                          {o.customerName ? ` · ${o.customerName}` : ""}
                        </span>
                        <span className={cn(dashboardHintClass(), needsSomeone(o) && "font-semibold text-[#8f3f2f]")}>
                          {cardState(o)}
                          {o.booked ? "" : ` · ${elapsedLabel(o.openedAt, now)}`}
                        </span>
                      </span>
                      <span className="font-mono text-sm tabular-nums">{kes(o.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}

      {seating ? (
        <StartOrderDialog
          branchId={branchId}
          mode="DINE_IN"
          table={seating}
          tables={[]}
          onClose={() => setSeating(null)}
          onOpened={(id) => {
            setSeating(null);
            setOpenId(id);
          }}
        />
      ) : null}
      {starting ? (
        <StartOrderDialog
          branchId={branchId}
          mode={starting}
          table={null}
          tables={(floor?.tables ?? []).map((t) => t.table).filter((t) => t.active)}
          onClose={() => setStarting(null)}
          onOpened={(id, booked) => {
            setStarting(null);
            if (booked) void load();
            else setOpenId(id);
          }}
        />
      ) : null}
      {managing ? (
        <TablesDialog
          branchId={branchId}
          tables={(floor?.tables ?? []).map((t) => t.table)}
          onClose={() => {
            setManaging(false);
            void load();
          }}
          onChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}

/** Seats a table, starts a takeaway or delivery order, or books a table for later. */
function StartOrderDialog({
  branchId,
  mode,
  table,
  tables,
  onClose,
  onOpened,
}: {
  branchId: string;
  mode: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "BOOKING";
  table: RestaurantTableRecord | null;
  tables: RestaurantTableRecord[];
  onClose: () => void;
  onOpened: (orderId: string, booked: boolean) => void;
}) {
  const [guests, setGuests] = useState(mode === "DINE_IN" ? "2" : "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tableId, setTableId] = useState(table?.id ?? "");
  const [when, setWhen] = useState("");
  const [hours, setHours] = useState("2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id for this dialog: a second tap, or a retry after a dropped connection, opens nothing new.
  const [clientOrderId] = useState(() => nextIdempotencyKey());

  const title =
    mode === "DINE_IN" ? `Seat ${table?.name ?? "table"}` : mode === "TAKEAWAY" ? "Takeaway order" : mode === "DELIVERY" ? "Delivery order" : "Book a table";

  async function start() {
    setError(null);
    const guestCount = guests.trim() === "" ? undefined : Number(guests);
    if (guestCount != null && (!Number.isInteger(guestCount) || guestCount < 1)) return setError("Check the number of guests");
    if (mode === "DELIVERY" && !address.trim()) return setError("Where is it being delivered?");
    let scheduledStart: string | undefined;
    let scheduledEnd: string | undefined;
    if (mode === "BOOKING") {
      if (!tableId) return setError("Choose the table");
      if (!name.trim()) return setError("Whose booking is it?");
      const start = new Date(when);
      const length = Number(hours);
      if (!when || Number.isNaN(start.getTime())) return setError("Choose the day and time");
      if (start.getTime() < Date.now() - 5 * 60000) return setError("That time has passed");
      if (!Number.isFinite(length) || length <= 0 || length > 12) return setError("How long is the table needed for?");
      scheduledStart = start.toISOString();
      scheduledEnd = new Date(start.getTime() + length * 3600000).toISOString();
    }
    setBusy(true);
    try {
      const order = await openOrder({
        branchId,
        channel: mode === "BOOKING" ? "DINE_IN" : mode,
        tableId: mode === "DINE_IN" || mode === "BOOKING" ? tableId : undefined,
        guestCount,
        customerName: name.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        deliveryAddress: mode === "DELIVERY" ? address.trim() : undefined,
        clientOrderId,
        scheduledStart,
        scheduledEnd,
      });
      onOpened(order.id, mode === "BOOKING");
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "BOOKING"
              ? "The table is held for that time. Seat the booking when the guests arrive."
              : mode === "DINE_IN"
                ? "Opens an order for this table. Nothing goes to the kitchen until you send it."
                : "Opens an order with no table."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {mode === "BOOKING" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Table</span>
              <select className={dashboardSelectClass(false)} value={tableId} onChange={(e) => setTableId(e.target.value)}>
                <option value="">Choose a table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.capacity ? ` (seats ${t.capacity})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {mode === "BOOKING" ? (
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Day and time</span>
                <input type="datetime-local" className={dashboardInputClass(false)} value={when} onChange={(e) => setWhen(e.target.value)} />
              </label>
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Hours</span>
                <input
                  className={dashboardInputClass(false, "font-mono")}
                  inputMode="decimal"
                  value={hours}
                  onChange={(e) => setHours(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </label>
            </div>
          ) : null}
          {mode === "DINE_IN" || mode === "BOOKING" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Guests</span>
              <input
                className={dashboardInputClass(false, "w-24 font-mono")}
                inputMode="numeric"
                value={guests}
                onChange={(e) => setGuests(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              />
            </label>
          ) : null}
          {mode !== "DINE_IN" ? (
            <>
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>{mode === "BOOKING" ? "Name" : "Name (optional)"}</span>
                <input className={dashboardInputClass(false)} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Phone (optional)</span>
                <input className={dashboardInputClass(false, "font-mono")} inputMode="tel" value={phone} maxLength={32} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </>
          ) : null}
          {mode === "DELIVERY" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Deliver to</span>
              <input className={dashboardInputClass(false)} value={address} maxLength={500} onChange={(e) => setAddress(e.target.value)} />
            </label>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void start()} disabled={busy}>
            {busy ? "Opening…" : mode === "BOOKING" ? "Book" : mode === "DINE_IN" ? "Seat" : "Start order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Add tables and take one out of use. A table with an open order stays on the floor until it is settled. */
function TablesDialog({
  branchId,
  tables,
  onClose,
  onChanged,
}: {
  branchId: string;
  tables: RestaurantTableRecord[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState(tables);
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return setError("Give the table a name or number");
    setBusy(true);
    setError(null);
    try {
      const created = await createTable({
        branchId,
        name: name.trim(),
        capacity: seats ? Number(seats) : undefined,
        area: area.trim() || undefined,
      });
      setRows((prev) => [...prev, created]);
      setName("");
      setSeats("");
      onChanged();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not add the table. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(table: RestaurantTableRecord) {
    setBusy(true);
    try {
      const updated = await updateTable(table.id, { active: !table.active });
      setRows((prev) => prev.map((t) => (t.id === table.id ? updated : t)));
      onChanged();
    } catch {
      setError("Could not change the table. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** The address the table's QR code should open: this shop's own page, with the table's code. */
  function qrLink(token: string): string {
    return `${window.location.origin}/shop/table?t=${token}`;
  }

  async function qr(table: RestaurantTableRecord, enabled: boolean) {
    if (table.qrToken && enabled && !window.confirm("Make a new code? The one printed on the table stops working.")) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await setTableQr(table.id, enabled);
      setRows((prev) => prev.map((t) => (t.id === table.id ? updated : t)));
      onChanged();
    } catch {
      setError("Could not change the table's code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy. Select the address and copy it by hand.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tables</DialogTitle>
          <DialogDescription>
            The tables at this branch. Give a table a QR code here, then print the codes as table cards under Menu,
            QR codes. A code only works while ordering from tables is switched on under Menu.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className={cn("min-w-0 flex-1 text-sm font-medium", !t.active && "line-through opacity-60")}>
                {t.name}
                <span className={dashboardHintClass()}>
                  {t.capacity ? ` · seats ${t.capacity}` : ""}
                  {t.area ? ` · ${t.area}` : ""}
                </span>
              </span>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void qr(t, !t.qrToken)}>
                {t.qrToken ? "Remove QR code" : "QR code"}
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void toggle(t)}>
                {t.active ? "Take out of use" : "Use again"}
              </Button>
              {t.qrToken ? (
                <div className="basis-full text-xs">
                  <span className="break-all font-mono">{qrLink(t.qrToken)}</span>{" "}
                  <button type="button" className="underline" onClick={() => void copy(qrLink(t.qrToken!))}>
                    Copy
                  </button>{" "}
                  <button type="button" className="underline" disabled={busy} onClick={() => void qr(t, true)}>
                    New code
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <input className={dashboardInputClass(false)} aria-label="Table name or number" placeholder="Table 1" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <input
            className={dashboardInputClass(false, "font-mono")}
            aria-label="Seats"
            placeholder="Seats"
            inputMode="numeric"
            value={seats}
            onChange={(e) => setSeats(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          />
          <input className={dashboardInputClass(false)} aria-label="Area (optional)" placeholder="Area, e.g. Terrace (optional)" maxLength={60} value={area} onChange={(e) => setArea(e.target.value)} />
          <Button type="submit" variant="outline" disabled={busy}>
            Add
          </Button>
        </form>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

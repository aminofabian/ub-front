"use client";

import { BedDouble, CalendarCheck, DoorOpen, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import { takeBookingDeposit } from "@/lib/restaurant-api";
import {
  createRoom,
  fetchFrontDesk,
  fetchRooms,
  openStay,
  updateRoom,
  type FrontDeskRecord,
  type RoomRecord,
  type RoomWithStays,
} from "@/lib/rooms-api";
import { useRestaurantLive } from "@/lib/use-restaurant-live";
import { cn } from "@/lib/utils";

import { OrderSheet } from "../../restaurant/floor/_components/order-sheet";
import { type FloorRights } from "../../restaurant/floor/_components/floor-screen";
import { NoBranch } from "../../restaurant/_components/no-branch";
import { OpenForTheDay } from "../../restaurant/_components/open-for-the-day";
import { RoomToken, type RoomState } from "./room-token";

const kes = (n: number) => formatMoney(n, "KES");

const TITLE = "font-serif text-[1.45rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]";

/** Nairobi's today, as a YYYY-MM-DD string, for deciding who arrives or leaves today. */
function nairobiToday(): string {
  return nairobiDateIso(0);
}

/** A YYYY-MM-DD string `days` from now, read in Nairobi's calendar (not the device's UTC date). */
function nairobiDateIso(days: number): string {
  const when = new Date(Date.now() + days * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(when);
}

function sameNairobiDay(iso: string | null, today: string): boolean {
  if (!iso) return false;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date(iso)) === today;
}

export function FrontDeskScreen({
  canManage,
  rights,
}: {
  canManage: boolean;
  rights: FloorRights;
}) {
  const { branchId } = useDashboard();
  const [desk, setDesk] = useState<FrontDeskRecord | null>(null);
  const [stale, setStale] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [booking, setBooking] = useState<RoomRecord | null>(null);
  const [managing, setManaging] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setDesk(await fetchFrontDesk(branchId));
      setStale(false);
    } catch {
      setStale(true);
      setDesk((current) => current ?? { branchId, asOf: "", rooms: [], otherStays: [] });
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);
  // Poll, paused while a stay's folio is open (its own screen refreshes it).
  useRestaurantLive(() => void load(), 6000, Boolean(branchId) && openId == null);

  const today = nairobiToday();
  const tally = useMemo(() => {
    let inHouse = 0;
    let arriving = 0;
    let leaving = 0;
    let free = 0;
    for (const entry of desk?.rooms ?? []) {
      const live = entry.stays.filter((s) => !s.settled && s.channel === "LODGING");
      const here = live.find((s) => !s.booked);
      const soon = live.find((s) => s.booked && sameNairobiDay(s.scheduledStart, today));
      if (here) {
        inHouse += 1;
        if (sameNairobiDay(here.scheduledEnd, today)) leaving += 1;
      } else if (soon) {
        arriving += 1;
      } else if (live.length === 0) {
        free += 1;
      }
    }
    return { inHouse, arriving, leaving, free };
  }, [desk, today]);

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <NoBranch message="Choose a branch at the top of the page to see its rooms." />
      </div>
    );
  }

  if (desk == null) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardLoading label="Opening the front desk…" />
      </div>
    );
  }

  // A stay's folio is the restaurant open-order sheet: a stay is an open order on channel LODGING.
  if (openId) {
    return (
      <OrderSheet
        orderId={openId}
        rights={rights}
        tables={[]}
        variant="lodging"
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const noRooms = desk.rooms.length === 0 && desk.otherStays.length === 0;

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <DashboardPageHero
        icon={BedDouble}
        title="Front desk"
        description={
          noRooms ? "The rooms you let." : (
            <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[11px] tabular-nums">
              {/* In-house carries the forest; today's comings and goings — the one thing the desk
                  acts on — carry the single terracotta accent; the rest stay quiet muted ink. */}
              <TallyStat n={tally.inHouse} label="in" tone="forest" />
              <TallyDot />
              <TallyStat n={tally.arriving} label="arriving" tone="attention" />
              <TallyDot />
              <TallyStat n={tally.leaving} label="leaving" tone="attention" />
              <TallyDot />
              <TallyStat n={tally.free} label="free" tone="muted" />
            </span>
          )
        }
      >
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
            Rooms
          </Button>
        ) : null}
      </DashboardPageHero>

      {stale ? (
        <p role="status" className={cn(dashboardHintClass(), "px-2 pt-1")}>
          Showing the last front desk loaded; the connection dropped.
        </p>
      ) : null}

      {/* Money — a deposit, or settling a folio — needs a shift open on this till. Ask at a quiet
          moment, before a guest is at the desk, as the floor and counter do. */}
      {rights.canTakeMoney ? <OpenForTheDay branchId={branchId} className="mt-1" /> : null}

      {noRooms ? (
        <EmptyRooms canManage={canManage} onManage={() => setManaging(true)} />
      ) : (
        <ul className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {desk.rooms.map((entry) => (
            <RoomTile
              key={entry.room.id}
              entry={entry}
              today={today}
              onOpenStay={(id) => setOpenId(id)}
              onBook={() => setBooking(entry.room)}
            />
          ))}
        </ul>
      )}

      {desk.otherStays.length > 0 ? (
        <section className="mt-3">
          <h2 className={cn(TITLE, "mb-1.5 px-1")}>Stays with no room</h2>
          <ul className="flex flex-col gap-1">
            {desk.otherStays.map((s) => (
              <li key={s.orderId}>
                <button
                  type="button"
                  onClick={() => setOpenId(s.orderId)}
                  className={cn(DASHBOARD_SECTION_SURFACE, "flex w-full items-center justify-between p-2.5 text-left text-sm")}
                >
                  <span>{s.customerName ?? `Stay #${s.orderNumber}`}</span>
                  <span className="font-mono tabular-nums">{kes(s.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {booking ? (
        <BookingDrawer
          branchId={branchId}
          room={booking}
          onClose={() => setBooking(null)}
          onBooked={() => {
            setBooking(null);
            void load();
          }}
        />
      ) : null}
      {managing ? (
        <ManageRoomsDrawer branchId={branchId} onClose={() => setManaging(false)} onChanged={() => void load()} />
      ) : null}
    </div>
  );
}

function RoomTile({
  entry,
  today,
  onOpenStay,
  onBook,
}: {
  entry: RoomWithStays;
  today: string;
  onOpenStay: (orderId: string) => void;
  onBook: () => void;
}) {
  const { room, stays } = entry;
  const live = stays.filter((s) => !s.settled);
  const here = live.find((s) => !s.booked) ?? null;
  const booked = live.filter((s) => s.booked);
  const leavingToday = here && sameNairobiDay(here.scheduledEnd, today);
  const arrivingToday = booked.some((s) => sameNairobiDay(s.scheduledStart, today));

  const tone = here ? "occupied" : arrivingToday ? "arriving" : "free";
  const roomState: RoomState = !room.active
    ? "blocked"
    : here
      ? leavingToday
        ? "leaving"
        : "occupied"
      : arrivingToday
        ? "arriving"
        : "free";

  return (
    <li>
      <div
        className={cn(
          DASHBOARD_SECTION_SURFACE,
          "flex flex-col gap-1.5 p-2.5 transition-colors duration-200",
          tone === "occupied" && "border-[var(--pos-primary,#1D4B3B)]",
          !room.active && "opacity-55",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight text-[var(--op-ink,#121A16)]">
              {room.name}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-[var(--pos-primary,#1D4B3B)]">
              {kes(room.nightlyRate)}
              <span className={cn(dashboardHintClass(), "ml-0.5")}>/night</span>
            </span>
          </span>
          <RoomToken state={roomState} />
        </div>

        {here ? (
          <button
            type="button"
            onClick={() => onOpenStay(here.orderId)}
            className="flex items-center justify-between gap-2 rounded-[2px] border border-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_30%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)] px-2 py-1.5 text-left text-xs motion-safe:active:scale-[0.99]"
          >
            <span className="min-w-0 truncate">
              <DoorOpen className="mr-1 inline size-3.5 align-text-bottom" aria-hidden />
              {here.customerName ?? "In house"}
              {leavingToday ? <span className="ml-1 font-semibold text-[var(--kiosk-highlight,#8f3f2f)]">· leaving today</span> : null}
            </span>
            <span className="font-mono tabular-nums">{kes(here.total)}</span>
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className={dashboardHintClass()}>{room.active ? "Free" : "Out of use"}</span>
            {room.active ? (
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onBook}>
                <Plus className="size-3" aria-hidden /> Book
              </Button>
            ) : null}
          </div>
        )}

        {booked.map((s) => (
          <button
            key={s.orderId}
            type="button"
            onClick={() => onOpenStay(s.orderId)}
            className="flex items-center justify-between gap-2 px-1 text-left text-[11px] text-[color:var(--muted)]"
          >
            <span className="min-w-0 truncate">
              <CalendarCheck className="mr-1 inline size-3 align-text-bottom" aria-hidden />
              {s.customerName ?? `Stay #${s.orderNumber}`}
              {sameNairobiDay(s.scheduledStart, today) ? (
                <span className="ml-1 font-semibold text-[var(--kiosk-highlight,#8f3f2f)]">· arriving today</span>
              ) : (
                <span className={cn(dashboardHintClass(), "ml-1")}>{bookedFor(s.scheduledStart)}</span>
              )}
            </span>
          </button>
        ))}

        {here && room.active ? (
          <Button variant="ghost" size="sm" className="h-6 justify-start px-1 text-xs" onClick={onBook}>
            <Plus className="size-3" aria-hidden /> Book it for later too
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function bookedFor(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** One count in the front-desk tally. A tone shows only when the count is live; a zero stays quiet. */
function TallyStat({ n, label, tone }: { n: number; label: string; tone: "forest" | "attention" | "muted" }) {
  const lit = n > 0 && tone !== "muted";
  return (
    <span
      className={cn(
        "transition-colors",
        tone === "muted"
          ? "text-[color-mix(in_srgb,var(--op-ink,#121A16)_55%,transparent)]"
          : lit && tone === "forest"
            ? "text-[var(--pos-primary,#1D4B3B)]"
            : lit && tone === "attention"
              ? "font-semibold text-[var(--kiosk-highlight,#8f3f2f)]"
              : "text-[color-mix(in_srgb,var(--op-ink,#121A16)_55%,transparent)]",
      )}
    >
      {n} {label}
    </span>
  );
}

/** The hairline separator between tally counts, dimmer than the counts themselves. */
function TallyDot() {
  return <span className="text-[color-mix(in_srgb,var(--op-ink,#121A16)_28%,transparent)]" aria-hidden>·</span>;
}

function EmptyRooms({ canManage, onManage }: { canManage: boolean; onManage: () => void }) {
  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "mt-1 flex flex-col items-center gap-2 px-4 py-10 text-center")}>
      <span className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--pos-primary,#1D4B3B)] text-[var(--pos-primary,#1D4B3B)]">
        <BedDouble className="size-5" aria-hidden />
      </span>
      <p className={cn(TITLE, "text-[1.2rem]")}>No rooms yet</p>
      <p className={cn(dashboardHintClass(), "max-w-xs")}>
        Add the rooms you let, each with what it costs a night. Then book a stay and check guests in.
      </p>
      {canManage ? (
        <Button size="sm" className="mt-1" onClick={onManage}>
          <Plus className="size-3.5" aria-hidden /> Add your first room
        </Button>
      ) : null}
    </div>
  );
}

/** Book a stay: pick nights, name the guest, optionally hold a deposit. */
function BookingDrawer({
  branchId,
  room,
  onClose,
  onBooked,
}: {
  branchId: string;
  room: RoomRecord;
  onClose: () => void;
  onBooked: () => void;
}) {
  // Nairobi's calendar, not the device's UTC date: at night the two differ and the defaults and
  // the min= guard below would otherwise land a day off.
  const todayIso = nairobiDateIso(0);
  const tomorrow = nairobiDateIso(1);
  const [checkIn, setCheckIn] = useState(todayIso);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState("1");
  const [deposit, setDeposit] = useState("");
  const [depositMethod, setDepositMethod] = useState<"cash" | "mpesa_manual">("cash");
  const [clientOrderId] = useState(() => nextIdempotencyKey());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = useMemo(() => {
    const a = new Date(checkIn + "T12:00:00");
    const b = new Date(checkOut + "T12:00:00");
    const n = Math.round((b.getTime() - a.getTime()) / 86400000);
    return Number.isFinite(n) ? n : 0;
  }, [checkIn, checkOut]);

  async function save() {
    if (nights < 1) return setError("Check-out must be after check-in");
    if (!name.trim()) return setError("Name the guest");
    const depositAmount = deposit ? Number(deposit) : 0;
    if (depositAmount > 0 && !phone.trim()) return setError("A deposit needs the guest's phone");
    setBusy(true);
    setError(null);
    try {
      const stay = await openStay({
        branchId,
        roomId: room.id,
        // Check-in at 2pm, check-out at 11am Nairobi — stored as instants; nights drive the charge.
        checkIn: new Date(checkIn + "T14:00:00+03:00").toISOString(),
        checkOut: new Date(checkOut + "T11:00:00+03:00").toISOString(),
        guestCount: Math.max(1, Number(guests) || 1),
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        clientOrderId,
      });
      if (depositAmount > 0) {
        await takeBookingDeposit(stay.id, depositAmount, depositMethod);
      }
      onBooked();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not book the stay. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent side="right" className="gap-3 p-4 sm:p-5">
        <DialogHeader className="space-y-0">
          <DialogTitle className={TITLE}>Book {room.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className={dashboardLabelClass()}>Check in</span>
            <input type="date" className={dashboardInputClass(false)} value={checkIn} min={todayIso}
              onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={dashboardLabelClass()}>Check out</span>
            <input type="date" className={dashboardInputClass(false)} value={checkOut} min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)} />
          </label>
        </div>

        {/* The stay's cost: the working muted, the figure the guest pays in ink. A hairline rule
            sets it apart as the number the booking turns on. */}
        {nights > 0 ? (
          <div className="flex items-baseline justify-between border-t border-[color-mix(in_srgb,var(--op-ink,#121A16)_10%,transparent)] pt-2 font-mono tabular-nums">
            <span className={dashboardHintClass()}>
              {nights} night{nights === 1 ? "" : "s"} × {kes(room.nightlyRate)}
            </span>
            <span className="text-sm font-semibold text-[var(--op-ink,#121A16)]">{kes(nights * room.nightlyRate)}</span>
          </div>
        ) : (
          <p className={cn(dashboardHintClass(), "font-mono")}>Choose the nights</p>
        )}

        <label className="flex flex-col gap-1">
          <span className={dashboardLabelClass()}>Guest name</span>
          <input className={dashboardInputClass(false)} placeholder="Jane Doe" maxLength={120} value={name}
            autoFocus onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className={dashboardLabelClass()}>Phone (optional)</span>
            <input className={dashboardInputClass(false, "font-mono")} placeholder="07…" inputMode="tel" maxLength={32}
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={dashboardLabelClass()}>Guests</span>
            <input className={dashboardInputClass(false, "font-mono")} inputMode="numeric" value={guests}
              onChange={(e) => setGuests(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className={dashboardLabelClass()}>Deposit (optional)</span>
            <input className={dashboardInputClass(false, "font-mono")} placeholder="0" inputMode="decimal"
              value={deposit} onChange={(e) => setDeposit(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={dashboardLabelClass()}>Paid by</span>
            <select
              className={dashboardInputClass(false)}
              value={depositMethod}
              disabled={!deposit}
              onChange={(e) => setDepositMethod(e.target.value as "cash" | "mpesa_manual")}
            >
              <option value="cash">Cash</option>
              <option value="mpesa_manual">M-Pesa</option>
            </select>
          </label>
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={busy} onClick={() => void save()}>Book the stay</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Add, edit and take out of use the rooms of this branch. */
function ManageRoomsDrawer({
  branchId,
  onClose,
  onChanged,
}: {
  branchId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<RoomRecord[] | null>(null);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRooms(branchId).then(setRows).catch(() => setRows([]));
  }, [branchId]);

  async function add() {
    if (!name.trim()) return setError("Give the room a name or number");
    const nightlyRate = Number(rate);
    if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) return setError("Set what it costs a night");
    setBusy(true);
    setError(null);
    try {
      const created = await createRoom({ branchId, name: name.trim(), nightlyRate, area: area.trim() || undefined });
      setRows((prev) => [...(prev ?? []), created]);
      setName("");
      setRate("");
      setArea("");
      onChanged();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not add the room. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(room: RoomRecord) {
    setBusy(true);
    try {
      const updated = await updateRoom(room.id, { active: !room.active });
      setRows((prev) => (prev ?? []).map((r) => (r.id === room.id ? updated : r)));
      onChanged();
    } catch {
      setError("Could not change the room. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent side="right" className="gap-3 p-4 sm:p-5">
        <DialogHeader className="space-y-0">
          <DialogTitle className={TITLE}>Rooms</DialogTitle>
        </DialogHeader>

        <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#121A16)_10%,transparent)]">
          {(rows ?? []).map((r) => (
            <li key={r.id} className="flex items-center gap-2 py-2">
              <span className={cn("min-w-0 flex-1 text-sm", !r.active && "line-through opacity-60")}>
                {r.name}
                <span className={cn(dashboardHintClass(), "ml-1 font-mono")}>
                  {kes(r.nightlyRate)}/night{r.area ? ` · ${r.area}` : ""}
                </span>
              </span>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void toggle(r)}>
                {r.active ? "Take out of use" : "Use again"}
              </Button>
            </li>
          ))}
        </ul>

        <form
          className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <input className={dashboardInputClass(false)} aria-label="Room name" placeholder="Room 1" maxLength={80}
            value={name} onChange={(e) => setName(e.target.value)} />
          <input className={dashboardInputClass(false, "font-mono")} aria-label="Nightly rate" placeholder="2500"
            inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))} />
          <input className={cn(dashboardInputClass(false), "col-span-2")} aria-label="Floor or wing (optional)"
            placeholder="Floor or wing, e.g. Upstairs (optional)" maxLength={60} value={area}
            onChange={(e) => setArea(e.target.value)} />
          <Button type="submit" variant="outline" disabled={busy} className="col-span-2">Add room</Button>
        </form>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <div className="mt-auto flex justify-end pt-2">
          <Button size="sm" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

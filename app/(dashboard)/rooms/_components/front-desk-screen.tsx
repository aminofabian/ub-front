"use client";

import { BedDouble, CalendarCheck, DoorOpen, Plus, Sparkles, Wrench } from "lucide-react";
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
import { changeStayDates, fetchServers, moveStayToRoom, takeBookingDeposit } from "@/lib/restaurant-api";
import {
  createRoom,
  createRoomType,
  fetchAccommodationReport,
  fetchFrontDesk,
  fetchRooms,
  fetchRoomTypes,
  openStay,
  type AccommodationReport,
  setRoomHousekeeping,
  setRoomType,
  updateRoom,
  type FrontDeskRecord,
  type HousekeepingStatus,
  type RoomRecord,
  type RoomTypeRecord,
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
  const [housekeeping, setHousekeeping] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setDesk(await fetchFrontDesk(branchId));
      setStale(false);
    } catch {
      setStale(true);
      setDesk((current) => current ?? {
        branchId, asOf: "", rooms: [], otherStays: [],
        defaultCheckInTime: "14:00", defaultCheckOutTime: "11:00",
      });
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);
  // Poll, paused while a stay's folio is open (its own screen refreshes it).
  useRestaurantLive(() => void load(), 6000, Boolean(branchId) && openId == null);

  const changeHousekeeping = useCallback(
    async (roomId: string, status: HousekeepingStatus) => {
      setHousekeeping(true);
      try {
        await setRoomHousekeeping(roomId, status);
        await load();
      } finally {
        setHousekeeping(false);
      }
    },
    [load],
  );

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
      } else if (entry.room.readyToLet) {
        // Free = nobody in, and the room can take a guest tonight: not dirty, not out of use, and
        // not held by a booking for later. A dirty or future-booked room is simply not "free".
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
    // Rooms a stay can move to: ready to let AND holding no live stay of their own (so we do not
    // offer a room a guest is in or that is booked for later, which the server would then refuse).
    // The server still re-checks the exact dates; this just keeps the obvious conflicts off the list.
    const freeRooms = desk.rooms
      .filter((r) => r.room.readyToLet && !r.stays.some((s) => !s.settled && s.channel === "LODGING"))
      .map((r) => ({ id: r.room.id, name: r.room.name }));
    return (
      <OrderSheet
        orderId={openId}
        rights={rights}
        tables={[]}
        variant="lodging"
        lodgingEdit={
          rights.canTakeOrders
            ? {
                freeRooms,
                onMoveRoom: async (roomId) => {
                  await moveStayToRoom(openId, roomId);
                },
                onChangeDates: async (checkIn, checkOut) => {
                  await changeStayDates(openId, checkIn, checkOut);
                },
              }
            : undefined
        }
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
        description={noRooms ? "The rooms you let." : undefined}
      >
        {!noRooms ? (
          <Button variant="outline" size="sm" onClick={() => setShowNumbers((v) => !v)}>
            {showNumbers ? "Hide numbers" : "Numbers"}
          </Button>
        ) : null}
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
            Rooms
          </Button>
        ) : null}
      </DashboardPageHero>

      {!noRooms ? <OccupancyBoard tally={tally} rooms={desk.rooms} today={today} /> : null}

      {showNumbers && !noRooms ? <AccommodationOverview branchId={branchId} /> : null}

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
              busy={housekeeping}
              canBook={rights.canTakeOrders}
              onOpenStay={(id) => setOpenId(id)}
              onBook={() => setBooking(entry.room)}
              onHousekeeping={(status) => void changeHousekeeping(entry.room.id, status)}
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
          checkInTime={desk.defaultCheckInTime}
          checkOutTime={desk.defaultCheckOutTime}
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
  busy,
  canBook,
  onOpenStay,
  onBook,
  onHousekeeping,
}: {
  entry: RoomWithStays;
  today: string;
  busy: boolean;
  /** Whether this user may open a stay (take orders). Hides Book for view-only / sell-only roles. */
  canBook: boolean;
  onOpenStay: (orderId: string) => void;
  onBook: () => void;
  onHousekeeping: (status: HousekeepingStatus) => void;
}) {
  const { room, stays } = entry;
  const live = stays.filter((s) => !s.settled);
  const here = live.find((s) => !s.booked) ?? null;
  const booked = live.filter((s) => s.booked);
  const leavingToday = here && sameNairobiDay(here.scheduledEnd, today);
  const arrivingToday = booked.some((s) => sameNairobiDay(s.scheduledStart, today));

  const tone = here ? "occupied" : arrivingToday ? "arriving" : "free";
  const roomState: RoomState = roomStateOf(entry, today);

  return (
    <li>
      <div
        className={cn(
          DASHBOARD_SECTION_SURFACE,
          "relative flex flex-col gap-1.5 overflow-hidden p-2.5 transition-[border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          // An occupied room lifts off the board: a warm forest surface and a soft tinted shadow
          // (offset + blur, real depth), so the rooms with someone in them read first.
          tone === "occupied" &&
            "border-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_38%,var(--kiosk-border,rgba(18,26,22,0.1)))] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_4%,var(--op-surface,#FCFAF5))] shadow-[0_8px_20px_-14px_rgba(29,75,59,0.55)]",
          tone === "arriving" &&
            "border-[color-mix(in_srgb,var(--kiosk-highlight,#8f3f2f)_26%,var(--kiosk-border,rgba(18,26,22,0.1)))]",
          !room.active && "opacity-55",
        )}
      >
        {/* A hairline forest spine down the left of an occupied room — a drawn accent, not a loud
            border — marking the rooms that are working tonight. */}
        {tone === "occupied" ? (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-[2px] bg-[var(--pos-primary,#1D4B3B)]"
          />
        ) : null}
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight text-[var(--op-ink,#121A16)]">
              {room.name}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-[var(--pos-primary,#1D4B3B)]">
              {kes(room.effectiveNightlyRate)}
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
            <RoomFreeLine room={room} />
            {canBook && room.active && room.readyToLet ? (
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onBook}>
                <Plus className="size-3" aria-hidden /> Book
              </Button>
            ) : room.active && needsTurnaround(room) ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={busy}
                onClick={() => onHousekeeping("CLEAN")}
              >
                <Sparkles className="size-3" aria-hidden /> Mark clean
              </Button>
            ) : null}
          </div>
        )}

        {/* A housekeeping note (damage, a missing amenity) and who is on the room, when set. */}
        {room.housekeepingNote || room.cleanerName ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
            {room.housekeepingNote ? (
              <span className="inline-flex items-center gap-1">
                <Wrench className="size-3 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{room.housekeepingNote}</span>
              </span>
            ) : null}
            {room.cleanerName ? <span className="truncate">· {room.cleanerName}</span> : null}
          </div>
        ) : null}

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
              {/* A booking the guest made themselves on the storefront (ADR 0031) — call it out so the
                  desk knows to confirm it. */}
              {s.source === "ONLINE" ? (
                <span className="ml-1 rounded-[2px] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_12%,transparent)] px-1 py-px text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--pos-primary,#1D4B3B)]">
                  web
                </span>
              ) : null}
              {sameNairobiDay(s.scheduledStart, today) ? (
                <span className="ml-1 font-semibold text-[var(--kiosk-highlight,#8f3f2f)]">· arriving today</span>
              ) : (
                <span className={cn(dashboardHintClass(), "ml-1")}>{bookedFor(s.scheduledStart)}</span>
              )}
            </span>
          </button>
        ))}

        {canBook && here && room.active ? (
          <Button variant="ghost" size="sm" className="h-6 justify-start px-1 text-xs" onClick={onBook}>
            <Plus className="size-3" aria-hidden /> Book it for later too
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** The one state a room is in now, shared by the tile and the occupancy board so they never drift. */
function roomStateOf(entry: RoomWithStays, today: string): RoomState {
  const live = entry.stays.filter((s) => !s.settled);
  const here = live.find((s) => !s.booked) ?? null;
  const arrivingToday = live.some((s) => s.booked && sameNairobiDay(s.scheduledStart, today));
  if (!entry.room.active) return "blocked";
  if (here) return sameNairobiDay(here.scheduledEnd, today) ? "leaving" : "occupied";
  if (arrivingToday) return "arriving";
  return "free";
}

/**
 * The living front desk's signature board: a drawn key rack — one mark per room, filled by its
 * state — above the day's four figures in editorial type. The whole room at a glance, the way a
 * night manager reads a key board on the wall (ADR 0030).
 */
function OccupancyBoard({
  tally,
  rooms,
  today,
}: {
  tally: { inHouse: number; arriving: number; leaving: number; free: number };
  rooms: RoomWithStays[];
  today: string;
}) {
  const marks = rooms.map((entry) => ({ id: entry.room.id, state: roomStateOf(entry, today) }));
  const total = rooms.length;
  const filled = tally.inHouse;
  return (
    <section
      className={cn(DASHBOARD_SECTION_SURFACE, "mt-1 overflow-hidden p-0")}
      aria-label={`${filled} of ${total} rooms in use`}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:p-4">
        {/* The day in four figures: in-house leads in forest, today's comings and goings in the one
            terracotta accent, free kept quiet. Each rises into place once on load. */}
        <dl className="flex items-end gap-4 sm:gap-6">
          <BoardStat n={tally.inHouse} label="in house" tone="forest" lead delay={0} />
          <BoardStat n={tally.arriving} label="arriving" tone="attention" delay={60} />
          <BoardStat n={tally.leaving} label="leaving" tone="attention" delay={120} />
          <BoardStat n={tally.free} label="free" tone="muted" delay={180} />
        </dl>
        <KeyRack marks={marks} />
      </div>
    </section>
  );
}

/** One figure on the board: a large tabular count over a tinted label, rising in on load. */
function BoardStat({
  n,
  label,
  tone,
  lead,
  delay,
}: {
  n: number;
  label: string;
  tone: "forest" | "attention" | "muted";
  lead?: boolean;
  delay: number;
}) {
  const lit = n > 0;
  const color =
    tone === "forest"
      ? "text-[var(--pos-primary,#1D4B3B)]"
      : tone === "attention" && lit
        ? "text-[var(--kiosk-highlight,#8f3f2f)]"
        : "text-[color-mix(in_srgb,var(--op-ink,#121A16)_52%,transparent)]";
  return (
    <div className="min-w-0">
      <dd
        className={cn(
          "font-mono tabular-nums leading-[0.9] tracking-[-0.03em] motion-safe:[animation:desk-stat-rise_460ms_cubic-bezier(0.22,1,0.36,1)_both]",
          lead ? "text-[2.6rem] sm:text-[3.1rem]" : "text-[1.7rem] sm:text-[2rem]",
          lit || tone === "forest" ? color : "text-[color-mix(in_srgb,var(--op-ink,#121A16)_30%,transparent)]",
        )}
        style={{ animationDelay: `${delay}ms` }}
      >
        {n}
      </dd>
      <dt
        className={cn(
          "mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
          tone === "forest"
            ? "text-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_80%,transparent)]"
            : "text-[color-mix(in_srgb,var(--op-ink,#121A16)_50%,transparent)]",
        )}
      >
        {label}
      </dt>
    </div>
  );
}

/** The drawn key rack: one slim mark per room, its fill the room's state. Filled marks grow up. */
function KeyRack({ marks }: { marks: { id: string; state: RoomState }[] }) {
  if (marks.length === 0) return null;
  return (
    <ol
      className="flex flex-1 items-end gap-[3px] sm:max-w-[60%] sm:justify-end"
      aria-hidden
    >
      {marks.map((m, i) => {
        const occupied = m.state === "occupied" || m.state === "leaving";
        const flag = m.state === "arriving" || m.state === "leaving";
        const height = occupied ? "h-7" : flag ? "h-5" : "h-3.5";
        const fill = occupied
          ? "bg-[var(--pos-primary,#1D4B3B)]"
          : m.state === "arriving"
            ? "bg-[color-mix(in_srgb,var(--kiosk-highlight,#8f3f2f)_55%,transparent)]"
            : m.state === "blocked"
              ? "bg-[color-mix(in_srgb,var(--op-ink,#121A16)_14%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--op-ink,#121A16)_10%,transparent)]";
        return (
          <li key={m.id} className="relative flex h-7 min-w-[5px] flex-1 items-end sm:max-w-[14px]">
            <span
              className={cn(
                "block w-full origin-bottom rounded-[1.5px] transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                height,
                fill,
                occupied && "motion-safe:[animation:desk-key-fill_420ms_cubic-bezier(0.22,1,0.36,1)_both]",
              )}
              style={occupied ? { animationDelay: `${Math.min(i * 22, 300)}ms` } : undefined}
            />
            {/* The terracotta key-dot for a room with someone due in or out today. */}
            {flag ? (
              <span className="absolute -top-0.5 left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-[var(--kiosk-highlight,#8f3f2f)] motion-safe:[animation:seat-attention_1600ms_ease-in-out_infinite]" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** "14:00" → "2pm", "09:30" → "9:30am" — the house's check-in / check-out time, read plainly. */
function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour12}:${String(m).padStart(2, "0")}${period}` : `${hour12}${period}`;
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

/** A room whose housekeeping holds it back from the next guest, beyond being simply occupied. */
function needsTurnaround(room: RoomRecord): boolean {
  return room.housekeepingStatus === "DIRTY" || room.housekeepingStatus === "CLEANING";
}

/** The housekeeping states in the order a cleaner moves through them, for the manage list. */
const HOUSEKEEPING_WORDS: Record<HousekeepingStatus, string> = {
  CLEAN: "Clean",
  DIRTY: "Needs cleaning",
  CLEANING: "Being cleaned",
  INSPECTED: "Inspected",
  MAINTENANCE: "Out for repair",
};

/**
 * What a free (unoccupied) room reads as: ready to let, or held back by its housekeeping. A room
 * needing a turnaround carries the one terracotta accent; out of use or out for repair stay muted.
 */
function RoomFreeLine({ room }: { room: RoomRecord }) {
  if (!room.active) {
    return <span className={dashboardHintClass()}>Out of use</span>;
  }
  if (room.housekeepingStatus === "MAINTENANCE") {
    return (
      <span className={cn(dashboardHintClass(), "inline-flex items-center gap-1")}>
        <Wrench className="size-3" aria-hidden /> Out for repair
      </span>
    );
  }
  if (needsTurnaround(room)) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--kiosk-highlight,#8f3f2f)]">
        {HOUSEKEEPING_WORDS[room.housekeepingStatus]}
      </span>
    );
  }
  return <span className={dashboardHintClass()}>Free</span>;
}

function EmptyRooms({ canManage, onManage }: { canManage: boolean; onManage: () => void }) {
  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "mt-1 flex flex-col items-center gap-3 px-4 py-12 text-center")}>
      {/* An empty key rack: the board the front desk will fill, drawn once so the metaphor reads
          before there is any data. Hairline marks, waiting for keys. */}
      <ol className="flex items-end gap-[3px]" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <li
            key={i}
            className="w-[7px] rounded-[1.5px] bg-[color-mix(in_srgb,var(--op-ink,#121A16)_9%,transparent)]"
            style={{ height: `${10 + (i % 3) * 5}px` }}
          />
        ))}
      </ol>
      <p className={cn(TITLE, "text-[1.55rem] leading-none")}>The desk is quiet</p>
      <p className={cn(dashboardHintClass(), "max-w-[22rem] leading-relaxed")}>
        Add the rooms you let, each with what it costs a night. Then you can book a stay, check guests
        in, and charge food and drink to the room.
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
  checkInTime,
  checkOutTime,
  onClose,
  onBooked,
}: {
  branchId: string;
  room: RoomRecord;
  /** The business default check-in / check-out times, "HH:mm" Nairobi (ADR 0031). */
  checkInTime: string;
  checkOutTime: string;
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

  // The cost resolved the same way the folio will at check-in: each night at the room's weekday or
  // weekend (Fri/Sat) rate, so the quote the guest is given matches what they are charged.
  const cost = useMemo(() => {
    if (nights < 1) return { total: 0, weekday: 0, weekend: 0 };
    let weekdayNights = 0;
    let weekendNights = 0;
    const start = new Date(checkIn + "T12:00:00");
    for (let i = 0; i < nights; i++) {
      const day = new Date(start.getTime() + i * 86400000).getDay(); // 5 = Fri, 6 = Sat
      if (day === 5 || day === 6) weekendNights++;
      else weekdayNights++;
    }
    return {
      total: weekdayNights * room.effectiveNightlyRate + weekendNights * room.effectiveWeekendRate,
      weekday: weekdayNights,
      weekend: weekendNights,
    };
  }, [nights, checkIn, room.effectiveNightlyRate, room.effectiveWeekendRate]);

  const hasWeekendRate = room.effectiveWeekendRate !== room.effectiveNightlyRate;

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
        // The house's own check-in / check-out times (ADR 0031), Nairobi — stored as instants;
        // nights drive the charge, not the hour.
        checkIn: new Date(`${checkIn}T${checkInTime}:00+03:00`).toISOString(),
        checkOut: new Date(`${checkOut}T${checkOutTime}:00+03:00`).toISOString(),
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
            <span className={dashboardLabelClass()}>
              Check in <span className={cn(dashboardHintClass(), "font-normal normal-case")}>from {prettyTime(checkInTime)}</span>
            </span>
            <input type="date" className={dashboardInputClass(false)} value={checkIn} min={todayIso}
              onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={dashboardLabelClass()}>
              Check out <span className={cn(dashboardHintClass(), "font-normal normal-case")}>by {prettyTime(checkOutTime)}</span>
            </span>
            <input type="date" className={dashboardInputClass(false)} value={checkOut} min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)} />
          </label>
        </div>

        {/* The stay's cost: the working muted, the figure the guest pays in ink. A hairline rule
            sets it apart as the number the booking turns on. */}
        {nights > 0 ? (
          <div className="flex items-baseline justify-between border-t border-[color-mix(in_srgb,var(--op-ink,#121A16)_10%,transparent)] pt-2 font-mono tabular-nums">
            <span className={dashboardHintClass()}>
              {hasWeekendRate && cost.weekend > 0 && cost.weekday > 0
                ? `${cost.weekday} × ${kes(room.effectiveNightlyRate)} + ${cost.weekend} × ${kes(room.effectiveWeekendRate)}`
                : `${nights} night${nights === 1 ? "" : "s"} × ${kes(cost.weekend === nights ? room.effectiveWeekendRate : room.effectiveNightlyRate)}`}
            </span>
            <span className="text-sm font-semibold text-[var(--op-ink,#121A16)]">{kes(cost.total)}</span>
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
  const [types, setTypes] = useState<RoomTypeRecord[]>([]);
  const [cleaners, setCleaners] = useState<{ staffProfileId: string; name: string }[]>([]);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRooms(branchId).then(setRows).catch(() => setRows([]));
    void fetchRoomTypes(branchId).then(setTypes).catch(() => setTypes([]));
    void fetchServers().then(setCleaners).catch(() => setCleaners([]));
  }, [branchId]);

  async function hk(room: RoomRecord, extra: Parameters<typeof setRoomHousekeeping>[2]) {
    setBusy(true);
    setError(null);
    try {
      const updated = await setRoomHousekeeping(room.id, room.housekeepingStatus, extra);
      setRows((prev) => (prev ?? []).map((r) => (r.id === room.id ? updated : r)));
      onChanged();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not update the room. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function assignType(room: RoomRecord, roomTypeId: string | null) {
    setBusy(true);
    setError(null);
    try {
      const updated = await setRoomType(room.id, roomTypeId);
      setRows((prev) => (prev ?? []).map((r) => (r.id === room.id ? updated : r)));
      onChanged();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not set the room type. Try again.");
    } finally {
      setBusy(false);
    }
  }

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

  async function setHk(room: RoomRecord, status: HousekeepingStatus) {
    setBusy(true);
    setError(null);
    try {
      const updated = await setRoomHousekeeping(room.id, status);
      setRows((prev) => (prev ?? []).map((r) => (r.id === room.id ? updated : r)));
      onChanged();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not change the room. Try again.");
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
            <li key={r.id} className="flex flex-col gap-1.5 py-2">
              <div className="flex items-center gap-2">
                <span className={cn("min-w-0 flex-1 text-sm", !r.active && "line-through opacity-60")}>
                  {r.name}
                  <span className={cn(dashboardHintClass(), "ml-1 font-mono")}>
                    {kes(r.effectiveNightlyRate)}/night
                    {r.effectiveWeekendRate !== r.effectiveNightlyRate ? ` · ${kes(r.effectiveWeekendRate)} wknd` : ""}
                    {r.area ? ` · ${r.area}` : ""}
                  </span>
                </span>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void toggle(r)}>
                  {r.active ? "Take out of use" : "Use again"}
                </Button>
              </div>
              {r.active ? (
                <div className="flex items-center gap-2 pl-0.5">
                  <label className={cn(dashboardHintClass(), "sr-only")} htmlFor={`hk-${r.id}`}>
                    Housekeeping for {r.name}
                  </label>
                  <select
                    id={`hk-${r.id}`}
                    className="h-8 rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-2 text-xs focus-visible:border-[var(--pos-primary,#1D4B3B)] focus-visible:outline-none disabled:opacity-60"
                    value={r.housekeepingStatus}
                    disabled={busy}
                    onChange={(e) => void setHk(r, e.target.value as HousekeepingStatus)}
                  >
                    {(Object.keys(HOUSEKEEPING_WORDS) as HousekeepingStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {HOUSEKEEPING_WORDS[s]}
                      </option>
                    ))}
                  </select>
                  {r.readyToLet ? (
                    <span className={cn(dashboardHintClass(), "inline-flex items-center gap-1")}>
                      <Sparkles className="size-3" aria-hidden /> Ready to let
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--kiosk-highlight,#8f3f2f)]">
                      Not ready
                    </span>
                  )}
                </div>
              ) : null}
              {/* Who is cleaning the room, and a note about it — shown for a room needing a turnaround. */}
              {r.active && (needsTurnaround(r) || r.housekeepingNote || r.cleanerStaffProfileId) ? (
                <div className="flex flex-wrap items-center gap-2 pl-0.5">
                  {cleaners.length > 0 ? (
                    <select
                      aria-label={`Cleaner for ${r.name}`}
                      className="h-8 rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-2 text-xs focus-visible:border-[var(--pos-primary,#1D4B3B)] focus-visible:outline-none disabled:opacity-60"
                      value={r.cleanerStaffProfileId ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        void hk(r, e.target.value ? { cleanerStaffProfileId: e.target.value } : { clearCleaner: true })
                      }
                    >
                      <option value="">No cleaner</option>
                      {r.cleanerStaffProfileId && !cleaners.some((c) => c.staffProfileId === r.cleanerStaffProfileId) ? (
                        <option value={r.cleanerStaffProfileId}>{r.cleanerName ?? "Staff"}</option>
                      ) : null}
                      {cleaners.map((c) => (
                        <option key={c.staffProfileId} value={c.staffProfileId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    aria-label={`Housekeeping note for ${r.name}`}
                    className={dashboardInputClass(false, "h-8 flex-1 text-xs")}
                    placeholder="Note — damage, missing amenity…"
                    maxLength={300}
                    defaultValue={r.housekeepingNote ?? ""}
                    disabled={busy}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value === (r.housekeepingNote ?? "")) return;
                      void hk(r, value ? { note: value } : { clearNote: true });
                    }}
                  />
                </div>
              ) : null}
              {types.length > 0 ? (
                <div className="flex items-center gap-2 pl-0.5">
                  <label className={cn(dashboardHintClass(), "sr-only")} htmlFor={`type-${r.id}`}>
                    Room type for {r.name}
                  </label>
                  <select
                    id={`type-${r.id}`}
                    className="h-8 rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-2 text-xs focus-visible:border-[var(--pos-primary,#1D4B3B)] focus-visible:outline-none disabled:opacity-60"
                    value={r.roomTypeId ?? ""}
                    disabled={busy}
                    onChange={(e) => void assignType(r, e.target.value || null)}
                  >
                    <option value="">No type (own rate)</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {r.roomTypeId ? (
                    <span className={dashboardHintClass()}>rate from type</span>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <RoomTypesManager
          branchId={branchId}
          types={types}
          busy={busy}
          onChanged={(next) => {
            setTypes(next);
            onChanged();
          }}
          setBusy={setBusy}
          setError={setError}
        />

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

/** Manage the room types (rate cards) of a branch, inside the Rooms drawer (ADR 0030). */
function RoomTypesManager({
  branchId,
  types,
  busy,
  onChanged,
  setBusy,
  setError,
}: {
  branchId: string;
  types: RoomTypeRecord[];
  busy: boolean;
  onChanged: (next: RoomTypeRecord[]) => void;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [weekend, setWeekend] = useState("");
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!name.trim()) return setError("Give the room type a name");
    const defaultNightlyRate = Number(rate);
    if (!Number.isFinite(defaultNightlyRate) || defaultNightlyRate <= 0) return setError("Set the weekday rate");
    const weekendNightlyRate = weekend ? Number(weekend) : undefined;
    setBusy(true);
    setError(null);
    try {
      const created = await createRoomType({
        branchId,
        name: name.trim(),
        defaultNightlyRate,
        ...(weekendNightlyRate && weekendNightlyRate > 0 ? { weekendNightlyRate } : {}),
      });
      onChanged([...types, created]);
      setName("");
      setRate("");
      setWeekend("");
      setAdding(false);
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not add the room type. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-[color-mix(in_srgb,var(--order-ink,#121A16)_10%,transparent)] pt-2">
      <div className="flex items-center justify-between">
        <h3 className={cn(dashboardLabelClass())}>Room types</h3>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => setAdding((a) => !a)}>
          <Plus className="size-3" aria-hidden /> New type
        </Button>
      </div>
      {types.length > 0 ? (
        <ul className="mt-1 grid gap-0.5">
          {types.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{t.name}</span>
              <span className={cn(dashboardHintClass(), "font-mono tabular-nums")}>
                {kes(t.defaultNightlyRate)}
                {t.weekendNightlyRate != null ? ` · wknd ${kes(t.weekendNightlyRate)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn(dashboardHintClass(), "mt-1")}>No types yet. A room without a type uses its own rate.</p>
      )}
      {adding ? (
        <form
          className="mt-2 grid grid-cols-[minmax(0,1fr)_5rem_5rem] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <input className={dashboardInputClass(false)} aria-label="Type name" placeholder="Standard Double" maxLength={80}
            value={name} onChange={(e) => setName(e.target.value)} />
          <input className={dashboardInputClass(false, "font-mono")} aria-label="Weekday rate" placeholder="3500"
            inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))} />
          <input className={dashboardInputClass(false, "font-mono")} aria-label="Weekend rate (optional)" placeholder="wknd"
            inputMode="decimal" value={weekend} onChange={(e) => setWeekend(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))} />
          <Button type="submit" variant="outline" disabled={busy} className="col-span-3">Add type</Button>
        </form>
      ) : null}
    </section>
  );
}

/** Nairobi's today minus `days`, as YYYY-MM-DD. */
function nairobiBack(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(
    new Date(Date.now() - days * 86400000),
  );
}

/** The accommodation numbers for the last 30 days: occupancy, ADR, RevPAR, and today's attention. */
function AccommodationOverview({ branchId }: { branchId: string }) {
  const [report, setReport] = useState<AccommodationReport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchAccommodationReport(branchId, nairobiBack(29), nairobiBack(0))
      .then((r) => live && setReport(r))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [branchId]);

  if (failed) {
    return (
      <p role="status" className={cn(dashboardHintClass(), "mt-1 px-2")}>
        Could not load the numbers.
      </p>
    );
  }
  if (!report) {
    return <DashboardLoading label="Working out the numbers…" />;
  }

  const pct = Math.round(report.occupancyRate * 100);
  return (
    <section className={cn(DASHBOARD_SECTION_SURFACE, "mt-1 grid gap-3")} aria-label="Accommodation numbers">
      <p className={dashboardLabelClass()}>Last 30 days</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <OccupancyDial pct={pct} />
        <dl className="grid flex-1 grid-cols-3 gap-x-4 gap-y-1.5">
          <Metric label="Avg nightly" value={kes(report.averageDailyRate)} />
          <Metric label="RevPAR" value={kes(report.revPar)} />
          <Metric label="Room income" value={kes(report.accommodationRevenue)} tone="forest" />
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-[color-mix(in_srgb,var(--op-ink,#121A16)_10%,transparent)] pt-1.5 font-mono text-[11px] tabular-nums">
        <span className={dashboardHintClass()}>{report.roomNightsSold} room-nights sold</span>
        {report.dirty > 0 ? (
          <span className="font-semibold text-[var(--kiosk-highlight,#8f3f2f)]">{report.dirty} to clean</span>
        ) : null}
        {report.underMaintenance > 0 ? (
          <span className={dashboardHintClass()}>{report.underMaintenance} out for repair</span>
        ) : null}
        {report.outstandingBalances > 0 ? (
          <span className={dashboardHintClass()}>{kes(report.outstandingBalances)} owed in house</span>
        ) : null}
      </div>
    </section>
  );
}

/** A drawn occupancy dial: a forest arc filling to the month's occupancy, the figure at its heart. */
function OccupancyDial({ pct }: { pct: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  // Three-quarter sweep (270°), so the gap sits at the foot like a gauge, not a full ring.
  const sweep = 0.75;
  const dash = circ * sweep;
  const filled = dash * (clamped / 100);
  return (
    <div className="relative inline-flex size-[88px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 80 80" className="size-full -rotate-[135deg]">
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke="color-mix(in srgb, var(--op-ink,#121A16) 9%, transparent)"
          strokeDasharray={`${dash} ${circ}`}
        />
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke="var(--pos-primary,#1D4B3B)"
          strokeDasharray={`${filled} ${circ}`}
          className="motion-safe:[transition:stroke-dasharray_700ms_cubic-bezier(0.22,1,0.36,1)]"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[1.45rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[var(--op-ink,#121A16)]">
          {clamped}
          <span className="text-[0.7rem] align-top text-[color-mix(in_srgb,var(--op-ink,#121A16)_50%,transparent)]">%</span>
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_75%,transparent)]">
          full
        </span>
      </span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "forest" }) {
  return (
    <div className="min-w-0">
      <dt className={cn(dashboardHintClass(), "truncate")}>{label}</dt>
      <dd
        className={cn(
          "font-mono text-lg font-semibold tabular-nums tracking-[-0.02em]",
          tone === "forest" ? "text-[var(--pos-primary,#1D4B3B)]" : "text-[var(--op-ink,#121A16)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

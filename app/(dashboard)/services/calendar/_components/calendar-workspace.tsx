"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { fetchServicePerformers, fetchServices, nairobiToday, type ServicePerformerRecord, type ServiceRecord } from "@/lib/service-business-api";
import {
  addStaffTimeOff,
  columnOf,
  fetchServiceCalendar,
  hoursToShow,
  placeEntries,
  removeStaffTimeOff,
  timeAtFraction,
  weekOf,
  type CalendarEntry,
  type CalendarGroup,
  type CalendarKind,
  type ServiceCalendar,
} from "@/lib/service-calendar";
import { cn } from "@/lib/utils";

import { BookingDialog, nairobiInstant } from "../../appointments/_components/appointments-workspace";

const HOUR_PX = 56;
const REFRESH_MS = 30000;
const NO_COLUMN = "__none__";

const KIND_WORD: Record<CalendarKind, string> = {
  BOOKED: "Booked",
  IN_SERVICE: "In progress",
  DONE: "Done",
  NO_SHOW: "Did not come",
  TIME_OFF: "Off",
  BLOCKED: "Out of use",
};

/** Each kind has its own border and fill as well as its word, so it never depends on colour alone. */
const KIND_STYLE: Record<CalendarKind, string> = {
  BOOKED: "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_10%,var(--op-surface,#FCFAF5))]",
  IN_SERVICE: "border-2 border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_22%,var(--op-surface,#FCFAF5))]",
  DONE: "border-[color-mix(in_srgb,var(--order-ink,#121A16)_25%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#121A16)_6%,var(--op-surface,#FCFAF5))]",
  NO_SHOW: "border-dashed border-[color-mix(in_srgb,var(--order-ink,#121A16)_35%,transparent)] bg-transparent line-through",
  TIME_OFF: "border-dashed border-[color-mix(in_srgb,var(--order-ink,#121A16)_30%,transparent)] bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,color-mix(in_srgb,var(--order-ink,#121A16)_7%,transparent)_6px,color-mix(in_srgb,var(--order-ink,#121A16)_7%,transparent)_12px)]",
  BLOCKED: "border-dashed border-[color-mix(in_srgb,var(--order-ink,#121A16)_30%,transparent)] bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,color-mix(in_srgb,var(--order-ink,#121A16)_7%,transparent)_6px,color-mix(in_srgb,var(--order-ink,#121A16)_7%,transparent)_12px)]",
};

const clock = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
const dayName = (date: string, long = false) =>
  new Intl.DateTimeFormat("en-KE", { timeZone: "UTC", weekday: long ? "long" : "short", day: "numeric", month: long ? "long" : "short" }).format(
    new Date(`${date}T12:00:00Z`),
  );
const shift = (date: string, days: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
/** The Nairobi calendar day an instant falls on. */
const dayOf = (iso: string) => nairobiToday(new Date(iso));

/**
 * The branch calendar. One set of entries, seen four ways: a day or a week, by person or by
 * place. In the day view each block also names the other half (a person's block says which
 * chair; a chair's block says who), so people and places can be read side by side.
 */
export function CalendarWorkspace({ canManageTeam }: { canManageTeam: boolean }) {
  const { branchId } = useDashboard();
  const [view, setView] = useState<"day" | "week">("day");
  const [group, setGroup] = useState<CalendarGroup>("people");
  const [date, setDate] = useState(() => nairobiToday());
  const [calendar, setCalendar] = useState<ServiceCalendar | null>(null);
  const [failed, setFailed] = useState(false);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [performers, setPerformers] = useState<ServicePerformerRecord[]>([]);
  const [booking, setBooking] = useState<{ date: string; time?: string; staffProfileId?: string; resourceId?: string } | null>(null);
  const [opened, setOpened] = useState<CalendarEntry | null>(null);
  const [timeOff, setTimeOff] = useState(false);
  const [filter, setFilter] = useState("");

  const days = useMemo(() => (view === "week" ? weekOf(date) : [date]), [view, date]);
  const fromIso = nairobiInstant(days[0]!, "00:00");
  const toIso = nairobiInstant(shift(days[days.length - 1]!, 1), "00:00");

  const refresh = useCallback(async () => {
    if (!branchId) return;
    try {
      setCalendar(await fetchServiceCalendar(branchId, fromIso, toIso));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [branchId, fromIso, toIso]);

  useEffect(() => {
    setCalendar(null);
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    void fetchServices({ active: true }).then(setServices).catch(() => setServices([]));
    void fetchServicePerformers().then(setPerformers).catch(() => setPerformers([]));
  }, []);

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Choose a branch</p>
          <p className={dashboardHintClass()}>Pick a branch at the top of the page to see its calendar.</p>
        </div>
      </div>
    );
  }

  const columns = calendar ? (group === "people" ? calendar.staff : calendar.resources) : [];
  const nameOfStaff = (id: string | null) => calendar?.staff.find((s) => s.id === id)?.name ?? null;
  const nameOfPlace = (id: string | null) => calendar?.resources.find((r) => r.id === id)?.name ?? null;

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero icon={CalendarRange} title="Calendar" description="Who is busy, which chairs and rooms are taken, and when.">
        <div className="flex flex-wrap gap-1.5">
          {canManageTeam ? (
            <Button size="sm" variant="outline" onClick={() => setTimeOff(true)}>
              Time off
            </Button>
          ) : null}
          <Button size="sm" variant="outline" asChild>
            <Link href={APP_ROUTES.servicesAppointments}>Bookings list</Link>
          </Button>
          <Button size="sm" onClick={() => setBooking({ date })}>
            New booking
          </Button>
        </div>
      </DashboardPageHero>

      <div className={cn(DASHBOARD_SECTION_SURFACE, "flex flex-wrap items-center gap-2")}>
        <div className="flex gap-1" role="group" aria-label="Period">
          {(["day", "week"] as const).map((v) => (
            <Button key={v} size="sm" variant={view === v ? "default" : "outline"} aria-pressed={view === v} onClick={() => setView(v)}>
              {v === "day" ? "Day" : "Week"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="Show by">
          {(["people", "places"] as const).map((g) => (
            <Button
              key={g}
              size="sm"
              variant={group === g ? "default" : "outline"}
              aria-pressed={group === g}
              onClick={() => {
                setGroup(g);
                setFilter("");
              }}
            >
              {g === "people" ? "By person" : "By place"}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setDate((d) => shift(d, view === "week" ? -7 : -1))}>
          {view === "week" ? "Week before" : "Day before"}
        </Button>
        <input type="date" aria-label="Day" className={dashboardInputClass(false, "w-auto")} value={date} onChange={(e) => (e.target.value ? setDate(e.target.value) : undefined)} />
        <Button size="sm" variant="outline" onClick={() => setDate((d) => shift(d, view === "week" ? 7 : 1))}>
          {view === "week" ? "Week after" : "Day after"}
        </Button>
        {date !== nairobiToday() ? (
          <Button size="sm" variant="ghost" onClick={() => setDate(nairobiToday())}>
            Today
          </Button>
        ) : null}
        <p className="text-sm font-medium">
          {view === "day" ? dayName(date, true) : `${dayName(days[0]!)} to ${dayName(days[6]!)}`}
        </p>
      </div>

      {failed && !calendar ? (
        <DashboardLoadError title="Calendar" message="Could not load the calendar. Check your connection." onRetry={() => void refresh()} />
      ) : !calendar ? (
        <DashboardLoading label="Loading the calendar…" />
      ) : columns.length === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">{group === "people" ? "Nobody on the team yet" : "No chairs or rooms yet"}</p>
          <p className={dashboardHintClass()}>
            {group === "people" ? "Add your team on the Commissions page." : "Add them from Serve a customer, under Chairs and rooms."}
          </p>
        </div>
      ) : view === "day" ? (
        <DayGrid
          calendar={calendar}
          date={date}
          group={group}
          nameOfStaff={nameOfStaff}
          nameOfPlace={nameOfPlace}
          onOpen={setOpened}
          onBook={(columnId, time) =>
            setBooking({
              date,
              time,
              ...(group === "people" ? { staffProfileId: columnId } : { resourceId: columnId }),
            })
          }
        />
      ) : (
        <>
          <label className={cn(DASHBOARD_SECTION_SURFACE, "flex items-center gap-2 text-sm")}>
            <span className={dashboardLabelClass()}>{group === "people" ? "Person" : "Place"}</span>
            <select className={dashboardSelectClass(false, "w-56")} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">{group === "people" ? "Everyone" : "Everywhere"}</option>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {days.map((day) => {
              const entries = calendar.entries.filter(
                (e) => dayOf(e.start) <= day && dayOf(e.end) >= day && (!filter || columnOf(e, group) === filter),
              );
              return (
                <section key={day} className={cn(DASHBOARD_SECTION_SURFACE, "content-start", day === nairobiToday() && "border-[var(--pos-primary,#1D4B3B)]")} aria-label={dayName(day, true)}>
                  <button
                    type="button"
                    className="text-left text-sm font-semibold underline-offset-2 hover:underline"
                    onClick={() => {
                      setDate(day);
                      setView("day");
                    }}
                  >
                    {dayName(day)}
                    {day === nairobiToday() ? " · today" : ""}
                  </button>
                  {entries.length === 0 ? (
                    <p className={cn("mt-1", dashboardHintClass())}>Nothing</p>
                  ) : (
                    <ul className="mt-1 grid gap-1">
                      {entries.map((e, i) => (
                        <li key={`${e.kind}-${e.ticketId ?? ""}-${e.start}-${i}`}>
                          <button
                            type="button"
                            onClick={() => setOpened(e)}
                            className={cn("w-full rounded-[2px] border px-1.5 py-1 text-left text-xs leading-snug", KIND_STYLE[e.kind])}
                          >
                            <span className="block font-mono tabular-nums">{dayOf(e.start) === day ? clock(e.start) : "All day"}</span>
                            <span className="block truncate font-medium">{e.customerName ?? e.title}</span>
                            <span className="block truncate">
                              {[group === "people" ? nameOfStaff(e.staffProfileId) : nameOfPlace(e.resourceId), KIND_WORD[e.kind]].filter(Boolean).join(" · ")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <p className={dashboardHintClass()}>
        Solid: booked. Heavy border: in progress now. Grey: done. Dashed: did not come. Striped: time off or out of use.
      </p>

      {booking ? (
        <BookingDialog
          branchId={branchId}
          date={booking.date}
          services={services}
          performers={performers}
          resources={calendar?.resources ?? []}
          initial={booking}
          onClose={() => setBooking(null)}
          onDone={async () => {
            setBooking(null);
            await refresh();
          }}
        />
      ) : null}
      {opened ? (
        <EntryDialog entry={opened} staffName={nameOfStaff(opened.staffProfileId)} placeName={nameOfPlace(opened.resourceId)} onClose={() => setOpened(null)} />
      ) : null}
      {timeOff && calendar ? (
        <TimeOffDialog
          calendar={calendar}
          date={date}
          onClose={() => {
            setTimeOff(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function DayGrid({
  calendar,
  date,
  group,
  nameOfStaff,
  nameOfPlace,
  onOpen,
  onBook,
}: {
  calendar: ServiceCalendar;
  date: string;
  group: CalendarGroup;
  nameOfStaff: (id: string | null) => string | null;
  nameOfPlace: (id: string | null) => string | null;
  onOpen: (entry: CalendarEntry) => void;
  onBook: (columnId: string, time: string) => void;
}) {
  const dayStart = new Date(nairobiInstant(date, "00:00")).getTime();
  const { firstHour, lastHour } = hoursToShow(calendar.entries, dayStart);
  const gridStart = dayStart + firstHour * 3600000;
  const gridEnd = dayStart + lastHour * 3600000;
  const height = (lastHour - firstHour) * HOUR_PX;
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const base = group === "people" ? calendar.staff : calendar.resources;
  // Work with no place (or no person) still has to be somewhere to be seen.
  const stray = calendar.entries.some((e) => columnOf(e, group) == null && e.kind !== "TIME_OFF" && e.kind !== "BLOCKED");
  const columns = stray ? [...base, { id: NO_COLUMN, name: group === "people" ? "Nobody yet" : "No particular place" }] : base;
  const now = Date.now();
  const nowTop = now > gridStart && now < gridEnd ? ((now - gridStart) / (gridEnd - gridStart)) * height : null;

  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "overflow-x-auto p-0")}>
      <div className="grid min-w-max" style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(9rem, 1fr))` }}>
        <div className="sticky left-0 z-10 border-b bg-[var(--op-surface,#FCFAF5)]" />
        {columns.map((c) => (
          <div key={c.id} className="border-b border-l px-2 py-1.5 text-sm font-semibold">
            {c.name}
          </div>
        ))}

        <div className="sticky left-0 z-10 bg-[var(--op-surface,#FCFAF5)]" style={{ height }}>
          {hours.map((h) => (
            <div key={h} className={cn("pr-1 text-right font-mono text-xs tabular-nums", dashboardHintClass())} style={{ height: HOUR_PX }}>
              {h % 12 === 0 ? 12 : h % 12} {h < 12 ? "am" : "pm"}
            </div>
          ))}
        </div>
        {columns.map((c) => {
          const mine = calendar.entries.filter((e) => (columnOf(e, group) ?? NO_COLUMN) === c.id && (c.id !== NO_COLUMN || (e.kind !== "TIME_OFF" && e.kind !== "BLOCKED")));
          const placed = placeEntries(mine, gridStart, gridEnd);
          return (
            <div
              key={c.id}
              className="relative border-l"
              style={{
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${HOUR_PX - 1}px, color-mix(in srgb, var(--order-ink,#121A16) 8%, transparent) ${HOUR_PX - 1}px, color-mix(in srgb, var(--order-ink,#121A16) 8%, transparent) ${HOUR_PX}px)`,
              }}
            >
              {c.id !== NO_COLUMN ? (
                <button
                  type="button"
                  className="absolute inset-0 cursor-cell"
                  aria-label={`Book ${c.name}`}
                  title="Tap a free time to book it"
                  onClick={(e) => {
                    const box = e.currentTarget.getBoundingClientRect();
                    onBook(c.id, timeAtFraction((e.clientY - box.top) / box.height, firstHour, lastHour));
                  }}
                />
              ) : null}
              {placed.map((p, i) => {
                const e = p.entry;
                const other = group === "people" ? nameOfPlace(e.resourceId) : nameOfStaff(e.staffProfileId);
                return (
                  <button
                    key={`${e.kind}-${e.ticketId ?? ""}-${e.start}-${i}`}
                    type="button"
                    onClick={() => onOpen(e)}
                    className={cn("absolute overflow-hidden rounded-[2px] border px-1 py-0.5 text-left text-xs leading-tight", KIND_STYLE[e.kind])}
                    style={{
                      top: p.top * height,
                      height: Math.max(18, p.height * height - 1),
                      left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / p.lanes}% - 4px)`,
                    }}
                  >
                    <span className="block truncate font-medium">
                      <span className="font-mono tabular-nums">{clock(e.start)}</span> {e.customerName ?? e.title}
                    </span>
                    <span className="block truncate">{[e.customerName ? e.title : null, other, KIND_WORD[e.kind]].filter(Boolean).join(" · ")}</span>
                  </button>
                );
              })}
              {nowTop != null ? <div aria-hidden className="pointer-events-none absolute inset-x-0 border-t-2 border-[var(--kiosk-highlight,#A55237)]" style={{ top: nowTop }} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntryDialog({
  entry,
  staffName,
  placeName,
  onClose,
}: {
  entry: CalendarEntry;
  staffName: string | null;
  placeName: string | null;
  onClose: () => void;
}) {
  const visit = entry.ticketId != null;
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry.customerName ?? entry.title}</DialogTitle>
          <DialogDescription>
            {KIND_WORD[entry.kind]}
            {entry.ticketNumber != null ? ` · visit #${entry.ticketNumber}` : ""}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-1 text-sm">
          {entry.customerName ? <Row label="What" value={entry.title} /> : null}
          <Row label="When" value={`${dayName(dayOf(entry.start), true)}, ${clock(entry.start)} to ${clock(entry.end)}`} />
          {staffName ? <Row label="Who" value={staffName} /> : null}
          {placeName ? <Row label="Where" value={placeName} /> : null}
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {visit && entry.kind === "BOOKED" ? (
            <Button asChild>
              <Link href={APP_ROUTES.servicesAppointments}>Open bookings</Link>
            </Button>
          ) : null}
          {visit && entry.kind === "IN_SERVICE" ? (
            <Button asChild>
              <Link href={APP_ROUTES.servicesSell}>Open the visit</Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={dashboardHintClass()}>{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

/** A day off, leave or a long break. While it lasts the person cannot be booked. */
function TimeOffDialog({ calendar, date, onClose }: { calendar: ServiceCalendar; date: string; onClose: () => void }) {
  const [staffId, setStaffId] = useState(calendar.staff.length === 1 ? calendar.staff[0]!.id : "");
  const [fromDay, setFromDay] = useState(date);
  const [fromTime, setFromTime] = useState("08:00");
  const [toDay, setToDay] = useState(date);
  const [toTime, setToTime] = useState("20:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const existing = calendar.entries.filter((e) => e.kind === "TIME_OFF");

  async function run(action: () => Promise<void>, ok: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setDone(ok);
    } catch (err) {
      const payload = err instanceof ApiRequestError ? (err.payload as { detail?: unknown } | null) : null;
      setError(payload && typeof payload.detail === "string" ? payload.detail : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Time off</DialogTitle>
          <DialogDescription>A day off, leave or a long break. Nobody can book them for that time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Who</span>
            <select className={dashboardSelectClass()} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Choose…</option>
              {calendar.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>From</span>
              <input type="date" className={dashboardInputClass(false)} value={fromDay} onChange={(e) => setFromDay(e.target.value)} />
              <input type="time" aria-label="From time" className={dashboardInputClass(false)} value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Until</span>
              <input type="date" className={dashboardInputClass(false)} value={toDay} min={fromDay} onChange={(e) => setToDay(e.target.value)} />
              <input type="time" aria-label="Until time" className={dashboardInputClass(false)} value={toTime} onChange={(e) => setToTime(e.target.value)} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Reason (optional)</span>
            <input className={dashboardInputClass(false)} maxLength={40} placeholder="Day off" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {existing.length > 0 ? (
            <div>
              <p className={dashboardLabelClass()}>Already off in this view</p>
              <ul className="mt-1 divide-y text-sm">
                {existing.map((e) => (
                  <li key={`${e.staffProfileId}-${e.start}`} className="flex items-center justify-between gap-2 py-1">
                    <span>
                      {calendar.staff.find((s) => s.id === e.staffProfileId)?.name ?? "Staff"} · {dayName(dayOf(e.start))} {clock(e.start)} to{" "}
                      {dayName(dayOf(e.end))} {clock(e.end)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || !e.staffProfileId}
                      onClick={() => void run(() => removeStaffTimeOff(e.staffProfileId!, e.start), "Removed. Close to see the calendar.")}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {done ? (
            <p role="status" className="text-sm">
              {done}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (!staffId) return setError("Choose who is off");
              const from = nairobiInstant(fromDay, fromTime);
              const to = nairobiInstant(toDay, toTime);
              if (!(new Date(to).getTime() > new Date(from).getTime())) return setError("The end must be after the start");
              void run(() => addStaffTimeOff(staffId, { from, to, reason: reason.trim() || "Off" }), "Saved. Close to see the calendar.");
            }}
          >
            {busy ? "Saving…" : "Save time off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

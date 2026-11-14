"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import {
  BOOKING_DAY_KEYS,
  bookAppointment,
  cancelServiceTicket,
  fetchAppointments,
  fetchBookingHours,
  fetchServicePerformers,
  fetchServices,
  markAppointmentArrived,
  markAppointmentNoShow,
  nairobiToday,
  rescheduleAppointment,
  setBookingHours,
  takeTicketDeposit,
  type BookingDayKey,
  type BookingHours,
  type ServicePerformerRecord,
  type ServiceRecord,
  type ServiceTicketRecord,
} from "@/lib/service-business-api";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";
import { cn } from "@/lib/utils";

import { findOrCreateCustomer } from "../../floor/_components/floor-board";

const kes = (n: number) => formatMoney(n, "KES");
const DAY_NAMES: Record<BookingDayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function message(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const payload = err.payload as { detail?: unknown } | null;
    if (payload && typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  }
  return fallback;
}

/** A Nairobi wall-clock date and time as an instant. Nairobi is UTC+3 all year. */
export function nairobiInstant(date: string, time: string): string {
  return new Date(`${date}T${time}:00+03:00`).toISOString();
}

function nairobiTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return nairobiToday(d);
}

function dayTitle(date: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00+03:00`));
}

/** The booking book: one day at a time, earliest first. Every change is a tap on a button. */
export function AppointmentsWorkspace() {
  const { branchId } = useDashboard();
  const [date, setDate] = useState(() => nairobiToday());
  const [rows, setRows] = useState<ServiceTicketRecord[] | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [performers, setPerformers] = useState<ServicePerformerRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [moving, setMoving] = useState<ServiceTicketRecord | null>(null);
  const [depositFor, setDepositFor] = useState<ServiceTicketRecord | null>(null);
  const [hoursOpen, setHoursOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!branchId) return;
    try {
      setRows(await fetchAppointments(branchId, nairobiInstant(date, "00:00"), nairobiInstant(addDays(date, 1), "00:00")));
      setLoadError(null);
    } catch {
      setLoadError("Could not load the bookings. Check your connection.");
    }
  }, [branchId, date]);

  useEffect(() => {
    setRows(null);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void fetchServices({ active: true }).then(setServices).catch(() => setServices([]));
    void fetchServicePerformers().then(setPerformers).catch(() => setPerformers([]));
  }, []);

  const run = useCallback(
    async (id: string, action: () => Promise<unknown>, failure: string) => {
      setBusy(id);
      setNotice(null);
      try {
        await action();
      } catch (err) {
        setNotice(message(err, failure));
      } finally {
        setBusy(null);
        await refresh();
      }
    },
    [refresh],
  );

  const upcoming = useMemo(() => (rows ?? []).filter((r) => r.stage === "BOOKED" && r.status === "pending"), [rows]);
  const past = useMemo(() => (rows ?? []).filter((r) => !(r.stage === "BOOKED" && r.status === "pending")), [rows]);

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Choose a branch</p>
          <p className={dashboardHintClass()}>Pick a branch at the top of the page to see its bookings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero icon={CalendarDays} title="Bookings" description="Who is coming, when, and with whom.">
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setHoursOpen(true)}>
            Online booking
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={APP_ROUTES.servicesFloor}>Floor</Link>
          </Button>
          <Button size="sm" onClick={() => setBooking(true)}>
            New booking
          </Button>
        </div>
      </DashboardPageHero>

      <div className={cn(DASHBOARD_SECTION_SURFACE, "flex flex-wrap items-center gap-2")}>
        <Button size="sm" variant="outline" onClick={() => setDate((d) => addDays(d, -1))}>
          Day before
        </Button>
        <input
          type="date"
          aria-label="Day"
          className={dashboardInputClass(false, "w-auto")}
          value={date}
          onChange={(e) => (e.target.value ? setDate(e.target.value) : undefined)}
        />
        <Button size="sm" variant="outline" onClick={() => setDate((d) => addDays(d, 1))}>
          Day after
        </Button>
        {date !== nairobiToday() ? (
          <Button size="sm" variant="ghost" onClick={() => setDate(nairobiToday())}>
            Today
          </Button>
        ) : null}
        <p className="text-sm font-medium">{dayTitle(date)}</p>
      </div>

      {notice ? (
        <p role="alert" className={cn(DASHBOARD_SECTION_SURFACE, "text-sm text-red-700")}>
          {notice}
        </p>
      ) : null}

      {loadError && !rows ? (
        <DashboardLoadError title="Bookings" message={loadError} onRetry={() => void refresh()} />
      ) : !rows ? (
        <DashboardLoading label="Loading bookings…" />
      ) : (
        <>
          <section className={DASHBOARD_SECTION_SURFACE} aria-label="Expected">
            <h2 className={dashboardLabelClass()}>Expected ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className={cn("mt-2", dashboardHintClass())}>No one is booked for this day.</p>
            ) : (
              <ul className="mt-1 divide-y">
                {upcoming.map((row) => (
                  <li key={row.id} className="grid gap-1.5 py-2 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center">
                    <p className="font-mono text-sm font-semibold tabular-nums">{nairobiTime(row.scheduledStart)}</p>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.bookingName ?? "Customer"} · {row.staffName ?? "Staff"}
                      </p>
                      <p className={dashboardHintClass()}>
                        {row.lines.map((l) => l.name).join(", ")} · {kes(row.total)}
                        {row.bookingPhone ? ` · ${row.bookingPhone}` : ""}
                        {row.depositState === "HELD" && row.depositAmount ? ` · deposit ${kes(row.depositAmount)}` : ""}
                        {row.sendReminder ? " · reminder on" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        disabled={busy === row.id}
                        onClick={() => void run(row.id, () => markAppointmentArrived(row.id), "Could not update the booking.")}
                      >
                        Arrived
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => setMoving(row)}>
                        Move
                      </Button>
                      {row.depositState == null && row.customerId ? (
                        <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => setDepositFor(row)}>
                          Deposit
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === row.id}
                        onClick={() => {
                          const held = row.depositState === "HELD" && row.depositAmount ? row.depositAmount : 0;
                          if (!window.confirm(`${row.bookingName ?? "The customer"} did not come?`)) return;
                          const keep =
                            held > 0
                              ? window.confirm(
                                  `They paid a deposit of ${kes(held)}. OK: keep it as credit for their next visit. Cancel: the shop keeps it.`,
                                )
                              : false;
                          void run(row.id, () => markAppointmentNoShow(row.id, keep), "Could not update the booking.");
                        }}
                      >
                        Did not come
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === row.id}
                        onClick={() => {
                          if (!window.confirm(`Cancel the booking for ${row.bookingName ?? "this customer"}?`)) return;
                          void run(
                            row.id,
                            () => cancelServiceTicket(row.id, { reason: "Booking cancelled" }),
                            "Could not cancel the booking.",
                          );
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 ? (
            <section className={DASHBOARD_SECTION_SURFACE} aria-label="Already dealt with">
              <h2 className={dashboardLabelClass()}>Already dealt with ({past.length})</h2>
              <ul className="mt-1 divide-y">
                {past.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm">
                    <span className="font-mono tabular-nums">{nairobiTime(row.scheduledStart)}</span>
                    <span className="font-medium">{row.bookingName ?? "Customer"}</span>
                    <span className={dashboardHintClass()}>
                      {row.stage === "NO_SHOW"
                        ? "Did not come"
                        : row.status === "cancelled"
                          ? "Cancelled"
                          : row.status === "completed"
                            ? "Paid"
                            : "On the floor"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {booking ? (
        <BookingDialog
          branchId={branchId}
          date={date}
          services={services}
          performers={performers}
          onClose={() => setBooking(false)}
          onDone={async () => {
            setBooking(false);
            await refresh();
          }}
        />
      ) : null}
      {moving ? (
        <MoveDialog
          row={moving}
          date={date}
          performers={performers}
          onClose={() => setMoving(null)}
          onDone={async () => {
            setMoving(null);
            await refresh();
          }}
        />
      ) : null}
      {depositFor ? (
        <DepositDialog
          row={depositFor}
          onClose={() => setDepositFor(null)}
          onDone={async () => {
            setDepositFor(null);
            await refresh();
          }}
        />
      ) : null}
      {hoursOpen ? <OnlineBookingDialog branchId={branchId} onClose={() => setHoursOpen(false)} /> : null}
    </div>
  );
}

export function BookingDialog({
  branchId,
  date,
  services,
  performers,
  resources = [],
  initial,
  onClose,
  onDone,
}: {
  branchId: string;
  date: string;
  services: ServiceRecord[];
  performers: ServicePerformerRecord[];
  /** Chairs, beds and rooms that can be held for the booking; none means the choice is not offered. */
  resources?: { id: string; name: string }[];
  /** What the calendar already knows from where it was tapped. */
  initial?: { time?: string; staffProfileId?: string; resourceId?: string };
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [resourceId, setResourceId] = useState(initial?.resourceId ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState(
    initial?.staffProfileId ?? (performers.length === 1 ? performers[0]!.staffProfileId : ""),
  );
  const [day, setDay] = useState(date);
  const [time, setTime] = useState(initial?.time ?? "");
  const [remind, setRemind] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One id per booking: a retry after a dropped connection books nobody twice.
  const clientIdRef = useRef<string>(nextIdempotencyKey());

  async function save() {
    if (name.trim().length < 2) return setError("Enter the customer's name");
    if (!serviceId) return setError("Choose a service");
    if (!staffId) return setError("Choose who they are booked with");
    if (!day || !time) return setError("Choose a day and a time");
    setError(null);
    setSaving(true);
    try {
      // A phone number makes them a customer of the shop, so a deposit can be held in their name.
      const customerId = phone.trim() ? await findOrCreateCustomer(phone, name) : null;
      await bookAppointment({
        branchId,
        clientTicketId: clientIdRef.current,
        staffProfileId: staffId,
        start: nairobiInstant(day, time),
        lines: [{ serviceId }],
        customerId,
        name: name.trim(),
        phone: phone.trim() || null,
        sendReminder: remind && phone.trim().length > 0,
        resourceId: resourceId || null,
      });
      await onDone();
    } catch (err) {
      setError(message(err, "Could not save the booking. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>Nobody can be booked twice for the same time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Name</span>
              <input className={dashboardInputClass(false)} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Phone (optional)</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="tel"
                autoComplete="off"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9+ ]/g, ""))}
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Service</span>
            <select className={dashboardSelectClass()} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Choose…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.durationMinutes} min
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>With</span>
            <select className={dashboardSelectClass()} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Choose…</option>
              {performers.map((p) => (
                <option key={p.staffProfileId} value={p.staffProfileId}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </label>
          {resources.length > 0 ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Where (optional)</span>
              <select className={dashboardSelectClass()} value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                <option value="">No particular place</option>
                {resources.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Day</span>
              <input type="date" className={dashboardInputClass(false)} value={day} min={nairobiToday()} onChange={(e) => setDay(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Time</span>
              <input type="time" step={900} className={dashboardInputClass(false)} value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={remind}
              disabled={!phone.trim()}
              onChange={(e) => setRemind(e.target.checked)}
            />
            <span>
              Text them a reminder about two hours before
              <span className={cn("block", dashboardHintClass())}>Uses one of your SMS credits. Needs a phone number.</span>
            </span>
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  row,
  date,
  performers,
  onClose,
  onDone,
}: {
  row: ServiceTicketRecord;
  date: string;
  performers: ServicePerformerRecord[];
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [day, setDay] = useState(date);
  const [time, setTime] = useState("");
  const [staffId, setStaffId] = useState(row.staffProfileId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!day || !time) return setError("Choose a day and a time");
    setError(null);
    setSaving(true);
    try {
      await rescheduleAppointment(row.id, {
        start: nairobiInstant(day, time),
        ...(staffId && staffId !== row.staffProfileId ? { staffProfileId: staffId } : {}),
      });
      await onDone();
    } catch (err) {
      setError(message(err, "Could not move the booking. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move the booking</DialogTitle>
          <DialogDescription>
            {row.bookingName ?? "Customer"} · now {nairobiTime(row.scheduledStart)} with {row.staffName ?? "staff"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Day</span>
              <input type="date" className={dashboardInputClass(false)} value={day} min={nairobiToday()} onChange={(e) => setDay(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Time</span>
              <input type="time" step={900} className={dashboardInputClass(false)} value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>With</span>
            <select className={dashboardSelectClass()} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {performers.map((p) => (
                <option key={p.staffProfileId} value={p.staffProfileId}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepositDialog({
  row,
  onClose,
  onDone,
}: {
  row: ServiceTicketRecord;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "mpesa_manual">("mpesa_manual");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const value = parseMoney(amount);

  async function save() {
    if (value == null || !(value > 0)) return setError("Enter the deposit");
    setError(null);
    setSaving(true);
    try {
      await takeTicketDeposit(row.id, {
        amount: value,
        method,
        ...(method === "mpesa_manual" && reference.trim() ? { reference: reference.trim().toUpperCase() } : {}),
      });
      await onDone();
    } catch (err) {
      setError(message(err, "The deposit was not recorded. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take a deposit</DialogTitle>
          <DialogDescription>
            {row.bookingName ?? "Customer"} · {nairobiTime(row.scheduledStart)} · {kes(row.total)}. It comes off the bill when
            they pay.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Deposit</span>
            <input
              className={dashboardInputClass(false, "font-mono")}
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(cleanMoneyText(e.target.value));
                setError(null);
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["mpesa_manual", "cash"] as const).map((m) => (
              <Button key={m} variant={method === m ? "default" : "outline"} aria-pressed={method === m} onClick={() => setMethod(m)}>
                {m === "cash" ? "Cash" : "M-Pesa"}
              </Button>
            ))}
          </div>
          {method === "mpesa_manual" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>M-Pesa code (optional)</span>
              <input
                className={dashboardInputClass(false, "font-mono uppercase")}
                value={reference}
                maxLength={20}
                onChange={(e) => setReference(e.target.value)}
              />
              <span className={dashboardHintClass()}>Check the payment on your phone before you confirm.</span>
            </label>
          ) : (
            <p className={dashboardHintClass()}>Cash goes into the drawer of the open shift.</p>
          )}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Recording…" : value != null && value > 0 ? `Take ${kes(value)}` : "Take deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Opening hours for booking by customers themselves. No days ticked means online booking is off. */
function OnlineBookingDialog({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const [hours, setHours] = useState<BookingHours | null>(null);
  const [days, setDays] = useState<BookingHours["days"]>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetchBookingHours(branchId)
      .then((h) => {
        setHours(h);
        setDays(h.days ?? {});
      })
      .catch(() => setError("Could not load the hours."));
  }, [branchId]);

  async function save() {
    for (const key of BOOKING_DAY_KEYS) {
      const d = days[key];
      if (d && !(d.close > d.open)) return setError(`${DAY_NAMES[key]}: closing must be after opening`);
    }
    setError(null);
    setSaving(true);
    try {
      const next = await setBookingHours(branchId, days);
      setHours(next);
      setSaved(true);
    } catch (err) {
      setError(message(err, "Could not save. Only a manager can change online booking."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Online booking</DialogTitle>
          <DialogDescription>
            Tick the days customers may book for themselves on your shop page, at /shop/book. Untick every day to switch it
            off.
          </DialogDescription>
        </DialogHeader>
        {!hours && !error ? (
          <p className="text-sm">Loading…</p>
        ) : (
          <div className="grid gap-2">
            {BOOKING_DAY_KEYS.map((key) => {
              const d = days[key];
              return (
                <div key={key} className="grid grid-cols-[8rem_1fr_1fr] items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(d)}
                      onChange={(e) => {
                        setSaved(false);
                        setDays((prev) => {
                          const next = { ...prev };
                          if (e.target.checked) next[key] = { open: "08:00", close: "19:00" };
                          else delete next[key];
                          return next;
                        });
                      }}
                    />
                    {DAY_NAMES[key]}
                  </label>
                  <input
                    type="time"
                    aria-label={`${DAY_NAMES[key]} opens`}
                    className={dashboardInputClass(!d)}
                    disabled={!d}
                    value={d?.open ?? ""}
                    onChange={(e) => {
                      setSaved(false);
                      setDays((prev) => ({ ...prev, [key]: { open: e.target.value, close: prev[key]?.close ?? "19:00" } }));
                    }}
                  />
                  <input
                    type="time"
                    aria-label={`${DAY_NAMES[key]} closes`}
                    className={dashboardInputClass(!d)}
                    disabled={!d}
                    value={d?.close ?? ""}
                    onChange={(e) => {
                      setSaved(false);
                      setDays((prev) => ({ ...prev, [key]: { open: prev[key]?.open ?? "08:00", close: e.target.value } }));
                    }}
                  />
                </div>
              );
            })}
            <p className={dashboardHintClass()}>
              Customers choose a service, a person and a free half hour. Their booking appears here like any other; nothing
              is texted to them unless you turn a reminder on.
            </p>
            {saved ? (
              <p role="status" className="text-sm">
                Saved. Online booking is {hours?.online ? "on" : "off"}.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Close
          </Button>
          <Button disabled={saving || !hours} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

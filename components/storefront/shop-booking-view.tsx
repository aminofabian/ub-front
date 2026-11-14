"use client";

import {
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import {
  addDays,
  addMonths,
  bookingCalendarFile,
  clockLabel,
  fetchPublicBookingInfo,
  fetchPublicDays,
  fetchPublicSlots,
  groupByPartOfDay,
  monthGrid,
  monthOf,
  PublicBookingError,
  submitPublicBooking,
  upcomingDays,
  weekdayKey,
  type PublicBookingConfirmation,
  type PublicBookingDay,
  type PublicBookingInfo,
} from "@/lib/public-booking";
import { cn } from "@/lib/utils";

import styles from "./shop-booking.module.css";

/** The server books at most this far ahead; the calendar stops at the same day. */
const DAYS_AHEAD = 60;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Calendar dates are plain strings; noon UTC keeps the label on the right day in any timezone. */
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-KE", { timeZone: "UTC", ...options }).format(
    new Date(`${date}T12:00:00Z`),
  );

const money = (amount: number, currency: string) =>
  formatMoney(amount, currency).replace(/\.00$/, "");

/**
 * The shop's public booking page, dressed in the storefront's own theme: what, who with, a month
 * calendar that shows which days still have room, a time, then a name and phone number. The
 * booking builds up on a ticket stub beside the steps. No account, nothing to pay online.
 */
export function ShopBookingView({
  slug,
  initialInfo,
  embedded = false,
  pick,
}: {
  slug: string;
  /** Already read on the server (the landing page): skips the first request. */
  initialInfo?: PublicBookingInfo | null;
  /** Inside the landing page: no header of its own, and headings one level down. */
  embedded?: boolean;
  /** A service or person chosen elsewhere on the page; `nonce` changes on every choice. */
  pick?: { serviceId?: string; staffId?: string; nonce: number } | null;
}) {
  const [info, setInfo] = useState<PublicBookingInfo | null | undefined>(
    initialInfo ?? undefined,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [month, setMonth] = useState("");
  const [calendar, setCalendar] = useState<Record<
    string,
    PublicBookingDay
  > | null>(null);
  const [calendarFailed, setCalendarFailed] = useState(false);
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [start, setStart] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<PublicBookingConfirmation | null>(null);
  // One id per booking: a retry on a poor connection books nobody twice.
  const requestIdRef = useRef<string>(nextIdempotencyKey());
  const rootClass = cn(styles.root, embedded && styles.rootEmbedded);
  const whenRef = useRef<HTMLElement | null>(null);
  // Bumped to read the calendar again after a booking.
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    const begin = (data: PublicBookingInfo | null) => {
      if (!live) return;
      setInfo(data);
      if (data) {
        if (data.branches.length === 1) setBranchId(data.branches[0]!.id);
        if (data.services.length === 1) setServiceId(data.services[0]!.id);
        setMonth(monthOf(upcomingDays(data.timezone, 1)[0] ?? ""));
      }
    };
    if (initialInfo) {
      begin(initialInfo);
    } else {
      void fetchPublicBookingInfo(slug)
        .then(begin)
        .catch(() => (live ? setLoadFailed(true) : undefined));
    }
    return () => {
      live = false;
    };
  }, [slug, initialInfo]);

  // A tap on the price list or on a person elsewhere on the page starts the booking with it.
  const pickNonce = pick?.nonce;
  useEffect(() => {
    if (!pick || !info) return;
    if (pick.serviceId && info.services.some((s) => s.id === pick.serviceId)) {
      setServiceId(pick.serviceId);
      setStaffId("");
    }
    if (pick.staffId) setStaffId(pick.staffId);
    if (done) {
      // They booked already and are starting another: a new booking, a new id.
      requestIdRef.current = nextIdempotencyKey();
      setDone(null);
      setReload((n) => n + 1);
    }
    setDay("");
    setStart("");
    setError(null);
    // Only a new choice (a new nonce) should run this, not every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickNonce]);

  const timezone = info?.timezone ?? "Africa/Nairobi";
  const today = useMemo(() => upcomingDays(timezone, 1)[0] ?? "", [timezone]);
  const lastDay = today ? addDays(today, DAYS_AHEAD) : "";
  const branch = info?.branches.find((b) => b.id === branchId) ?? null;
  const service = info?.services.find((s) => s.id === serviceId) ?? null;
  const staffChoices = useMemo(() => {
    if (!info || !service) return [];
    return service.staffIds.length === 0
      ? info.staff
      : info.staff.filter((s) => service.staffIds.includes(s.id));
  }, [info, service]);
  const grid = useMemo(() => (month ? monthGrid(month) : []), [month]);

  // The month at a glance: how many times are left on each day, in one request.
  useEffect(() => {
    setCalendar(null);
    setCalendarFailed(false);
    if (!branchId || !serviceId || !month) return;
    let live = true;
    void fetchPublicDays(slug, {
      branchId,
      serviceId,
      staffId: staffId || null,
      from: monthGrid(month)[0]!,
      days: 42,
    })
      .then((rows) => {
        if (!live) return;
        setCalendar(Object.fromEntries(rows.map((row) => [row.date, row])));
        // Nothing chosen yet: land on the soonest day with room, so times show straight away.
        setDay(
          (current) =>
            current ||
            rows.find(
              (row) => row.open && row.free > 0 && monthOf(row.date) === month,
            )?.date ||
            "",
        );
      })
      .catch(() => (live ? setCalendarFailed(true) : undefined));
    return () => {
      live = false;
    };
  }, [slug, branchId, serviceId, staffId, month, reload]);

  useEffect(() => {
    setStart("");
    setSlots(null);
    setSlotsFailed(false);
    if (!branchId || !serviceId || !day) return;
    let live = true;
    void fetchPublicSlots(slug, {
      branchId,
      serviceId,
      staffId: staffId || null,
      date: day,
    })
      .then((rows) => (live ? setSlots(rows) : undefined))
      .catch(() => (live ? setSlotsFailed(true) : undefined));
    return () => {
      live = false;
    };
  }, [slug, branchId, serviceId, staffId, day]);

  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat("en-KE", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  const dayName = (date: string) =>
    date === today
      ? "Today"
      : date === addDays(today, 1)
        ? "Tomorrow"
        : dateLabel(date, { weekday: "long", day: "numeric", month: "long" });

  /** A new service or person changes which days have room: start the day again from the soonest. */
  function chooseAgain() {
    setDay("");
    setStart("");
    setError(null);
    if (today) setMonth(monthOf(today));
  }

  async function book() {
    if (!start) return setError("Choose a time");
    if (name.trim().length < 2) return setError("Enter your name");
    if (phone.replace(/[^0-9]/g, "").length < 9)
      return setError("Enter your phone number");
    setError(null);
    setSaving(true);
    try {
      setDone(
        await submitPublicBooking(slug, {
          branchId,
          serviceId,
          staffId: staffId || null,
          start,
          name: name.trim(),
          phone: phone.trim(),
          requestId: requestIdRef.current,
        }),
      );
    } catch (err) {
      if (err instanceof PublicBookingError && err.status === 409) {
        // The time went while they were typing: show the times that are left.
        setError(err.message);
        setStart("");
        try {
          setSlots(
            await fetchPublicSlots(slug, {
              branchId,
              serviceId,
              staffId: staffId || null,
              date: day,
            }),
          );
        } catch {
          setSlots([]);
        }
      } else if (err instanceof PublicBookingError && err.status === 429) {
        setError("Too many tries from here. Wait a minute and try again.");
      } else if (err instanceof PublicBookingError && err.status === 400) {
        setError(err.message);
      } else {
        setError(
          "We could not reach the shop. Check your connection and try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadFailed) {
    return (
      <div className={rootClass}>
        <div className={cn(styles.sheet, styles.notice)}>
          <p>
            We could not load the booking page. Check your connection and try
            again.
          </p>
          <button
            type="button"
            className={cn(styles.linkButton, "mt-3")}
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (info === undefined) {
    return (
      <div className={rootClass} aria-busy="true">
        <div className={cn(styles.sheet, styles.notice)}>
          <p className={styles.hint}>Opening the booking page…</p>
        </div>
      </div>
    );
  }
  if (info === null || info.services.length === 0) {
    return (
      <div className={rootClass}>
        <div className={cn(styles.sheet, styles.notice)}>
          <h1 className={styles.stepTitle}>Booking</h1>
          <p className="mt-2">
            This shop does not take bookings online. Call or visit to book.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    const file = bookingCalendarFile({
      ...done,
      businessName: info.businessName,
    });
    return (
      <div className={rootClass}>
        <div className={cn(styles.ticket, styles.done)} role="status">
          <div className={styles.ticketTop}>
            <span className={styles.doneMark} aria-hidden>
              <Check className="size-6" />
            </span>
            <h1 className={styles.doneTitle}>
              You are booked, {name.trim().split(/\s+/)[0]}.
            </h1>
            <p className={cn("mt-1", styles.hint)}>
              {info.businessName} is expecting you. You pay at the shop.
            </p>
          </div>
          <div className={styles.tear} aria-hidden />
          <div className={styles.ticketBottom}>
            <h2 className={styles.ticketTitle}>Booking {done.reference}</h2>
            <dl className={styles.ticketRows}>
              <TicketRow label="What" value={done.serviceName} />
              <TicketRow
                label="When"
                value={new Intl.DateTimeFormat("en-KE", {
                  timeZone: timezone,
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }).format(new Date(done.start))}
              />
              <TicketRow label="With" value={done.staffName} />
              <TicketRow label="Where" value={done.branchName} />
            </dl>
            <div className={styles.doneActions}>
              <a
                className={styles.linkButton}
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(file)}`}
                download="booking.ics"
              >
                <CalendarPlus className="size-4" aria-hidden /> Add to my
                calendar
              </a>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  requestIdRef.current = nextIdempotencyKey();
                  setDone(null);
                  setStart("");
                  setDay("");
                  // Ask for the month again: the time just booked is no longer free.
                  setMonth(monthOf(today));
                  setReload((n) => n + 1);
                }}
              >
                Book another
              </button>
            </div>
            <p className={cn("mt-3", styles.hint)}>
              To change or cancel, call {info.businessName}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const todayHours =
    branch?.hours?.[weekdayKey(today)] ??
    (info.branches.length === 1
      ? info.branches[0]!.hours?.[weekdayKey(today)]
      : undefined);
  const knowsHours = Boolean(branch?.hours ?? info.branches[0]?.hours);
  const firstMonth = monthOf(today);
  const lastMonth = monthOf(lastDay);
  const groups = slots ? groupByPartOfDay(slots, timezone) : [];
  const withName = staffId
    ? (staffChoices.find((s) => s.id === staffId)?.name ?? "")
    : "Anyone free";
  const needsBranch = info.branches.length > 1;
  const asksWho = Boolean(service) && staffChoices.length > 1;
  // Steps are numbered as shown: the branch and "who with" steps only appear when there is a choice.
  const numberOf = {
    branch: 1,
    service: needsBranch ? 2 : 1,
    who: needsBranch ? 3 : 2,
    when: (needsBranch ? 2 : 1) + (asksWho ? 2 : 1),
    details: (needsBranch ? 2 : 1) + (asksWho ? 3 : 2),
  };

  return (
    <div className={rootClass}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Book at {info.businessName}</h1>
          <div className={styles.heroFacts}>
            {knowsHours && (branch || !needsBranch) ? (
              <span className={styles.heroFact}>
                <span
                  aria-hidden
                  className={cn(
                    styles.openDot,
                    !todayHours && styles.openDotClosed,
                  )}
                />
                {todayHours
                  ? `Booking today ${clockLabel(todayHours.open)} to ${clockLabel(todayHours.close)}`
                  : "No bookings today"}
              </span>
            ) : null}
            {(branch ?? (needsBranch ? null : info.branches[0]))?.address ? (
              <span className={styles.heroFact}>
                <MapPin className="size-4" aria-hidden />
                {(branch ?? info.branches[0])!.address}
              </span>
            ) : null}
            <span className={styles.heroFact}>
              <Wallet className="size-4" aria-hidden />
              Pay at the shop
            </span>
          </div>
        </div>
        {today ? (
          <div
            className={styles.leaf}
            aria-label={`Today is ${dateLabel(today, { weekday: "long", day: "numeric", month: "long" })}`}
          >
            <div className={styles.leafDay} aria-hidden>
              {dateLabel(today, { weekday: "short" })}
            </div>
            <div className={styles.leafNumber} aria-hidden>
              {Number(today.slice(8))}
            </div>
            <div className={styles.leafMonth} aria-hidden>
              {dateLabel(today, { month: "long" })}
            </div>
          </div>
        ) : null}
      </header>

      <div className={styles.layout}>
        <div className={styles.sheet}>
          {needsBranch ? (
            <Step
              number={numberOf.branch}
              title="Which branch?"
              done={Boolean(branch)}
              choice={branch?.name}
            >
              <div className={styles.people} role="group" aria-label="Branch">
                {info.branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={branchId === b.id}
                    className={cn(
                      styles.person,
                      "pl-3.5",
                      branchId === b.id && styles.personOn,
                    )}
                    onClick={() => {
                      setBranchId(b.id);
                      chooseAgain();
                    }}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </Step>
          ) : null}

          <Step
            number={numberOf.service}
            title="What would you like?"
            done={Boolean(service)}
            choice={service?.name}
          >
            <ul className={styles.services}>
              {info.services.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={serviceId === s.id}
                    className={cn(
                      styles.service,
                      serviceId === s.id && styles.serviceOn,
                    )}
                    onClick={() => {
                      setServiceId(s.id);
                      setStaffId("");
                      chooseAgain();
                      // On a phone the calendar is below the fold: bring it up.
                      window.setTimeout(
                        () =>
                          whenRef.current?.scrollIntoView({
                            block: "nearest",
                            behavior: "smooth",
                          }),
                        60,
                      );
                    }}
                  >
                    <span className={styles.serviceName}>
                      {s.name}
                      {s.description ? (
                        <span className={styles.serviceAbout}>
                          {s.description}
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.serviceMeta}>
                      <span className={styles.hint}>
                        {s.durationMinutes} min
                      </span>
                      <span className={styles.price}>
                        {s.priceIsVariable ? "from " : ""}
                        {money(s.price, info.currency)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Step>

          {asksWho ? (
            <Step
              number={numberOf.who}
              title="Who with?"
              done
              choice={withName}
            >
              <div className={styles.people} role="group" aria-label="Who with">
                <button
                  type="button"
                  aria-pressed={staffId === ""}
                  className={cn(
                    styles.person,
                    staffId === "" && styles.personOn,
                  )}
                  onClick={() => {
                    setStaffId("");
                    chooseAgain();
                  }}
                >
                  <span className={styles.avatar} aria-hidden>
                    <Users className="size-4" />
                  </span>
                  Anyone free
                </button>
                {staffChoices.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={staffId === s.id}
                    className={cn(
                      styles.person,
                      staffId === s.id && styles.personOn,
                    )}
                    onClick={() => {
                      setStaffId(s.id);
                      chooseAgain();
                    }}
                  >
                    <span className={styles.avatar} aria-hidden>
                      {s.name.slice(0, 1).toUpperCase()}
                    </span>
                    {s.name}
                  </button>
                ))}
              </div>
              <p className={cn("mt-2", styles.hint)}>
                &ldquo;Anyone free&rdquo; gives you the most times to choose
                from.
              </p>
            </Step>
          ) : null}

          <Step
            number={numberOf.when}
            title="When?"
            done={Boolean(start)}
            choice={start ? `${dayName(day)}, ${timeLabel(start)}` : undefined}
            sectionRef={whenRef}
          >
            {!service || !branchId ? (
              <p className={styles.hint}>
                {needsBranch && !branchId
                  ? "Choose a branch and what you would like"
                  : "Choose what you would like"}{" "}
                to see the days with room.
              </p>
            ) : (
              <div className={styles.when}>
                <div>
                  <div className={styles.monthBar}>
                    <button
                      type="button"
                      className={styles.monthButton}
                      aria-label="Earlier month"
                      disabled={month <= firstMonth}
                      onClick={() => setMonth(addMonths(month, -1))}
                    >
                      <ChevronLeft className="size-5" aria-hidden />
                    </button>
                    <p className={styles.monthName} aria-live="polite">
                      {dateLabel(`${month}-01`, {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <button
                      type="button"
                      className={styles.monthButton}
                      aria-label="Later month"
                      disabled={month >= lastMonth}
                      onClick={() => setMonth(addMonths(month, 1))}
                    >
                      <ChevronRight className="size-5" aria-hidden />
                    </button>
                  </div>
                  <div className={styles.weekdays} aria-hidden>
                    {WEEKDAYS.map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                  </div>
                  <div
                    className={styles.grid}
                    role="group"
                    aria-label="Choose a day"
                  >
                    {grid.map((date) => {
                      if (monthOf(date) !== month)
                        return (
                          <span
                            key={date}
                            className={styles.dayBlank}
                            aria-hidden
                          />
                        );
                      const cell = calendar?.[date];
                      const free = cell?.open ? cell.free : 0;
                      const full = Boolean(cell?.open) && free === 0;
                      const label = dateLabel(date, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      });
                      return (
                        <button
                          key={date}
                          type="button"
                          disabled={free === 0}
                          aria-pressed={day === date}
                          aria-label={
                            !cell
                              ? label
                              : !cell.open
                                ? `${label}, not open for booking`
                                : full
                                  ? `${label}, fully booked`
                                  : `${label}, ${free} ${free === 1 ? "time" : "times"} free`
                          }
                          className={cn(
                            styles.day,
                            full && styles.dayFull,
                            date === today && styles.dayToday,
                            day === date && styles.dayOn,
                          )}
                          onClick={() => {
                            setDay(date);
                            setError(null);
                          }}
                        >
                          {Number(date.slice(8))}
                          <span className={styles.pips} aria-hidden>
                            {Array.from(
                              {
                                length:
                                  free >= 8
                                    ? 3
                                    : free >= 3
                                      ? 2
                                      : free >= 1
                                        ? 1
                                        : 0,
                              },
                              (_, i) => (
                                <span key={i} className={styles.pip} />
                              ),
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {calendarFailed ? (
                    <p className={cn("mt-2", styles.problem)}>
                      We could not load the calendar. Check your connection and
                      choose the month again.
                    </p>
                  ) : calendar === null ? (
                    <p className={cn("mt-2", styles.hint)}>
                      Checking which days have room…
                    </p>
                  ) : (
                    <p className={styles.legend}>
                      <span className={styles.legendItem}>
                        <span className={styles.pips} aria-hidden>
                          <span className={styles.pip} />
                          <span className={styles.pip} />
                          <span className={styles.pip} />
                        </span>
                        Plenty of room
                      </span>
                      <span className={styles.legendItem}>
                        <span className={styles.pips} aria-hidden>
                          <span className={styles.pip} />
                        </span>
                        Nearly full
                      </span>
                      <span className={styles.legendItem}>
                        <s>12</s> Full
                      </span>
                    </p>
                  )}
                </div>

                <div className={styles.whenTimes}>
                  {!day ? (
                    <p className={styles.hint}>
                      {calendar &&
                      !Object.values(calendar).some(
                        (c) =>
                          c.open && c.free > 0 && monthOf(c.date) === month,
                      )
                        ? "Nothing is free this month. Try the next one."
                        : "Choose a day to see the times."}
                    </p>
                  ) : (
                    <>
                      <h3 className={styles.dayHeading}>{dayName(day)}</h3>
                      {slotsFailed ? (
                        <p className={cn("mt-2", styles.problem)}>
                          We could not load the times. Check your connection and
                          choose the day again.
                        </p>
                      ) : slots === null ? (
                        <p className={cn("mt-2", styles.hint)}>
                          Looking for free times…
                        </p>
                      ) : slots.length === 0 ? (
                        <p className="mt-2">
                          Nothing is free on this day. Try another day.
                        </p>
                      ) : (
                        groups.map((group) => (
                          <div key={group.part} className={styles.part}>
                            <p className={styles.partName}>{group.part}</p>
                            <div
                              className={styles.times}
                              role="group"
                              aria-label={`${group.part} times`}
                            >
                              {group.starts.map((iso) => (
                                <button
                                  key={iso}
                                  type="button"
                                  aria-pressed={start === iso}
                                  className={cn(
                                    styles.time,
                                    start === iso && styles.timeOn,
                                  )}
                                  onClick={() => {
                                    setStart(iso);
                                    setError(null);
                                  }}
                                >
                                  {timeLabel(iso)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </Step>

          <Step
            number={numberOf.details}
            title="Your details"
            done={
              name.trim().length >= 2 &&
              phone.replace(/[^0-9]/g, "").length >= 9
            }
          >
            <div className={styles.fields}>
              <label className={styles.field}>
                Your name
                <input
                  className={styles.input}
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                Your phone number
                <input
                  className={styles.input}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="07…"
                  maxLength={20}
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/[^0-9+ ]/g, ""))
                  }
                />
              </label>
            </div>
            <p className={cn("mt-2", styles.hint)}>
              Only so the shop can reach you about this booking.
            </p>
          </Step>
        </div>

        <aside className={styles.aside} aria-label="Your booking">
          <div className={styles.ticket}>
            <div className={styles.ticketTop}>
              <h2 className={styles.ticketTitle}>Your booking</h2>
              <dl className={styles.ticketRows}>
                <TicketRow
                  label="What"
                  value={service?.name}
                  empty="Not chosen yet"
                />
                {service && staffChoices.length > 1 ? (
                  <TicketRow label="With" value={withName} />
                ) : null}
                <TicketRow
                  label="Day"
                  value={day && service ? dayName(day) : undefined}
                  empty="Not chosen yet"
                />
                <TicketRow
                  label="Time"
                  value={
                    start && service
                      ? `${timeLabel(start)} · ${service.durationMinutes} min`
                      : undefined
                  }
                  empty="Not chosen yet"
                />
                {branch || !needsBranch ? (
                  <TicketRow
                    label="Where"
                    value={(branch ?? info.branches[0])!.name}
                  />
                ) : null}
              </dl>
            </div>
            <div className={styles.tear} aria-hidden />
            <div className={styles.ticketBottom}>
              <div className={styles.total}>
                <span className={styles.hint}>
                  {service?.priceIsVariable ? "From" : "To pay at the shop"}
                </span>
                <span className={styles.totalAmount}>
                  {service ? money(service.price, info.currency) : "—"}
                </span>
              </div>
              {error ? (
                <p role="alert" className={cn("mt-2", styles.problem)}>
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.book}
                disabled={saving || !start}
                onClick={() => void book()}
              >
                {saving
                  ? "Booking…"
                  : start
                    ? `Book ${timeLabel(start)}`
                    : !service
                      ? "Choose a service"
                      : "Choose a time"}
              </button>
              <p className={cn("mt-2 text-center", styles.hint)}>
                Nothing to pay now. No account needed.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  done,
  choice,
  sectionRef,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  /** What was chosen, shown at the right of the heading. */
  choice?: string;
  sectionRef?: React.Ref<HTMLElement>;
  children: React.ReactNode;
}) {
  return (
    <section ref={sectionRef} className={styles.step}>
      <div className={styles.stepHead}>
        <span
          className={cn(styles.stepNumber, done && styles.stepNumberDone)}
          aria-hidden
        >
          {done ? <Check className="size-4" /> : number}
        </span>
        <h2 className={styles.stepTitle}>{title}</h2>
        {choice ? <span className={styles.stepChoice}>{choice}</span> : null}
      </div>
      <div className={styles.stepBody}>{children}</div>
    </section>
  );
}

function TicketRow({
  label,
  value,
  empty,
}: {
  label: string;
  value?: string;
  empty?: string;
}) {
  return (
    <div className={styles.ticketRow}>
      <dt>{label}</dt>
      <dd className={cn(!value && styles.ticketEmpty)}>{value || empty}</dd>
    </div>
  );
}

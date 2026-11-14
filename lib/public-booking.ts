import { apiUrl } from "./config";

/**
 * Client for the shop's public booking page (`/api/v1/public/businesses/{slug}/booking`).
 * Nobody is signed in: the shop comes from the slug, and the server limits and checks every call.
 */

export type PublicBookingInfo = {
  businessName: string;
  timezone: string;
  currency: string;
  branches: {
    id: string;
    name: string;
    address: string | null;
    /** When customers may book here, by weekday key (mon..sun); a day left out is closed. */
    hours?: Record<string, { open: string; close: string }>;
  }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: number;
    priceIsVariable: boolean;
    /** Who can be booked for it; empty means anyone on the staff list. */
    staffIds: string[];
  }[];
  staff: { id: string; name: string }[];
};

export type PublicBookingConfirmation = {
  reference: string;
  serviceName: string;
  staffName: string;
  start: string;
  end: string;
  branchName: string;
};

/** Carries the HTTP status so the page can tell "that time has gone" from a real fault. */
export class PublicBookingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PublicBookingError";
  }
}

function base(slug: string): string {
  return apiUrl(`/api/v1/public/businesses/${encodeURIComponent(slug.trim())}/booking`);
}

async function read<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let detail = "";
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
  } catch {
    // No readable body; the status is enough.
  }
  throw new PublicBookingError(detail || "Something went wrong. Try again.", res.status);
}

/** Null when the shop does not take bookings online. */
export async function fetchPublicBookingInfo(slug: string): Promise<PublicBookingInfo | null> {
  const res = await fetch(base(slug), { headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  return read<PublicBookingInfo>(res);
}

export async function fetchPublicSlots(
  slug: string,
  query: { branchId: string; serviceId: string; staffId?: string | null; date: string },
): Promise<string[]> {
  const params = new URLSearchParams({ branchId: query.branchId, serviceId: query.serviceId, date: query.date });
  if (query.staffId) params.set("staffId", query.staffId);
  const res = await fetch(`${base(slug)}/slots?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return (await read<{ starts: string[] }>(res)).starts;
}

export type PublicBookingDay = { date: string; open: boolean; free: number };

/** Up to six weeks of the calendar from `from`, with the free start times counted per day. */
export async function fetchPublicDays(
  slug: string,
  query: { branchId: string; serviceId: string; staffId?: string | null; from: string; days?: number },
): Promise<PublicBookingDay[]> {
  const params = new URLSearchParams({
    branchId: query.branchId,
    serviceId: query.serviceId,
    from: query.from,
    days: String(query.days ?? 42),
  });
  if (query.staffId) params.set("staffId", query.staffId);
  const res = await fetch(`${base(slug)}/days?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return (await read<{ days: PublicBookingDay[] }>(res)).days;
}

/** `requestId` is made once per booking and reused on retry, so a retry books nobody twice. */
export async function submitPublicBooking(
  slug: string,
  body: {
    branchId: string;
    serviceId: string;
    staffId?: string | null;
    start: string;
    name: string;
    phone: string;
    requestId: string;
  },
): Promise<PublicBookingConfirmation> {
  const res = await fetch(`${base(slug)}/appointments`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return read<PublicBookingConfirmation>(res);
}

/** The next `count` days from today in the shop's timezone, as YYYY-MM-DD. */
export function upcomingDays(timezone: string, count: number, now: Date = new Date()): string[] {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(format.format(new Date(now.getTime() + i * 86400000)));
  }
  // A daylight-saving shift could repeat a day; Kenya has none, but keep the list honest anywhere.
  return out.filter((day, index) => out.indexOf(day) === index);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Calendar dates are plain YYYY-MM-DD strings; arithmetic is done at noon UTC so no timezone can shift a day. */
export function addDays(date: string, count: number): string {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + count);
  return at.toISOString().slice(0, 10);
}

/** "2026-11" for a date, and the month `count` months away from one. */
export const monthOf = (date: string): string => date.slice(0, 7);

export function addMonths(month: string, count: number): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const index = year * 12 + (m - 1) + count;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/**
 * The six weeks a month is drawn in, Monday first (the week as Kenyan calendars print it):
 * 42 dates starting on the Monday on or before the 1st.
 */
export function monthGrid(month: string): string[] {
  const first = `${month}-01`;
  // getUTCDay: Sunday 0 … Saturday 6; shift so Monday is 0.
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** The weekday key the shop's hours are stored under ("mon" … "sun"). */
export function weekdayKey(date: string): string {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(`${date}T12:00:00Z`).getUTCDay()]!;
}

export type PartOfDay = "Morning" | "Afternoon" | "Evening";

/** Start times grouped the way people ask for them, by the clock in the shop's timezone. */
export function groupByPartOfDay(starts: readonly string[], timezone: string): { part: PartOfDay; starts: string[] }[] {
  const hourIn = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" });
  const groups: Record<PartOfDay, string[]> = { Morning: [], Afternoon: [], Evening: [] };
  for (const iso of starts) {
    const hour = Number(hourIn.format(new Date(iso)));
    groups[hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"].push(iso);
  }
  return (["Morning", "Afternoon", "Evening"] as const)
    .map((part) => ({ part, starts: groups[part] }))
    .filter((group) => group.starts.length > 0);
}

/** "8:00 am" from the "08:00" the shop's hours are stored as. */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return `${h % 12 === 0 ? 12 : h % 12}:${pad2(m)} ${h < 12 ? "am" : "pm"}`;
}

/** A calendar file for the booking, so the customer can put it in their phone. Text is escaped as RFC 5545 asks. */
export function bookingCalendarFile(booking: {
  reference: string;
  serviceName: string;
  staffName: string;
  start: string;
  end: string;
  branchName: string;
  businessName: string;
}): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const text = (value: string) => value.replace(/\\/g, "\\\\").replace(/([;,])/g, "\\$1").replace(/\r?\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kiosk//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${text(`${booking.reference}-${stamp(booking.start)}`)}@kiosk.ke`,
    `DTSTAMP:${stamp(booking.start)}`,
    `DTSTART:${stamp(booking.start)}`,
    `DTEND:${stamp(booking.end)}`,
    `SUMMARY:${text(`${booking.serviceName} at ${booking.businessName}`)}`,
    `DESCRIPTION:${text(`With ${booking.staffName}. Booking ${booking.reference}.`)}`,
    `LOCATION:${text(booking.branchName)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

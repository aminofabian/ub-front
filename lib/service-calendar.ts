import { apiRequest } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";

/**
 * The calendar of a service branch: bookings, services under way and done, staff time off and
 * resources out of use, laid out by person or by place.
 */

export type CalendarKind = "BOOKED" | "IN_SERVICE" | "DONE" | "NO_SHOW" | "TIME_OFF" | "BLOCKED";

export type CalendarEntry = {
  kind: CalendarKind;
  ticketId: string | null;
  ticketNumber: number | null;
  title: string;
  customerName: string | null;
  staffProfileId: string | null;
  resourceId: string | null;
  start: string;
  end: string;
};

export type ServiceCalendar = {
  branchId: string;
  from: string;
  to: string;
  staff: { id: string; name: string }[];
  resources: { id: string; name: string }[];
  entries: CalendarEntry[];
};

export async function fetchServiceCalendar(branchId: string, fromIso: string, toIso: string): Promise<ServiceCalendar> {
  const params = new URLSearchParams({ branchId, from: fromIso, to: toIso });
  return apiRequest<ServiceCalendar>(`${API_ROUTES.serviceTickets}/calendar?${params.toString()}`, { toast: false });
}

/** A day off, leave or a long break: the person cannot be booked for that time. */
export async function addStaffTimeOff(staffProfileId: string, body: { from: string; to: string; reason?: string }): Promise<void> {
  await apiRequest(`${API_ROUTES.serviceTeam}/${encodeURIComponent(staffProfileId)}/time-off`, {
    method: "POST",
    body,
    toast: false,
  });
}

export async function removeStaffTimeOff(staffProfileId: string, fromIso: string): Promise<void> {
  const params = new URLSearchParams({ from: fromIso });
  await apiRequest(`${API_ROUTES.serviceTeam}/${encodeURIComponent(staffProfileId)}/time-off?${params.toString()}`, {
    method: "DELETE",
    toast: false,
  });
}

export type CalendarGroup = "people" | "places";

/** The column an entry belongs to in a grouping; null when it has none (a walk-in with no place). */
export function columnOf(entry: CalendarEntry, group: CalendarGroup): string | null {
  return group === "people" ? entry.staffProfileId : entry.resourceId;
}

export type PlacedEntry = {
  entry: CalendarEntry;
  /** Distance from the top of the day, and height, as a fraction of the shown hours (0..1). */
  top: number;
  height: number;
  /** Which side-by-side lane it sits in when entries in one column overlap, and how many lanes there are. */
  lane: number;
  lanes: number;
};

/**
 * Places one column's entries on a day running from `dayStartMs` to `dayEndMs`. Entries are
 * clipped to the day; ones that overlap in time are put side by side so none hides another.
 */
export function placeEntries(entries: readonly CalendarEntry[], dayStartMs: number, dayEndMs: number): PlacedEntry[] {
  const span = dayEndMs - dayStartMs;
  if (span <= 0) return [];
  const visible = entries
    .map((entry) => ({ entry, start: new Date(entry.start).getTime(), end: new Date(entry.end).getTime() }))
    .filter((e) => e.end > dayStartMs && e.start < dayEndMs && e.end > e.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: (PlacedEntry & { start: number; end: number })[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = -Infinity;
  const closeCluster = () => {
    const lanes = cluster.reduce((max, p) => Math.max(max, p.lane + 1), 0);
    for (const p of cluster) p.lanes = lanes;
    cluster = [];
  };
  for (const e of visible) {
    if (e.start >= clusterEnd) {
      closeCluster();
      clusterEnd = -Infinity;
    }
    // The first lane whose last entry has finished by the time this one starts.
    let lane = 0;
    while (cluster.some((p) => p.lane === lane && p.end > e.start)) lane += 1;
    const from = Math.max(e.start, dayStartMs);
    const to = Math.min(e.end, dayEndMs);
    const item = { entry: e.entry, top: (from - dayStartMs) / span, height: (to - from) / span, lane, lanes: 1, start: e.start, end: e.end };
    cluster.push(item);
    placed.push(item);
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  closeCluster();
  return placed.map(({ entry, top, height, lane, lanes }) => ({ entry, top, height, lane, lanes }));
}

/** First and last hour to show for a day: 07:00–20:00, widened to fit whatever is on it. */
export function hoursToShow(entries: readonly CalendarEntry[], dayStartMs: number): { firstHour: number; lastHour: number } {
  let first = 7;
  let last = 20;
  const dayEnd = dayStartMs + 86400000;
  for (const entry of entries) {
    const start = new Date(entry.start).getTime();
    const end = new Date(entry.end).getTime();
    if (end <= dayStartMs || start >= dayEnd) continue;
    first = Math.min(first, Math.floor((Math.max(start, dayStartMs) - dayStartMs) / 3600000));
    last = Math.max(last, Math.ceil((Math.min(end, dayEnd) - dayStartMs) / 3600000));
  }
  return { firstHour: Math.max(0, first), lastHour: Math.min(24, last) };
}

/** Monday to Sunday of the week holding `date` (YYYY-MM-DD), as YYYY-MM-DD. */
export function weekOf(date: string): string[] {
  const noon = new Date(`${date}T12:00:00Z`);
  const mondayOffset = (noon.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => new Date(noon.getTime() + (i - mondayOffset) * 86400000).toISOString().slice(0, 10));
}

/** A tap at `fraction` of the way down the shown hours, as "HH:mm" rounded to the quarter hour. */
export function timeAtFraction(fraction: number, firstHour: number, lastHour: number): string {
  const minutes = firstHour * 60 + Math.min(1, Math.max(0, fraction)) * (lastHour - firstHour) * 60;
  const rounded = Math.min(23 * 60 + 45, Math.round(minutes / 15) * 15);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

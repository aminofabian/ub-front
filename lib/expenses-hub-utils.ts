/** Period helpers for the Expenses & profit hub (`/expenses`). */

export type ExpensesHubPreset = "all" | "today" | "week" | "month" | "custom";

/** Earliest day the expenses hub treats as “all”. */
export const EXPENSES_HUB_ALL_FROM = "2018-01-01";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function expensesHubPresetRange(
  preset: Exclude<ExpensesHubPreset, "custom">,
  now = new Date(),
): { from: string; to: string } {
  const to = toIsoDate(now);
  if (preset === "all") {
    return { from: EXPENSES_HUB_ALL_FROM, to };
  }
  if (preset === "today") {
    return { from: to, to };
  }
  if (preset === "week") {
    const start = new Date(now);
    const day = start.getDay(); // 0 Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    return { from: toIsoDate(start), to };
  }
  // month
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toIsoDate(from), to };
}

export function monthsOverlappingRange(
  fromIso: string,
  toIso: string,
): { year: number; month: number }[] {
  const from = parseIsoMonth(fromIso);
  const to = parseIsoMonth(toIso);
  if (!from || !to) return [];
  const out: { year: number; month: number }[] = [];
  let y = from.year;
  let m = from.month;
  while (y < to.year || (y === to.year && m <= to.month)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 240) {
      out.shift();
    }
  }
  return out.slice(-36);
}

/** Daily chart window. Long ranges stay on the last 31 days so the strip stays readable. */
export function expensesHubDailyRange(
  fromIso: string,
  toIso: string,
): { from: string; to: string } {
  const end = new Date(`${toIso}T12:00:00`);
  const start = new Date(`${fromIso}T12:00:00`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) {
    return { from: fromIso, to: toIso };
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days <= 45) return { from: fromIso, to: toIso };
  const capped = new Date(end);
  capped.setDate(capped.getDate() - 30);
  return { from: toIsoDate(capped), to: toIso };
}

function parseIsoMonth(iso: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

export function moneyNumber(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

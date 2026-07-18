import { addDays, parseISODate } from "@/lib/analytics-date-range";

import { toNum } from "./formatters";

export type DailyRevenuePoint = {
  day: string;
  value: number;
  label: string;
};

function dayKey(day: string | { toString(): string }): string {
  return String(day).slice(0, 10);
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortDayLabel(isoDay: string): string {
  const date = parseISODate(isoDay);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Build one bar per calendar day in [from, to].
 * Sales register rows are per (day, branch) and omit empty days — this sums
 * branches and fills gaps so the chart is temporally honest.
 */
export function buildDailyRevenueSeries(
  days: Array<{ day: string; revenue: number | string | null | undefined }>,
  from: string,
  to: string,
): DailyRevenuePoint[] {
  const byDay = new Map<string, number>();
  for (const row of days) {
    const key = dayKey(row.day);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    byDay.set(key, (byDay.get(key) ?? 0) + toNum(row.revenue));
  }

  const start = parseISODate(from);
  const end = parseISODate(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const points: DailyRevenuePoint[] = [];
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    const key = toLocalISODate(cursor);
    points.push({
      day: key,
      value: byDay.get(key) ?? 0,
      label: shortDayLabel(key),
    });
    cursor = addDays(cursor, 1);
  }
  return points;
}

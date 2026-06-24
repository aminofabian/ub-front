import { addDays, addMonths, differenceInCalendarDays, format, startOfDay } from "date-fns";

import { parseISODate } from "@/lib/analytics-date-range";

export function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(value: string): Date | null {
  const t = value.trim();
  if (!t) {
    return null;
  }
  const d = parseISODate(t);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function formatYmd(value: string, pattern = "d MMM yyyy"): string {
  const d = parseYmd(value);
  if (!d) {
    return "";
  }
  return format(d, pattern);
}

export function formatYmdCompact(value: string): string {
  return formatYmd(value, "d MMM yy");
}

export function addYmdDays(value: string, days: number): string {
  const base = parseYmd(value) ?? startOfDay(new Date());
  return toYmd(addDays(base, days));
}

export function addYmdMonths(value: string, months: number): string {
  const base = parseYmd(value) ?? startOfDay(new Date());
  return toYmd(addMonths(base, months));
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type ExpiryTone = "empty" | "past" | "urgent" | "soon" | "fresh";

export function expiryTone(value: string): ExpiryTone {
  const d = parseYmd(value);
  if (!d) {
    return "empty";
  }
  const days = differenceInCalendarDays(startOfDay(d), startOfDay(new Date()));
  if (days < 0) {
    return "past";
  }
  if (days <= 7) {
    return "urgent";
  }
  if (days <= 30) {
    return "soon";
  }
  return "fresh";
}

export function expiryToneLabel(tone: ExpiryTone): string | null {
  switch (tone) {
    case "past":
      return "Expired";
    case "urgent":
      return "≤ 1 week";
    case "soon":
      return "≤ 30 days";
    case "fresh":
      return "OK";
    default:
      return null;
  }
}

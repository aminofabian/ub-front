export type DatePreset =
  | "today"
  | "yesterday"
  | "last3"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function diffDays(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDateRangeLabel(from: string, to: string): string {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (from === to) {
    return start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function presetRange(
  preset: DatePreset,
): { from: string; to: string } | null {
  const today = new Date();
  const todayStr = toISODate(today);
  switch (preset) {
    case "today":
      return { from: todayStr, to: todayStr };
    case "yesterday": {
      const y = toISODate(addDays(today, -1));
      return { from: y, to: y };
    }
    case "last3":
      return { from: toISODate(addDays(today, -2)), to: todayStr };
    case "last7":
      return { from: toISODate(addDays(today, -6)), to: todayStr };
    case "last30":
      return { from: toISODate(addDays(today, -29)), to: todayStr };
    case "thisMonth":
      return { from: toISODate(startOfMonth(today)), to: todayStr };
    case "lastMonth": {
      const firstOfThis = startOfMonth(today);
      const lastOfPrev = addDays(firstOfThis, -1);
      const firstOfPrev = startOfMonth(lastOfPrev);
      return { from: toISODate(firstOfPrev), to: toISODate(lastOfPrev) };
    }
    default:
      return null;
  }
}

export function previousPeriod(
  from: string,
  to: string,
): { from: string; to: string } {
  const days = Math.max(1, diffDays(from, to));
  return {
    from: toISODate(addDays(parseISODate(from), -days - 1)),
    to: toISODate(addDays(parseISODate(from), -1)),
  };
}

export const ANALYTICS_PRESET_LABELS: {
  key: DatePreset;
  label: string;
  hint?: string;
}[] = [
  { key: "today", label: "Today", hint: "Live pulse" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "7 days" },
  { key: "last30", label: "30 days" },
  { key: "last3", label: "3 days" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "custom", label: "Custom" },
];

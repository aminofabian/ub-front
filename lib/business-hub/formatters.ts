import { parseISODate } from "@/lib/analytics-date-range";

import type { Period } from "./types";

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function fmtKes(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  return KES.format(v);
}

export function fmtPct(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

export function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-KE");
}

export function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

export function padChartValues(values: number[], size = 12): number[] {
  if (values.length >= size) return values.slice(-size);
  return [...Array(size - values.length).fill(0), ...values];
}

export function fmtTrendPct(current: number, previous: number): string | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    if (current === 0) return null;
    return "+100%";
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

export function formatPeriodSubtitle(
  period: Period,
  from: string,
  to: string,
): string {
  const end = parseISODate(to);
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (period === "today") return `Today, ${endLabel}`;
  const start = parseISODate(from);
  const startLabel = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endShort = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `This week, ${startLabel} – ${endShort}`;
}

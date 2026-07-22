import { formatMoneyCompact } from "@/lib/money";
import { parseISODate } from "@/lib/analytics-date-range";

import type { Period } from "./types";

/** @deprecated Prefer {@link fmtMoney} with an explicit currency. */
export function fmtKes(n: number | string | null | undefined): string {
  return formatMoneyCompact(n, "KES");
}

export function fmtMoney(
  n: number | string | null | undefined,
  currency?: string | null,
): string {
  return formatMoneyCompact(n, currency);
}

export function fmtPct(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

export function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en");
}

export function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

export function fmtTrendPct(current: number, previous: number): string | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    if (current === 0) return null;
    return current > 0 ? "+100%" : "-100%";
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(delta)) return null;
  // Near-zero baselines produce absurd percentages (e.g. +48000%); treat as a step-change.
  if (Math.abs(delta) > 999) {
    return delta > 0 ? ">+999%" : "<-999%";
  }
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

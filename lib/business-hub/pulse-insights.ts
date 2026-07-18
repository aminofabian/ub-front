import type { DailyRevenuePoint } from "./build-daily-revenue-series";
import { fmtKes, fmtTrendPct, toNum } from "./formatters";
import type { Period } from "./types";

export type ChartWindowStats = {
  total: number;
  average: number;
  best: DailyRevenuePoint | null;
  activeDays: number;
};

export function chartWindowStats(points: DailyRevenuePoint[]): ChartWindowStats {
  if (points.length === 0) {
    return { total: 0, average: 0, best: null, activeDays: 0 };
  }
  let total = 0;
  let activeDays = 0;
  let best: DailyRevenuePoint | null = null;
  for (const point of points) {
    total += point.value;
    if (point.value > 0) activeDays += 1;
    if (!best || point.value > best.value) best = point;
  }
  return {
    total,
    average: total / points.length,
    best: best && best.value > 0 ? best : null,
    activeDays,
  };
}

export function averageTicket(
  revenue: number,
  salesCount: number | null | undefined,
): number | null {
  const count = salesCount ?? 0;
  if (count <= 0 || revenue <= 0) return null;
  return revenue / count;
}

/** One plain-language line an owner can read in under two seconds. */
export function buildPulseHeadline(input: {
  period: Period;
  revenue: number;
  prevRevenue: number;
  orders: number | null;
  chartPoints: DailyRevenuePoint[];
  salesEmpty: boolean;
}): string {
  const { period, revenue, prevRevenue, orders, chartPoints, salesEmpty } =
    input;

  if (salesEmpty) {
    return period === "today"
      ? "Quiet so far — the till is waiting for the first sale."
      : "A soft week so far — trends will light up after the next sales.";
  }

  const trend = fmtTrendPct(revenue, prevRevenue);
  const stats = chartWindowStats(chartPoints);
  const parts: string[] = [];

  if (trend) {
    const vs = period === "today" ? "vs yesterday" : "vs last week";
    if (trend.startsWith("-") || trend.startsWith("<-")) {
      parts.push(`${trend} ${vs}`);
    } else {
      parts.push(`${trend} ${vs}`);
    }
  }

  if (orders != null && orders > 0) {
    parts.push(
      period === "today"
        ? `${orders.toLocaleString("en-KE")} sale${orders === 1 ? "" : "s"}`
        : `${orders.toLocaleString("en-KE")} units moved`,
    );
  }

  if (stats.best && period === "week") {
    parts.push(`peak ${stats.best.label} (${fmtKes(stats.best.value)})`);
  } else if (stats.best && period === "today" && stats.activeDays >= 3) {
    parts.push(`strongest day ${stats.best.label}`);
  }

  if (parts.length === 0) {
    return period === "today"
      ? "Live pulse for today."
      : "Seven-day trading snapshot.";
  }

  return parts.join(" · ");
}

export function buildChartCaption(input: {
  period: Period;
  points: DailyRevenuePoint[];
}): string {
  const stats = chartWindowStats(input.points);
  if (stats.total <= 0) {
    return input.period === "today"
      ? "Last 12 days — bars appear as revenue lands."
      : "Last 7 days — bars appear as revenue lands.";
  }

  const bits = [
    `Window ${fmtKes(stats.total)}`,
    `avg ${fmtKes(stats.average)}/day`,
  ];
  if (stats.best) {
    bits.push(`best ${stats.best.label}`);
  }
  if (stats.activeDays > 0) {
    bits.push(
      `${stats.activeDays} active day${stats.activeDays === 1 ? "" : "s"}`,
    );
  }
  return bits.join(" · ");
}

export function marginPct(
  revenue: number,
  grossProfit: number,
  pulseMargin?: number | string | null,
): number | null {
  if (pulseMargin != null && pulseMargin !== "") {
    const v = toNum(pulseMargin);
    if (Number.isFinite(v)) return v;
  }
  if (revenue <= 0) return null;
  return (grossProfit / revenue) * 100;
}

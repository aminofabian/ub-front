import type { PathBSupplyListRowRecord } from "@/lib/api";

import { supplyN } from "../../_components/supplies-shared";

export type SpendPeriodId = "today" | "week" | "month" | "year";

export type SpendWindow = {
  start: Date;
  /** Midnight after the last day included in the window. */
  endExclusive: Date;
};

export type SpendSummary = {
  total: number;
  paid: number;
  open: number;
  count: number;
  supplierCount: number;
  unpaidCount: number;
  partialCount: number;
  paidCount: number;
};

export type SpendBarPoint = {
  key: string;
  label: string;
  value: number;
  current?: boolean;
  future?: boolean;
};

export type SpendRankItem = {
  id: string;
  label: string;
  value: number;
  count: number;
  open: number;
};

export type SpendDelta = {
  percent: number | null;
  previous: number;
  direction: "up" | "down" | "flat";
  isNew: boolean;
};

export const SPEND_PERIODS: { id: SpendPeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
];

const DAY_MS = 86_400_000;

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function addDays(value: Date, days: number): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate() + days,
  );
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      DAY_MS,
  );
}

export function isoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a `YYYY-MM-DD` date as local midnight, never as UTC. */
export function parseIsoDateOnly(
  value: string | null | undefined,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value?.trim() ?? "");
  if (!match) return null;
  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

/** Prefer the bill's invoice date; older payloads fall back to creation time. */
export function supplyRowDate(row: PathBSupplyListRowRecord): Date {
  const invoiceDate = parseIsoDateOnly(row.invoiceDate);
  if (invoiceDate) return invoiceDate;
  const created = new Date(row.createdAt);
  return startOfDay(Number.isFinite(created.getTime()) ? created : new Date(0));
}

export function isInWindow(date: Date, window: SpendWindow): boolean {
  return date >= window.start && date < window.endExclusive;
}

export function periodWindow(
  period: SpendPeriodId,
  now: Date,
): SpendWindow {
  const today = startOfDay(now);
  if (period === "today") {
    return { start: today, endExclusive: addDays(today, 1) };
  }
  if (period === "week") {
    const mondayOffset = (today.getDay() + 6) % 7;
    return {
      start: addDays(today, -mondayOffset),
      endExclusive: addDays(today, 1),
    };
  }
  if (period === "month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      endExclusive: addDays(today, 1),
    };
  }
  return {
    start: new Date(today.getFullYear(), 0, 1),
    endExclusive: addDays(today, 1),
  };
}

/**
 * The like-for-like window immediately before `current`: the same elapsed days
 * in the previous week / month / year, so a part-finished period is not
 * compared with a complete one.
 */
export function previousWindow(
  period: SpendPeriodId,
  current: SpendWindow,
  now: Date,
): SpendWindow {
  if (period === "today") {
    return { start: addDays(current.start, -1), endExclusive: current.start };
  }
  if (period === "week") {
    const elapsed = daysBetween(current.start, current.endExclusive);
    const start = addDays(current.start, -7);
    return { start, endExclusive: addDays(start, elapsed) };
  }
  if (period === "month") {
    const start = new Date(
      current.start.getFullYear(),
      current.start.getMonth() - 1,
      1,
    );
    const monthEnd = new Date(
      current.start.getFullYear(),
      current.start.getMonth(),
      1,
    );
    const elapsed = daysBetween(current.start, current.endExclusive);
    return {
      start,
      endExclusive: addDays(start, Math.min(elapsed, daysBetween(start, monthEnd))),
    };
  }
  const start = new Date(current.start.getFullYear() - 1, 0, 1);
  const day = Math.min(
    now.getDate(),
    daysInMonth(start.getFullYear(), now.getMonth()),
  );
  return {
    start,
    endExclusive: addDays(new Date(start.getFullYear(), now.getMonth(), day), 1),
  };
}

export function periodLabel(period: SpendPeriodId): string {
  return SPEND_PERIODS.find((p) => p.id === period)?.label ?? "This month";
}

export function comparisonLabel(period: SpendPeriodId): string {
  if (period === "today") return "yesterday";
  if (period === "week") return "last week";
  if (period === "month") return "last month";
  return "last year";
}

function shortDate(value: Date, includeYear = false): string {
  return value.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

export function formatWindowRange(
  window: SpendWindow,
  period: SpendPeriodId,
): string {
  const end = addDays(window.endExclusive, -1);
  if (period === "today") return shortDate(end);

  const crossesYear = window.start.getFullYear() !== end.getFullYear();
  if (crossesYear) {
    return `${shortDate(window.start, true)} – ${shortDate(end, true)}`;
  }
  if (period === "year") {
    return `${shortDate(window.start)} – ${shortDate(end)}`;
  }
  if (isoDate(window.start) === isoDate(end)) {
    return shortDate(end);
  }
  if (window.start.getMonth() === end.getMonth()) {
    return `${window.start.getDate()}–${shortDate(end)}`;
  }
  return `${shortDate(window.start)} – ${shortDate(end)}`;
}

export function summarizeSpend(
  rows: PathBSupplyListRowRecord[],
  window: SpendWindow,
): SpendSummary {
  const suppliers = new Set<string>();
  let total = 0;
  let paid = 0;
  let open = 0;
  let count = 0;
  let unpaidCount = 0;
  let partialCount = 0;
  let paidCount = 0;

  for (const row of rows) {
    if (!isInWindow(supplyRowDate(row), window)) continue;
    const rowTotal = supplyN(row.grandTotal);
    const rowPaid = supplyN(row.amountPaid);
    const rowOpen = supplyN(row.balanceOpen);
    total += rowTotal;
    paid += rowPaid;
    open += rowOpen;
    count += 1;
    suppliers.add(row.supplierId || `name:${row.supplierName}`);
    if (rowOpen > 0.009) {
      if (rowPaid > 0.009) partialCount += 1;
      else unpaidCount += 1;
    } else {
      paidCount += 1;
    }
  }

  return {
    total,
    paid,
    open,
    count,
    supplierCount: suppliers.size,
    unpaidCount,
    partialCount,
    paidCount,
  };
}

export function spendDelta(current: number, previous: number): SpendDelta {
  if (previous > 0.004) {
    const percent = ((current - previous) / previous) * 100;
    return {
      percent,
      previous,
      direction:
        Math.abs(percent) < 0.05 ? "flat" : percent > 0 ? "up" : "down",
      isNew: false,
    };
  }
  return {
    percent: null,
    previous,
    direction: current > 0.004 ? "up" : "flat",
    isNew: current > 0.004,
  };
}

function sumByDay(
  rows: PathBSupplyListRowRecord[],
  window: SpendWindow,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const date = supplyRowDate(row);
    if (!isInWindow(date, window)) continue;
    const key = isoDate(date);
    totals.set(key, (totals.get(key) ?? 0) + supplyN(row.grandTotal));
  }
  return totals;
}

function sumByMonth(
  rows: PathBSupplyListRowRecord[],
  window: SpendWindow,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const date = supplyRowDate(row);
    if (!isInWindow(date, window)) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    totals.set(key, (totals.get(key) ?? 0) + supplyN(row.grandTotal));
  }
  return totals;
}

export function buildSpendTrend(
  rows: PathBSupplyListRowRecord[],
  period: SpendPeriodId,
  window: SpendWindow,
  now: Date,
): SpendBarPoint[] {
  const today = startOfDay(now);

  if (period === "today") {
    const start = addDays(today, -13);
    const totals = sumByDay(rows, { start, endExclusive: addDays(today, 1) });
    return Array.from({ length: 14 }, (_, index) => {
      const date = addDays(start, index);
      const key = isoDate(date);
      const current = index === 13;
      return {
        key,
        label: current
          ? "Today"
          : String(date.getDate()).padStart(2, "0"),
        value: totals.get(key) ?? 0,
        current,
      };
    });
  }

  if (period === "week") {
    const totals = sumByDay(rows, window);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(window.start, index);
      const key = isoDate(date);
      return {
        key,
        label: date.toLocaleDateString("en-KE", { weekday: "short" }),
        value: totals.get(key) ?? 0,
        current: key === isoDate(today),
        future: date > today,
      };
    });
  }

  if (period === "month") {
    const totals = sumByDay(rows, window);
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDays = daysInMonth(year, month);
    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(year, month, index + 1);
      const key = isoDate(date);
      return {
        key,
        label: String(index + 1),
        value: totals.get(key) ?? 0,
        current: key === isoDate(today),
        future: date > today,
      };
    });
  }

  const totals = sumByMonth(rows, window);
  const year = today.getFullYear();
  const currentMonth = today.getMonth();
  return Array.from({ length: 12 }, (_, month) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Date(year, month, 1).toLocaleDateString("en-KE", {
        month: "short",
      }),
      value: totals.get(key) ?? 0,
      current: month === currentMonth,
      future: month > currentMonth,
    };
  });
}

export function rankSuppliers(
  rows: PathBSupplyListRowRecord[],
  window: SpendWindow,
): SpendRankItem[] {
  const map = new Map<string, SpendRankItem>();
  for (const row of rows) {
    if (!isInWindow(supplyRowDate(row), window)) continue;
    const id = row.supplierId || `name:${row.supplierName}`;
    const previous = map.get(id);
    const value = supplyN(row.grandTotal);
    if (previous) {
      previous.value += value;
      previous.count += 1;
      previous.open += supplyN(row.balanceOpen);
    } else {
      map.set(id, {
        id,
        label: row.supplierName?.trim() || "Unknown supplier",
        value,
        count: 1,
        open: supplyN(row.balanceOpen),
      });
    }
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

export type SpendSourceItem = { id: string; label: string; value: number; count: number };

export type SpendStatusMix = {
  paid: number;
  partial: number;
  unpaid: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  total: number;
};

export function statusMix(
  rows: PathBSupplyListRowRecord[],
  window: SpendWindow,
): SpendStatusMix {
  const mix: SpendStatusMix = {
    paid: 0,
    partial: 0,
    unpaid: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
    total: 0,
  };
  for (const row of rows) {
    if (!isInWindow(supplyRowDate(row), window)) continue;
    const value = supplyN(row.grandTotal);
    mix.total += value;
    if (supplyN(row.balanceOpen) <= 0.009) {
      mix.paid += value;
      mix.paidCount += 1;
    } else if (supplyN(row.amountPaid) > 0.009) {
      mix.partial += value;
      mix.partialCount += 1;
    } else {
      mix.unpaid += value;
      mix.unpaidCount += 1;
    }
  }
  return mix;
}

export function rankSources(
  rows: PathBSupplyListRowRecord[],
  window: SpendWindow,
): SpendSourceItem[] {
  const labels: Record<string, string> = {
    path_a: "Against an order",
    path_b: "Walk-in supply",
  };
  const map = new Map<string, SpendSourceItem>();
  for (const row of rows) {
    if (!isInWindow(supplyRowDate(row), window)) continue;
    const id = row.source === "path_a" ? "path_a" : "path_b";
    const previous = map.get(id);
    if (previous) {
      previous.value += supplyN(row.grandTotal);
      previous.count += 1;
    } else {
      map.set(id, {
        id,
        label: labels[id],
        value: supplyN(row.grandTotal),
        count: 1,
      });
    }
  }
  return ["path_a", "path_b"]
    .map((id) => map.get(id))
    .filter((item): item is SpendSourceItem => item != null);
}

export function billsInWindow(
  rows: PathBSupplyListRowRecord[],
  window: SpendWindow,
): PathBSupplyListRowRecord[] {
  return rows
    .filter((row) => isInWindow(supplyRowDate(row), window))
    .sort((a, b) => {
      const byDate = supplyRowDate(b).getTime() - supplyRowDate(a).getTime();
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function downloadSpendCsv(
  rows: PathBSupplyListRowRecord[],
  window: SpendWindow,
  currency: string,
): void {
  const header = [
    "Invoice date",
    "Invoice",
    "Supplier",
    "Source",
    "Status",
    `Billed (${currency})`,
    `Paid (${currency})`,
    `Open (${currency})`,
  ];
  const lines = billsInWindow(rows, window).map((row) => [
    isoDate(supplyRowDate(row)),
    row.invoiceNumber,
    row.supplierName,
    row.source === "path_a" ? "Order" : "Walk-in",
    row.paymentStatus,
    supplyN(row.grandTotal).toFixed(2),
    supplyN(row.amountPaid).toFixed(2),
    supplyN(row.balanceOpen).toFixed(2),
  ]);
  const csv = [header, ...lines]
    .map((line) =>
      line
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `supply-spend-${isoDate(window.start)}-${isoDate(addDays(window.endExclusive, -1))}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

import type { PathBSupplyListRowRecord } from "@/lib/api";

import { supplyN } from "./supplies-shared";

export type SupplyBillFilterId =
  | "all"
  | "today"
  | "yesterday"
  | "3d"
  | "7d"
  | "14d"
  | "30d"
  | "paid"
  | "unpaid";

export const SUPPLY_BILL_FILTERS: {
  id: SupplyBillFilterId;
  label: string;
  group: "period" | "status";
}[] = [
  { id: "all", label: "All", group: "status" },
  { id: "today", label: "Today", group: "period" },
  { id: "yesterday", label: "Yesterday", group: "period" },
  { id: "3d", label: "3 days", group: "period" },
  { id: "7d", label: "1 week", group: "period" },
  { id: "14d", label: "2 weeks", group: "period" },
  { id: "30d", label: "Month", group: "period" },
  { id: "unpaid", label: "Unpaid", group: "status" },
  { id: "paid", label: "Paid", group: "status" },
];

export function parseSupplyBillFilter(
  filterParam: string | null,
  legacyUnpaidParam: string | null,
): SupplyBillFilterId {
  if (legacyUnpaidParam === "1") {
    return "unpaid";
  }
  const raw = filterParam?.trim().toLowerCase();
  if (raw && SUPPLY_BILL_FILTERS.some((f) => f.id === raw)) {
    return raw as SupplyBillFilterId;
  }
  return "all";
}

export function isSupplyRowUnpaid(row: PathBSupplyListRowRecord): boolean {
  return supplyN(row.balanceOpen) > 0.009;
}

function rowCreatedMs(row: PathBSupplyListRowRecord): number {
  const t = new Date(row.createdAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function matchesDateFilter(
  createdMs: number,
  filter: SupplyBillFilterId,
  now = new Date(),
): boolean {
  const todayStart = startOfLocalDay(now);
  switch (filter) {
    case "today":
      return createdMs >= todayStart;
    case "yesterday": {
      const yesterdayStart = todayStart - 86_400_000;
      return createdMs >= yesterdayStart && createdMs < todayStart;
    }
    case "3d":
      return createdMs >= todayStart - 2 * 86_400_000;
    case "7d":
      return createdMs >= todayStart - 6 * 86_400_000;
    case "14d":
      return createdMs >= todayStart - 13 * 86_400_000;
    case "30d":
      return createdMs >= todayStart - 29 * 86_400_000;
    default:
      return true;
  }
}

export function matchesSupplyBillFilter(
  row: PathBSupplyListRowRecord,
  filter: SupplyBillFilterId,
): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "paid") {
    return !isSupplyRowUnpaid(row);
  }
  if (filter === "unpaid") {
    return isSupplyRowUnpaid(row);
  }
  return matchesDateFilter(rowCreatedMs(row), filter);
}

export function sortSupplyBillRows(
  rows: PathBSupplyListRowRecord[],
  filter: SupplyBillFilterId,
): PathBSupplyListRowRecord[] {
  return [...rows].sort((a, b) => {
    if (filter === "all") {
      const aUnpaid = isSupplyRowUnpaid(a) ? 0 : 1;
      const bUnpaid = isSupplyRowUnpaid(b) ? 0 : 1;
      if (aUnpaid !== bUnpaid) {
        return aUnpaid - bUnpaid;
      }
    }
    return rowCreatedMs(b) - rowCreatedMs(a);
  });
}

export function filterAndSortSupplyRows(
  rows: PathBSupplyListRowRecord[],
  filter: SupplyBillFilterId,
): PathBSupplyListRowRecord[] {
  const filtered =
    filter === "all"
      ? rows
      : rows.filter((row) => matchesSupplyBillFilter(row, filter));
  return sortSupplyBillRows(filtered, filter);
}

export function supplyBillFilterLabel(filter: SupplyBillFilterId): string {
  return SUPPLY_BILL_FILTERS.find((f) => f.id === filter)?.label ?? "All";
}

export function summarizeSupplyRows(rows: PathBSupplyListRowRecord[]) {
  let totalInvoiced = 0;
  let totalPaid = 0;
  let openBalance = 0;
  let unpaidCount = 0;
  for (const r of rows) {
    totalInvoiced += supplyN(r.grandTotal);
    totalPaid += supplyN(r.amountPaid);
    const bal = supplyN(r.balanceOpen);
    if (bal > 0.009) {
      openBalance += bal;
      unpaidCount += 1;
    }
  }
  return {
    totalInvoiced,
    totalPaid,
    openBalance,
    unpaidCount,
    count: rows.length,
  };
}

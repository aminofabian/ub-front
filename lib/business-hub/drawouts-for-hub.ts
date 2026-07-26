"use client";

import type { DrawoutRecord } from "@/lib/api";
import {
  cashierIdentityKey,
  cashierNamesMatch,
  normalizeCashierName,
} from "@/lib/business-hub/ticks-from-transactions";

export const DRAWOUT_POOL_LIMIT = 50;

export const HUB_DRAWOUT_CATEGORIES: Record<string, string> = {
  PETTY_CASH: "Petty cash",
  CASUAL_LABOUR: "Casual labour",
  SUPPLIER_PAYMENT: "Supplier",
  RECURRING: "Recurring",
  OTHER: "Other",
};

const ACTIVE_DRAWOUT_STATUSES = new Set(["APPROVED", "PENDING_APPROVAL"]);

export type HubDrawout = {
  id: string;
  shiftId: string;
  createdAt: string;
  amount: number;
  category: string;
  categoryLabel: string;
  description: string;
  recipientName: string;
  status: string;
  /** Who initiated the drawout (usually the cashier). */
  cashierName: string;
  /** Cashier who owns the shift / till. */
  shiftCashierName: string;
};

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

export function drawoutCategoryLabel(category: string): string {
  return HUB_DRAWOUT_CATEGORIES[category] ?? category.replace(/_/g, " ");
}

export function drawoutStatusLabel(status: string): string {
  if (status === "PENDING_APPROVAL") return "Pending";
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  if (status === "VOIDED") return "Voided";
  if (status === "EXPIRED") return "Expired";
  return status;
}

export function isActiveDrawoutStatus(status: string): boolean {
  return ACTIVE_DRAWOUT_STATUSES.has(status);
}

/** Sum of approved + pending drawouts (cash out / reserved on the open shift). */
export function totalDrawoutAmount(drawouts: HubDrawout[]): number {
  return drawouts.reduce((sum, row) => {
    if (!isActiveDrawoutStatus(row.status)) return sum;
    return sum + row.amount;
  }, 0);
}

export function hubDrawoutsFromRecords(
  records: Array<
    DrawoutRecord & {
      shiftCashierName?: string | null;
    }
  >,
  limit = DRAWOUT_POOL_LIMIT,
): HubDrawout[] {
  return [...records]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit)
    .map((row) => {
      const cashierName = normalizeCashierName(row.initiatedByName);
      const shiftCashierName = normalizeCashierName(
        row.shiftCashierName || row.initiatedByName,
      );
      return {
        id: row.id,
        shiftId: row.shiftId,
        createdAt: row.createdAt,
        amount: toNum(row.amount),
        category: row.category,
        categoryLabel: drawoutCategoryLabel(row.category),
        description: row.description?.trim() || "Drawout",
        recipientName: row.recipientName?.trim() || "—",
        status: row.status,
        cashierName,
        shiftCashierName,
      };
    });
}

/** Unique cashier names from drawouts (initiator first, then till owner). */
export function cashiersFromDrawouts(drawouts: HubDrawout[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of drawouts) {
    for (const name of [row.cashierName, row.shiftCashierName]) {
      const key = cashierIdentityKey(name);
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

/**
 * Filter open-shift drawouts for the active stage selection.
 * Empty selection = floor (all open shifts). A cashier lane matches
 * initiator or shift owner. Returns every match on the open shift(s).
 */
export function filterDrawoutsByCashiers(
  drawouts: HubDrawout[],
  selectedCashiers: string[],
): HubDrawout[] {
  if (selectedCashiers.length === 0) {
    return drawouts;
  }
  return drawouts.filter((row) =>
    selectedCashiers.some(
      (name) =>
        cashierNamesMatch(name, row.cashierName) ||
        cashierNamesMatch(name, row.shiftCashierName),
    ),
  );
}

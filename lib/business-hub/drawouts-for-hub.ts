"use client";

import type { DrawoutRecord } from "@/lib/api";
import { normalizeCashierName } from "@/lib/business-hub/ticks-from-transactions";

export const DRAWOUT_POOL_LIMIT = 20;
export const DRAWOUT_DISPLAY_LIMIT = 5;

export const HUB_DRAWOUT_CATEGORIES: Record<string, string> = {
  PETTY_CASH: "Petty cash",
  CASUAL_LABOUR: "Casual labour",
  SUPPLIER_PAYMENT: "Supplier",
  RECURRING: "Recurring",
  OTHER: "Other",
};

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
      if (seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function namesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return true;
  const leftFirst = left.split(/\s+/)[0] ?? left;
  const rightFirst = right.split(/\s+/)[0] ?? right;
  return leftFirst.length > 1 && leftFirst === rightFirst;
}

/**
 * Filter drawouts for the active stage selection.
 * Empty selection = floor (all). A cashier lane matches initiator or shift owner.
 */
export function filterDrawoutsByCashiers(
  drawouts: HubDrawout[],
  selectedCashiers: string[],
  displayLimit = DRAWOUT_DISPLAY_LIMIT,
): HubDrawout[] {
  if (selectedCashiers.length === 0) {
    return drawouts.slice(0, displayLimit);
  }
  return drawouts
    .filter((row) =>
      selectedCashiers.some(
        (name) =>
          namesMatch(name, row.cashierName) ||
          namesMatch(name, row.shiftCashierName),
      ),
    )
    .slice(0, displayLimit);
}

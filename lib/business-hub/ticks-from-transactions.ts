import type { SaleTransaction } from "@/lib/sale-transactions";
import { formatSalePaymentDisplay } from "@/lib/sale-payment-filter";

export type RecentTickItem = {
  name: string;
  quantity: number;
  lineTotal: number;
};

export type RecentTick = {
  saleId: string;
  items: RecentTickItem[];
  soldAt: string;
  amount: number;
  /** Display label, e.g. Cash, M-Pesa, Split · Cash + M-Pesa. */
  paymentLabel: string;
  cashierName: string;
};

/** How many sales to keep in the till-tape pool (before cashier filter). */
export const TICK_POOL_LIMIT = 30;
/** How many sales to show after filtering. */
export const TICK_DISPLAY_LIMIT = 3;

const UNKNOWN_CASHIER = "Unknown";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/** Case-insensitive identity key for the same person behind a till. */
export function cashierIdentityKey(name: string | null | undefined): string {
  return (name?.trim() || UNKNOWN_CASHIER).toLowerCase();
}

/**
 * Canonical display name so "moreen" and "Moreen" collapse to one till tab.
 */
export function normalizeCashierName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return UNKNOWN_CASHIER;
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function cashierNamesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const left = cashierIdentityKey(a);
  const right = cashierIdentityKey(b);
  if (left === right) return true;
  const leftFirst = left.split(/\s+/)[0] ?? left;
  const rightFirst = right.split(/\s+/)[0] ?? right;
  return leftFirst.length > 1 && leftFirst === rightFirst;
}

export function ticksFromTransactions(
  txs: SaleTransaction[],
  limit = TICK_POOL_LIMIT,
): RecentTick[] {
  return txs.slice(0, limit).map((tx) => ({
    saleId: tx.saleId,
    soldAt: tx.soldAt,
    amount: tx.total,
    paymentLabel: formatSalePaymentDisplay(
      tx.paymentMethod,
      tx.paymentMethods,
    ),
    cashierName: normalizeCashierName(tx.cashierName),
    items: tx.lines.map((line) => ({
      name: line.itemName?.trim() || "Item",
      quantity: Math.max(1, toNum(line.quantity) || 1),
      lineTotal: toNum(line.lineTotal),
    })),
  }));
}

/** Unique cashier names in sale order (most recent first appearance). */
export function cashiersFromTicks(ticks: RecentTick[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const tick of ticks) {
    const key = cashierIdentityKey(tick.cashierName);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(tick.cashierName);
  }
  return names;
}

/**
 * Filter till-tape sales by selected cashiers.
 * Empty selection = all cashiers.
 */
export function filterTicksByCashiers(
  ticks: RecentTick[],
  selectedCashiers: string[],
  displayLimit = TICK_DISPLAY_LIMIT,
): RecentTick[] {
  if (selectedCashiers.length === 0) {
    return ticks.slice(0, displayLimit);
  }
  return ticks
    .filter((tick) =>
      selectedCashiers.some((name) => cashierNamesMatch(name, tick.cashierName)),
    )
    .slice(0, displayLimit);
}

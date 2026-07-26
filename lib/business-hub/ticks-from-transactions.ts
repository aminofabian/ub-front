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

export function normalizeCashierName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  return trimmed || UNKNOWN_CASHIER;
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
    if (seen.has(tick.cashierName)) continue;
    seen.add(tick.cashierName);
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
  const allowed = new Set(selectedCashiers);
  return ticks
    .filter((tick) => allowed.has(tick.cashierName))
    .slice(0, displayLimit);
}

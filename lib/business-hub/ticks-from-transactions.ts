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
};

const TICK_LIMIT = 3;

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

export function ticksFromTransactions(
  txs: SaleTransaction[],
  limit = TICK_LIMIT,
): RecentTick[] {
  return txs.slice(0, limit).map((tx) => ({
    saleId: tx.saleId,
    soldAt: tx.soldAt,
    amount: tx.total,
    paymentLabel: formatSalePaymentDisplay(
      tx.paymentMethod,
      tx.paymentMethods,
    ),
    items: tx.lines.map((line) => ({
      name: line.itemName?.trim() || "Item",
      quantity: Math.max(1, toNum(line.quantity) || 1),
      lineTotal: toNum(line.lineTotal),
    })),
  }));
}

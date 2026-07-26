import type { SaleTransaction } from "@/lib/sale-transactions";

export type RecentTick = {
  saleId: string;
  itemLabel: string;
  soldAt: string;
  amount: number;
};

const TICK_LIMIT = 3;

export function ticksFromTransactions(
  txs: SaleTransaction[],
  limit = TICK_LIMIT,
): RecentTick[] {
  return txs.slice(0, limit).map((tx) => {
    const primary = tx.lines[0]?.itemName?.trim() || "Sale";
    const itemLabel =
      tx.lineCount > 1 ? `${primary} +${tx.lineCount - 1}` : primary;
    return {
      saleId: tx.saleId,
      itemLabel,
      soldAt: tx.soldAt,
      amount: tx.total,
    };
  });
}

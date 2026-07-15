import type { RecentSaleRow } from "@/lib/api";

export type SaleTransaction = {
  saleId: string;
  receiptNo: number | null;
  soldAt: string;
  cashierName: string;
  customerName: string;
  paymentMethod: string;
  paymentMethods: string | null;
  channel: string;
  status: string;
  lineCount: number;
  total: number;
  profit: number;
  lines: RecentSaleRow[];
};

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function isRefunded(status: string | undefined): boolean {
  return (status?.toLowerCase() ?? "").includes("refund");
}

export function shortSaleId(saleId: string): string {
  const id = saleId.trim();
  if (id.length <= 8) return id.toUpperCase();
  return id.slice(-8).toUpperCase();
}

/** Prefer the short sequential receipt number; fall back to short UUID. */
export function txDisplayNo(tx: Pick<SaleTransaction, "receiptNo" | "saleId">): string {
  return tx.receiptNo != null ? String(tx.receiptNo) : shortSaleId(tx.saleId);
}

export function groupLinesIntoTransactions(
  lines: RecentSaleRow[],
): SaleTransaction[] {
  const map = new Map<string, SaleTransaction>();

  for (const row of lines) {
    let tx = map.get(row.saleId);
    if (!tx) {
      tx = {
        saleId: row.saleId,
        receiptNo: row.receiptNo ?? null,
        soldAt: row.soldAt,
        cashierName: row.cashierName,
        customerName: row.customerName,
        paymentMethod: row.paymentMethod,
        paymentMethods: row.paymentMethods ?? null,
        channel: row.channel ?? "walk_in",
        status: row.status,
        lineCount: 0,
        total: 0,
        profit: 0,
        lines: [],
      };
      map.set(row.saleId, tx);
    }
    tx.lines.push(row);
    tx.lineCount += 1;
    const refunded = isRefunded(row.status);
    const lineTotal = toNum(row.lineTotal);
    const profit = toNum(row.profit);
    if (refunded) {
      tx.total -= lineTotal;
      tx.profit -= profit;
    } else {
      tx.total += lineTotal;
      tx.profit += profit;
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime(),
  );
}

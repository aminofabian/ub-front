import type { RecentSaleRow } from "@/lib/api";

/**
 * The fields grouping and the till tape actually read from one sale line.
 *
 * `RecentSaleRow` (the full board) satisfies this structurally. The hub's tape
 * projection omits the rest — customer identity, receipt number, SKU/barcode,
 * unit price, channel, M-Pesa verification — so it can group and paint without
 * downloading fields it never shows.
 */
export type SaleLineLike = {
  saleId: string;
  soldAt: string;
  cashierName: string;
  paymentMethod: string;
  status: string;
  itemName: string;
  quantity: number | string;
  lineTotal: number | string;
  profit: number | string;
  receiptNo?: number | null;
  customerName?: string;
  customerId?: string | null;
  customerNo?: number | null;
  customerMaskedHint?: string | null;
  customerPhoneVerified?: boolean | null;
  paymentMethods?: string | null;
  channel?: string | null;
  mpesaVerified?: boolean | null;
};

export type SaleTransaction<L extends SaleLineLike = RecentSaleRow> = {
  saleId: string;
  receiptNo: number | null;
  soldAt: string;
  cashierName: string;
  customerName: string;
  customerId: string | null;
  customerNo: number | null;
  customerMaskedHint: string | null;
  customerPhoneVerified: boolean;
  paymentMethod: string;
  paymentMethods: string | null;
  channel: string;
  status: string;
  lineCount: number;
  total: number;
  profit: number;
  lines: L[];
  /** True when any line reports gateway-verified M-Pesa. */
  mpesaVerified: boolean;
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

export function groupLinesIntoTransactions<L extends SaleLineLike>(
  lines: L[],
): SaleTransaction<L>[] {
  const map = new Map<string, SaleTransaction<L>>();

  for (const row of lines) {
    let tx = map.get(row.saleId);
    if (!tx) {
      tx = {
        saleId: row.saleId,
        receiptNo: row.receiptNo ?? null,
        soldAt: row.soldAt,
        cashierName: row.cashierName,
        customerName: row.customerName ?? "",
        customerId: row.customerId ?? null,
        customerNo: row.customerNo ?? null,
        customerMaskedHint: row.customerMaskedHint ?? null,
        customerPhoneVerified: Boolean(row.customerPhoneVerified),
        paymentMethod: row.paymentMethod,
        paymentMethods: row.paymentMethods ?? null,
        channel: row.channel ?? "walk_in",
        status: row.status,
        lineCount: 0,
        total: 0,
        profit: 0,
        lines: [],
        mpesaVerified: Boolean(row.mpesaVerified),
      };
      map.set(row.saleId, tx);
    }
    tx.lines.push(row);
    if (row.mpesaVerified) {
      tx.mpesaVerified = true;
    }
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

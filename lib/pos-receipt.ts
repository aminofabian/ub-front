import type { SalePaymentResponseRecord, SaleRecord } from "@/lib/api";
import type { CartSessionLine } from "@/lib/cart-session";

export type PosReceiptLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PosReceiptPayment = {
  method: string;
  label: string;
  amount: number;
  reference?: string | null;
};

export type PosReceiptSnapshot = {
  businessName: string;
  /** Tenant branding logo (Cloudinary URL). */
  logoUrl?: string | null;
  branchName: string;
  branchAddress?: string | null;
  branchPhone?: string | null;
  branchEmail?: string | null;
  branchWebsite?: string | null;
  /** M-Pesa till (Buy Goods) shown on the receipt. */
  tillNumber?: string | null;
  branchReceiptMessage?: string | null;
  servedByName?: string | null;
  saleId: string;
  /** Short sequential receipt number (1, 2, 3, ...); null for older sales. */
  receiptNo?: number | null;
  soldAt: string;
  currency: string;
  status: string;
  lines: PosReceiptLine[];
  payments: PosReceiptPayment[];
  grandTotal: number;
  /** Set when the sale included a cash tender (full cash or split). */
  cashReceived?: number | null;
  changeGiven?: number | null;
  customerName?: string | null;
  voided: boolean;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mpesa_manual: "M-Pesa",
  card: "Card",
  customer_credit: "Customer tab",
  customer_wallet: "Wallet",
  loyalty_redeem: "Loyalty",
};

export function paymentMethodLabel(method: string): string {
  const key = method.trim().toLowerCase();
  return PAYMENT_LABELS[key] ?? method.replace(/_/g, " ");
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toNumber(v: number | string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatReceiptMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency.trim() || ""}`.trim();
}

export function formatReceiptDate(isoOrDisplay: string): string {
  const d = new Date(isoOrDisplay);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return isoOrDisplay;
}

export type BuildPosReceiptInput = {
  businessName: string;
  logoUrl?: string | null;
  branchName: string;
  branchAddress?: string | null;
  branchPhone?: string | null;
  branchEmail?: string | null;
  branchWebsite?: string | null;
  /** M-Pesa till (Buy Goods) shown on the receipt. */
  tillNumber?: string | null;
  branchReceiptMessage?: string | null;
  servedByName?: string | null;
  currency: string;
  cartLines: CartSessionLine[];
  sale: SaleRecord;
  customerName?: string | null;
  /** Cash tendered by customer (full cash checkout only). */
  cashTendered?: number | null;
  clientSoldAt?: string;
};

export function buildPosReceiptSnapshot(input: BuildPosReceiptInput): PosReceiptSnapshot {
  const { sale, cartLines, cashTendered } = input;
  const grandTotal = roundMoney2(toNumber(sale.grandTotal));
  const voided =
    sale.voidedAt != null && String(sale.voidedAt).length > 0;

  const lines: PosReceiptLine[] = cartLines.map((line) => {
    const q = toNumber(line.quantity);
    const p = toNumber(line.unitPrice);
    const qty = q > 0 ? q : 1;
    const unit = p >= 0 ? p : 0;
    return {
      description: line.label.trim() || "Item",
      quantity: qty,
      unitPrice: unit,
      lineTotal: roundMoney2(qty * unit),
    };
  });

  if (lines.length === 0 && sale.items?.length) {
    for (const item of sale.items) {
      const qty = toNumber(item.quantity);
      const unit = toNumber(item.unitPrice);
      lines.push({
        description: "Item",
        quantity: qty > 0 ? qty : 1,
        unitPrice: unit,
        lineTotal: roundMoney2(toNumber(item.lineTotal)),
      });
    }
  }

  const payments: PosReceiptPayment[] = (sale.payments ?? []).map(
    (p: SalePaymentResponseRecord) => ({
      method: p.method,
      label: paymentMethodLabel(p.method),
      amount: roundMoney2(toNumber(p.amount)),
      reference: p.reference,
    }),
  );

  const isFullCash =
    payments.length === 1 && payments[0]?.method.trim().toLowerCase() === "cash";

  let cashReceived: number | null = null;
  let changeGiven: number | null = null;
  const persistedCash = sale.cashReceived != null ? toNumber(sale.cashReceived) : null;
  if (isFullCash) {
    const tender =
      persistedCash != null && persistedCash >= grandTotal
        ? persistedCash
        : cashTendered != null && cashTendered >= grandTotal
          ? cashTendered
          : null;
    if (tender != null) {
      cashReceived = roundMoney2(tender);
      changeGiven = roundMoney2(tender - grandTotal);
    }
  }

  const servedBy =
    input.servedByName?.trim() ||
    sale.soldByName?.trim() ||
    null;

  return {
    businessName: input.businessName.trim() || "Store",
    logoUrl: input.logoUrl?.trim() || null,
    branchName: input.branchName.trim(),
    branchAddress: input.branchAddress?.trim() || null,
    branchPhone: input.branchPhone?.trim() || null,
    branchEmail: input.branchEmail?.trim() || null,
    branchWebsite: input.branchWebsite?.trim() || null,
    tillNumber: input.tillNumber?.trim() || null,
    branchReceiptMessage: input.branchReceiptMessage?.trim() || null,
    servedByName: servedBy,
    saleId: sale.id,
    receiptNo: sale.receiptNo ?? null,
    soldAt: input.clientSoldAt ?? new Date().toISOString(),
    currency: input.currency.trim().toUpperCase() || "KES",
    status: sale.status,
    lines,
    payments,
    grandTotal,
    cashReceived,
    changeGiven,
    customerName: input.customerName ?? null,
    voided,
  };
}

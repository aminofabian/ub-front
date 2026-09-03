"use client";

import { FormDrawer } from "@/components/form-drawer";

import styles from "./credit-ticket-drawer.module.css";

export type CreditSlipLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CreditSlip =
  | {
      kind: "items";
      heading: string;
      when: string;
      customerName?: string;
      cashierName?: string;
      lines: CreditSlipLine[];
      grandTotal: number;
      tabAmount?: number;
    }
  | {
      kind: "payment";
      heading: string;
      when: string;
      customerName?: string;
      amount: number;
      note?: string;
    };

function qtyLabel(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

export function CreditTicketDrawer({
  slip,
  loading,
  error,
  fmtKes,
  onOpenChange,
}: {
  slip: CreditSlip | null;
  loading: boolean;
  error: string | null;
  fmtKes: (n: number) => string;
  onOpenChange: (open: boolean) => void;
}) {
  const open = slip != null || loading;
  const title = slip?.heading ?? (loading ? "Till slip" : "Till slip");
  const when = slip?.when;

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={when}
      width="default"
      appearance="sharp"
      headerDensity="compact"
    >
      <div className={styles.wrap}>
        {loading ? (
          <p className={styles.status}>Pulling the slip…</p>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : slip?.kind === "payment" ? (
          <div className={styles.slip}>
            <div className={styles.tear} aria-hidden />
            <p className={styles.shop}>{slip.customerName ?? "On tab"}</p>
            <p className={styles.paidFigure}>{fmtKes(slip.amount)}</p>
            <p className={styles.paidLabel}>Collected against the tab</p>
            {slip.note ? <p className={styles.note}>{slip.note}</p> : null}
            <div className={styles.tear} aria-hidden />
          </div>
        ) : slip?.kind === "items" ? (
          <div className={styles.slip}>
            <div className={styles.tear} aria-hidden />
            {slip.customerName ? (
              <p className={styles.shop}>{slip.customerName}</p>
            ) : null}
            {slip.cashierName ? (
              <p className={styles.meta}>Till · {slip.cashierName}</p>
            ) : null}
            <ul className={styles.items}>
              {slip.lines.length === 0 ? (
                <li className={styles.emptyLine}>No line items on this sale.</li>
              ) : (
                slip.lines.map((line, i) => (
                  <li key={`${line.name}-${i}`} className={styles.item}>
                    <span className={styles.itemName}>
                      {line.name}
                      <span className={styles.itemQty}>
                        {qtyLabel(line.quantity)} × {fmtKes(line.unitPrice)}
                      </span>
                    </span>
                    <span className={styles.itemAmt}>
                      {fmtKes(line.lineTotal)}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <dl className={styles.totals}>
              <div>
                <dt>Sale</dt>
                <dd>{fmtKes(slip.grandTotal)}</dd>
              </div>
              {slip.tabAmount != null && slip.tabAmount > 0 ? (
                <div>
                  <dt>On tab</dt>
                  <dd className={styles.tabAmt}>{fmtKes(slip.tabAmount)}</dd>
                </div>
              ) : null}
            </dl>
            <div className={styles.tear} aria-hidden />
          </div>
        ) : (
          <p className={styles.status}>Nothing on this slip.</p>
        )}
      </div>
    </FormDrawer>
  );
}

export function slipFromPurchase(
  row: {
    receiptNo?: number | null;
    soldAt: string;
    grandTotal: number | string;
    creditAmount: number | string;
    lines: {
      itemName: string;
      quantity: number | string;
      unitPrice: number | string;
      lineTotal: number | string;
    }[];
  },
  fmtWhen: (iso: string) => string,
  customerName?: string,
  cashierName?: string,
): CreditSlip {
  const num = (v: number | string) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    kind: "items",
    heading: row.receiptNo != null ? `#${row.receiptNo}` : "Sale",
    when: fmtWhen(row.soldAt),
    customerName,
    cashierName,
    lines: row.lines.map((line) => ({
      name: line.itemName,
      quantity: num(line.quantity),
      unitPrice: num(line.unitPrice),
      lineTotal: num(line.lineTotal),
    })),
    grandTotal: num(row.grandTotal),
    tabAmount: num(row.creditAmount),
  };
}

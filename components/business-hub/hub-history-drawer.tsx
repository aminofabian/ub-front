"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FormDrawer } from "@/components/form-drawer";
import { fmtMoney } from "@/lib/business-hub/formatters";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchCustomerCreditStatement,
  fetchCustomersPage,
  fetchCustomerTabPurchases,
  fetchSupplierPurchaseHistory,
  fetchWebOrders,
  type CreditStatementLineRecord,
  type SupplierPurchaseHistoryRecord,
  type TabPurchaseRowRecord,
  type WebOrderSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import styles from "./hub-history-drawer.module.css";

export type HubHistoryTarget =
  | {
      kind: "supplier";
      supplierId: string;
      name: string;
    }
  | {
      kind: "credit";
      customerId: string;
      name: string;
      phone: string | null;
      balanceOwed: number | string;
    }
  | {
      kind: "shopper";
      name: string;
      phone: string;
      seed: WebOrderSummary;
    };

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function digits(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function creditLabel(kind: string, memo: string): string {
  switch (kind) {
    case "credit_debt":
      return "Charged";
    case "credit_payment":
      return "Paid";
    case "credit_payment_reversal":
      return "Payment reversed";
    case "credit_adjustment":
      return "Adjusted";
    default:
      return memo.trim() || kind.replaceAll("_", " ");
  }
}

function jobCopy(target: HubHistoryTarget): string {
  if (target.kind === "supplier") return "Supply history";
  if (target.kind === "credit") return "Credit history";
  return "Purchase history";
}

type Loaded =
  | { kind: "supplier"; data: SupplierPurchaseHistoryRecord }
  | {
      kind: "credit";
      charged: number;
      paid: number;
      owed: number;
      lines: CreditStatementLineRecord[];
      purchases: TabPurchaseRowRecord[];
    }
  | {
      kind: "shopper";
      orders: WebOrderSummary[];
      purchases: TabPurchaseRowRecord[];
    };

export function HubHistoryDrawer({
  target,
  currency,
  onOpenChange,
}: {
  target: HubHistoryTarget | null;
  currency?: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = target != null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!target) {
      setLoaded(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLoaded(null);

    const run = async () => {
      if (target.kind === "supplier") {
        const data = await fetchSupplierPurchaseHistory(target.supplierId, {
          limit: 80,
        });
        if (!cancelled) setLoaded({ kind: "supplier", data });
        return;
      }
      if (target.kind === "credit") {
        const [stmt, page] = await Promise.all([
          fetchCustomerCreditStatement(target.customerId),
          fetchCustomerTabPurchases(target.customerId, {
            offset: 0,
            limit: 40,
          }),
        ]);
        if (cancelled) return;
        setLoaded({
          kind: "credit",
          charged: toNum(stmt.totalCharged),
          paid: toNum(stmt.totalPaid),
          owed: toNum(stmt.balanceOwed ?? target.balanceOwed),
          lines: (stmt.lines ?? []).filter((l) =>
            l.kind.startsWith("credit_"),
          ),
          purchases: page.rows,
        });
        return;
      }
      const phoneKey = digits(target.phone);
      const [orders, directory] = await Promise.all([
        fetchWebOrders(0, 80),
        phoneKey.length >= 9
          ? fetchCustomersPage({ q: phoneKey.slice(-9), size: 5 }).catch(
              () => null,
            )
          : Promise.resolve(null),
      ]);
      const matched = orders.filter((o) => {
        if (o.id === target.seed.id) return true;
        if (phoneKey.length < 9) return false;
        return digits(o.customerPhone) === phoneKey;
      });
      if (!matched.some((o) => o.id === target.seed.id)) {
        matched.unshift(target.seed);
      }
      const customerId = directory?.content[0]?.id;
      const purchases = customerId
        ? (
            await fetchCustomerTabPurchases(customerId, {
              offset: 0,
              limit: 30,
            }).catch(() => ({ rows: [] as TabPurchaseRowRecord[] }))
          ).rows
        : [];
      if (!cancelled) {
        setLoaded({ kind: "shopper", orders: matched, purchases });
      }
    };

    void run()
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load this history.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  const footerHref = useMemo(() => {
    if (!target) return null;
    if (target.kind === "supplier") {
      return `${APP_ROUTES.suppliers}?supplierId=${encodeURIComponent(target.supplierId)}`;
    }
    if (target.kind === "credit") {
      return APP_ROUTES.customer(target.customerId);
    }
    return APP_ROUTES.storefrontWebOrders;
  }, [target]);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={target?.name ?? "History"}
      description={target ? jobCopy(target) : undefined}
      width="wide"
      headerDensity="compact"
    >
      <div className={styles.panel}>
        {loading ? (
          <p className={styles.loading}>Opening the book…</p>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : loaded?.kind === "supplier" ? (
          <SupplierBody data={loaded.data} currency={currency} />
        ) : loaded?.kind === "credit" ? (
          <CreditBody
            charged={loaded.charged}
            paid={loaded.paid}
            owed={loaded.owed}
            lines={loaded.lines}
            purchases={loaded.purchases}
            currency={currency}
          />
        ) : loaded?.kind === "shopper" ? (
          <ShopperBody
            orders={loaded.orders}
            purchases={loaded.purchases}
            currency={currency}
          />
        ) : (
          <p className={styles.empty}>Nothing to show yet.</p>
        )}

        {footerHref ? (
          <p className={styles.foot}>
            <Link href={footerHref}>Open the full record</Link>
          </p>
        ) : null}
      </div>
    </FormDrawer>
  );
}

function SupplierBody({
  data,
  currency,
}: {
  data: SupplierPurchaseHistoryRecord;
  currency?: string | null;
}) {
  const s = data.summary;
  return (
    <>
      <div className={styles.hero}>
        <div>
          <p className={styles.figure}>{fmtMoney(s.totalSpent, currency)}</p>
          <p className={styles.meta}>
            {s.invoiceCount} bill{s.invoiceCount === 1 ? "" : "s"}
            {s.lastInvoiceDate
              ? ` · last ${fmtWhen(s.lastInvoiceDate)}`
              : ""}
          </p>
        </div>
      </div>
      <dl className={styles.tally}>
        <div>
          <dt>Paid</dt>
          <dd className={styles.paid}>{fmtMoney(s.totalPaid, currency)}</dd>
        </div>
        <div>
          <dt>Open</dt>
          <dd className={styles.owed}>{fmtMoney(s.openBalance, currency)}</dd>
        </div>
        <div>
          <dt>Partial</dt>
          <dd>{fmtMoney(s.partialOpenBalance ?? 0, currency)}</dd>
        </div>
      </dl>
      <div className={styles.ledger}>
        <div className={styles.ledgerHead}>
          <span>Bills</span>
          <span>Amount</span>
        </div>
        {data.orders.length === 0 ? (
          <p className={styles.empty}>No supplies on file for this name.</p>
        ) : (
          <ul className={styles.rows}>
            {data.orders.map((row) => (
              <li key={row.supplierInvoiceId} className={styles.row}>
                <span>
                  <span className={styles.kind}>
                    {row.invoiceNumber || "Supply"}
                  </span>
                  <span className={styles.sub}>
                    {fmtWhen(row.createdAt || row.invoiceDate)} ·{" "}
                    {row.paymentStatus.toLowerCase()} · {row.lineCount} line
                    {row.lineCount === 1 ? "" : "s"}
                  </span>
                </span>
                <span className={styles.amt}>
                  {fmtMoney(row.grandTotal, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function CreditBody({
  charged,
  paid,
  owed,
  lines,
  purchases,
  currency,
}: {
  charged: number;
  paid: number;
  owed: number;
  lines: CreditStatementLineRecord[];
  purchases: TabPurchaseRowRecord[];
  currency?: string | null;
}) {
  const ledger = [...lines].reverse();
  return (
    <>
      <div className={styles.hero}>
        <div>
          <p className={cn(styles.figure, styles.figureOwed)}>
            {fmtMoney(owed, currency)}
          </p>
          <p className={styles.meta}>Still on tab</p>
        </div>
      </div>
      <dl className={styles.tally}>
        <div>
          <dt>Charged</dt>
          <dd>{fmtMoney(charged, currency)}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd className={styles.paid}>{fmtMoney(paid, currency)}</dd>
        </div>
        <div>
          <dt>Purchases</dt>
          <dd>{purchases.length}</dd>
        </div>
      </dl>
      <div className={styles.ledger}>
        <div className={styles.ledgerHead}>
          <span>Ledger</span>
          <span>Amount</span>
        </div>
        {ledger.length === 0 ? (
          <p className={styles.empty}>No charges or payments on file yet.</p>
        ) : (
          <ul className={styles.rows}>
            {ledger.map((line, i) => {
              const debit = toNum(line.debit);
              const credit = toNum(line.credit);
              const paidLine = line.kind === "credit_payment";
              const amount = paidLine || credit > 0 ? credit : debit;
              return (
                <li key={`${line.at}-${line.kind}-${i}`} className={styles.row}>
                  <span>
                    <span className={styles.kind}>
                      {creditLabel(line.kind, line.memo)}
                    </span>
                    <span className={styles.sub}>{fmtWhen(line.at)}</span>
                  </span>
                  <span
                    className={cn(styles.amt, paidLine && styles.paid)}
                  >
                    {paidLine ? "−" : "+"}
                    {fmtMoney(amount, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {purchases.length > 0 ? (
        <div className={styles.ledger}>
          <div className={styles.ledgerHead}>
            <span>On the till</span>
            <span>Tab</span>
          </div>
          <ul className={styles.rows}>
            {purchases.slice(0, 12).map((row) => (
              <li key={row.saleId} className={styles.row}>
                <span>
                  <span className={styles.kind}>
                    {row.receiptNo != null ? `#${row.receiptNo}` : "Sale"}
                  </span>
                  <span className={styles.sub}>
                    {fmtWhen(row.soldAt)} · {row.lines.length} item
                    {row.lines.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className={styles.amt}>
                  {fmtMoney(row.creditAmount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function ShopperBody({
  orders,
  purchases,
  currency,
}: {
  orders: WebOrderSummary[];
  purchases: TabPurchaseRowRecord[];
  currency?: string | null;
}) {
  const spent = orders.reduce((sum, o) => sum + toNum(o.grandTotal), 0);
  return (
    <>
      <div className={styles.hero}>
        <div>
          <p className={styles.figure}>{fmtMoney(spent, currency)}</p>
          <p className={styles.meta}>
            {orders.length} web order{orders.length === 1 ? "" : "s"}
            {purchases.length > 0
              ? ` · ${purchases.length} till purchase${purchases.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
      </div>
      <div className={styles.ledger}>
        <div className={styles.ledgerHead}>
          <span>Web orders</span>
          <span>Total</span>
        </div>
        {orders.length === 0 ? (
          <p className={styles.empty}>No matching web orders in the recent list.</p>
        ) : (
          <ul className={styles.rows}>
            {orders.map((order) => (
              <li key={order.id} className={styles.row}>
                <span>
                  <Link
                    href={`${APP_ROUTES.storefrontWebOrders}?orderId=${encodeURIComponent(order.id)}`}
                    className={styles.kind}
                  >
                    {order.orderCode?.trim() || "Order"}
                  </Link>
                  <span className={styles.sub}>
                    {fmtWhen(order.createdAt)} ·{" "}
                    {(order.fulfillmentStatus ?? order.status)
                      .replaceAll("_", " ")
                      .toLowerCase()}
                  </span>
                </span>
                <span className={styles.amt}>
                  {fmtMoney(order.grandTotal, order.currency || currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {purchases.length > 0 ? (
        <div className={styles.ledger}>
          <div className={styles.ledgerHead}>
            <span>Till</span>
            <span>Tab</span>
          </div>
          <ul className={styles.rows}>
            {purchases.slice(0, 12).map((row) => (
              <li key={row.saleId} className={styles.row}>
                <span>
                  <span className={styles.kind}>
                    {row.receiptNo != null ? `#${row.receiptNo}` : "Sale"}
                  </span>
                  <span className={styles.sub}>{fmtWhen(row.soldAt)}</span>
                </span>
                <span className={styles.amt}>
                  {fmtMoney(row.creditAmount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

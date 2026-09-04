"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import { formatPaymentMethodLabel } from "@/lib/sale-payment-filter";
import type {
  AuditEventRecord,
  CreditCollectionRowRecord,
  OutstandingTabRowRecord,
  PaymentLedgerRow,
} from "@/lib/api";

const OWED = "#9a2e16";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

function humanizeEvent(eventType: string): string {
  return eventType
    .split(/[._]/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function Panel({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {hrefLabel ?? "Open"}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatusMark({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "info";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.04em]",
        tone === "ok" && "text-emerald-700",
        tone === "warn" && "text-amber-700",
        tone === "bad" && "text-[#9a2e16]",
        tone === "info" && "text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-3 py-6 text-center text-xs text-muted-foreground"
      >
        {children}
      </td>
    </tr>
  );
}

function paymentStatus(row: PaymentLedgerRow): {
  tone: "ok" | "warn" | "bad" | "info";
  label: string;
} {
  const method = row.method.trim().toLowerCase();
  const status = row.status.trim().toLowerCase();
  if (status && status !== "completed" && status !== "paid") {
    return { tone: "warn", label: status };
  }
  if ((method === "mpesa" || method === "mpesa_manual") && row.mpesaVerified === false) {
    return { tone: "warn", label: "Unverified" };
  }
  return { tone: "ok", label: "Posted" };
}

export type AnalyticsOpsBoardProps = {
  money: (n: number | string | null | undefined) => string;
  payments: PaymentLedgerRow[];
  tabs: OutstandingTabRowRecord[];
  collections: CreditCollectionRowRecord[];
  audit: AuditEventRecord[];
  imported: number;
  allocated: number;
  unallocated: number;
  balanced: boolean;
  openShifts: number;
  unverifiedMpesa: number;
  canViewAudit: boolean;
};

export function AnalyticsOpsBoard({
  money,
  payments,
  tabs,
  collections,
  audit,
  imported,
  allocated,
  unallocated,
  balanced,
  openShifts,
  unverifiedMpesa,
  canViewAudit,
}: AnalyticsOpsBoardProps) {
  const reviewRows = payments.filter((row) => {
    const st = paymentStatus(row);
    return st.tone !== "ok";
  });
  const shownPayments = payments.slice(0, 7);
  const shownReview = (reviewRows.length > 0 ? reviewRows : payments).slice(0, 7);
  const shownTabs = [...tabs]
    .sort((a, b) => toNum(b.balanceOwed) - toNum(a.balanceOwed))
    .slice(0, 7);
  const shownPaid = collections.slice(0, 4);
  const exceptions = [
    ...payments
      .filter((row) => paymentStatus(row).tone !== "ok")
      .slice(0, 5)
      .map((row) => ({
        key: row.paymentId,
        type:
          row.mpesaVerified === false ? "Unverified M-Pesa" : "Open tender",
        detail: `${formatPaymentMethodLabel(row.method)} · ${row.customerName || row.cashierName || "Sale"}`,
        amount: toNum(row.amount),
        when: row.soldAt,
      })),
    ...tabs
      .filter((t) => t.creditSuspended)
      .slice(0, 3)
      .map((t) => ({
        key: `tab-${t.customerId}`,
        type: "Suspended tab",
        detail: t.name,
        amount: toNum(t.balanceOwed),
        when: "",
      })),
  ].slice(0, 7);

  const checks: { done: boolean; label: string; href: string }[] = [
    {
      done: payments.length > 0,
      label: "Read the day ledger",
      href: APP_ROUTES.paymentsDayLedger,
    },
    {
      done: unverifiedMpesa === 0,
      label: "Verify M-Pesa receipts",
      href: APP_ROUTES.paymentsDayLedger,
    },
    {
      done: openShifts === 0,
      label: "Close open shifts",
      href: APP_ROUTES.shifts,
    },
    {
      done: tabs.length === 0,
      label: "Collect open tabs",
      href: APP_ROUTES.creditsOnTab,
    },
    {
      done: exceptions.length === 0,
      label: "Clear exceptions",
      href: APP_ROUTES.paymentsDayLedger,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Payments (all channels)"
          href={APP_ROUTES.paymentsDayLedger}
          hrefLabel="Day ledger"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-[12px]">
              <thead className="border-b border-border text-muted-foreground">
                <tr className="text-[11px]">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">Payer</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shownPayments.length === 0 ? (
                  <EmptyRow cols={5}>No tenders in this window.</EmptyRow>
                ) : (
                  shownPayments.map((row) => {
                    const st = paymentStatus(row);
                    return (
                      <tr
                        key={row.paymentId}
                        className="border-b border-border last:border-0"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {formatWhen(row.soldAt)}
                        </td>
                        <td className="px-3 py-2">
                          {formatPaymentMethodLabel(row.method)}
                        </td>
                        <td className="max-w-[9rem] truncate px-3 py-2">
                          {row.customerName || row.cashierName || "Walk-in"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {money(row.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusMark tone={st.tone}>{st.label}</StatusMark>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Review queue"
          href={APP_ROUTES.paymentsDayLedger}
          hrefLabel="Review"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-[12px]">
              <thead className="border-b border-border text-muted-foreground">
                <tr className="text-[11px]">
                  <th className="px-3 py-2 font-medium">Receipt</th>
                  <th className="px-3 py-2 font-medium">Match</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {shownReview.length === 0 ? (
                  <EmptyRow cols={5}>Nothing waiting to review.</EmptyRow>
                ) : (
                  shownReview.map((row) => (
                    <tr
                      key={row.paymentId}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 tabular-nums">
                        {row.receiptNo != null ? `#${row.receiptNo}` : "No receipt"}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2">
                        {row.customerName || row.cashierName || "Walk-in"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatPaymentMethodLabel(row.method)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={APP_ROUTES.paymentsDayLedger}
                          className="inline-flex h-8 items-center border border-border px-2.5 text-[11px] font-semibold hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Tabs and collections"
          href={APP_ROUTES.creditsOnTab}
          hrefLabel="Credits"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-[12px]">
              <thead className="border-b border-border text-muted-foreground">
                <tr className="text-[11px]">
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 text-right font-medium">Owed</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shownTabs.length === 0 && shownPaid.length === 0 ? (
                  <EmptyRow cols={3}>No open tabs in this slice.</EmptyRow>
                ) : (
                  <>
                    {shownTabs.map((row) => (
                      <tr
                        key={row.customerId}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2">{row.name}</td>
                        <td
                          className="px-3 py-2 text-right tabular-nums"
                          style={{ color: OWED }}
                        >
                          {money(row.balanceOwed)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusMark tone={row.creditSuspended ? "bad" : "warn"}>
                            {row.creditSuspended ? "Suspended" : "Open"}
                          </StatusMark>
                        </td>
                      </tr>
                    ))}
                    {shownPaid.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {money(row.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusMark tone="ok">Collected</StatusMark>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Exception queue"
          href={APP_ROUTES.paymentsDayLedger}
          hrefLabel="Ledger"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-[12px]">
              <thead className="border-b border-border text-muted-foreground">
                <tr className="text-[11px]">
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Detail</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.length === 0 ? (
                  <EmptyRow cols={4}>No exceptions in this window.</EmptyRow>
                ) : (
                  exceptions.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2">{row.type}</td>
                      <td className="max-w-[12rem] truncate px-3 py-2 text-muted-foreground">
                        {row.detail}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusMark tone="info">Open</StatusMark>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Reconciliation">
          <div className="space-y-2 px-3 py-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Imported</span>
              <span className="tabular-nums font-semibold">{money(imported)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Allocated</span>
              <span className="tabular-nums font-semibold">{money(allocated)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Unallocated</span>
              <span
                className="tabular-nums font-semibold"
                style={{ color: unallocated > 0 ? OWED : undefined }}
              >
                {money(unallocated)}
              </span>
            </div>
            <div className="mt-2 border-t border-border pt-3">
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.04em]",
                  balanced ? "text-emerald-700" : "text-[#9a2e16]",
                )}
              >
                {balanced ? <Check className="size-3.5" aria-hidden /> : null}
                {balanced ? "Balanced" : "Needs review"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {balanced
                  ? "Posted tenders match the period total."
                  : "Open tenders or tabs still need a pass."}
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Period close">
          <ul className="grid gap-0 px-2 py-1">
            {checks.map((item) => (
              <li key={item.label} className="border-b border-border last:border-0">
                <Link
                  href={item.href}
                  className="flex min-h-10 items-center gap-2 px-1 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center border border-border",
                      item.done && "border-emerald-700 text-emerald-700",
                    )}
                    aria-hidden
                  >
                    {item.done ? <Check className="size-3" /> : null}
                  </span>
                  <span className={item.done ? "text-muted-foreground line-through" : undefined}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Activity log"
          href={canViewAudit ? APP_ROUTES.businessLogs : undefined}
          hrefLabel="Full log"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-[12px]">
              <thead className="border-b border-border text-muted-foreground">
                <tr className="text-[11px]">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Who</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {!canViewAudit ? (
                  <EmptyRow cols={3}>You do not have the activity log.</EmptyRow>
                ) : audit.length === 0 ? (
                  <EmptyRow cols={3}>No entries in this window.</EmptyRow>
                ) : (
                  audit.slice(0, 6).map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatDay(row.createdAt)}
                      </td>
                      <td className="max-w-[7rem] truncate px-3 py-2">
                        {row.actorName || row.actorType || "System"}
                      </td>
                      <td className="px-3 py-2">
                        {humanizeEvent(row.eventType)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

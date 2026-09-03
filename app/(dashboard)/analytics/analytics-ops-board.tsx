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

const INK = "#0c3a66";
const MUTED = "#3a5570";
const LINE = "#d5deea";
const HEAD = "#eef3f8";
const NAVY = "#0c3a66";

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

function WhiteCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-none bg-white", className)}
      style={{ boxShadow: "0 4px 14px rgba(7, 30, 54, 0.22)" }}
    >
      {children}
    </div>
  );
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
    <WhiteCard className="flex min-h-0 flex-col">
      <div
        className="flex items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: LINE }}
      >
        <h2
          className="text-[12px] font-semibold uppercase tracking-[-0.02em]"
          style={{ color: INK }}
        >
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            className="text-[11px] font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ color: NAVY }}
          >
            {hrefLabel ?? "Open"}
          </Link>
        ) : null}
      </div>
      {children}
    </WhiteCard>
  );
}

function StatusMark({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "info";
  children: React.ReactNode;
}) {
  const style =
    tone === "ok"
      ? { background: "#d8f0d8", color: "#1a6b2a" }
      : tone === "warn"
        ? { background: "#f7e7b0", color: "#8a5a00" }
        : tone === "bad"
          ? { background: "#f4d0d0", color: "#9b1c1c" }
          : { background: "#d4e4f4", color: INK };
  return (
    <span
      className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[-0.02em]"
      style={style}
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
        className="px-3 py-6 text-center text-xs"
        style={{ color: MUTED }}
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
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Payments (all channels)"
          href={APP_ROUTES.paymentsDayLedger}
          hrefLabel="Day ledger"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-[12px]">
              <thead style={{ background: HEAD, color: MUTED }}>
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
                        className="border-b last:border-0"
                        style={{ borderColor: "#eef1f4" }}
                      >
                        <td className="whitespace-nowrap px-3 py-2" style={{ color: MUTED }}>
                          {formatWhen(row.soldAt)}
                        </td>
                        <td className="px-3 py-2" style={{ color: INK }}>
                          {formatPaymentMethodLabel(row.method)}
                        </td>
                        <td className="max-w-[9rem] truncate px-3 py-2" style={{ color: INK }}>
                          {row.customerName || row.cashierName || "Walk-in"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: INK }}>
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
              <thead style={{ background: HEAD, color: MUTED }}>
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
                      className="border-b last:border-0"
                      style={{ borderColor: "#eef1f4" }}
                    >
                      <td className="px-3 py-2 tabular-nums" style={{ color: INK }}>
                        {row.receiptNo != null ? `#${row.receiptNo}` : "No receipt"}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2" style={{ color: INK }}>
                        {row.customerName || row.cashierName || "Walk-in"}
                      </td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>
                        {formatPaymentMethodLabel(row.method)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: INK }}>
                        {money(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={APP_ROUTES.paymentsDayLedger}
                          className="inline-flex h-8 items-center px-2.5 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                          style={{ background: NAVY }}
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
              <thead style={{ background: HEAD, color: MUTED }}>
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
                        className="border-b last:border-0"
                        style={{ borderColor: "#eef1f4" }}
                      >
                        <td className="px-3 py-2" style={{ color: INK }}>
                          {row.name}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: INK }}>
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
                        className="border-b last:border-0"
                        style={{ borderColor: "#eef1f4" }}
                      >
                        <td className="px-3 py-2" style={{ color: INK }}>
                          {row.name}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: MUTED }}>
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
              <thead style={{ background: HEAD, color: MUTED }}>
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
                      className="border-b last:border-0"
                      style={{ borderColor: "#eef1f4" }}
                    >
                      <td className="px-3 py-2" style={{ color: INK }}>
                        {row.type}
                      </td>
                      <td className="max-w-[12rem] truncate px-3 py-2" style={{ color: MUTED }}>
                        {row.detail}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: INK }}>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Reconciliation">
          <div className="space-y-2 px-4 py-4 text-[13px]">
            <div className="flex justify-between gap-3">
              <span style={{ color: MUTED }}>Imported</span>
              <span className="tabular-nums font-semibold" style={{ color: INK }}>
                {money(imported)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span style={{ color: MUTED }}>Allocated</span>
              <span className="tabular-nums font-semibold" style={{ color: INK }}>
                {money(allocated)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span style={{ color: MUTED }}>Unallocated</span>
              <span
                className="tabular-nums font-semibold"
                style={{ color: unallocated > 0 ? "#c05612" : INK }}
              >
                {money(unallocated)}
              </span>
            </div>
            <div
              className="mt-3 flex items-center gap-2 px-3 py-3 text-white"
              style={{ background: balanced ? "#1a6b2a" : "#8a5a00" }}
            >
              {balanced ? <Check className="size-4 shrink-0" aria-hidden /> : null}
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[-0.02em]">
                  {balanced ? "Balanced" : "Needs review"}
                </p>
                <p className="text-[11px] text-white/85">
                  {balanced
                    ? "Posted tenders match the period total."
                    : "Open tenders or tabs still need a pass."}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Period close">
          <ul className="grid gap-1 px-3 py-3 sm:grid-cols-1">
            {checks.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center gap-2 px-1 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ color: INK }}
                >
                  <span
                    className="flex size-5 shrink-0 items-center justify-center border"
                    style={{
                      borderColor: item.done ? "#1a6b2a" : LINE,
                      background: item.done ? "#d8f0d8" : "#fff",
                      color: "#1a6b2a",
                    }}
                    aria-hidden
                  >
                    {item.done ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className={item.done ? "line-through opacity-60" : undefined}>
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
              <thead style={{ background: HEAD, color: MUTED }}>
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
                      className="border-b last:border-0"
                      style={{ borderColor: "#eef1f4" }}
                    >
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: MUTED }}>
                        {formatDay(row.createdAt)}
                      </td>
                      <td className="max-w-[7rem] truncate px-3 py-2" style={{ color: INK }}>
                        {row.actorName || row.actorType || "System"}
                      </td>
                      <td className="px-3 py-2" style={{ color: INK }}>
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

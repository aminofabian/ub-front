"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  BadgeCheck,
  ChevronDown,
  Clock,
  Download,
  List,
  Pencil,
  Plus,
  Receipt,
  Search,
} from "lucide-react";

import { ReceiptLookupBanner } from "@/components/sales/receipt-lookup-banner";
import { SaleReceiptActions } from "@/components/sales/sale-receipt-actions";
import { useReceiptLookup } from "@/components/sales/use-receipt-lookup";
import { useMpesaCodeLookup } from "@/components/sales/use-mpesa-code-lookup";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  ALL_SHELF_ZONES_LABEL,
  useSessionAisle,
  useSessionBranch,
  useSessionItemType,
  useSyncBranchFilter,
} from "@/hooks/use-session-scope";
import { AdjustSalePaymentDialog } from "@/components/sales/adjust-sale-payment-dialog";
import { VoidSaleDialog } from "@/components/sales/void-sale-dialog";
import {
  SalesFeedFilters,
  DATE_FILTER_OPTIONS,
  type SalesDatePreset,
  type StatusFilter,
} from "@/components/sales/sales-feed-filters";
import { cn } from "@/lib/utils";
import { textMatchesQuery } from "@/lib/text-search";
import {
  groupLinesIntoTransactions,
  txDisplayNo,
  type SaleTransaction,
} from "@/lib/sale-transactions";
import { formatDateRangeLabel, presetRange } from "@/lib/analytics-date-range";
import {
  fetchBranches,
  type BranchRecord,
  type RecentSaleRow,
} from "@/lib/api";
import { fetchMergedSalesActivity } from "@/lib/sales-activity";
import {
  matchesChannelFilter,
  matchesStatusWithChannel,
  normalizeSaleChannel,
  type ChannelFilter,
} from "@/lib/sale-channel-filter";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatPaymentMethodLabel,
  formatSalePaymentDisplay,
  matchesPaymentFilter,
  salePaymentCategories,
  type PaymentFilter,
} from "@/lib/sale-payment-filter";
import {
  buildSalesActivityPdf,
  downloadBlob,
  salesActivityPdfFilename,
} from "@/lib/sales-activity-pdf";

const POLL_MS = 8_000;
const LEDGER = "#0D3B2E";
const LEDGER_INK = "#F4F2EC";
const LEDGER_MUTED = "rgba(244,242,236,0.72)";
const PEAK = "#86E8B8";
const INK = "#121A16";
const MUTED = "#5C675F";
const HOUR_BAR_MAX_PX = 120;
const HOUR_CHART_PX = 152;
const NEAR_PEAK_SHARE = 0.85;
const PAPER_CARD =
  "rounded-[20px] bg-[#FFFEFB] shadow-[0_1px_2px_rgba(18,26,22,0.05)]";

const PAYMENT_TINTS: Record<string, string> = {
  mpesa: "#2C8A5E",
  cash: "#9FE0C0",
  split: "#3E6D8C",
  credit: "#E9A15A",
  wallet: "#7A6AAB",
  loyalty: "#C46B8A",
  other: "#8A938C",
};

/** The single payment bucket a sale is attributed to in the payment-mix card. */
function primaryPaymentKey(
  paymentMethod: string,
  paymentMethods?: string | null,
): PaymentFilter {
  const cats = salePaymentCategories(paymentMethod, paymentMethods);
  if (cats.has("split")) return "split";
  for (const key of ["mpesa", "cash", "credit", "wallet", "loyalty"] as const) {
    if (cats.has(key)) return key;
  }
  return "other";
}

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function fmtAmount(n: number | string | null | undefined): string {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Math.round(toNum(n)));
}

function fmtKes(n: number | string | null | undefined): string {
  return `Ksh ${fmtAmount(n)}`;
}

function takenCaption(preset: SalesDatePreset): string {
  switch (preset) {
    case "today":
      return "Taken today";
    case "yesterday":
      return "Taken yesterday";
    case "last3":
      return "Taken, last 3 days";
    case "last7":
      return "Taken, last 7 days";
    case "last30":
      return "Taken, last 30 days";
    case "thisMonth":
      return "Taken this month";
    default:
      return "Taken";
  }
}

function axisTick(label: string, hourly: boolean): string {
  if (hourly) return label.slice(0, 2);
  return label.slice(-2);
}

function peakWhenLabel(label: string, hourly: boolean): string {
  if (hourly) return label;
  const [month, day] = label.split("-");
  const monthNum = Number(month);
  const dayNum = Number(day);
  if (!monthNum || !dayNum) return label;
  return new Date(2000, monthNum - 1, dayNum).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

function barHeightPx(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(4, Math.round((value / max) * HOUR_BAR_MAX_PX));
}

function barColor(value: number, max: number, peak: boolean): string {
  if (peak) return PEAK;
  if (max > 0 && value / max >= NEAR_PEAK_SHARE) return "rgba(255,255,255,0.5)";
  return "rgba(255,255,255,0.28)";
}

function clockLabel(nowMs: number): string {
  return new Date(nowMs).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function todayHeading(nowMs: number): string {
  return new Date(nowMs).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SalesScopeLine({ nowMs }: { nowMs: number }) {
  const { branchName } = useSessionBranch();
  const { itemTypeLabel } = useSessionItemType();
  const { aisleLabel } = useSessionAisle();
  const parts: string[] = [];
  if (branchName) parts.push(branchName);
  if (itemTypeLabel) parts.push(itemTypeLabel);
  if (aisleLabel && aisleLabel !== ALL_SHELF_ZONES_LABEL) parts.push(aisleLabel);
  const iso = new Date(nowMs).toISOString().slice(0, 10);

  return (
    <p className="mt-1.5 text-[13.5px]" style={{ color: MUTED }}>
      {parts.length > 0 ? <span>{parts.join(" · ")} · </span> : null}
      <time dateTime={iso}>{todayHeading(nowMs)}</time>
    </p>
  );
}

function formatQty(q: number | string): string {
  const n = toNum(q);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function formatSoldTime(
  iso: string,
  nowMs: number,
  options: { relative?: boolean },
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (options.relative) {
    const diffSec = Math.floor((nowMs - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return d.toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rowKey(row: RecentSaleRow, index: number): string {
  return `${row.saleId}-${row.itemId}-${row.soldAt}-${index}`;
}

function isRefunded(status: string | undefined): boolean {
  return (status?.toLowerCase() ?? "").includes("refund");
}

/** POS sales that are still live: not online, refunded or already voided. */
function isMutableSale(tx: SaleTransaction): boolean {
  if (tx.channel === "online_store") return false;
  const status = tx.status?.toLowerCase() ?? "";
  if (status.includes("refund") || status.includes("void")) return false;
  return true;
}

/** A void is refused for any sale with a refund, including a partial one. */
function canVoidSale(tx: SaleTransaction): boolean {
  return isMutableSale(tx) && !tx.lines.some((line) => isRefunded(line.status));
}

function LedgerBar({
  value,
  max,
  tick,
  title,
  peak,
  showTick,
}: {
  value: number;
  max: number;
  tick: string;
  title: string;
  peak: boolean;
  showTick: boolean;
}) {
  return (
    <div
      title={title}
      className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
    >
      <div
        className="rounded-t-[6px] rounded-b-[2px] motion-reduce:transition-none"
        style={{
          height: barHeightPx(value, max),
          background: barColor(value, max, peak),
          transition: "height 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <span
        className={cn(
          "text-center text-[12px] tabular-nums leading-none",
          peak ? "font-bold" : "font-medium",
          !showTick && "invisible",
        )}
        style={{ color: peak ? PEAK : LEDGER_MUTED }}
      >
        {tick}
      </span>
    </div>
  );
}

function LedgerBars({
  values,
  labels,
  hourly,
}: {
  values: number[];
  labels: string[];
  hourly: boolean;
}) {
  const max = Math.max(...values, 1);
  const peakIdx = values.reduce(
    (best, v, i) => (v > (values[best] ?? 0) ? i : best),
    0,
  );
  const peakValue = values[peakIdx] ?? 0;
  if (peakValue <= 0 || values.length < 2) return null;
  const from = hourly ? labels[0] : peakWhenLabel(labels[0] ?? "", false);
  const to = hourly
    ? labels[labels.length - 1]
    : peakWhenLabel(labels[labels.length - 1] ?? "", false);
  const when = peakWhenLabel(labels[peakIdx] ?? "", hourly);
  const dense = labels.length > 16;

  return (
    <div
      role="img"
      aria-label={`Sales ${hourly ? "by hour" : "by day"} from ${from} to ${to}. Peak at ${when} with ${fmtKes(peakValue)}.`}
      className="flex items-end gap-2"
      style={{ height: HOUR_CHART_PX }}
    >
      {values.map((value, i) => {
        const label = labels[i] ?? "";
        const peak = value > 0 && value === peakValue;
        return (
          <LedgerBar
            key={`${label}-${i}`}
            value={value}
            max={max}
            tick={axisTick(label, hourly)}
            title={`${hourly ? label : peakWhenLabel(label, false)} · ${fmtKes(value)}${peak ? " (peak)" : ""}`}
            peak={peak}
            showTick={!dense || peak || i === 0 || i === values.length - 1}
          />
        );
      })}
    </div>
  );
}

function LedgerHero({
  caption,
  amount,
  peak,
  chart,
  note,
}: {
  caption: string;
  amount: number;
  peak: { caption: string; when: string; amount: number } | null;
  chart: ReactNode;
  note?: string | null;
}) {
  return (
    <section
      className="flex flex-col gap-7 rounded-[24px] p-5 sm:p-7"
      style={{ background: LEDGER, color: LEDGER_INK }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[14px] font-medium" style={{ color: LEDGER_MUTED }}>
            {caption}
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5 tabular-nums">
            <span className="text-[28px] font-medium" style={{ color: LEDGER_MUTED }}>
              Ksh
            </span>
            <span className="text-[3.25rem] font-semibold leading-none tracking-[-0.03em] sm:text-[4.5rem]">
              {fmtAmount(amount)}
            </span>
          </div>
        </div>
        {peak ? (
          <div
            className="flex items-center gap-3.5 rounded-[16px] px-[18px] py-3"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <span className="text-[13px]" style={{ color: LEDGER_MUTED }}>
              {peak.caption}
            </span>
            <span
              className="text-[20px] font-semibold tabular-nums"
              style={{ color: PEAK }}
            >
              {peak.when}
            </span>
            <span
              className="text-[14px] tabular-nums"
              style={{ color: "rgba(244,242,236,0.9)" }}
            >
              {fmtKes(peak.amount)}
            </span>
          </div>
        ) : null}
      </div>
      {chart}
      {note ? (
        <p className="text-[14px]" style={{ color: LEDGER_MUTED }}>
          {note}
        </p>
      ) : null}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  warn,
  textual,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  textual?: boolean;
  className?: string;
}) {
  return (
    <article className={cn(PAPER_CARD, "flex flex-col px-5 py-4", className)}>
      <p className="text-[13px] font-medium" style={{ color: MUTED }}>
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-semibold tracking-[-0.03em]",
          textual
            ? "line-clamp-2 text-[1.35rem] leading-tight"
            : "text-[2rem] leading-none tabular-nums",
        )}
        style={{ color: warn ? "#9a2e16" : INK }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-[13px]" style={{ color: MUTED }}>
          {hint}
        </p>
      ) : null}
    </article>
  );
}

function PaymentMix({
  mix,
  total,
}: {
  mix: { method: string; amount: number }[];
  total: number;
}) {
  if (mix.length === 0 || total <= 0) return null;
  return (
    <section className={cn(PAPER_CARD, "px-5 py-5")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold" style={{ color: INK }}>
          Payment mix
        </h2>
        <p className="text-[13px] tabular-nums" style={{ color: MUTED }}>
          {fmtKes(total)} total
        </p>
      </div>
      <div
        className="mt-4 flex h-2.5 overflow-hidden rounded-full"
        style={{ background: "#EFEBE3" }}
      >
        {mix.map(({ method, amount }) => (
          <div
            key={method}
            title={`${formatPaymentMethodLabel(method)} ${fmtKes(amount)}`}
            style={{
              flexGrow: amount,
              flexBasis: 0,
              background: PAYMENT_TINTS[method] ?? PAYMENT_TINTS.other,
            }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {mix.map(({ method, amount }) => {
          const pct = Math.round((amount / total) * 100);
          return (
            <li key={method} className="flex items-center gap-2.5 text-[14px]">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{
                  background: PAYMENT_TINTS[method] ?? PAYMENT_TINTS.other,
                }}
              />
              <span className="font-medium" style={{ color: INK }}>
                {formatPaymentMethodLabel(method)}
              </span>
              <span className="ml-auto tabular-nums" style={{ color: INK }}>
                {fmtKes(amount)}
              </span>
              <span
                className="w-10 text-right tabular-nums"
                style={{ color: MUTED }}
              >
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function peakFromTrend(
  trend: { values: number[]; labels: string[] },
  hourly: boolean,
): { caption: string; when: string; amount: number } | null {
  if (trend.values.length === 0) return null;
  const peakIdx = trend.values.reduce(
    (best, v, i) => (v > (trend.values[best] ?? 0) ? i : best),
    0,
  );
  const amount = trend.values[peakIdx] ?? 0;
  if (amount <= 0) return null;
  return {
    caption: hourly ? "Peak hour" : "Peak day",
    when: peakWhenLabel(trend.labels[peakIdx] ?? "", hourly),
    amount,
  };
}

function SalesLedger({
  datePreset,
  hourly,
  needsDates,
  error,
  loading,
  summary,
  trend,
}: {
  datePreset: SalesDatePreset;
  hourly: boolean;
  needsDates: boolean;
  error: string | null;
  loading: boolean;
  summary: {
    revenue: number;
    transactions: number;
    units: number;
    lineCount: number;
    refundLines: number;
    refundTotal: number;
    avgTicket: number;
    topItem: string;
    paymentMix: { method: string; amount: number }[];
  };
  trend: { values: number[]; labels: string[] };
}) {
  if (loading && !needsDates && !error) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <div
          className="h-64 animate-pulse rounded-[24px]"
          style={{ background: LEDGER }}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(PAPER_CARD, "h-28 animate-pulse")} />
          ))}
        </div>
      </div>
    );
  }

  const quietFailure =
    Boolean(error) && summary.revenue <= 0 && summary.transactions === 0;
  const peak = needsDates || quietFailure ? null : peakFromTrend(trend, hourly);
  const chart =
    needsDates || quietFailure || trend.values.filter((v) => v > 0).length < 2 ? null : (
      <LedgerBars values={trend.values} labels={trend.labels} hourly={hourly} />
    );
  const note = needsDates
    ? "Pick a start and end date."
    : error || chart || summary.revenue > 0
      ? null
      : "Nothing sold in this period.";
  const refunds = summary.refundLines > 0;

  return (
    <div className="flex flex-col gap-4">
      <LedgerHero
        caption={takenCaption(datePreset)}
        amount={needsDates || quietFailure ? 0 : summary.revenue}
        peak={peak}
        chart={chart}
        note={note}
      />
      {needsDates || quietFailure ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.25fr]">
            <StatCard
              label="Tickets"
              value={summary.transactions.toLocaleString("en-KE")}
              hint={
                summary.transactions > 0
                  ? `${fmtKes(summary.avgTicket)} average ticket`
                  : "No tickets yet"
              }
            />
            <StatCard
              label="Units sold"
              value={summary.units.toLocaleString("en-KE", {
                maximumFractionDigits: 1,
              })}
              hint={
                summary.lineCount > 0
                  ? `${summary.lineCount.toLocaleString("en-KE")} lines`
                  : undefined
              }
            />
            <StatCard
              className="sm:col-span-2 xl:col-span-1"
              textual={!refunds}
              label={refunds ? "Refunds" : "Top product"}
              value={refunds ? fmtKes(summary.refundTotal) : summary.topItem || "—"}
              hint={
                refunds
                  ? `${summary.refundLines} refunded line${summary.refundLines === 1 ? "" : "s"}`
                  : summary.topItem
                    ? datePreset === "today"
                      ? "Highest revenue today"
                      : "Highest revenue"
                    : "Nothing sold yet"
              }
              warn={refunds}
            />
          </div>
          <PaymentMix mix={summary.paymentMix} total={summary.revenue} />
        </>
      )}
    </div>
  );
}

/** Build hourly (today/yesterday) or daily buckets for a compact sparkline. */
function buildRevenueTrend(
  rows: RecentSaleRow[],
  opts: { hourly: boolean; from: string; to: string },
): { values: number[]; labels: string[] } {
  const buckets = new Map<string, number>();

  if (opts.hourly) {
    for (let h = 0; h < 24; h++) {
      buckets.set(String(h).padStart(2, "0"), 0);
    }
  } else {
    const start = new Date(`${opts.from}T00:00:00`);
    const end = new Date(`${opts.to}T00:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, 0);
    }
  }

  for (const row of rows) {
    if (isRefunded(row.status)) continue;
    const dt = new Date(row.soldAt);
    if (Number.isNaN(dt.getTime())) continue;
    const key = opts.hourly
      ? String(dt.getHours()).padStart(2, "0")
      : row.soldAt.slice(0, 10);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + toNum(row.lineTotal));
  }

  const entries = [...buckets.entries()];
  // For hourly: drop leading/trailing empty hours if there is any activity
  let slice = entries;
  if (opts.hourly) {
    const first = entries.findIndex(([, v]) => v > 0);
    let last = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
      if ((entries[i]?.[1] ?? 0) > 0) {
        last = i;
        break;
      }
    }
    if (first >= 0 && last >= first) {
      slice = entries.slice(
        Math.max(0, first - 1),
        Math.min(entries.length, last + 2),
      );
    }
  }

  return {
    values: slice.map(([, v]) => v),
    labels: slice.map(([k]) => (opts.hourly ? `${k}:00` : k.slice(5))),
  };
}

function FeedSkeleton() {
  return (
    <div className="divide-y divide-black/[0.06]" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2.5 px-4 py-3.5">
          <div className="flex justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted/70" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
          <div className="ml-0.5 h-3 w-56 animate-pulse rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}

function saleMetaParts(tx: SaleTransaction): string[] {
  const isOnline = tx.channel === "online_store";
  const parts: string[] = [];
  const pay = formatSalePaymentDisplay(tx.paymentMethod, tx.paymentMethods);
  const payKey = pay.toLowerCase();
  // Online rows already show an Online badge — skip repeating "Online checkout".
  if (
    !isOnline &&
    payKey &&
    payKey !== "online" &&
    payKey !== "online checkout"
  ) {
    parts.push(pay);
  }
  const customer = tx.customerName?.trim() ?? "";
  const cashier = tx.cashierName?.trim() ?? "";
  if (isOnline) {
    if (customer) parts.push(customer);
  } else {
    if (customer) parts.push(customer);
    if (cashier && cashier.toLowerCase() !== customer.toLowerCase()) {
      parts.push(cashier);
    }
  }
  if (tx.customerNo != null) parts.push(`C-${tx.customerNo}`);
  if (tx.customerMaskedHint) parts.push(tx.customerMaskedHint);
  if (tx.paymentReferences?.trim()) parts.push(tx.paymentReferences.trim());
  return parts;
}

const TICKET_ACTION =
  "h-8 gap-1.5 rounded-full border border-black/[0.1] bg-[#FFFEFB] px-3 text-[12.5px] font-medium text-[#121A16] shadow-none hover:bg-[#F6F3EC]";

function TicketStatus({
  refunded,
  online,
}: {
  refunded: boolean;
  online: boolean;
}) {
  const color = refunded ? "#9a2e16" : online ? MUTED : "#2C8A5E";
  const label = refunded ? "Refunded" : online ? "Online" : "Completed";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color }}>
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function SaleGroup({
  tx,
  nowMs,
  showRelativeTime,
  isNew,
  open,
  canAdjust,
  canVoid,
  onToggle,
  onAdjust,
  onVoid,
}: {
  tx: SaleTransaction;
  nowMs: number;
  showRelativeTime: boolean;
  isNew?: boolean;
  open: boolean;
  canAdjust: boolean;
  canVoid: boolean;
  onToggle: () => void;
  onAdjust: () => void;
  onVoid: () => void;
}) {
  const refunded = isRefunded(tx.status);
  const isOnline = tx.channel === "online_store";
  const receipt = txDisplayNo(tx);
  const showReceiptActions = !isOnline;
  const hasActions = showReceiptActions || canAdjust || canVoid;
  const detail = [
    ...saleMetaParts(tx),
    formatSoldTime(tx.soldAt, nowMs, { relative: showRelativeTime }),
    `${tx.lineCount} item${tx.lineCount === 1 ? "" : "s"}`,
  ];

  return (
    <article
      className={cn(
        "border-b border-black/[0.06] px-4 py-3.5 last:border-0 sm:px-5",
        refunded && "bg-[#9a2e16]/[0.03]",
        isNew && "bg-[#86E8B8]/25",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold tabular-nums" style={{ color: INK }}>
              #{receipt}
            </span>
            <TicketStatus refunded={refunded} online={isOnline} />
            {tx.mpesaVerified && !refunded ? (
              <span title="M-Pesa confirmed" className="inline-flex items-center gap-1 text-[12px] font-medium text-[#2C8A5E]">
                <BadgeCheck className="size-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-[13px]" style={{ color: MUTED }}>
            {tx.customerId ? (
              <Link
                href={APP_ROUTES.customer(tx.customerId)}
                className="underline-offset-2 hover:underline"
                style={{ color: LEDGER }}
              >
                {detail.join(" · ")}
              </Link>
            ) : (
              detail.join(" · ")
            )}
            {tx.customerId && !tx.customerPhoneVerified && tx.customerMaskedHint
              ? " · Unverified number"
              : null}
          </p>
        </div>
        <p
          className="shrink-0 text-[17px] font-semibold tabular-nums leading-none tracking-[-0.02em]"
          style={{ color: refunded ? "#9a2e16" : INK }}
        >
          {refunded && tx.total > 0 ? "−" : ""}
          {fmtKes(Math.abs(tx.total))}
        </p>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Hide sale ${receipt}` : `Show sale ${receipt}`}
          className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[#5C675F] hover:bg-black/[0.04]"
        >
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <ul className="mt-3 space-y-1.5 border-l border-black/[0.08] pl-3">
          {tx.lines.map((line, i) => {
            const lineRefunded = isRefunded(line.status);
            return (
              <li
                key={`${line.itemId}-${i}`}
                className="flex items-baseline justify-between gap-3 text-[13px] leading-snug"
              >
                <span className="min-w-0 truncate">
                  <span className="tabular-nums" style={{ color: MUTED }}>
                    {formatQty(line.quantity)}×
                  </span>
                  <span
                    className={cn("ml-1.5", lineRefunded && "line-through opacity-60")}
                    style={{ color: INK }}
                  >
                    {line.itemName}
                  </span>
                  <span className="ml-1.5 tabular-nums" style={{ color: MUTED }}>
                    @ {fmtKes(line.unitPrice)}
                  </span>
                </span>
                <span
                  className="shrink-0 tabular-nums"
                  style={{ color: lineRefunded ? "#9a2e16" : MUTED }}
                >
                  {lineRefunded ? "−" : ""}
                  {fmtKes(line.lineTotal)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {open && hasActions ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {showReceiptActions ? (
            <SaleReceiptActions
              saleId={tx.saleId}
              receiptLabel={receipt}
              buttonClassName={TICKET_ACTION}
            />
          ) : null}
          {canAdjust ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={TICKET_ACTION}
              onClick={onAdjust}
              aria-label={`Adjust payment for sale ${receipt}`}
            >
              <Pencil className="size-3.5" aria-hidden />
              Adjust payment
            </Button>
          ) : null}
          {canVoid ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-full border border-[#9a2e16]/35 bg-[#FFFEFB] px-3 text-[12.5px] font-medium text-[#9a2e16] shadow-none hover:bg-[#9a2e16]/[0.06]"
              onClick={onVoid}
              aria-label={`Void sale ${receipt}`}
            >
              <Ban className="size-3.5" aria-hidden />
              Void
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function SalesOverviewPage() {
  const {
    me,
    business,
    setBranchId: setHeaderBranchId,
    itemTypeId,
    headerScopeReady,
  } = useDashboard();
  const allowed =
    hasPermission(me?.permissions, Permission.SalesIntelligenceRead) ||
    hasPermission(me?.permissions, Permission.SalesSell);
  const canViewWebOrders = hasPermission(
    me?.permissions,
    Permission.StorefrontOrdersRead,
  );
  const canAdjustPayment = hasPermission(
    me?.permissions,
    Permission.SalesPaymentAdjust,
  );
  const canVoid =
    hasPermission(me?.permissions, Permission.SalesVoidAny) ||
    hasPermission(me?.permissions, Permission.SalesVoidOwn);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  /**
   * `useSyncBranchFilter` applies the header branch in an effect after mount.
   * Loading before that lands the (large) all-branches report and then repeats
   * the same query scoped to the branch, so wait for the scope first.
   */
  const [branchesReady, setBranchesReady] = useState(false);
  const [adjustSaleId, setAdjustSaleId] = useState<string | null>(null);
  const [adjustReceiptLabel, setAdjustReceiptLabel] = useState<
    string | undefined
  >();
  const [voidSaleId, setVoidSaleId] = useState<string | null>(null);
  const [voidReceiptLabel, setVoidReceiptLabel] = useState<
    string | undefined
  >();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [branchId, setBranchId] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });
  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      setHeaderBranchId(id.trim());
    },
    [setHeaderBranchId],
  );
  const [datePreset, setDatePreset] = useState<SalesDatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const searchParams = useSearchParams();
  // `?q=1563` lets the activity diary jump straight to a receipt.
  const [search, setSearch] = useState(() => searchParams.get("q")?.trim() ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);
  const [trackedListKey, setTrackedListKey] = useState("");
  const [lines, setLines] = useState<RecentSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [newSaleIds, setNewSaleIds] = useState<Set<string>>(new Set());

  const knownKeysRef = useRef<Set<string>>(new Set());

  const dateRange = useMemo(() => {
    if (datePreset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const isLivePeriod = datePreset === "today" && dateRange != null;

  const periodLabel = useMemo(() => {
    if (!dateRange) {
      return datePreset === "custom" ? "Choose a start and end date." : "";
    }
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange, datePreset]);

  useEffect(() => {
    void fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setBranchesReady(true));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!allowed || !headerScopeReady || !branchesReady) return;
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);

      if (!dateRange) {
        setLines([]);
        setLoading(false);
        return;
      }

      try {
        const rows = await fetchMergedSalesActivity(
          dateRange.from,
          dateRange.to,
          branchId.trim() || undefined,
          {
            includeOnlineStore: canViewWebOrders,
            itemTypeId: itemTypeId.trim() || undefined,
          },
        );

        const incomingKeys = new Set<string>();
        const freshSaleIds = new Set<string>();
        rows.forEach((row, index) => {
          const key = rowKey(row, index);
          incomingKeys.add(key);
          if (!knownKeysRef.current.has(key)) freshSaleIds.add(row.saleId);
        });

        if (isLivePeriod && silent && freshSaleIds.size > 0) {
          setNewSaleIds(freshSaleIds);
          window.setTimeout(() => setNewSaleIds(new Set()), 4_000);
        }

        knownKeysRef.current = incomingKeys;
        setLines(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sales.");
        if (!silent) setLines([]);
      } finally {
        setLoading(false);
      }
    },
    [
      allowed,
      branchId,
      branchesReady,
      canViewWebOrders,
      dateRange,
      headerScopeReady,
      isLivePeriod,
      itemTypeId,
    ],
  );

  useEffect(() => {
    knownKeysRef.current = new Set();
    void load();
  }, [load]);

  useEffect(() => {
    if (!allowed || loading || !isLivePeriod) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load({ silent: true });
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [allowed, loading, load, isLivePeriod]);

  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((row) => {
      if (!matchesChannelFilter(channelFilter, row.channel)) return false;
      if (!matchesStatusWithChannel(statusFilter, row.status, row.channel)) {
        return false;
      }
      if (
        !matchesPaymentFilter(
          paymentFilter,
          row.paymentMethod,
          row.paymentMethods,
        )
      ) {
        return false;
      }
      if (!q) return true;
      return textMatchesQuery(
        q,
        row.itemName,
        row.itemSku,
        row.itemBarcode,
        row.cashierName,
        row.customerName,
        row.paymentMethod,
        row.paymentMethods,
        row.paymentReferences,
        row.saleId,
        row.receiptNo,
      );
    });
  }, [lines, search, statusFilter, paymentFilter, channelFilter]);

  const transactions = useMemo(
    () => groupLinesIntoTransactions(filteredLines),
    [filteredLines],
  );

  const receiptAlreadyVisible = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#+/, "");
    if (!q) return false;
    return transactions.some(
      (tx) =>
        (tx.receiptNo != null && String(tx.receiptNo) === q) ||
        tx.saleId.toLowerCase().includes(q) ||
        (tx.paymentReferences ?? "").toLowerCase().includes(q),
    );
  }, [transactions, search]);

  const receiptLookup = useReceiptLookup(search, receiptAlreadyVisible);
  const mpesaCodeLookup = useMpesaCodeLookup(search, receiptAlreadyVisible);

  const filteredSummary = useMemo(() => {
    let revenue = 0;
    let units = 0;
    for (const tx of transactions) {
      if (!isRefunded(tx.status)) revenue += tx.total;
      for (const line of tx.lines) {
        if (!isRefunded(line.status)) units += toNum(line.quantity);
      }
    }
    return { revenue, units, count: transactions.length };
  }, [transactions]);

  const downloadPdf = useCallback(() => {
    if (!dateRange || pdfLoading) return;
    setPdfLoading(true);
    try {
      const branchLabel = branchId.trim()
        ? (branches.find((b) => b.id === branchId)?.name ?? "Branch")
        : "All branches";
      const blob = buildSalesActivityPdf({
        title: "Sales activity",
        businessLabel: business?.name ?? null,
        branchLabel,
        periodLabel: periodLabel || "Selected period",
        revenue: filteredSummary.revenue,
        transactionCount: filteredSummary.count,
        unitsSold: filteredSummary.units,
        transactions,
      });
      downloadBlob(
        blob,
        salesActivityPdfFilename({
          title: "sales-activity",
          from: dateRange.from,
          to: dateRange.to,
        }),
      );
    } finally {
      setPdfLoading(false);
    }
  }, [
    dateRange,
    pdfLoading,
    branchId,
    branches,
    business?.name,
    periodLabel,
    filteredSummary,
    transactions,
  ]);

  const summary = useMemo(() => {
    let revenue = 0;
    let refundTotal = 0;
    let refundLines = 0;
    const saleIds = new Set<string>();
    let units = 0;
    const byItem = new Map<string, { name: string; revenue: number }>();
    // Revenue by payment method + channel, counted once per sale (not per line).
    const byPayment = new Map<string, number>();
    let walkInRevenue = 0;
    let onlineRevenue = 0;
    const seenSaleTotals = new Map<string, number>();

    for (const row of lines) {
      const refunded = (row.status?.toLowerCase() ?? "").includes("refund");
      const total = toNum(row.lineTotal);
      if (refunded) {
        refundTotal += total;
        refundLines += 1;
        continue;
      }
      revenue += total;
      saleIds.add(row.saleId);
      units += toNum(row.quantity);
      const key = row.itemId || row.itemName;
      const prev = byItem.get(key);
      byItem.set(key, {
        name: row.itemName,
        revenue: (prev?.revenue ?? 0) + total,
      });

      // Attribute this line's revenue to its sale's payment method + channel.
      const method = primaryPaymentKey(row.paymentMethod, row.paymentMethods);
      byPayment.set(method, (byPayment.get(method) ?? 0) + total);
      if (normalizeSaleChannel(row.channel) === "online_store") {
        onlineRevenue += total;
      } else {
        walkInRevenue += total;
      }
      seenSaleTotals.set(row.saleId, (seenSaleTotals.get(row.saleId) ?? 0) + total);
    }

    let topItem = "";
    let topItemRevenue = 0;
    for (const { name, revenue: itemRev } of byItem.values()) {
      if (itemRev > topItemRevenue) {
        topItem = name;
        topItemRevenue = itemRev;
      }
    }

    const paymentMix = [...byPayment.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);

    const count = saleIds.size;
    return {
      revenue,
      transactions: count,
      units,
      lineCount: lines.length,
      refundLines,
      refundTotal,
      avgTicket: count > 0 ? revenue / count : 0,
      topItem,
      paymentMix,
      walkInRevenue,
      onlineRevenue,
    };
  }, [lines]);

  const revenueTrend = useMemo(() => {
    if (!dateRange || lines.length === 0) {
      return { values: [] as number[], labels: [] as string[] };
    }
    const hourly = datePreset === "today" || datePreset === "yesterday";
    return buildRevenueTrend(lines, {
      hourly,
      from: dateRange.from,
      to: dateRange.to,
    });
  }, [lines, dateRange, datePreset]);

  const feedFiltered =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    channelFilter !== "all";

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Sales"
        description="You do not have permission to view sales activity."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }

  const listKey = [
    datePreset,
    branchId,
    search,
    statusFilter,
    paymentFilter,
    channelFilter,
  ].join("|");
  if (trackedListKey !== listKey) {
    setTrackedListKey(listKey);
    setOpenSaleId(null);
  }
  const expandedSaleId =
    openSaleId === "" ? null : (openSaleId ?? transactions[0]?.saleId ?? null);
  const hourlyTrend = datePreset === "today" || datePreset === "yesterday";

  const ticketCountLabel = loading
    ? "Loading…"
    : feedFiltered
      ? `${transactions.length.toLocaleString("en-KE")} of ${summary.transactions.toLocaleString("en-KE")} tickets`
      : `${transactions.length.toLocaleString("en-KE")} ticket${transactions.length === 1 ? "" : "s"}`;

  const focusTicketSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ block: "center" });
  };

  const feed = (
    <section
      className={cn(
        PAPER_CARD,
        "flex min-h-[28rem] flex-col max-lg:max-h-[80dvh] lg:sticky lg:top-3 lg:h-[calc(100dvh-7.5rem)] lg:max-h-[calc(100dvh-7.5rem)]",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: INK }}>
          Tickets
        </h2>
        <span
          className="rounded-full bg-[#F4F1EA] px-2.5 py-0.5 text-[13px] tabular-nums"
          style={{ color: MUTED }}
        >
          {loading ? "…" : summary.transactions.toLocaleString("en-KE")}
        </span>
      </div>
      <div className="px-4 sm:px-5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#7A847D]"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Receipt no. or M-Pesa code"
            aria-label="Search tickets"
            className="h-11 w-full rounded-full border border-black/[0.08] bg-[#FBF9F4] pl-10 pr-4 text-[14px] text-[#121A16] outline-none placeholder:text-[#8A938C] focus-visible:border-[#0D3B2E] focus-visible:ring-2 focus-visible:ring-[#0D3B2E]/20"
          />
        </div>
      </div>
      <div className="px-4 py-3.5 sm:px-5">
        <SalesFeedFilters
          board
          hidePeriod
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={setPaymentFilter}
          channelFilter={channelFilter}
          onChannelFilterChange={setChannelFilter}
          showChannelFilter={canViewWebOrders}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-black/[0.06] [scrollbar-color:#c9cfc8_transparent]">
        {receiptLookup.receiptNo != null ? (
          <ReceiptLookupBanner
            receiptNo={receiptLookup.receiptNo}
            sale={receiptLookup.sale}
            loading={receiptLookup.loading}
            notFound={receiptLookup.notFound}
          />
        ) : null}
        {mpesaCodeLookup.code != null ? (
          <ReceiptLookupBanner
            code={mpesaCodeLookup.code}
            sale={mpesaCodeLookup.sale}
            loading={mpesaCodeLookup.loading}
            notFound={mpesaCodeLookup.notFound}
          />
        ) : null}
        {loading ? (
          <FeedSkeleton />
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#F4F1EA] text-[#5C675F]">
              <Receipt className="size-4" aria-hidden />
            </span>
            <p className="text-sm font-medium" style={{ color: INK }}>
              {!dateRange
                ? "Pick a from and to date"
                : feedFiltered
                  ? "No sales match your filters"
                  : "No sales in this period"}
            </p>
            <p className="max-w-[16rem] text-[13px]" style={{ color: MUTED }}>
              {!dateRange
                ? "Choose a start and end date under Custom."
                : feedFiltered
                  ? "Clear the search or filters to see every ticket."
                  : "New tickets appear here as the till rings them up."}
            </p>
          </div>
        ) : (
          transactions.map((tx) => (
            <SaleGroup
              key={tx.saleId}
              tx={tx}
              nowMs={nowMs}
              showRelativeTime={isLivePeriod}
              isNew={newSaleIds.has(tx.saleId)}
              open={expandedSaleId === tx.saleId}
              canAdjust={canAdjustPayment && isMutableSale(tx)}
              canVoid={canVoid && canVoidSale(tx)}
              onToggle={() =>
                setOpenSaleId(expandedSaleId === tx.saleId ? "" : tx.saleId)
              }
              onAdjust={() => {
                setAdjustSaleId(tx.saleId);
                setAdjustReceiptLabel(txDisplayNo(tx));
              }}
              onVoid={() => {
                setVoidSaleId(tx.saleId);
                setVoidReceiptLabel(txDisplayNo(tx));
              }}
            />
          ))
        )}
      </div>
      <div
        className="flex items-center justify-between border-t border-black/[0.06] px-4 py-2.5 text-[12.5px] sm:px-5"
        style={{ color: MUTED }}
      >
        <span>{ticketCountLabel}</span>
      </div>
    </section>
  );

  const toolBtn =
    "inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FFFEFB] px-3.5 text-[13px] font-medium text-[#121A16] shadow-[0_1px_2px_rgba(18,26,22,0.04)] ring-1 ring-black/[0.06] transition-colors hover:bg-[#F6F3EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D3B2E]/35 disabled:opacity-40";

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "gap-5 selection:bg-[#86E8B8]/80 selection:text-[#0D3B2E] [&_input]:caret-[#0D3B2E]",
      )}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-[14px]"
            style={{ background: LEDGER, color: LEDGER_INK }}
          >
            <Receipt className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1
              className="text-[1.7rem] font-semibold leading-none tracking-[-0.03em]"
              style={{ color: INK }}
            >
              Sales
            </h1>
            <SalesScopeLine nowMs={nowMs} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission(me?.permissions, Permission.SalesIntelligenceRead) ? (
            <Link href={APP_ROUTES.salesByHour} className={toolBtn}>
              <Clock className="size-3.5" aria-hidden />
              By the hour
            </Link>
          ) : null}
          <Link href={APP_ROUTES.salesTransactions} className={toolBtn}>
            <List className="size-3.5" aria-hidden />
            Transactions
          </Link>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full bg-[#FFFEFB] text-[#121A16] shadow-[0_1px_2px_rgba(18,26,22,0.04)] ring-1 ring-black/[0.06] hover:bg-[#F6F3EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D3B2E]/35"
            onClick={focusTicketSearch}
            aria-label="Search tickets"
          >
            <Search className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={toolBtn}
            onClick={downloadPdf}
            disabled={loading || !dateRange || pdfLoading}
          >
            <Download className="size-3.5" aria-hidden />
            {pdfLoading ? "PDF…" : "PDF"}
          </button>
          <Link
            href={APP_ROUTES.salesQuick}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-[#F4F2EC] transition-colors hover:bg-[#0A3025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D3B2E]/40"
            style={{ background: LEDGER }}
          >
            <Plus className="size-3.5" aria-hidden />
            Record sale
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Period"
          className="inline-flex flex-wrap items-center gap-0.5 rounded-full bg-[#FFFEFB] p-1 shadow-[0_1px_2px_rgba(18,26,22,0.04)] ring-1 ring-black/[0.05]"
        >
          {DATE_FILTER_OPTIONS.map(({ id, label }) => {
            const active = datePreset === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDatePreset(id)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D3B2E]/30",
                  active ? "bg-[#1A211E] text-[#F4F2EC]" : "text-[#121A16] hover:bg-[#F4F1EA]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px]" style={{ color: MUTED }}>
            Branch
            <span className="relative">
              <select
                value={branchId}
                onChange={(e) => onChangeBranch(e.target.value)}
                aria-label="Branch"
                disabled={branchLocked}
                className="h-9 cursor-pointer appearance-none rounded-full bg-[#FFFEFB] py-0 pl-3 pr-8 text-[13px] font-medium text-[#121A16] ring-1 ring-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D3B2E]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">All branches</option>
                {branches
                  .filter((b) => !branchLocked || b.id === me?.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#5C675F]"
                aria-hidden
              />
            </span>
          </label>
          {isLivePeriod ? (
            <button
              type="button"
              onClick={() => void load({ silent: true })}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium disabled:opacity-50"
              style={{ color: INK }}
              title="Refresh sales"
            >
              <span className="size-2 rounded-full bg-[#2C8A5E] motion-safe:animate-pulse" aria-hidden />
              Live · {clockLabel(nowMs)}
            </button>
          ) : periodLabel ? (
            <span className="text-[13px]" style={{ color: MUTED }}>
              {periodLabel}
            </span>
          ) : null}
        </div>
      </div>

      {datePreset === "custom" ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px]" style={{ color: MUTED }}>
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={cn(dashboardInputClass(), "h-9 w-auto rounded-full px-3 text-[13px]")}
            />
          </label>
          <label className="flex items-center gap-2 text-[13px]" style={{ color: MUTED }}>
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className={cn(dashboardInputClass(), "h-9 w-auto rounded-full px-3 text-[13px]")}
            />
          </label>
        </div>
      ) : null}

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.32fr)_minmax(21.5rem,0.9fr)]">
        <SalesLedger
          datePreset={datePreset}
          hourly={hourlyTrend}
          needsDates={!dateRange}
          error={error}
          loading={loading}
          summary={summary}
          trend={revenueTrend}
        />
        {feed}
      </div>

      <AdjustSalePaymentDialog
        open={adjustSaleId != null}
        saleId={adjustSaleId}
        receiptLabel={adjustReceiptLabel}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustSaleId(null);
            setAdjustReceiptLabel(undefined);
          }
        }}
        onAdjusted={() => void load({ silent: true })}
      />

      <VoidSaleDialog
        open={voidSaleId != null}
        saleId={voidSaleId}
        receiptLabel={voidReceiptLabel}
        onOpenChange={(open) => {
          if (!open) {
            setVoidSaleId(null);
            setVoidReceiptLabel(undefined);
          }
        }}
        onVoided={() => void load({ silent: true })}
      />
    </div>
  );
}

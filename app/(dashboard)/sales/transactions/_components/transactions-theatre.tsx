"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Ban,
  ChevronRight,
  Download,
  FileDown,
  Pencil,
  Search,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import {
  SalesFeedFilters,
  type SalesDatePreset,
  type StatusFilter,
} from "@/components/sales/sales-feed-filters";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import { APP_ROUTES } from "@/lib/config";
import {
  formatChannelLabel,
  type ChannelFilter,
} from "@/lib/sale-channel-filter";
import {
  formatSalePaymentDisplay,
  type PaymentFilter,
} from "@/lib/sale-payment-filter";
import {
  txDisplayNo,
  type SaleTransaction,
} from "@/lib/sale-transactions";
import { fetchSaleReceiptPdf } from "@/lib/api";
import { cn } from "@/lib/utils";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const RUST = "text-[#9a2e16]";

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function fmtKes(n: number | string | null | undefined): string {
  const v = toNum(n);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatQty(q: number | string): string {
  const n = toNum(q);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function isRefunded(status: string | undefined): boolean {
  return (status?.toLowerCase() ?? "").includes("refund");
}

function isVoided(status: string | undefined): boolean {
  const s = status?.toLowerCase() ?? "";
  return s === "voided" || s.includes("void");
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

function itemPreview(tx: SaleTransaction): string {
  const first = tx.lines[0]?.itemName ?? "Sale";
  if (tx.lineCount <= 1) return first;
  return `${first} + ${tx.lineCount - 1} more`;
}

function saleMetaParts(tx: SaleTransaction): string[] {
  const isOnline = tx.channel === "online_store";
  const parts: string[] = [];
  const pay = formatSalePaymentDisplay(tx.paymentMethod, tx.paymentMethods);
  const payKey = pay.toLowerCase();
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
  return parts;
}

function statusForTx(tx: SaleTransaction): {
  label: string;
  className: string;
} {
  const refunded = isRefunded(tx.status);
  const voided = isVoided(tx.status);
  const isOnline = tx.channel === "online_store";
  const label = isOnline
    ? formatChannelLabel(tx.channel)
    : voided
      ? "Voided"
      : refunded
        ? "Refunded"
        : "Completed";
  const className = isOnline
    ? "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-[var(--order-ink,#15231f)]"
    : voided
      ? "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground"
      : refunded
        ? "border-[#9a2e16]/35 bg-transparent text-[#9a2e16]"
        : "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent text-[var(--pos-primary,#0f766e)]";
  return { label, className };
}

type Summary = {
  revenue: number;
  count: number;
  completed: number;
  units: number;
  refundCount: number;
  refundTotal: number;
  avgTicket: number;
};

export type TransactionsTheatreProps = {
  periodLabel: string;
  lastUpdated: Date | null;
  dateRange: { from: string; to: string } | null;
  summary: Summary;
  filteredCount: number;
  totalCount: number;
  feedFiltered: boolean;
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  branchId: string;
  onBranchChange: (id: string) => void;
  branchLocked: boolean;
  branches: { id: string; name: string }[];
  meBranchId?: string | null;
  datePreset: SalesDatePreset;
  onDatePresetChange: (preset: SalesDatePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  paymentFilter: PaymentFilter;
  onPaymentFilterChange: (value: PaymentFilter) => void;
  channelFilter: ChannelFilter;
  onChannelFilterChange: (value: ChannelFilter) => void;
  showChannelFilter: boolean;
  filtered: SaleTransaction[];
  nowMs: number;
  showRelativeTime: boolean;
  selectedId: string | null;
  selectedTx: SaleTransaction | null;
  onSelect: (tx: SaleTransaction) => void;
  onClearSelection: () => void;
  mobileShowDetail: boolean;
  canAdjustPayment: boolean;
  canVoid: boolean;
  onAdjustPayment: (tx: SaleTransaction) => void;
  onVoid: (tx: SaleTransaction) => void;
  pdfLoading: boolean;
  onDownloadPdf: () => void;
  listSkeleton?: ReactNode;
};

function TransactionsContextBanner({
  periodLabel,
  lastUpdated,
  summary,
  filteredCount,
  totalCount,
  feedFiltered,
  dateRange,
}: {
  periodLabel: string;
  lastUpdated: Date | null;
  summary: Summary;
  filteredCount: number;
  totalCount: number;
  feedFiltered: boolean;
  dateRange: { from: string; to: string } | null;
}) {
  const updated =
    lastUpdated != null
      ? lastUpdated.toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        HAIRLINE,
      )}
    >
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {dateRange ? fmtKes(summary.revenue) : "Pick dates"}
        </span>
        {dateRange ? (
          <>
            <span className={dashboardHintClass()}>
              {summary.count.toLocaleString("en-KE")} receipts
            </span>
            <span className={dashboardHintClass()}>
              · {summary.units.toLocaleString("en-KE", { maximumFractionDigits: 1 })}{" "}
              units
            </span>
            {summary.refundCount > 0 ? (
              <span className={cn(dashboardHintClass(), RUST)}>
                · {summary.refundCount} refunds ({fmtKes(summary.refundTotal)})
              </span>
            ) : null}
          </>
        ) : null}
        {periodLabel ? (
          <span className={cn(dashboardHintClass(), "hidden sm:inline")}>
            · {periodLabel}
          </span>
        ) : null}
        {updated ? (
          <span className={cn(dashboardHintClass(), "hidden md:inline")}>
            · updated {updated}
          </span>
        ) : null}
        {feedFiltered && filteredCount !== totalCount ? (
          <span className={dashboardHintClass()}>
            · showing {filteredCount} of {totalCount}
          </span>
        ) : null}
      </p>
      {summary.completed > 0 ? (
        <span className={cn(dashboardHintClass(), "hidden lg:inline")}>
          Avg ticket {fmtKes(summary.avgTicket)}
        </span>
      ) : null}
    </div>
  );
}

function TransactionsPulse({
  summary,
  periodLabel,
  className,
}: {
  summary: Summary;
  periodLabel: string;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M18 38 C 36 24, 58 20, 76 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M22 52 C 44 62, 64 56, 78 68"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <article className={cn(card, "left-[8%] top-[18%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Revenue
        </p>
        <p
          className="mt-2 text-[2.05rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {fmtKes(summary.revenue)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {summary.completed > 0
            ? `${fmtKes(summary.avgTicket)} average ticket`
            : "Completed sales in period"}
        </p>
      </article>

      <article className={cn(card, "right-[6%] top-[32%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Receipts
        </p>
        <p
          className="mt-2 text-[2.05rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[var(--pos-primary,#0f766e)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {summary.count.toLocaleString("en-KE")}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {summary.units.toLocaleString("en-KE", { maximumFractionDigits: 1 })}{" "}
          units sold
        </p>
      </article>

      <article className={cn(card, "left-[10%] bottom-[14%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {summary.refundCount > 0 ? "Refunds" : "Period"}
        </p>
        <p
          className={cn(
            "mt-2 text-[1.65rem] font-semibold leading-none tracking-[-0.04em] tabular-nums",
            summary.refundCount > 0 ? RUST : "text-foreground",
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {summary.refundCount > 0
            ? fmtKes(summary.refundTotal)
            : periodLabel.split("–")[0]?.trim() || "—"}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {summary.refundCount > 0
            ? `${summary.refundCount} refunded`
            : "Select a receipt on the left"}
        </p>
      </article>
    </div>
  );
}

function TransactionsFocus({
  tx,
  nowMs,
  showRelativeTime,
  className,
}: {
  tx: SaleTransaction;
  nowMs: number;
  showRelativeTime: boolean;
  className?: string;
}) {
  const refunded = isRefunded(tx.status);
  const { label, className: statusClass } = statusForTx(tx);
  const payment = formatSalePaymentDisplay(tx.paymentMethod, tx.paymentMethods);
  const meta = saleMetaParts(tx);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-6",
        className,
      )}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <circle
          cx="50"
          cy="46"
          r="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          strokeDasharray="1.2 1.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
        <span
          className="grid size-14 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white font-mono text-sm font-bold tracking-wide text-foreground shadow-[0_10px_28px_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
          aria-hidden
        >
          #{txDisplayNo(tx)}
        </span>
        <h3
          className="mt-4 text-[1.45rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {fmtKes(Math.abs(tx.total))}
        </h3>
        <p className="mt-2 max-w-full truncate text-sm text-muted-foreground">
          {itemPreview(tx)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatSoldTime(tx.soldAt, nowMs, { relative: showRelativeTime })}
          {payment ? ` · ${payment}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-none border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
              statusClass,
            )}
          >
            {tx.mpesaVerified && !refunded ? (
              <BadgeCheck className="size-3 shrink-0" aria-hidden />
            ) : null}
            {label}
          </span>
          {meta.slice(0, 2).map((part) => (
            <span
              key={part}
              className="inline-flex max-w-[10rem] truncate border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-foreground"
            >
              {part}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionDetailPanel({
  tx,
  canAdjustPayment,
  canVoid,
  onAdjustPayment,
  onVoid,
}: {
  tx: SaleTransaction;
  canAdjustPayment: boolean;
  canVoid: boolean;
  onAdjustPayment: () => void;
  onVoid: () => void;
}) {
  const [receiptLoading, setReceiptLoading] = useState(false);
  const refunded = isRefunded(tx.status);
  const voided = isVoided(tx.status);
  const isOnline = tx.channel === "online_store";
  const showAdjust = canAdjustPayment && !isOnline && !refunded && !voided;
  const showVoid = canVoid && !isOnline && !refunded && !voided;
  const payment = formatSalePaymentDisplay(tx.paymentMethod, tx.paymentMethods);
  const meta = saleMetaParts(tx);
  const person =
    (isOnline
      ? tx.customerName
      : tx.customerName?.trim() || tx.cashierName || tx.customerName
    )?.trim() || "—";

  const onDownloadReceipt = async () => {
    setReceiptLoading(true);
    try {
      const blob = await fetchSaleReceiptPdf(tx.saleId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${txDisplayNo(tx)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Line items
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {tx.lineCount} item{tx.lineCount === 1 ? "" : "s"}
          {payment ? ` · ${payment}` : ""}
        </p>
        {meta.length > 0 ? (
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {meta.join(" · ")}
          </p>
        ) : null}
        {tx.customerId ? (
          <p className="mt-1 text-[11px]">
            <Link
              href={APP_ROUTES.customer(tx.customerId)}
              className="font-medium text-[var(--pos-primary,#0f766e)] hover:underline"
            >
              {person}
            </Link>
          </p>
        ) : null}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4">
        {tx.lines.map((line, i) => {
          const lineRefunded = isRefunded(line.status);
          return (
            <li
              key={`${line.itemId}-${i}`}
              className="flex items-baseline justify-between gap-3 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] py-2 text-[11px] leading-snug text-muted-foreground last:border-0 sm:text-xs"
            >
              <span className="min-w-0 truncate">
                <span className="tabular-nums opacity-70">
                  {formatQty(line.quantity)} × {fmtKes(line.unitPrice)}
                </span>
                <span className="mx-1 opacity-40">·</span>
                <span className={lineRefunded ? "line-through opacity-70" : ""}>
                  {line.itemName}
                </span>
              </span>
              <span className="shrink-0 tabular-nums opacity-80">
                {fmtKes(line.lineTotal)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 sm:px-4">
        {!isOnline ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-none px-2 text-[11px] text-muted-foreground hover:text-foreground"
              disabled={receiptLoading}
              onClick={() => void onDownloadReceipt()}
            >
              <Download className="size-3" aria-hidden />
              {receiptLoading ? "…" : "Receipt"}
            </Button>
            {showAdjust ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-none px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={onAdjustPayment}
              >
                <Pencil className="size-3" aria-hidden />
                Adjust payment
              </Button>
            ) : null}
            {showVoid ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-none px-2 text-[11px] text-[#9a2e16] hover:bg-[color-mix(in_srgb,#9a2e16_6%,white)] hover:text-[#7a2412]"
                onClick={onVoid}
              >
                <Ban className="size-3" aria-hidden />
                Void
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Online order — manage in{" "}
            <Link
              href={APP_ROUTES.storefrontWebOrders}
              className="font-medium text-[var(--pos-primary,#0f766e)] hover:underline"
            >
              Web orders
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function ListSkeletonInner() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-3 last:border-0"
        >
          <div className="h-3 w-24 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
          <div className="h-3 w-40 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
        </div>
      ))}
    </div>
  );
}

export function TransactionsTheatre(props: TransactionsTheatreProps) {
  const {
    periodLabel,
    lastUpdated,
    dateRange,
    summary,
    filteredCount,
    totalCount,
    feedFiltered,
    loading,
    error,
    search,
    onSearchChange,
    branchId,
    onBranchChange,
    branchLocked,
    branches,
    meBranchId,
    datePreset,
    onDatePresetChange,
    customFrom,
    customTo,
    onCustomFromChange,
    onCustomToChange,
    statusFilter,
    onStatusFilterChange,
    paymentFilter,
    onPaymentFilterChange,
    channelFilter,
    onChannelFilterChange,
    showChannelFilter,
    filtered,
    nowMs,
    showRelativeTime,
    selectedId,
    selectedTx,
    onSelect,
    onClearSelection,
    mobileShowDetail,
    canAdjustPayment,
    canVoid,
    onAdjustPayment,
    onVoid,
    pdfLoading,
    onDownloadPdf,
    listSkeleton,
  } = props;

  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const mobileDetailOpen = mobileShowDetail && !!selectedTx;

  const recentRefunds = useMemo(
    () =>
      filtered.filter((tx) => isRefunded(tx.status)).slice(0, 3),
    [filtered],
  );

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;

    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Receipt, product, SKU…"
              aria-label="Search transactions"
            />
          </label>
          <select
            value={branchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className={cn(
              dashboardInputClass(),
              "h-9 w-full text-[13px] lg:h-8 lg:text-[12px]",
            )}
            aria-label="Branch"
            disabled={branchLocked}
          >
            <option value="">All branches</option>
            {branches
              .filter((b) => !branchLocked || b.id === meBranchId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
          <SalesFeedFilters
            datePreset={datePreset}
            onDatePresetChange={onDatePresetChange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={onCustomFromChange}
            onCustomToChange={onCustomToChange}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            paymentFilter={paymentFilter}
            onPaymentFilterChange={onPaymentFilterChange}
            channelFilter={channelFilter}
            onChannelFilterChange={onChannelFilterChange}
            showChannelFilter={showChannelFilter}
            compact
          />
          {feedFiltered && filteredCount !== totalCount ? (
            <p className={dashboardHintClass()}>
              {filteredCount} of {totalCount} match filters
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            denser ? "text-[12px]" : "text-[13px]",
          )}
        >
          {loading ? (
            listSkeleton ?? <ListSkeletonInner />
          ) : filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-[12px] text-muted-foreground">
              {!dateRange
                ? "Pick a from and to date."
                : feedFiltered
                  ? "No transactions match your filters."
                  : "No transactions in this period."}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((tx) => {
                const selected = selectedId === tx.saleId;
                const refunded = isRefunded(tx.status);
                const { label, className: statusClass } = statusForTx(tx);
                return (
                  <li key={tx.saleId}>
                    <button
                      type="button"
                      onClick={() => onSelect(tx)}
                      className={cn(
                        "flex w-full items-start gap-2 px-2.5 py-2.5 text-left transition-colors sm:px-3",
                        selected
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                        refunded &&
                          !selected &&
                          "bg-[color-mix(in_srgb,#9a2e16_3%,white)]",
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform",
                          selected && "rotate-90 text-[var(--pos-primary,#0f766e)]",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-mono text-[10px] font-semibold tracking-wide text-foreground/75">
                            #{txDisplayNo(tx)}
                          </span>
                          <span
                            className={cn(
                              "px-1 py-0.5 text-[9px] font-semibold",
                              statusClass,
                            )}
                          >
                            {label}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-medium text-foreground/90">
                          {itemPreview(tx)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatSoldTime(tx.soldAt, nowMs, {
                            relative: showRelativeTime,
                          })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-right text-[13px] font-semibold tabular-nums tracking-[-0.03em]",
                          refunded ? RUST : "text-foreground",
                        )}
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {refunded && tx.total > 0 ? "−" : ""}
                        {fmtKes(Math.abs(tx.total))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = selectedTx ? (
    <TransactionsFocus
      tx={selectedTx}
      nowMs={nowMs}
      showRelativeTime={showRelativeTime}
      className="h-full min-h-0"
    />
  ) : (
    <TransactionsPulse
      summary={summary}
      periodLabel={periodLabel}
      className="h-full min-h-0"
    />
  );

  const inspect = selectedTx ? (
    <TransactionDetailPanel
      tx={selectedTx}
      canAdjustPayment={canAdjustPayment}
      canVoid={canVoid}
      onAdjustPayment={() => onAdjustPayment(selectedTx)}
      onVoid={() => onVoid(selectedTx)}
    />
  ) : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a receipt
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The map in the middle is this period. The list on the left names each
          sale — open one for line items, payment, and receipt actions.
        </p>
      </div>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full gap-1.5 rounded-none text-[12px] shadow-none"
          onClick={onDownloadPdf}
          disabled={loading || !dateRange || pdfLoading}
        >
          <FileDown className="size-3.5" aria-hidden />
          {pdfLoading ? "PDF…" : "Download PDF"}
        </Button>
        {recentRefunds.length > 0 ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Recent refunds
            </p>
            <ul className="mt-2 space-y-1">
              {recentRefunds.map((tx) => (
                <li key={tx.saleId}>
                  <button
                    type="button"
                    onClick={() => onSelect(tx)}
                    className="text-left text-[12px] font-semibold text-[#9a2e16] underline-offset-2 hover:underline"
                  >
                    #{txDisplayNo(tx)} · {fmtKes(Math.abs(tx.total))}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <TransactionsContextBanner
        periodLabel={periodLabel}
        lastUpdated={lastUpdated}
        summary={summary}
        filteredCount={filteredCount}
        totalCount={totalCount}
        feedFiltered={feedFiltered}
        dateRange={dateRange}
      />

      {error ? (
        <DashboardFeedback kind="error" text={error} />
      ) : null}

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            Sales activity
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selectedTx ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={mobileDetailOpen}
        onOpenChange={(open) => {
          if (!open) onClearSelection();
        }}
        contextLabel="Receipt"
        title={
          selectedTx ? `#${txDisplayNo(selectedTx)}` : "Transaction"
        }
        description={
          selectedTx
            ? [
                itemPreview(selectedTx),
                formatSalePaymentDisplay(
                  selectedTx.paymentMethod,
                  selectedTx.paymentMethods,
                ),
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {selectedTx ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-white",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            <TransactionDetailPanel
              tx={selectedTx}
              canAdjustPayment={canAdjustPayment}
              canVoid={canVoid}
              onAdjustPayment={() => onAdjustPayment(selectedTx)}
              onVoid={() => onVoid(selectedTx)}
            />
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}

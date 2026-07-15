"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileDown,
  List,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { AdjustSalePaymentDialog } from "@/components/sales/adjust-sale-payment-dialog";
import {
  SalesFeedFilters,
  type SalesDatePreset,
  type StatusFilter,
} from "@/components/sales/sales-feed-filters";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { cn } from "@/lib/utils";
import { formatDateRangeLabel, presetRange } from "@/lib/analytics-date-range";
import {
  fetchBranches,
  fetchSaleReceiptPdf,
  type BranchRecord,
  type RecentSaleRow,
} from "@/lib/api";
import { fetchMergedSalesActivity } from "@/lib/sales-activity";
import {
  formatChannelLabel,
  matchesChannelFilter,
  matchesStatusWithChannel,
  type ChannelFilter,
} from "@/lib/sale-channel-filter";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatSalePaymentDisplay,
  matchesPaymentFilter,
  type PaymentFilter,
} from "@/lib/sale-payment-filter";
import {
  groupLinesIntoTransactions,
  txDisplayNo,
  type SaleTransaction,
} from "@/lib/sale-transactions";
import {
  buildSalesActivityPdf,
  downloadBlob,
  salesActivityPdfFilename,
} from "@/lib/sales-activity-pdf";

const SURFACE = DASHBOARD_TABLE_SURFACE;
const MUTED = "text-muted-foreground";

export type { SaleTransaction };

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
    return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
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

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function TransactionRow({
  tx,
  expanded,
  onToggle,
  nowMs,
  showRelativeTime,
  canAdjustPayment,
  onAdjustPayment,
}: {
  tx: SaleTransaction;
  expanded: boolean;
  onToggle: () => void;
  nowMs: number;
  showRelativeTime: boolean;
  canAdjustPayment: boolean;
  onAdjustPayment: () => void;
}) {
  const refunded = isRefunded(tx.status);
  const isOnline = tx.channel === "online_store";
  const [receiptLoading, setReceiptLoading] = useState(false);
  const status = tx.status?.toLowerCase() ?? "";
  const showAdjust =
    canAdjustPayment &&
    !isOnline &&
    !refunded &&
    status !== "voided" &&
    !status.includes("void");

  const onDownloadReceipt = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      // silent — user can retry
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "border-b border-[#EEEEEE] last:border-0",
        refunded && "bg-red-50/30",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[#F9F6F0]/50"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 text-[#888888]">
          {expanded ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#666666]">
              #{txDisplayNo(tx)}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isOnline
                  ? "bg-indigo-50 text-indigo-800"
                  : refunded
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-50 text-emerald-800",
              )}
            >
              {isOnline
                ? formatChannelLabel(tx.channel)
                : refunded
                  ? "Refunded"
                  : "Completed"}
            </span>
          </div>
          <p className="mt-1 truncate text-[15px] font-medium text-[#333333]">
            {itemPreview(tx)}
          </p>
          <p className="mt-1 text-sm text-[#666666]">
            {formatSalePaymentDisplay(tx.paymentMethod, tx.paymentMethods)}
            {tx.cashierName ? (
              <>
                <span className="mx-1.5 text-[#CCCCCC]">·</span>
                {tx.cashierName}
              </>
            ) : null}
            {tx.customerName?.trim() ? (
              <>
                <span className="mx-1.5 text-[#CCCCCC]">·</span>
                {tx.customerName}
              </>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-base font-bold tabular-nums",
              refunded ? "text-[#C47A5A]" : "text-black",
            )}
          >
            {refunded && tx.total > 0 ? "−" : ""}
            {fmtKes(Math.abs(tx.total))}
          </p>
          <p className="mt-0.5 text-xs text-[#888888]">
            {tx.lineCount} item{tx.lineCount === 1 ? "" : "s"} ·{" "}
            {formatSoldTime(tx.soldAt, nowMs, { relative: showRelativeTime })}
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[#EEEEEE] bg-[#FAFAFA] px-5 py-3">
          <ul className="space-y-2">
            {tx.lines.map((line, i) => (
              <li
                key={`${line.itemId}-${i}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="min-w-0 text-[#444444]">
                  {formatQty(line.quantity)} × {line.itemName}
                </span>
                <span className="shrink-0 tabular-nums font-medium text-[#333333]">
                  {fmtKes(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
          {!isOnline ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-[#EEEEEE] bg-white text-xs"
                disabled={receiptLoading}
                onClick={onDownloadReceipt}
              >
                <Download className="size-3.5" aria-hidden />
                {receiptLoading ? "Downloading…" : "Receipt PDF"}
              </Button>
              {showAdjust ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-[#EEEEEE] bg-white text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdjustPayment();
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Adjust payment
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#888888]">
              Storefront pickup order — manage under{" "}
              <Link
                href={APP_ROUTES.storefrontWebOrders}
                className="font-medium text-[#B08D48] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Web orders
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className={SURFACE}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-b border-[#EEEEEE] px-5 py-4 last:border-0">
          <div className="h-4 w-40 rounded bg-[#EEEEEE] animate-pulse" />
          <div className="mt-2 h-3 w-56 rounded bg-[#EEEEEE] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function TransactionsPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.SalesIntelligenceRead);
  const canViewWebOrders = hasPermission(
    me?.permissions,
    Permission.StorefrontOrdersRead,
  );
  const canAdjustPayment = hasPermission(
    me?.permissions,
    Permission.SalesPaymentAdjust,
  );

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const [adjustSaleId, setAdjustSaleId] = useState<string | null>(null);
  const [adjustReceiptLabel, setAdjustReceiptLabel] = useState<string | undefined>();
  const [pdfLoading, setPdfLoading] = useState(false);
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
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<RecentSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const isToday = datePreset === "today" && dateRange != null;

  const periodLabel = useMemo(() => {
    if (!dateRange) {
      return datePreset === "custom"
        ? "Choose a start and end date."
        : "";
    }
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange, datePreset]);

  useEffect(() => {
    void fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!allowed) return;
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      if (!dateRange) {
        setLines([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const data = await fetchMergedSalesActivity(
          dateRange.from,
          dateRange.to,
          branchId.trim() || undefined,
          { includeOnlineStore: canViewWebOrders },
        );
        setLines(data);
        setLastUpdated(new Date());
        setExpandedId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load transactions.");
        if (!silent) setLines([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, branchId, canViewWebOrders, dateRange],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const transactions = useMemo(
    () => groupLinesIntoTransactions(lines),
    [lines],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (!matchesChannelFilter(channelFilter, tx.channel)) return false;
      if (!matchesStatusWithChannel(statusFilter, tx.status, tx.channel)) {
        return false;
      }
      if (
        !matchesPaymentFilter(
          paymentFilter,
          tx.paymentMethod,
          tx.paymentMethods,
        )
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (tx.receiptNo != null && String(tx.receiptNo).includes(q)) ||
        tx.saleId.toLowerCase().includes(q) ||
        tx.cashierName.toLowerCase().includes(q) ||
        tx.customerName.toLowerCase().includes(q) ||
        tx.paymentMethod.toLowerCase().includes(q) ||
        (tx.paymentMethods ?? "").toLowerCase().includes(q) ||
        tx.lines.some((l) => l.itemName.toLowerCase().includes(q))
      );
    });
  }, [transactions, search, statusFilter, paymentFilter, channelFilter]);

  const summary = useMemo(() => {
    let revenue = 0;
    let refundTotal = 0;
    let refundCount = 0;
    let units = 0;

    for (const tx of transactions) {
      if (isRefunded(tx.status)) {
        refundTotal += Math.abs(tx.total);
        refundCount += 1;
      } else {
        revenue += tx.total;
      }
      for (const line of tx.lines) {
        if (!isRefunded(line.status)) units += toNum(line.quantity);
      }
    }

    const completed = transactions.length - refundCount;
    return {
      revenue,
      count: transactions.length,
      completed,
      units,
      refundCount,
      refundTotal,
      avgTicket: completed > 0 ? revenue / completed : 0,
    };
  }, [transactions]);

  const filteredSummary = useMemo(() => {
    let revenue = 0;
    let units = 0;
    for (const tx of filtered) {
      if (!isRefunded(tx.status)) revenue += tx.total;
      for (const line of tx.lines) {
        if (!isRefunded(line.status)) units += toNum(line.quantity);
      }
    }
    return { revenue, units, count: filtered.length };
  }, [filtered]);

  const downloadPdf = useCallback(() => {
    if (!dateRange || pdfLoading) return;
    setPdfLoading(true);
    try {
      const branchLabel = branchId.trim()
        ? (branches.find((b) => b.id === branchId)?.name ?? "Branch")
        : "All branches";
      const blob = buildSalesActivityPdf({
        title: "Sales transactions",
        businessLabel: business?.name ?? null,
        branchLabel,
        periodLabel: periodLabel || "Selected period",
        revenue: filteredSummary.revenue,
        transactionCount: filteredSummary.count,
        unitsSold: filteredSummary.units,
        transactions: filtered,
      });
      downloadBlob(
        blob,
        salesActivityPdfFilename({
          title: "sales-transactions",
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
    filtered,
  ]);

  const feedFiltered =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    channelFilter !== "all";

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Transactions</h1>
        <p className={cn("mt-2 text-sm", MUTED)}>
          You do not have permission to view transactions.
        </p>
        <Link
          href={APP_ROUTES.business}
          className="mt-6 inline-block text-sm font-medium text-[#B08D48] hover:underline"
        >
          Back to business
        </Link>
      </div>
    );
  }

  const statusLine = [
    periodLabel || (datePreset === "custom" ? "Choose dates below" : null),
    lastUpdated
      ? `Updated ${lastUpdated.toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn(DASHBOARD_MAX, "space-y-5")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Sales
          </p>
          <h1 className="mt-0.5 font-sans text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Transactions
          </h1>
          <ActiveScopeSubtitle className="mt-0.5 text-xs text-muted-foreground" />
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {statusLine || "Receipts for the selected period."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={APP_ROUTES.sales}>
              <List className="size-3.5" aria-hidden />
              Activity
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void load({ silent: true })}
            disabled={loading}
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={downloadPdf}
            disabled={loading || !dateRange || pdfLoading}
          >
            <FileDown className="size-3.5" aria-hidden />
            {pdfLoading ? "PDF…" : "PDF"}
          </Button>
        </div>
      </header>

      {dateRange && !error && !loading ? (
        <section
          aria-label="Period summary"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Metric label="Revenue" value={fmtKes(summary.revenue)} />
          <Metric
            label="Transactions"
            value={summary.count.toLocaleString("en-KE")}
            hint={
              summary.completed > 0
                ? `${fmtKes(summary.avgTicket)} average`
                : undefined
            }
          />
          <Metric
            label="Units sold"
            value={summary.units.toLocaleString("en-KE", {
              maximumFractionDigits: 1,
            })}
          />
          <Metric
            label={summary.refundCount > 0 ? "Refunds" : "Period"}
            value={
              summary.refundCount > 0
                ? fmtKes(summary.refundTotal)
                : periodLabel.split("–")[0]?.trim() || "—"
            }
            hint={
              summary.refundCount > 0
                ? `${summary.refundCount} refunded`
                : undefined
            }
          />
        </section>
      ) : null}

      <section className="space-y-2.5" aria-label="Filters">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt, product, cashier…"
              className={cn(dashboardInputClass(), "h-9 py-2 pl-9 text-sm")}
              aria-label="Search transactions"
            />
          </div>
          <select
            value={branchId}
            onChange={(e) => onChangeBranch(e.target.value)}
            className={cn(dashboardSelectClass(), "h-9 py-1.5 sm:w-48")}
            aria-label="Branch"
            disabled={branchLocked}
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
        </div>

        <SalesFeedFilters
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

        {feedFiltered && filtered.length !== transactions.length ? (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length.toLocaleString("en-KE")} of{" "}
            {transactions.length.toLocaleString("en-KE")} transactions.
          </p>
        ) : null}
      </section>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {loading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <div className={cn(SURFACE, "px-6 py-16 text-center text-sm", MUTED)}>
          {!dateRange
            ? "Pick a from and to date above."
            : search.trim() ||
                statusFilter !== "all" ||
                paymentFilter !== "all" ||
                channelFilter !== "all"
              ? "No transactions match your filters."
              : "No transactions in this period."}
        </div>
      ) : (
        <div className={SURFACE}>
          {filtered.map((tx) => (
            <TransactionRow
              key={tx.saleId}
              tx={tx}
              expanded={expandedId === tx.saleId}
              onToggle={() =>
                setExpandedId((id) => (id === tx.saleId ? null : tx.saleId))
              }
              nowMs={nowMs}
              showRelativeTime={isToday}
              canAdjustPayment={canAdjustPayment}
              onAdjustPayment={() => {
                setAdjustSaleId(tx.saleId);
                setAdjustReceiptLabel(txDisplayNo(tx));
              }}
            />
          ))}
        </div>
      )}

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
    </div>
  );
}

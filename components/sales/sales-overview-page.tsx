"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { List, Receipt, RefreshCw, Search } from "lucide-react";

import {
  DASHBOARD_MAX,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";
import { formatDateRangeLabel, presetRange } from "@/lib/analytics-date-range";
import { fetchBranches, type BranchRecord, type RecentSaleRow } from "@/lib/api";
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
  SalesFeedFilters,
  type SalesDatePreset,
  type StatusFilter,
} from "@/components/sales/sales-feed-filters";

const SURFACE = "overflow-hidden rounded-xl border border-[#EEEEEE] bg-white";
const MUTED = "text-[#888888]";
const ACCENT = "#B08D48";
const POLL_MS = 8_000;

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

function rowKey(row: RecentSaleRow, index: number): string {
  return `${row.saleId}-${row.itemId}-${row.soldAt}-${index}`;
}

function SaleLineRow({
  row,
  nowMs,
  isNew,
  showRelativeTime,
}: {
  row: RecentSaleRow;
  nowMs: number;
  isNew?: boolean;
  showRelativeTime: boolean;
}) {
  const refunded =
    row.status?.toLowerCase() === "refunded" ||
    row.status?.toLowerCase().includes("refund");
  const qty = formatQty(row.quantity);

  return (
    <div
      className={cn(
        "border-b border-[#EEEEEE] px-5 py-4 last:border-0 transition-colors",
        isNew && "bg-[#F9F6F0]/80",
        refunded && "bg-red-50/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-[#333333]">
            {row.itemName}
          </p>
          <p className="mt-1 text-sm text-[#666666]">
            <span
              className={cn(
                "mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                row.channel === "online_store"
                  ? "bg-indigo-50 text-indigo-800"
                  : "bg-[#F3F3F3] text-[#666666]",
              )}
            >
              {formatChannelLabel(row.channel)}
            </span>
            {qty} × {fmtKes(row.unitPrice)}
            <span className="mx-1.5 text-[#CCCCCC]">·</span>
            {formatSalePaymentDisplay(row.paymentMethod, row.paymentMethods)}
            {row.cashierName ? (
              <>
                <span className="mx-1.5 text-[#CCCCCC]">·</span>
                {row.cashierName}
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
            {refunded ? "−" : ""}
            {fmtKes(row.lineTotal)}
          </p>
          <p className="mt-0.5 text-xs text-[#888888]">
            {formatSoldTime(row.soldAt, nowMs, { relative: showRelativeTime })}
          </p>
        </div>
      </div>
    </div>
  );
}

const SUMMARY_CARD =
  "flex min-h-[88px] flex-col rounded-xl border border-[#EEEEEE] bg-white p-4";

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={SUMMARY_CARD}>
      <p className="text-xs font-medium text-[#888888]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-black">
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-xs text-[#888888]">{hint}</p> : null}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={SUMMARY_CARD}>
          <div className="h-3 w-16 rounded bg-[#EEEEEE] animate-pulse" />
          <div className="mt-2 h-7 w-24 rounded bg-[#EEEEEE] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className={SURFACE}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b border-[#EEEEEE] px-5 py-4 last:border-0">
          <div className="h-4 w-48 rounded bg-[#EEEEEE] animate-pulse" />
          <div className="mt-2 h-3 w-64 rounded bg-[#EEEEEE] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function SalesOverviewPage() {
  const { me, branchId: sessionBranchId } = useDashboard();
  const allowed =
    hasPermission(me?.permissions, Permission.SalesIntelligenceRead) ||
    hasPermission(me?.permissions, Permission.SalesSell);
  const canViewWebOrders = hasPermission(
    me?.permissions,
    Permission.StorefrontOrdersRead,
  );

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState("");
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
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());

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
    const id = (sessionBranchId ?? "").trim();
    if (!id) return;
    if (branches.some((b) => b.id === id)) setBranchId(id);
  }, [sessionBranchId, branches]);

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
        const rows = await fetchMergedSalesActivity(
          dateRange.from,
          dateRange.to,
          branchId.trim() || undefined,
          { includeOnlineStore: canViewWebOrders },
        );

        const incomingKeys = new Set<string>();
        const freshKeys = new Set<string>();
        rows.forEach((row, index) => {
          const key = rowKey(row, index);
          incomingKeys.add(key);
          if (!knownKeysRef.current.has(key)) freshKeys.add(key);
        });

        if (isLivePeriod && silent && freshKeys.size > 0) {
          setNewKeys(freshKeys);
          window.setTimeout(() => setNewKeys(new Set()), 4_000);
        }

        knownKeysRef.current = incomingKeys;
        setLines(rows);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sales.");
        if (!silent) setLines([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, branchId, canViewWebOrders, dateRange, isLivePeriod],
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
      return (
        row.itemName.toLowerCase().includes(q) ||
        row.cashierName.toLowerCase().includes(q) ||
        row.paymentMethod.toLowerCase().includes(q) ||
        (row.paymentMethods ?? "").toLowerCase().includes(q) ||
        row.saleId.toLowerCase().includes(q)
      );
    });
  }, [lines, search, statusFilter, paymentFilter, channelFilter]);

  const summary = useMemo(() => {
    let revenue = 0;
    let refundTotal = 0;
    let refundLines = 0;
    const saleIds = new Set<string>();
    let units = 0;
    const byItem = new Map<string, { name: string; revenue: number }>();

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
    }

    let topItem = "";
    let topItemRevenue = 0;
    for (const { name, revenue: itemRev } of byItem.values()) {
      if (itemRev > topItemRevenue) {
        topItem = name;
        topItemRevenue = itemRev;
      }
    }

    const transactions = saleIds.size;
    return {
      revenue,
      transactions,
      units,
      lineCount: lines.length,
      refundLines,
      refundTotal,
      avgTicket: transactions > 0 ? revenue / transactions : 0,
      topItem,
    };
  }, [lines]);

  const feedFiltered =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    channelFilter !== "all";

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-lg font-semibold text-black">Sales</h1>
        <p className={cn("mt-2 text-sm", MUTED)}>
          You do not have permission to view sales activity.
        </p>
        <Link
          href={APP_ROUTES.overview}
          className="mt-6 inline-block text-sm font-medium"
          style={{ color: ACCENT }}
        >
          Back to overview
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "space-y-6")}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className={cn("text-sm font-medium", MUTED)}>Sales</p>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white px-2 py-0.5 text-[11px] font-medium text-[#666666]",
                refreshing && "border-[#E8DFD0] bg-[#F9F6F0]",
              )}
            >
              {isLivePeriod ? (
                <>
                  <span
                    className={cn(
                      "size-1.5 rounded-full bg-emerald-500",
                      !refreshing && "animate-pulse",
                    )}
                    aria-hidden
                  />
                  Live
                </>
              ) : null}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-black">
            What&apos;s selling
          </h1>
          <p className={cn("mt-1 text-sm", MUTED)}>
            {periodLabel || (datePreset === "custom" ? "Choose dates below." : "")}
            {lastUpdated
              ? `${periodLabel ? " · " : ""}Updated ${lastUpdated.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
              : isLivePeriod && !periodLabel
                ? "Sold line items refresh automatically."
                : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-[#EEEEEE] bg-white"
            asChild
          >
            <Link href={APP_ROUTES.salesTransactions}>
              <List className="size-4" aria-hidden />
              Transactions
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-[#EEEEEE] bg-white"
            onClick={() => void load({ silent: true })}
            disabled={loading}
          >
            <RefreshCw
              className={cn("size-4", refreshing && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
          <Button
            asChild
            className="gap-2 bg-[#B08D48] text-white hover:bg-[#9A7A3F]"
          >
            <Link href={APP_ROUTES.salesQuick}>
              <Receipt className="size-4" aria-hidden />
              Record sale
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#888888]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, cashier, payment…"
            className={cn(dashboardInputClass(), "pl-9")}
            aria-label="Search sales"
          />
        </div>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className={cn(dashboardSelectClass(), "sm:w-56")}
          aria-label="Branch"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
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

      {dateRange && !error ? (
        loading ? (
          <SummarySkeleton />
        ) : (
          <section aria-label="Period summary" className="space-y-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Revenue" value={fmtKes(summary.revenue)} />
              <SummaryCard
                label="Transactions"
                value={summary.transactions.toLocaleString("en-KE")}
                hint={
                  summary.transactions > 0
                    ? `${fmtKes(summary.avgTicket)} avg per sale`
                    : undefined
                }
              />
              <SummaryCard
                label="Units sold"
                value={summary.units.toLocaleString("en-KE", {
                  maximumFractionDigits: 1,
                })}
                hint={
                  summary.lineCount > 0
                    ? `${summary.lineCount.toLocaleString("en-KE")} line items`
                    : undefined
                }
              />
              <SummaryCard
                label={summary.refundLines > 0 ? "Refunds" : "Top product"}
                value={
                  summary.refundLines > 0
                    ? fmtKes(summary.refundTotal)
                    : summary.topItem || "—"
                }
                hint={
                  summary.refundLines > 0
                    ? `${summary.refundLines} refunded line${summary.refundLines === 1 ? "" : "s"}`
                    : summary.topItem
                      ? "Highest revenue in period"
                      : undefined
                }
              />
            </div>
            {feedFiltered && filteredLines.length !== lines.length ? (
              <p className={cn("text-xs", MUTED)}>
                Feed shows {filteredLines.length.toLocaleString("en-KE")} of{" "}
                {lines.length.toLocaleString("en-KE")} lines for this period.
              </p>
            ) : null}
          </section>
        )
      ) : null}

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <FeedSkeleton />
      ) : filteredLines.length === 0 ? (
        <div className={cn(SURFACE, "px-6 py-16 text-center text-sm", MUTED)}>
          {!dateRange
            ? "Pick a from and to date above."
            : search.trim() ||
                statusFilter !== "all" ||
                paymentFilter !== "all" ||
                channelFilter !== "all"
              ? "No sales match your filters."
              : "No sales in this period."}
        </div>
      ) : (
        <div className={SURFACE}>
          {filteredLines.map((row, index) => (
            <SaleLineRow
              key={rowKey(row, index)}
              row={row}
              nowMs={nowMs}
              isNew={newKeys.has(rowKey(row, index))}
              showRelativeTime={isLivePeriod}
            />
          ))}
        </div>
      )}
    </div>
  );
}

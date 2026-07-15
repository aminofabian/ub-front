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
import {
  Download,
  List,
  Pencil,
  Receipt,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { AdjustSalePaymentDialog } from "@/components/sales/adjust-sale-payment-dialog";
import {
  SalesFeedFilters,
  type SalesDatePreset,
  type StatusFilter,
} from "@/components/sales/sales-feed-filters";
import { cn } from "@/lib/utils";
import {
  groupLinesIntoTransactions,
  txDisplayNo,
  type SaleTransaction,
} from "@/lib/sale-transactions";
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
  buildSalesActivityPdf,
  downloadBlob,
  salesActivityPdfFilename,
} from "@/lib/sales-activity-pdf";

const MUTED = "text-muted-foreground";
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

function isRefunded(status: string | undefined): boolean {
  return (status?.toLowerCase() ?? "").includes("refund");
}

function canAdjustSalePayment(tx: SaleTransaction): boolean {
  if (tx.channel === "online_store") return false;
  const status = tx.status?.toLowerCase() ?? "";
  if (status.includes("refund") || status.includes("void")) return false;
  return true;
}

function RevenueSparkline({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 28;
  const pad = 1;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `M${points[0]} L${points.join(" L")} L${w - pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="mt-1.5 overflow-visible"
      role="img"
      aria-label={`Revenue trend: ${labels[0]} to ${labels[labels.length - 1]}`}
    >
      <path d={area} fill="#B08D48" fillOpacity={0.12} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#B08D48"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Metric({
  label,
  value,
  hint,
  chart,
}: {
  label: string;
  value: string;
  hint?: string;
  chart?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {chart}
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-2.5 w-14 animate-pulse rounded bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
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
      slice = entries.slice(Math.max(0, first - 1), Math.min(entries.length, last + 2));
    }
  }

  return {
    values: slice.map(([, v]) => v),
    labels: slice.map(([k]) =>
      opts.hourly ? `${k}:00` : k.slice(5),
    ),
  };
}

function FeedSkeleton() {
  return (
    <div className={DASHBOARD_TABLE_SURFACE}>
      <div className={DASHBOARD_TABLE_HEAD}>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 border-b border-border/40 px-5 py-5 last:border-0 sm:px-6"
        >
          <div className="flex justify-between gap-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-56 animate-pulse rounded bg-muted" />
          <div className="h-3 w-44 animate-pulse rounded bg-muted" />
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
  if (!isOnline && payKey && payKey !== "online" && payKey !== "online checkout") {
    parts.push(pay);
  }
  const customer = tx.customerName?.trim() ?? "";
  const cashier = tx.cashierName?.trim() ?? "";
  if (isOnline) {
    if (customer) parts.push(customer);
  } else {
    if (cashier) parts.push(cashier);
    if (customer && customer.toLowerCase() !== cashier.toLowerCase()) {
      parts.push(customer);
    }
  }
  return parts;
}

function SaleGroup({
  tx,
  nowMs,
  showRelativeTime,
  isNew,
  canAdjust,
  onAdjust,
}: {
  tx: SaleTransaction;
  nowMs: number;
  showRelativeTime: boolean;
  isNew?: boolean;
  canAdjust: boolean;
  onAdjust: () => void;
}) {
  const refunded = isRefunded(tx.status);
  const isOnline = tx.channel === "online_store";
  const meta = saleMetaParts(tx);

  return (
    <article
      className={cn(
        "border-b border-border/40 last:border-0 transition-colors",
        isNew && "bg-primary/[0.04]",
        refunded && "bg-destructive/[0.03]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-4 py-2.5 sm:px-5">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/70">
              #{txDisplayNo(tx)}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isOnline
                  ? "bg-indigo-50 text-indigo-800"
                  : refunded
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-50 text-emerald-800",
              )}
            >
              {isOnline
                ? formatChannelLabel(tx.channel)
                : refunded
                  ? "Refunded"
                  : "Completed"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatSoldTime(tx.soldAt, nowMs, { relative: showRelativeTime })}
            </span>
          </div>
          {meta.length > 0 ? (
            <p className="text-xs font-medium text-foreground/75">{meta.join(" · ")}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p
              className={cn(
                "text-base font-semibold tabular-nums tracking-tight",
                refunded ? "text-[#C47A5A]" : "text-foreground",
              )}
            >
              {refunded && tx.total > 0 ? "−" : ""}
              {fmtKes(Math.abs(tx.total))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {tx.lineCount} item{tx.lineCount === 1 ? "" : "s"}
            </p>
          </div>
          {canAdjust ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={onAdjust}
            >
              <Pencil className="size-3" aria-hidden />
              Adjust
            </Button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-0.5 border-t border-border/25 bg-muted/10 px-4 py-1.5 pl-7 sm:px-5 sm:pl-8">
        {tx.lines.map((line, i) => {
          const lineRefunded = isRefunded(line.status);
          return (
            <li
              key={`${line.itemId}-${i}`}
              className="flex items-baseline justify-between gap-3 text-[11px] leading-snug text-muted-foreground sm:text-xs"
            >
              <span className="min-w-0 truncate">
                <span className="tabular-nums opacity-70">
                  {formatQty(line.quantity)}
                </span>
                <span className="mx-1 opacity-40">×</span>
                <span className={lineRefunded ? "line-through opacity-70" : ""}>
                  {line.itemName}
                </span>
              </span>
              <span className="shrink-0 tabular-nums opacity-80">
                {lineRefunded ? "−" : ""}
                {fmtKes(line.lineTotal)}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function SalesOverviewPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
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

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [adjustSaleId, setAdjustSaleId] = useState<string | null>(null);
  const [adjustReceiptLabel, setAdjustReceiptLabel] = useState<
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
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<RecentSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
        const rows = await fetchMergedSalesActivity(
          dateRange.from,
          dateRange.to,
          branchId.trim() || undefined,
          { includeOnlineStore: canViewWebOrders },
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
        row.customerName?.toLowerCase().includes(q) ||
        row.paymentMethod.toLowerCase().includes(q) ||
        (row.paymentMethods ?? "").toLowerCase().includes(q) ||
        row.saleId.toLowerCase().includes(q) ||
        (row.receiptNo != null && String(row.receiptNo).includes(q))
      );
    });
  }, [lines, search, statusFilter, paymentFilter, channelFilter]);

  const transactions = useMemo(
    () => groupLinesIntoTransactions(filteredLines),
    [filteredLines],
  );

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
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Sales</h1>
        <p className={cn("mt-2 text-sm", MUTED)}>
          You do not have permission to view sales activity.
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
    isLivePeriod ? "Live" : null,
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
            Activity
          </h1>
          <ActiveScopeSubtitle className="mt-0.5 text-xs text-muted-foreground" />
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {statusLine || "Sold items for the selected period."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            asChild
          >
            <Link href={APP_ROUTES.salesTransactions}>
              <List className="size-3.5" aria-hidden />
              Transactions
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
            <Download className="size-3.5" aria-hidden />
            {pdfLoading ? "PDF…" : "PDF"}
          </Button>
          <Button
            size="sm"
            asChild
            className="gap-1.5 bg-[#B08D48] text-white hover:bg-[#9A7A3F]"
          >
            <Link href={APP_ROUTES.salesQuick}>
              <Receipt className="size-3.5" aria-hidden />
              Record sale
            </Link>
          </Button>
        </div>
      </header>

      {dateRange && !error ? (
        loading ? (
          <MetricsSkeleton />
        ) : (
          <section
            aria-label="Period summary"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Metric
              label="Revenue"
              value={fmtKes(summary.revenue)}
              chart={
                revenueTrend.values.some((v) => v > 0) ? (
                  <RevenueSparkline
                    values={revenueTrend.values}
                    labels={revenueTrend.labels}
                  />
                ) : null
              }
              hint={
                revenueTrend.values.some((v) => v > 0)
                  ? datePreset === "today" || datePreset === "yesterday"
                    ? "Hourly trend"
                    : "Daily trend"
                  : undefined
              }
            />
            <Metric
              label="Transactions"
              value={summary.transactions.toLocaleString("en-KE")}
              hint={
                summary.transactions > 0
                  ? `${fmtKes(summary.avgTicket)} average`
                  : undefined
              }
            />
            <Metric
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
            <Metric
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
                    ? "Highest revenue"
                    : undefined
              }
            />
          </section>
        )
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
              aria-label="Search sales"
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
      </section>

      {error ? (
        <DashboardFeedback kind="error" text={error} />
      ) : null}

      {loading ? (
        <FeedSkeleton />
      ) : transactions.length === 0 ? (
        <div
          className={cn(
            DASHBOARD_TABLE_SURFACE,
            "px-6 py-20 text-center text-sm text-muted-foreground",
          )}
        >
          {!dateRange
            ? "Pick a from and to date above."
            : feedFiltered
              ? "No sales match your filters."
              : "No sales in this period."}
        </div>
      ) : (
        <section className={DASHBOARD_TABLE_SURFACE} aria-label="Sales feed">
          <div
            className={cn(
              DASHBOARD_TABLE_HEAD,
              "flex flex-wrap items-center justify-between gap-2",
            )}
          >
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Sales
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {feedFiltered
                  ? `Showing ${transactions.length.toLocaleString("en-KE")} of period`
                  : `${transactions.length.toLocaleString("en-KE")} transaction${transactions.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {isLivePeriod ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-emerald-500",
                    !refreshing && "animate-pulse",
                  )}
                  aria-hidden
                />
                Live feed
              </span>
            ) : null}
          </div>

          {transactions.map((tx) => (
            <SaleGroup
              key={tx.saleId}
              tx={tx}
              nowMs={nowMs}
              showRelativeTime={isLivePeriod}
              isNew={newSaleIds.has(tx.saleId)}
              canAdjust={canAdjustPayment && canAdjustSalePayment(tx)}
              onAdjust={() => {
                setAdjustSaleId(tx.saleId);
                setAdjustReceiptLabel(txDisplayNo(tx));
              }}
            />
          ))}
        </section>
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

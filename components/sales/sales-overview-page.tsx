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
  BadgeCheck,
  Download,
  List,
  Pencil,
  Receipt,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { AdjustSalePaymentDialog } from "@/components/sales/adjust-sale-payment-dialog";
import {
  SalesFeedFilters,
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

function canAdjustSalePayment(tx: SaleTransaction): boolean {
  if (tx.channel === "online_store") return false;
  const status = tx.status?.toLowerCase() ?? "";
  if (status.includes("refund") || status.includes("void")) return false;
  return true;
}

const INK_RULE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]";
const ROSTER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]";

function RevenueBars({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  return (
    <div
      className="mt-2 flex h-10 items-end gap-px"
      role="img"
      aria-label={`Revenue trend: ${labels[0]} to ${labels[labels.length - 1]}`}
    >
      {values.map((v, i) => (
        <div
          key={`${labels[i]}-${i}`}
          className="min-w-0 flex-1 bg-[var(--pos-primary,#0f766e)]"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            opacity: v > 0 ? 0.28 + (v / max) * 0.72 : 0.1,
          }}
          title={`${labels[i]} ${fmtKes(v)}`}
        />
      ))}
    </div>
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1 truncate text-[1.45rem] font-semibold tabular-nums leading-none tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {chart}
      {hint ? (
        <p className={cn(dashboardHintClass(), "mt-1.5 truncate")}>{hint}</p>
      ) : null}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-2.5 w-14 animate-pulse bg-muted" />
          <div className="h-7 w-24 animate-pulse bg-muted" />
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
    <div className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2 px-4 py-3">
          <div className="flex justify-between gap-4">
            <div className="h-3 w-36 animate-pulse bg-muted" />
            <div className="h-3 w-16 animate-pulse bg-muted" />
          </div>
          <div className="h-2.5 w-48 animate-pulse bg-muted/70" />
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
        "border-b last:border-0 transition-colors duration-150",
        INK_RULE,
        isNew && "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]",
        refunded && "bg-destructive/[0.03]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-3.5 py-2.5 sm:px-4">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold tabular-nums tracking-tight text-foreground/80">
              #{txDisplayNo(tx)}
            </span>
            <span
              className={cn(
                "border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                isOnline
                  ? "border-[color-mix(in_srgb,var(--order-ink,#15231f)_25%,transparent)] text-foreground"
                  : refunded
                    ? "border-destructive/35 text-destructive"
                    : "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] text-[var(--pos-primary,#0f766e)]",
              )}
            >
              {isOnline
                ? formatChannelLabel(tx.channel)
                : refunded
                  ? "Refunded"
                  : "Completed"}
            </span>
            {tx.mpesaVerified && !refunded ? (
              <span
                className="inline-flex items-center gap-0.5 border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-primary,#0f766e)]"
                title="M-Pesa confirmed by KopoKopo webhook"
              >
                <BadgeCheck className="size-3" aria-hidden />
                Verified
              </span>
            ) : null}
            {tx.customerId &&
            !tx.customerPhoneVerified &&
            tx.customerMaskedHint ? (
              <span
                className="inline-flex items-center border border-amber-700/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-900"
                title="M-Pesa number is still masked until the customer fills the missing digits"
              >
                Unverified number
              </span>
            ) : null}
            <span className={cn(dashboardHintClass())}>
              {formatSoldTime(tx.soldAt, nowMs, { relative: showRelativeTime })}
            </span>
          </div>
          {meta.length > 0 ? (
            <p className="text-xs font-medium text-foreground/80">
              {tx.customerId ? (
                <Link
                  href={APP_ROUTES.customer(tx.customerId)}
                  className="text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                >
                  {meta.join(" · ")}
                </Link>
              ) : (
                meta.join(" · ")
              )}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p
              className={cn(
                "text-[15px] font-semibold tabular-nums tracking-[-0.02em]",
                refunded ? "text-[#9a2e16]" : "text-foreground",
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {refunded && tx.total > 0 ? "−" : ""}
              {fmtKes(Math.abs(tx.total))}
            </p>
            <p className={dashboardHintClass()}>
              {tx.lineCount} item{tx.lineCount === 1 ? "" : "s"}
            </p>
          </div>
          {canAdjust ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-none px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={onAdjust}
            >
              <Pencil className="size-3" aria-hidden />
              Adjust
            </Button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-0.5 border-t px-3.5 py-1.5 pl-7 sm:px-4 sm:pl-8" style={{ borderColor: "color-mix(in srgb, var(--order-ink, #15231f) 10%, transparent)" }}>
        {tx.lines.map((line, i) => {
          const lineRefunded = isRefunded(line.status);
          return (
            <li
              key={`${line.itemId}-${i}`}
              className="flex items-baseline justify-between gap-3 text-[11px] leading-snug text-muted-foreground sm:text-xs"
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
      return textMatchesQuery(
        q,
        row.itemName,
        row.itemSku,
        row.itemBarcode,
        row.cashierName,
        row.customerName,
        row.paymentMethod,
        row.paymentMethods,
        row.saleId,
        row.receiptNo,
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
      <DashboardAccessDenied
        title="Sales"
        description="You do not have permission to view sales activity."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
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

  const trendChart =
    revenueTrend.values.some((v) => v > 0) ? (
      <RevenueBars
        values={revenueTrend.values}
        labels={revenueTrend.labels}
      />
    ) : null;

  const pulse = (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-4 sm:p-5">
      {dateRange && !error ? (
        loading ? (
          <MetricsSkeleton />
        ) : (
          <div className="grid gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Revenue
              </p>
              <p
                className="mt-1 text-[2.15rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {fmtKes(summary.revenue)}
              </p>
              <p className={cn(dashboardHintClass(), "mt-2")}>
                {statusLine || "Sold this period."}
              </p>
              {trendChart}
              {trendChart ? (
                <p className={cn(dashboardHintClass(), "mt-1")}>
                  {datePreset === "today" || datePreset === "yesterday"
                    ? "By hour"
                    : "By day"}
                </p>
              ) : null}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
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
            </div>
          </div>
        )
      ) : (
        <p className={dashboardHintClass()}>
          Pick a period to see what the till took.
        </p>
      )}
    </div>
  );

  const feed = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-3.5",
          INK_RULE,
        )}
      >
        <div>
          <h2
            className="text-[15px] font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tickets
          </h2>
          <p className={dashboardHintClass()}>
            {loading
              ? "Loading…"
              : feedFiltered
                ? `Showing ${transactions.length.toLocaleString("en-KE")} of period`
                : `${transactions.length.toLocaleString("en-KE")} ticket${transactions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {isLivePeriod ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span
              className="size-1.5 bg-[var(--pos-primary,#0f766e)]"
              aria-hidden
            />
            Live
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <FeedSkeleton />
        ) : transactions.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            {!dateRange
              ? "Pick a from and to date above."
              : feedFiltered
                ? "No sales match your filters."
                : "No sales in this period."}
          </p>
        ) : (
          transactions.map((tx) => (
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
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <DashboardPageHero
        icon={Receipt}
        title="Sales"
        description={statusLine || "What the till took."}
        showActiveScope
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-none shadow-none"
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
          className="h-8 gap-1.5 rounded-none shadow-none"
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
          className="h-8 gap-1.5 rounded-none shadow-none"
          onClick={downloadPdf}
          disabled={loading || !dateRange || pdfLoading}
        >
          <Download className="size-3.5" aria-hidden />
          {pdfLoading ? "PDF…" : "PDF"}
        </Button>
        <Button size="sm" asChild className="h-8 gap-1.5 rounded-none shadow-none">
          <Link href={APP_ROUTES.salesQuick}>
            <Receipt className="size-3.5" aria-hidden />
            Record sale
          </Link>
        </Button>
      </DashboardPageHero>

      <div
        className={cn(
          "flex flex-col gap-2 border bg-white p-2.5 sm:flex-row sm:items-center sm:px-3",
          INK_RULE,
        )}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Receipt, product, SKU, barcode…"
            className={cn(dashboardInputClass(), "h-8 py-1.5 pl-8 text-sm")}
            aria-label="Search sales"
          />
        </div>
        <select
          value={branchId}
          onChange={(e) => onChangeBranch(e.target.value)}
          className={cn(dashboardSelectClass(), "h-8 py-1 sm:w-48")}
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

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="flex min-h-0 flex-col gap-1.5">
        <div
          className={cn(
            "hidden overflow-hidden border lg:grid",
            "h-[min(80dvh,52rem)]",
            INK_RULE,
            PAPER,
            "lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]",
          )}
        >
          <div className={cn("min-h-0 overflow-hidden border-r", INK_RULE, ROSTER)}>
            {pulse}
          </div>
          {feed}
        </div>

        <div className="flex min-h-0 flex-col gap-1.5 lg:hidden">
          <div className={cn("border", INK_RULE, ROSTER)}>{pulse}</div>
          <div className={cn("border", INK_RULE)}>{feed}</div>
        </div>
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
    </div>
  );
}

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
  Clock,
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
import { VoidSaleDialog } from "@/components/sales/void-sale-dialog";
import {
  SalesFeedFilters,
  DATE_FILTER_OPTIONS,
  type SalesDatePreset,
  type StatusFilter,
} from "@/components/sales/sales-feed-filters";
import {
  salesHair,
  salesHairDivide,
  salesInk,
  salesMute,
  salesPaper,
  salesSurface,
  SalesHeroMetric,
  SalesMetricTile,
  SalesPeriodChip,
  SalesStage,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
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
    <figure className="mt-3 pb-2">
      <div
        className={cn("flex h-14 items-end gap-[3px] border-b", salesHair)}
        role="img"
        aria-label={`Revenue trend: ${labels[0]} to ${labels[labels.length - 1]}`}
      >
        {values.map((v, i) => (
          <div
            key={`${labels[i]}-${i}`}
            className="min-w-0 flex-1 rounded-t-[3px] bg-[var(--pos-primary,#0f766e)] transition-opacity duration-200 hover:!opacity-100"
            style={{
              height: `${Math.max(6, (v / max) * 100)}%`,
              opacity: v > 0 ? 0.3 + (v / max) * 0.7 : 0.12,
            }}
            title={`${labels[i]} ${fmtKes(v)}`}
          />
        ))}
      </div>
      <figcaption
        className={cn(
          "mt-1.5 flex justify-between font-mono text-[10.5px] tabular-nums",
          salesMute,
        )}
      >
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </figcaption>
    </figure>
  );
}

function MetricsSkeleton() {
  return (
    <div className="space-y-3 p-4 sm:p-5">
      <div className="h-24 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[4.75rem] animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]"
          />
        ))}
      </div>
    </div>
  );
}

function SalesTillMetrics({
  datePreset,
  onDatePresetChange,
  isLivePeriod,
  dateRange,
  error,
  loading,
  summary,
  statusLine,
  trendChart,
}: {
  datePreset: SalesDatePreset;
  onDatePresetChange: (id: SalesDatePreset) => void;
  isLivePeriod: boolean;
  dateRange: { from: string; to: string } | null;
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
  };
  statusLine: string;
  trendChart: ReactNode;
}) {
  const takenHint =
    trendChart && dateRange
      ? `${statusLine || "Sold this period."} · ${
          datePreset === "today" || datePreset === "yesterday" ? "by hour" : "by day"
        }`
      : statusLine || "Sold this period.";

  return (
    <div className={cn(salesSurface, "flex min-h-0 flex-col overflow-hidden")}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-3.5",
          salesHair,
        )}
      >
        <div
          role="group"
          aria-label="Period"
          className="flex flex-wrap items-center gap-1.5"
        >
          {DATE_FILTER_OPTIONS.map(({ id, label }) => (
            <SalesPeriodChip
              key={id}
              active={datePreset === id}
              onClick={() => onDatePresetChange(id)}
            >
              {label}
            </SalesPeriodChip>
          ))}
        </div>
        {isLivePeriod ? (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium",
              salesMute,
            )}
          >
            <span
              className="size-1.5 rounded-full bg-[var(--pos-primary,#0f766e)] motion-safe:animate-pulse"
              aria-hidden
            />
            Live
          </span>
        ) : null}
      </div>

      {!dateRange || error ? (
        <p className={cn(dashboardHintClass(), "px-4 py-10 text-center sm:px-5")}>
          Pick a period to see what the till took.
        </p>
      ) : loading ? (
        <MetricsSkeleton />
      ) : (
        <>
          <SalesHeroMetric
            label="Taken"
            value={fmtKes(summary.revenue)}
            hint={takenHint}
          />
          {trendChart ? (
            <div className="px-4 pb-1 sm:px-5">{trendChart}</div>
          ) : null}
          <div className={cn("grid grid-cols-2 border-t", salesHair, salesHairDivide)}>
            <SalesMetricTile
              label="Tickets"
              value={summary.transactions.toLocaleString("en-KE")}
              hint={
                summary.transactions > 0
                  ? `${fmtKes(summary.avgTicket)} average`
                  : "No tickets yet"
              }
            />
            <SalesMetricTile
              label="Units"
              value={summary.units.toLocaleString("en-KE", {
                maximumFractionDigits: 1,
              })}
              hint={
                summary.lineCount > 0
                  ? `${summary.lineCount.toLocaleString("en-KE")} lines`
                  : undefined
              }
            />
            <SalesMetricTile
              className="col-span-2 border-t"
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
                    : "Nothing sold yet"
              }
              warn={summary.refundLines > 0}
            />
          </div>
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
    <div className={cn("divide-y", salesHairDivide)} aria-hidden>
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
  return parts;
}

type ChipTone = "ok" | "refund" | "online" | "verified" | "warn";

const CHIP_TONES: Record<ChipTone, string> = {
  ok: "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)] text-[var(--pos-primary,#0f766e)]",
  verified:
    "bg-white text-[var(--pos-primary,#0f766e)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)]",
  refund: "bg-[#9a2e16]/[0.08] text-[#9a2e16]",
  online:
    "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,white)] text-[var(--order-ink,#15231f)]",
  warn: "bg-amber-500/10 text-amber-900",
};

function SaleChip({
  tone,
  title,
  children,
}: {
  tone: ChipTone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10.5px] font-semibold leading-none tracking-[0.01em]",
        CHIP_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

function SaleGroup({
  tx,
  nowMs,
  showRelativeTime,
  isNew,
  canAdjust,
  canVoid,
  onAdjust,
  onVoid,
}: {
  tx: SaleTransaction;
  nowMs: number;
  showRelativeTime: boolean;
  isNew?: boolean;
  canAdjust: boolean;
  canVoid: boolean;
  onAdjust: () => void;
  onVoid: () => void;
}) {
  const refunded = isRefunded(tx.status);
  const isOnline = tx.channel === "online_store";
  const meta = saleMetaParts(tx);
  const receipt = txDisplayNo(tx);
  const hasActions = canAdjust || canVoid;

  return (
    <article
      className={cn(
        "relative border-b transition-colors duration-200 last:border-0",
        salesHair,
        "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
        refunded && "bg-[#9a2e16]/[0.025]",
        isNew &&
          "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]",
      )}
    >
      <div className="flex items-start justify-between gap-3 px-3.5 pb-2 pt-3 sm:px-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "font-mono text-[12.5px] font-semibold tabular-nums tracking-tight",
                salesInk,
              )}
            >
              #{receipt}
            </span>
            {isOnline ? (
              <SaleChip tone="online">{formatChannelLabel(tx.channel)}</SaleChip>
            ) : refunded ? (
              <SaleChip tone="refund">Refunded</SaleChip>
            ) : (
              <SaleChip tone="ok">
                <span
                  className="size-1.5 rounded-full bg-current"
                  aria-hidden
                />
                Completed
              </SaleChip>
            )}
            {tx.mpesaVerified && !refunded ? (
              <SaleChip
                tone="verified"
                title="M-Pesa confirmed by KopoKopo webhook"
              >
                <BadgeCheck className="size-3" aria-hidden />
                Verified
              </SaleChip>
            ) : null}
            {tx.customerId &&
            !tx.customerPhoneVerified &&
            tx.customerMaskedHint ? (
              <SaleChip
                tone="warn"
                title="M-Pesa number is still masked until the customer fills the missing digits"
              >
                Unverified number
              </SaleChip>
            ) : null}
          </div>
          {meta.length > 0 ? (
            <p className={cn("truncate text-[12.5px] font-medium", salesInk)}>
              {tx.customerId ? (
                <Link
                  href={APP_ROUTES.customer(tx.customerId)}
                  className="text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                >
                  {meta.join(" · ")}
                </Link>
              ) : (
                <span className="opacity-80">{meta.join(" · ")}</span>
              )}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-[17px] font-semibold tabular-nums leading-none tracking-[-0.02em]",
              refunded ? "text-[#9a2e16]" : salesInk,
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {refunded && tx.total > 0 ? "−" : ""}
            {fmtKes(Math.abs(tx.total))}
          </p>
          <p className={cn("mt-1.5 text-[11px] tabular-nums", salesMute)}>
            {tx.lineCount} item{tx.lineCount === 1 ? "" : "s"}
            <span className="mx-1 opacity-50">·</span>
            {formatSoldTime(tx.soldAt, nowMs, { relative: showRelativeTime })}
          </p>
        </div>
      </div>

      <ul
        className={cn(
          "mx-3.5 mb-2.5 space-y-1 border-l pl-3 sm:mx-4",
          salesHair,
        )}
      >
        {tx.lines.map((line, i) => {
          const lineRefunded = isRefunded(line.status);
          return (
            <li
              key={`${line.itemId}-${i}`}
              className="flex items-baseline justify-between gap-3 text-[12px] leading-snug"
            >
              <span className="min-w-0 truncate">
                <span
                  className={cn("font-mono text-[11px] tabular-nums", salesMute)}
                >
                  {formatQty(line.quantity)}×
                </span>
                <span
                  className={cn(
                    "ml-1.5",
                    salesInk,
                    lineRefunded && "line-through opacity-60",
                  )}
                >
                  {line.itemName}
                </span>
                <span
                  className={cn("ml-1.5 font-mono text-[11px] tabular-nums", salesMute)}
                >
                  @ {fmtKes(line.unitPrice)}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 font-mono text-[11.5px] tabular-nums",
                  lineRefunded ? "text-[#9a2e16]" : salesMute,
                )}
              >
                {lineRefunded ? "−" : ""}
                {fmtKes(line.lineTotal)}
              </span>
            </li>
          );
        })}
      </ul>

      {hasActions ? (
        <div
          className={cn(
            "flex items-center justify-end gap-1 border-t px-2 py-1.5 sm:px-2.5",
            salesHair,
          )}
        >
          {canAdjust ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold sm:h-8",
                salesMute,
                "hover:text-[var(--order-ink,#15231f)]",
              )}
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
              className="h-9 gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold text-[#9a2e16] hover:bg-[#9a2e16]/[0.08] hover:text-[#7a2412] focus-visible:border-[#9a2e16]/40 focus-visible:ring-[#9a2e16]/20 sm:h-8"
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
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sales.");
        if (!silent) setLines([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
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

  const tillMetrics = (
    <SalesTillMetrics
      datePreset={datePreset}
      onDatePresetChange={setDatePreset}
      isLivePeriod={isLivePeriod}
      dateRange={dateRange}
      error={error}
      loading={loading}
      summary={summary}
      statusLine={statusLine}
      trendChart={trendChart}
    />
  );

  const feedHint =
    loading
      ? "Loading…"
      : feedFiltered
        ? `Showing ${transactions.length.toLocaleString("en-KE")} of period`
        : `${transactions.length.toLocaleString("en-KE")} ticket${transactions.length === 1 ? "" : "s"}`;

  const feed = (
    <SalesStage
      title="Tickets"
      hint={feedHint}
      className="h-full min-h-0"
      bodyClassName="flex min-h-0 flex-1 flex-col p-0"
    >
        <div className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:px-3.5">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Receipt, product, SKU…"
              className={cn(dashboardInputClass(), "h-8 py-1.5 pl-8 text-sm")}
              aria-label="Search sales"
            />
          </div>
          <select
            value={branchId}
            onChange={(e) => onChangeBranch(e.target.value)}
            className={cn(dashboardSelectClass(), "h-8 py-1 sm:w-40")}
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
          compact
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
      <div className={cn("min-h-0 flex-1 overflow-y-auto border-t", salesHair)}>
        {loading ? (
          <FeedSkeleton />
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]",
                salesMute,
              )}
            >
              <Receipt className="size-4" aria-hidden />
            </span>
            <p className={cn("text-sm font-medium", salesInk)}>
              {!dateRange
                ? "Pick a from and to date"
                : feedFiltered
                  ? "No sales match your filters"
                  : "No sales in this period"}
            </p>
            <p className={cn("max-w-[16rem] text-xs", salesMute)}>
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
              canAdjust={canAdjustPayment && isMutableSale(tx)}
              canVoid={canVoid && canVoidSale(tx)}
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
    </SalesStage>
  );

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, salesPaper)}>
      <DashboardPageHero
        icon={Receipt}
        title="Sales"
        description={statusLine || "What the till took."}
        showActiveScope
      >
        {hasPermission(me?.permissions, Permission.SalesIntelligenceRead) ? (
          <Link href={APP_ROUTES.salesByHour} className={salesToolBtnClass()}>
            <Clock className="size-3.5" aria-hidden />
            By the hour
          </Link>
        ) : null}
        <Link href={APP_ROUTES.salesTransactions} className={salesToolBtnClass()}>
          <List className="size-3.5" aria-hidden />
          Transactions
        </Link>
        <button
          type="button"
          className={salesToolBtnClass()}
          onClick={() => void load({ silent: true })}
          disabled={loading}
        >
          <RefreshCw
            className={cn("size-3.5", refreshing && "animate-spin")}
            aria-hidden
          />
          Refresh
        </button>
        <button
          type="button"
          className={salesToolBtnClass()}
          onClick={downloadPdf}
          disabled={loading || !dateRange || pdfLoading}
        >
          <Download className="size-3.5" aria-hidden />
          {pdfLoading ? "PDF…" : "PDF"}
        </button>
        <Link href={APP_ROUTES.salesQuick} className={salesToolBtnClass(true)}>
          <Receipt className="size-3.5" aria-hidden />
          Record sale
        </Link>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="flex min-h-0 flex-col gap-2">
        <div
          className={cn(
            "hidden h-[min(80dvh,52rem)] gap-2 lg:grid",
            "lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]",
          )}
        >
          <div className="min-h-0 overflow-hidden">{feed}</div>
          <div className="min-h-0 overflow-hidden">{tillMetrics}</div>
        </div>

        <div className="flex min-h-0 flex-col gap-2 lg:hidden">
          {tillMetrics}
          {feed}
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

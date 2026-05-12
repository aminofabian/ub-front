"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Minus,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DashboardLoading,
  DashboardPageHero,
  DashboardFeedback,
  DASHBOARD_MAX_WIDE,
} from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import {
  fetchBranches,
  fetchDashboardOwnerSummary,
  fetchFinanceExpenses,
  fetchFinancePL,
  fetchFinancePulse,
  fetchInventoryExpiryPipeline,
  fetchInventoryValuation,
  fetchPaymentsByMethod,
  fetchRecentSales,
  fetchSalesRegister,
  fetchSalesRevenueByCategory,
  fetchStaffPerformance,
  type BranchRecord,
  type FinancePulseResponse,
  type InventoryExpiryPipelineResponse,
  type InventoryValuationResponseRecord,
  type PaymentMethodBreakdownRow,
  type ProfitAndLossResponse,
  type RecentSaleRow,
  type RevenueByCategoryRow,
  type SalesRegisterResponse,
  type StaffPerformanceRow,
} from "@/lib/api";

/* ─── Date utilities ─────────────────────────────────────────────────────── */

type DatePreset =
  | "today"
  | "yesterday"
  | "last3"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function diffDays(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

function presetRange(preset: DatePreset): { from: string; to: string } | null {
  const today = new Date();
  const todayStr = toISODate(today);
  switch (preset) {
    case "today":
      return { from: todayStr, to: todayStr };
    case "yesterday": {
      const y = toISODate(addDays(today, -1));
      return { from: y, to: y };
    }
    case "last3":
      return { from: toISODate(addDays(today, -2)), to: todayStr };
    case "last7":
      return { from: toISODate(addDays(today, -6)), to: todayStr };
    case "last30":
      return { from: toISODate(addDays(today, -29)), to: todayStr };
    case "thisMonth":
      return { from: toISODate(startOfMonth(today)), to: todayStr };
    case "lastMonth": {
      const firstOfThis = startOfMonth(today);
      const lastOfPrev = addDays(firstOfThis, -1);
      const firstOfPrev = startOfMonth(lastOfPrev);
      return { from: toISODate(firstOfPrev), to: toISODate(lastOfPrev) };
    }
    default:
      return null;
  }
}

function previousPeriod(
  from: string,
  to: string,
): { from: string; to: string } {
  const days = Math.max(1, diffDays(from, to));
  return {
    from: toISODate(addDays(parseISODate(from), -days - 1)),
    to: toISODate(addDays(parseISODate(from), -1)),
  };
}

/* ─── Money formatting ───────────────────────────────────────────────────── */

function formatMoney(
  n: number | string | null | undefined,
  currency = "",
): string {
  const val = n == null ? 0 : typeof n === "number" ? n : Number(n);
  const num = val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${num}` : num;
}

function formatNumber(n: number | string | null | undefined): string {
  const val = n == null ? 0 : typeof n === "number" ? n : Number(n);
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

/* ─── Tone helpers ───────────────────────────────────────────────────────── */

const TONE_STYLES = {
  danger: "bg-red-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  neutral: "bg-muted",
  primary: "bg-primary",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
};

/* ─── Small components ───────────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent = "bg-primary/10 text-primary",
  trend,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ElementType;
  accent?: string;
  trend?: { delta: number; label: string } | null;
}) {
  const up = trend && trend.delta > 0;
  const down = trend && trend.delta < 0;
  const flat = trend && trend.delta === 0;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            accent,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
        {trend ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            {up ? (
              <TrendingUp className="size-3.5 text-emerald-600" aria-hidden />
            ) : down ? (
              <TrendingDown className="size-3.5 text-red-600" aria-hidden />
            ) : (
              <Minus className="size-3.5 text-muted-foreground" aria-hidden />
            )}
            <span
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                up && "text-emerald-700 dark:text-emerald-400",
                down && "text-red-700 dark:text-red-400",
                flat && "text-muted-foreground",
              )}
            >
              {up ? "+" : ""}
              {trend.delta.toFixed(1)}%
            </span>
            <span className="text-[11px] text-muted-foreground">
              {trend.label}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MiniBarChart({
  data,
  max,
  barClass,
  label,
  value,
}: {
  data: number[];
  max: number;
  barClass?: string;
  label?: (i: number) => string;
  value?: (i: number) => string;
}) {
  const safeMax = max > 0 ? max : 1;
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((v, i) => {
        const pct = Math.min((v / safeMax) * 100, 100);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group relative"
          >
            <div
              className={cn(
                "w-full rounded-sm transition-all",
                barClass || "bg-primary/80",
              )}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            {label && i % Math.ceil(data.length / 6) === 0 ? (
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {label(i)}
              </span>
            ) : null}
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
              <div className="rounded-md bg-popover border border-border px-2 py-1 text-xs shadow-sm whitespace-nowrap">
                {value ? value(i) : `${v.toFixed(2)}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBar({
  label,
  value,
  max,
  sublabel,
  tone = "primary",
}: {
  label: string;
  value: number;
  max: number;
  sublabel?: string;
  tone?: keyof typeof TONE_STYLES;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground truncate">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {sublabel || formatMoney(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            TONE_STYLES[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SparkBar({
  value,
  max,
  tone = "primary",
}: {
  value: number;
  max: number;
  tone?: keyof typeof TONE_STYLES;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-24">
      <div
        className={cn("h-full rounded-full transition-all", TONE_STYLES[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PercentageRing({
  value,
  size = 48,
  stroke = 5,
  color = "text-primary",
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100);
  const dash = (pct / 100) * c;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted"
          opacity={0.3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function calcTrend(
  current: number,
  previous: number,
): { delta: number; label: string } | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    if (current === 0) return { delta: 0, label: "vs previous" };
    return { delta: 100, label: "vs previous" };
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  return { delta, label: "vs previous" };
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

const PRESET_LABELS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last3", label: "Last 3 Days" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "custom", label: "Custom" },
];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>("last7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [pulse, setPulse] = useState<FinancePulseResponse | null>(null);
  const [pl, setPl] = useState<ProfitAndLossResponse | null>(null);
  const [salesRegister, setSalesRegister] =
    useState<SalesRegisterResponse | null>(null);
  const [categoryRevenue, setCategoryRevenue] = useState<
    RevenueByCategoryRow[]
  >([]);
  const [paymentMethods, setPaymentMethods] = useState<
    PaymentMethodBreakdownRow[]
  >([]);
  const [staffPerf, setStaffPerf] = useState<StaffPerformanceRow[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSaleRow[]>([]);
  const [inventoryVal, setInventoryVal] =
    useState<InventoryValuationResponseRecord | null>(null);
  const [expiryPipeline, setExpiryPipeline] =
    useState<InventoryExpiryPipelineResponse | null>(null);
  const [ownerSummary, setOwnerSummary] = useState<{
    topSkus: {
      itemId: string;
      itemName: string;
      revenueLast30Days: number | string;
    }[];
  } | null>(null);
  const [expenses, setExpenses] = useState<{ amount: number }[]>([]);

  // Previous period data for trends
  const [prevPl, setPrevPl] = useState<ProfitAndLossResponse | null>(null);
  const [prevSalesRegister, setPrevSalesRegister] =
    useState<SalesRegisterResponse | null>(null);
  const [prevCategoryRevenue, setPrevCategoryRevenue] = useState<
    RevenueByCategoryRow[]
  >([]);

  // Search
  const [saleSearch, setSaleSearch] = useState("");

  const dateRange = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [branchList] = await Promise.all([fetchBranches()]);
      setBranches(branchList);

      if (dateRange) {
        const prev = previousPeriod(dateRange.from, dateRange.to);
        const branchFilter = branchId || undefined;

        const [
          pulseRes,
          plRes,
          prevPlRes,
          regRes,
          prevRegRes,
          catRes,
          prevCatRes,
          payRes,
          staffRes,
          salesRes,
          invValRes,
          expiryRes,
          ownerRes,
          expenseRes,
        ] = await Promise.all([
          fetchFinancePulse(dateRange.to, branchFilter).catch(() => null),
          fetchFinancePL(dateRange.from, dateRange.to, branchFilter).catch(
            () => null,
          ),
          fetchFinancePL(prev.from, prev.to, branchFilter).catch(() => null),
          fetchSalesRegister(dateRange.from, dateRange.to, branchFilter).catch(
            () => null,
          ),
          fetchSalesRegister(prev.from, prev.to, branchFilter).catch(
            () => null,
          ),
          fetchSalesRevenueByCategory(dateRange.from, dateRange.to).catch(
            () => [],
          ),
          fetchSalesRevenueByCategory(prev.from, prev.to).catch(() => []),
          fetchPaymentsByMethod(
            dateRange.from,
            dateRange.to,
            branchFilter,
          ).catch(() => []),
          fetchStaffPerformance(
            dateRange.from,
            dateRange.to,
            branchFilter,
          ).catch(() => []),
          fetchRecentSales(dateRange.from, dateRange.to, branchFilter).catch(
            () => [],
          ),
          fetchInventoryValuation(branchFilter).catch(() => null),
          fetchInventoryExpiryPipeline(branchFilter).catch(() => null),
          fetchDashboardOwnerSummary().catch(() => null),
          fetchFinanceExpenses().catch(() => []),
        ]);

        setPulse(pulseRes);
        setPl(plRes);
        setPrevPl(prevPlRes);
        setSalesRegister(regRes);
        setPrevSalesRegister(prevRegRes);
        setCategoryRevenue(catRes);
        setPrevCategoryRevenue(prevCatRes);
        setPaymentMethods(payRes);
        setStaffPerf(staffRes);
        setRecentSales(salesRes);
        setInventoryVal(invValRes);
        setExpiryPipeline(expiryRes);
        setOwnerSummary(
          ownerRes ? { topSkus: ownerRes.topSkusLast30Days } : null,
        );
        setExpenses(
          Array.isArray(expenseRes)
            ? expenseRes.map((e) => ({ amount: toNum(e.amount) }))
            : [],
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ─── Derived metrics ──────────────────────────────────────────────────── */

  const totalRevenue = toNum(pl?.revenue ?? pulse?.revenue ?? 0);
  const totalProfit = toNum(pl?.grossProfit ?? pulse?.grossProfit ?? 0);
  const totalExpenses = toNum(
    pl?.operatingExpenses ?? pulse?.expensesTotal ?? 0,
  );
  const netOperating = toNum(pl?.netOperating ?? pulse?.netOperating ?? 0);
  const salesCount = pulse?.salesCount ?? 0;
  const grossMargin = toNum(pulse?.grossMarginPct ?? 0);

  const prevTotalRevenue = toNum(prevPl?.revenue ?? 0);
  const prevTotalProfit = toNum(prevPl?.grossProfit ?? 0);
  const prevTotalExpenses = toNum(prevPl?.operatingExpenses ?? 0);
  const prevNetOperating = toNum(prevPl?.netOperating ?? 0);

  const totalInventoryValue = toNum(inventoryVal?.totalExtensionValue ?? 0);

  const expiryBuckets = expiryPipeline?.buckets ?? {};
  const expiredQty = toNum(expiryBuckets.expired?.qtyRemaining ?? 0);
  const due7dQty = toNum(expiryBuckets.due_7d?.qtyRemaining ?? 0);
  const due30dQty = toNum(expiryBuckets.due_30d?.qtyRemaining ?? 0);

  const dailyRevenue = useMemo(() => {
    if (!salesRegister?.days) return [];
    return salesRegister.days.map((d) => toNum(d.revenue));
  }, [salesRegister]);

  const dailyLabels = useMemo(() => {
    if (!salesRegister?.days) return [];
    return salesRegister.days.map((d) => {
      const date = new Date(d.day);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
  }, [salesRegister]);

  const maxDailyRevenue = useMemo(() => {
    if (dailyRevenue.length === 0) return 1;
    return Math.max(...dailyRevenue, 1);
  }, [dailyRevenue]);

  const avgDailyRevenue = useMemo(() => {
    if (dailyRevenue.length === 0) return 0;
    return dailyRevenue.reduce((a, b) => a + b, 0) / dailyRevenue.length;
  }, [dailyRevenue]);

  /* ─── Insights ─────────────────────────────────────────────────────────── */

  const insights = useMemo(() => {
    const out: {
      icon: React.ElementType;
      text: string;
      tone: "good" | "warn" | "info" | "neutral";
    }[] = [];

    if (dailyRevenue.length > 1) {
      const mid = Math.floor(dailyRevenue.length / 2);
      const firstHalf =
        dailyRevenue.slice(0, mid).reduce((a, b) => a + b, 0) /
        Math.max(1, mid);
      const secondHalf =
        dailyRevenue.slice(mid).reduce((a, b) => a + b, 0) /
        Math.max(1, dailyRevenue.length - mid);
      if (secondHalf > firstHalf * 1.1) {
        out.push({
          icon: TrendingUp,
          text: "Revenue trending upward in recent days.",
          tone: "good",
        });
      } else if (secondHalf < firstHalf * 0.9) {
        out.push({
          icon: TrendingDown,
          text: "Revenue trending downward — consider promotions.",
          tone: "warn",
        });
      }
    }

    if (grossMargin < 15) {
      out.push({
        icon: AlertTriangle,
        text: "Gross margin is low. Review pricing or cost structure.",
        tone: "warn",
      });
    } else if (grossMargin > 40) {
      out.push({
        icon: TrendingUp,
        text: "Healthy gross margin. Business is well-positioned.",
        tone: "good",
      });
    }

    if (expiredQty > 0) {
      out.push({
        icon: Package,
        text: `${formatNumber(expiredQty)} units already expired. Dispose or discount immediately.`,
        tone: "warn",
      });
    }
    if (due7dQty > 0) {
      out.push({
        icon: Clock,
        text: `${formatNumber(due7dQty)} units expiring within 7 days. Plan promotions.`,
        tone: "warn",
      });
    }

    if (paymentMethods.length > 0) {
      const top = paymentMethods[0];
      out.push({
        icon: CreditCard,
        text: `${top.method} is your top payment method (${formatMoney(toNum(top.totalAmount))}).`,
        tone: "info",
      });
    }

    if (staffPerf.length > 0) {
      const topStaff = staffPerf[0];
      out.push({
        icon: Users,
        text: `${topStaff.userName} leads in sales with ${formatMoney(toNum(topStaff.totalRevenue))}.`,
        tone: "neutral",
      });
    }

    if (categoryRevenue.length > 1) {
      const topCat = categoryRevenue[0];
      const topShare =
        (toNum(topCat.netRevenue) / Math.max(1, totalRevenue)) * 100;
      out.push({
        icon: BarChart3,
        text: `${topCat.categoryName} accounts for ${topShare.toFixed(1)}% of revenue.`,
        tone: "info",
      });
    }

    return out;
  }, [
    dailyRevenue,
    grossMargin,
    expiredQty,
    due7dQty,
    paymentMethods,
    staffPerf,
    categoryRevenue,
    totalRevenue,
  ]);

  /* ─── Sales table filtering ────────────────────────────────────────────── */

  const filteredSales = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    if (!q) return recentSales;
    return recentSales.filter(
      (s) =>
        s.itemName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.paymentMethod.toLowerCase().includes(q) ||
        s.saleId.toLowerCase().includes(q),
    );
  }, [recentSales, saleSearch]);

  /* ─── Render ───────────────────────────────────────────────────────────── */

  if (loading && !refreshing) {
    return (
      <div className="h-full overflow-y-auto overscroll-contain">
        <div className={DASHBOARD_MAX_WIDE}>
          <DashboardLoading label="Loading analytics…" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className={cn(DASHBOARD_MAX_WIDE, "space-y-6 pb-12")}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <DashboardPageHero
            icon={BarChart3}
            eyebrow="Analytics"
            title="Overall Business Analytics"
            description="Real-time insights into sales, profit, inventory, and team performance."
            compact
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true);
                load();
              }}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("size-4 mr-1.5", refreshing && "animate-spin")}
                aria-hidden
              />
              Refresh
            </Button>
          </div>
        </div>

        {error ? <DashboardFeedback kind="error" text={error} /> : null}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  preset === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomFrom(e.target.value)
                }
                className="h-8 w-36 rounded-lg border border-input bg-background px-2 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomTo(e.target.value)
                }
                className="h-8 w-36 rounded-lg border border-input bg-background px-2 text-xs"
              />
            </div>
          ) : null}
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Total Revenue"
            value={formatMoney(totalRevenue)}
            icon={DollarSign}
            accent="bg-sky-500/10 text-sky-600"
            trend={calcTrend(totalRevenue, prevTotalRevenue)}
          />
          <MetricCard
            label="Gross Profit"
            value={formatMoney(totalProfit)}
            icon={TrendingUp}
            accent="bg-emerald-500/10 text-emerald-600"
            trend={calcTrend(totalProfit, prevTotalProfit)}
          />
          <MetricCard
            label="Net Operating"
            value={formatMoney(netOperating)}
            icon={Wallet}
            accent="bg-violet-500/10 text-violet-600"
            trend={calcTrend(netOperating, prevNetOperating)}
          />
          <MetricCard
            label="Expenses"
            value={formatMoney(totalExpenses)}
            icon={CreditCard}
            accent="bg-amber-500/10 text-amber-600"
            trend={calcTrend(totalExpenses, prevTotalExpenses)}
          />
          <MetricCard
            label="Sales Count"
            value={formatNumber(salesCount)}
            icon={ShoppingCart}
            accent="bg-primary/10 text-primary"
          />
          <MetricCard
            label="Gross Margin"
            value={`${grossMargin.toFixed(1)}%`}
            icon={BarChart3}
            accent="bg-rose-500/10 text-rose-600"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Revenue Trend */}
          <SectionCard
            title="Revenue Trend"
            icon={BarChart3}
            className="lg:col-span-2"
          >
            {dailyRevenue.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Avg daily:{" "}
                    <span className="font-semibold text-foreground">
                      {formatMoney(avgDailyRevenue)}
                    </span>
                  </span>
                  <span>
                    Total:{" "}
                    <span className="font-semibold text-foreground">
                      {formatMoney(totalRevenue)}
                    </span>
                  </span>
                </div>
                <MiniBarChart
                  data={dailyRevenue}
                  max={maxDailyRevenue}
                  label={(i) => dailyLabels[i] ?? ""}
                  value={(i) =>
                    `${dailyLabels[i]}: ${formatMoney(dailyRevenue[i])}`
                  }
                />
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No revenue data for this period.
              </div>
            )}
          </SectionCard>

          {/* Payment Methods */}
          <SectionCard title="Payment Methods" icon={CreditCard}>
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <HorizontalBar
                    key={pm.method}
                    label={pm.method}
                    value={toNum(pm.totalAmount)}
                    max={toNum(paymentMethods[0]?.totalAmount ?? 1)}
                    sublabel={`${formatMoney(pm.totalAmount)} • ${pm.transactionCount} txns`}
                    tone={
                      pm.method === "cash"
                        ? "success"
                        : pm.method === "mpesa"
                          ? "sky"
                          : "primary"
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No payment data.
              </div>
            )}
          </SectionCard>
        </div>

        {/* Categories + Staff Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Category Breakdown */}
          <SectionCard title="Revenue by Category" icon={Package}>
            {categoryRevenue.length > 0 ? (
              <div className="space-y-3">
                {categoryRevenue.slice(0, 10).map((cat) => (
                  <HorizontalBar
                    key={cat.categoryId}
                    label={cat.categoryName}
                    value={toNum(cat.netRevenue)}
                    max={toNum(categoryRevenue[0]?.netRevenue ?? 1)}
                    sublabel={`${formatMoney(cat.netRevenue)} • Profit: ${formatMoney(cat.netProfit)}`}
                    tone="violet"
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No category data.
              </div>
            )}
          </SectionCard>

          {/* Staff Performance */}
          <SectionCard title="Staff Performance" icon={Users}>
            {staffPerf.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Staff</th>
                      <th className="pb-2 font-medium text-right">Sales</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                      <th className="pb-2 font-medium text-right">Profit</th>
                      <th className="pb-2 font-medium text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {staffPerf.map((s) => {
                      const margin =
                        toNum(s.totalRevenue) > 0
                          ? (toNum(s.totalProfit) / toNum(s.totalRevenue)) * 100
                          : 0;
                      return (
                        <tr key={s.userId} className="group">
                          <td className="py-2.5 font-medium">{s.userName}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatNumber(s.saleCount)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatMoney(s.totalRevenue)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatMoney(s.totalProfit)}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs tabular-nums">
                                {margin.toFixed(1)}%
                              </span>
                              <SparkBar
                                value={margin}
                                max={50}
                                tone={
                                  margin > 20
                                    ? "success"
                                    : margin > 10
                                      ? "warning"
                                      : "danger"
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No staff data.
              </div>
            )}
          </SectionCard>
        </div>

        {/* Inventory + Top Products + Insights Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Inventory Summary */}
          <SectionCard title="Inventory" icon={Package}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Stock Value
                </span>
                <span className="text-lg font-bold">
                  {formatMoney(totalInventoryValue)}
                </span>
              </div>
              {inventoryVal?.byBranch && inventoryVal.byBranch.length > 1 ? (
                <div className="space-y-2">
                  {inventoryVal.byBranch.map((b) => (
                    <HorizontalBar
                      key={b.branchId}
                      label={b.branchName}
                      value={toNum(b.extensionValue)}
                      max={toNum(totalInventoryValue)}
                      sublabel={formatMoney(b.extensionValue)}
                      tone="sky"
                    />
                  ))}
                </div>
              ) : null}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="size-3" /> Expired
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatNumber(expiredQty)} units
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="size-3" /> Expires &lt; 7d
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatNumber(due7dQty)} units
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <Calendar className="size-3" /> Expires &lt; 30d
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatNumber(due30dQty)} units
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Top Products */}
          <SectionCard title="Top Products (30d)" icon={Zap}>
            {ownerSummary?.topSkus && ownerSummary.topSkus.length > 0 ? (
              <div className="space-y-3">
                {ownerSummary.topSkus.map((sku, i) => (
                  <div key={sku.itemId} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        i === 0
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : i === 1
                            ? "bg-slate-400/15 text-slate-700 dark:text-slate-400"
                            : i === 2
                              ? "bg-orange-600/15 text-orange-700 dark:text-orange-400"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {sku.itemName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(sku.revenueLast30Days)}
                      </p>
                    </div>
                    <PercentageRing
                      value={
                        toNum(sku.revenueLast30Days) > 0
                          ? Math.min(
                              (toNum(sku.revenueLast30Days) /
                                Math.max(
                                  1,
                                  toNum(
                                    ownerSummary.topSkus[0]?.revenueLast30Days,
                                  ),
                                )) *
                                100,
                              100,
                            )
                          : 0
                      }
                      size={36}
                      stroke={4}
                      color={
                        i === 0
                          ? "text-amber-500"
                          : i === 1
                            ? "text-slate-400"
                            : i === 2
                              ? "text-orange-500"
                              : "text-primary"
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No top product data.
              </div>
            )}
          </SectionCard>

          {/* Insights */}
          <SectionCard title="Smart Insights" icon={Zap}>
            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg bg-muted/40 p-2.5"
                  >
                    <insight.icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        insight.tone === "good"
                          ? "text-emerald-600"
                          : insight.tone === "warn"
                            ? "text-amber-600"
                            : insight.tone === "info"
                              ? "text-sky-600"
                              : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    <p className="text-xs leading-relaxed text-foreground">
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No insights available.
              </div>
            )}
          </SectionCard>
        </div>

        {/* Sales Transactions Table */}
        <SectionCard
          title={`Recent Sales (${filteredSales.length})`}
          icon={ShoppingCart}
          action={
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                placeholder="Search sales..."
                value={saleSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSaleSearch(e.target.value)
                }
                className="h-8 w-48 rounded-lg border border-input bg-background pl-8 pr-2 text-xs placeholder:text-muted-foreground/70"
              />
            </div>
          }
        >
          {filteredSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Price</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Profit</th>
                    <th className="pb-2 font-medium">Cashier</th>
                    <th className="pb-2 font-medium">Payment</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredSales.slice(0, 100).map((s, idx) => (
                    <tr
                      key={`${s.saleId}-${s.itemId}-${idx}`}
                      className="group hover:bg-muted/30"
                    >
                      <td className="py-2.5 text-xs text-muted-foreground tabular-nowrap">
                        {new Date(s.soldAt).toLocaleDateString()}
                        <span className="block text-[10px]">
                          {new Date(s.soldAt).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <p className="font-medium truncate max-w-[200px]">
                          {s.itemName}
                        </p>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {Number(s.quantity).toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {formatMoney(s.unitPrice)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-medium">
                        {formatMoney(s.lineTotal)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        <span
                          className={cn(
                            toNum(s.profit) >= 0
                              ? "text-emerald-600"
                              : "text-red-600",
                          )}
                        >
                          {formatMoney(s.profit)}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs">{s.cashierName}</td>
                      <td className="py-2.5 text-xs">
                        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase",
                            s.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : s.status === "refunded"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSales.length > 100 && (
                <div className="mt-3 text-center text-xs text-muted-foreground">
                  Showing 100 of {filteredSales.length} transactions
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {saleSearch
                ? "No sales match your search."
                : "No sales data for this period."}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

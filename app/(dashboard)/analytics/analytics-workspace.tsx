"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Minus,
  Package,
  Receipt,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  useSessionItemType,
  useSyncBranchFilter,
} from "@/hooks/use-session-scope";
import {
  DashboardLoading,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
  DASHBOARD_MAX_WIDE,
  DASHBOARD_TABLE_SURFACE,
} from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import {
  ANALYTICS_PRESET_LABELS,
  type DatePreset,
  formatDateRangeLabel,
  presetRange,
  previousPeriod,
} from "@/lib/analytics-date-range";
import {
  fetchBranches,
  fetchDashboardOwnerSummary,
  fetchFinanceExpenses,
  fetchFinancePL,
  fetchFinancePulse,
  fetchInventoryExpiryPipeline,
  fetchInventoryValuation,
  fetchPaymentsByMethod,
  fetchSalesRegister,
  fetchSalesRevenueByCategory,
  fetchStaffPerformance,
  type BranchRecord,
  type FinancePulseResponse,
  type InventoryExpiryPipelineResponse,
  type InventoryValuationResponseRecord,
  type PaymentMethodBreakdownRow,
  type ProfitAndLossResponse,
  type RevenueByCategoryRow,
  type SalesRegisterResponse,
  type StaffPerformanceRow,
} from "@/lib/api";

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
  danger: "bg-destructive",
  warning: "bg-chart-4",
  success: "bg-chart-2",
  neutral: "bg-muted",
  primary: "bg-primary",
  sky: "bg-chart-1",
  violet: "bg-chart-3",
};

const INSIGHT_TONE_STYLES: Record<
  "good" | "warn" | "info" | "neutral",
  string
> = {
  good: "border-l-[3px] border-emerald-500/60 bg-emerald-500/[0.04]",
  warn: "border-l-[3px] border-amber-500/60 bg-amber-500/[0.05]",
  info: "border-l-[3px] border-sky-500/60 bg-sky-500/[0.05]",
  neutral: "border-l-[3px] border-border/70 bg-muted/30",
};

/* ─── Small components ───────────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent = "bg-primary/10 text-primary",
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ElementType;
  accent?: string;
  trend?: { delta: number; label: string } | null;
  className?: string;
}) {
  const up = trend && trend.delta > 0;
  const down = trend && trend.delta < 0;
  const flat = trend && trend.delta === 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            accent,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>

      <div className="space-y-0.5">
        <p className="text-lg font-bold leading-none tracking-tight text-foreground tabular-nums sm:text-xl">
          {value}
        </p>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
        {trend ? (
          <div className="flex items-center gap-1 pt-0.5">
            {up ? (
              <TrendingUp className="size-3 text-emerald-600" aria-hidden />
            ) : down ? (
              <TrendingDown className="size-3 text-destructive" aria-hidden />
            ) : (
              <Minus className="size-3 text-muted-foreground" aria-hidden />
            )}
            <span
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                up && "text-emerald-600",
                down && "text-destructive",
                flat && "text-muted-foreground",
              )}
            >
              {up ? "+" : ""}
              {trend.delta.toFixed(1)}%
            </span>
            <span className="text-[11px] text-muted-foreground/70">
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
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/25 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate text-foreground/90">{title}</span>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function AnalyticsSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 space-y-2 sm:scroll-mt-28",
        className,
      )}
    >
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

type AnalyticsJourneyItem =
  | { kind: "hash"; id: string; label: string }
  | { kind: "route"; href: string; label: string };

function buildAnalyticsJourney(
  activityHref?: string | null,
): AnalyticsJourneyItem[] {
  const items: AnalyticsJourneyItem[] = [
    { kind: "hash", id: "analytics-overview", label: "Metrics" },
    { kind: "hash", id: "analytics-revenue", label: "Revenue" },
    { kind: "hash", id: "analytics-stock", label: "Stock" },
    { kind: "hash", id: "analytics-catalog", label: "Catalog" },
    { kind: "hash", id: "analytics-signals", label: "Signals" },
  ];
  if (activityHref) {
    items.push({ kind: "route", href: activityHref, label: "Activity" });
  }
  return items;
}

function AnalyticsJourneyNav({
  journey,
}: {
  journey: AnalyticsJourneyItem[];
}) {
  const linkClass =
    "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <nav
      aria-label="Jump to section"
      className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex min-w-0 items-center gap-0.5">
        {journey.filter((i) => i.kind === "hash").map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={linkClass}>
              {item.label}
            </a>
          </li>
        ))}
        {journey.some((i) => i.kind === "route") ? (
          <li
            className="mx-0.5 h-3.5 w-px shrink-0 self-center bg-border/60"
            aria-hidden
          />
        ) : null}
        {journey.filter((i) => i.kind === "route").map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={linkClass}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MiniBarChart({
  data,
  max,
  barClass,
  label,
  value,
  heightClassName = "h-20",
}: {
  data: number[];
  max: number;
  barClass?: string;
  label?: (i: number) => string;
  value?: (i: number) => string;
  heightClassName?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  return (
    <div className={cn("flex items-end gap-1", heightClassName)}>
      {data.map((v, i) => {
        const pct = Math.min((v / safeMax) * 100, 100);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group relative"
          >
            <div
              className={cn(
                "w-full rounded-t-sm transition-all duration-300",
                barClass || "bg-linear-to-t from-primary/60 to-primary",
              )}
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            {label && i % Math.ceil(data.length / 6) === 0 ? (
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {label(i)}
              </span>
            ) : null}
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
              <div className="border border-border bg-popover px-2 py-1 text-xs shadow-sm whitespace-nowrap">
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
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground truncate">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {sublabel || formatMoney(value)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn("h-full transition-all", TONE_STYLES[tone])}
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
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60 sm:w-20">
      <div
        className={cn("h-full transition-all", TONE_STYLES[tone])}
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
          className="text-muted/40"
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

export function AnalyticsWorkspace({
  activityHref = APP_ROUTES.analyticsActivity,
}: {
  activityHref?: string | null;
} = {}) {
  const { setBranchId: setHeaderBranchId } = useDashboard();
  const { itemTypeId: headerItemTypeId } = useSessionItemType();
  const analyticsJourney = useMemo(
    () => buildAnalyticsJourney(activityHref),
    [activityHref],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });
  const [appliedBranchId, setAppliedBranchId] = useState("");
  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      setAppliedBranchId(id);
      setHeaderBranchId(id.trim());
    },
    [setHeaderBranchId],
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!appliedBranchId && branchId) {
      setAppliedBranchId(branchId);
    }
  }, [branchId, appliedBranchId]);

  const branchScopeStale = branchId !== appliedBranchId;
  const appliedBranchLabel = useMemo(() => {
    if (!appliedBranchId) return "All branches";
    return (
      branches.find((b) => b.id === appliedBranchId)?.name?.trim() ||
      appliedBranchId
    );
  }, [appliedBranchId, branches]);
  const pendingBranchLabel = useMemo(() => {
    if (!branchId) return "All branches";
    return branches.find((b) => b.id === branchId)?.name?.trim() || branchId;
  }, [branchId, branches]);

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
  const [, setExpenses] = useState<{ amount: number }[]>([]);

  // Previous period data for trends
  const [prevPl, setPrevPl] = useState<ProfitAndLossResponse | null>(null);
  const [, setPrevSalesRegister] = useState<SalesRegisterResponse | null>(null);
  const [, setPrevCategoryRevenue] = useState<RevenueByCategoryRow[]>([]);

  const dateRange = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const activeRangeSummary = useMemo(() => {
    if (!dateRange) {
      return preset === "custom"
        ? "Choose a start and end date, then data will load."
        : "";
    }
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange, preset]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [branchList] = await Promise.all([fetchBranches()]);
      setBranches(branchList);

      if (dateRange) {
        const prev = previousPeriod(dateRange.from, dateRange.to);
        const branchFilter = appliedBranchId || undefined;
        const typeFilter = headerItemTypeId?.trim() || undefined;

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
          invValRes,
          expiryRes,
          ownerRes,
          expenseRes,
        ] = await Promise.all([
          fetchFinancePulse(dateRange.to, branchFilter, typeFilter).catch(
            () => null,
          ),
          fetchFinancePL(
            dateRange.from,
            dateRange.to,
            branchFilter,
            typeFilter,
          ).catch(() => null),
          fetchFinancePL(prev.from, prev.to, branchFilter, typeFilter).catch(
            () => null,
          ),
          fetchSalesRegister(
            dateRange.from,
            dateRange.to,
            branchFilter,
            typeFilter,
          ).catch(() => null),
          fetchSalesRegister(prev.from, prev.to, branchFilter, typeFilter).catch(
            () => null,
          ),
          fetchSalesRevenueByCategory(
            dateRange.from,
            dateRange.to,
            undefined,
            branchFilter,
            typeFilter,
          ).catch(() => []),
          fetchSalesRevenueByCategory(
            prev.from,
            prev.to,
            undefined,
            branchFilter,
            typeFilter,
          ).catch(() => []),
          fetchPaymentsByMethod(
            dateRange.from,
            dateRange.to,
            branchFilter,
            typeFilter,
          ).catch(() => []),
          fetchStaffPerformance(
            dateRange.from,
            dateRange.to,
            branchFilter,
            typeFilter,
          ).catch(() => []),
          fetchInventoryValuation(branchFilter, typeFilter).catch(() => null),
          fetchInventoryExpiryPipeline(branchFilter, undefined, typeFilter).catch(
            () => null,
          ),
          fetchDashboardOwnerSummary(branchFilter, typeFilter).catch(() => null),
          // Expenses are not department-attributed; skip when a department is selected.
          typeFilter
            ? Promise.resolve([])
            : fetchFinanceExpenses().catch(() => []),
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
      } else {
        setPulse(null);
        setPl(null);
        setPrevPl(null);
        setSalesRegister(null);
        setPrevSalesRegister(null);
        setCategoryRevenue([]);
        setPrevCategoryRevenue([]);
        setPaymentMethods([]);
        setStaffPerf([]);
        setInventoryVal(null);
        setExpiryPipeline(null);
        setOwnerSummary(null);
        setExpenses([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, appliedBranchId, headerItemTypeId]);

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

    if (totalRevenue > 0 || salesCount > 0) {
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
    salesCount,
  ]);

  /* ─── Render ───────────────────────────────────────────────────────────── */

  if (loading && !refreshing) {
    return (
      <div className={cn(DASHBOARD_MAX_WIDE, "space-y-5 pb-16")}>
        <DashboardLoading label="Loading analytics…" />
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-5 pb-16")}>
      <header className="space-y-4 border-b border-border/50 pb-5">
        <DashboardPageHero
          compact
          icon={BarChart3}
          eyebrow="Insights"
          title="Analytics"
          description={
            activeRangeSummary
              ? `${activeRangeSummary}`
              : "Revenue, stock, catalog, and team performance."
          }
        />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <DashboardQuickLinks
            links={[
              {
                href: APP_ROUTES.salesReports,
                label: "Sales reports",
                desc: "Detailed exports",
                icon: Receipt,
              },
              {
                href: APP_ROUTES.salesTransactions,
                label: "Transactions",
                desc: "Sale history",
                icon: ShoppingCart,
              },
              {
                href: APP_ROUTES.analyticsActivity,
                label: "Activity",
                desc: "Live signals",
                icon: Zap,
              },
            ]}
          />
          <ActiveScopeSubtitle className="text-[11px] text-muted-foreground lg:text-right" />
        </div>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {/* Controls + jump nav */}
      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className="space-y-3 border-b border-border/50 bg-muted/30 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Period
              </h2>
              {activeRangeSummary ? (
                <span className="truncate text-xs text-muted-foreground">
                  {activeRangeSummary}
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="relative">
                <select
                  value={branchId}
                  onChange={(e) => onChangeBranch(e.target.value)}
                  aria-label="Branch filter"
                  className="h-8 appearance-none rounded-md border border-border/55 bg-background py-0 pl-2.5 pr-7 text-xs font-medium text-foreground outline-none transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/55 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                onClick={() => {
                  setRefreshing(true);
                  load();
                }}
                disabled={refreshing}
                aria-label="Refresh"
              >
                <RefreshCw
                  className={cn(
                    "size-3.5",
                    refreshing && "animate-spin",
                  )}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {ANALYTICS_PRESET_LABELS.map(({ key, label, hint }) => (
              <button
                key={key}
                type="button"
                title={hint}
                onClick={() => setPreset(key)}
                className={cn(
                  "h-7 shrink-0 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                  preset === key
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border/50 bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {preset === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider">
                  From
                </span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 rounded-md border border-border/55 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider">
                  To
                </span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 rounded-md border border-border/55 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                />
              </label>
            </div>
          ) : null}

          {branchScopeStale ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-[11px] text-amber-950 dark:text-amber-100">
              <span>
                Branch changed to <strong>{pendingBranchLabel}</strong>. Charts
                still show <strong>{appliedBranchLabel}</strong>.
              </span>
              <button
                type="button"
                className="shrink-0 rounded-md border border-amber-600/30 bg-background/80 px-2.5 py-1 text-[11px] font-semibold hover:bg-background"
                onClick={() => setAppliedBranchId(branchId)}
              >
                Apply branch
              </button>
            </div>
          ) : null}

          <div className="border-t border-border/40 pt-2">
            <AnalyticsJourneyNav journey={analyticsJourney} />
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          {/* ── Section 1: Key Metrics ─────────────────────────────── */}
          <AnalyticsSection id="analytics-overview" title="Key metrics">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="Total Revenue"
                value={formatMoney(totalRevenue)}
                icon={DollarSign}
                accent="bg-primary/10 text-primary"
                trend={calcTrend(totalRevenue, prevTotalRevenue)}
              />
              <MetricCard
                label="Gross Profit"
                value={formatMoney(totalProfit)}
                icon={TrendingUp}
                accent="bg-chart-2/15 text-chart-2"
                trend={calcTrend(totalProfit, prevTotalProfit)}
              />
              <MetricCard
                label="Net Operating"
                value={formatMoney(netOperating)}
                icon={Wallet}
                accent="bg-secondary text-secondary-foreground"
                trend={calcTrend(netOperating, prevNetOperating)}
              />
              <MetricCard
                label="Expenses"
                value={formatMoney(totalExpenses)}
                icon={Receipt}
                accent="bg-muted text-muted-foreground"
                trend={calcTrend(totalExpenses, prevTotalExpenses)}
              />
              <MetricCard
                label="Sales Count"
                value={formatNumber(salesCount)}
                icon={ShoppingCart}
                accent="bg-accent text-accent-foreground"
              />
              <MetricCard
                label="Gross Margin"
                value={`${grossMargin.toFixed(1)}%`}
                icon={BarChart3}
                accent="bg-chart-3/20 text-chart-3"
              />
            </div>
          </AnalyticsSection>

          {/* ── Section 2: Revenue & Tender Mix ────────────────────── */}
          <AnalyticsSection
            id="analytics-revenue"
            title="Revenue and tender mix"
          >
            <div className="grid gap-2 lg:grid-cols-3">
              <SectionCard
                title="Revenue Trend"
                icon={BarChart3}
                className="lg:col-span-2"
              >
                {dailyRevenue.length > 0 ? (
                  <div className="space-y-2">
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
                      heightClassName="h-24"
                      data={dailyRevenue}
                      max={maxDailyRevenue}
                      label={(i) => dailyLabels[i] ?? ""}
                      value={(i) =>
                        `${dailyLabels[i]}: ${formatMoney(dailyRevenue[i])}`
                      }
                    />
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No revenue data for this period.
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Payment Methods" icon={CreditCard}>
                {paymentMethods.length > 0 ? (
                  <div className="space-y-2">
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
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No payment data.
                  </div>
                )}
              </SectionCard>
            </div>
          </AnalyticsSection>

          {/* ── Section 3: Stock & Inventory ───────────────────────── */}
          <AnalyticsSection id="analytics-stock" title="Stock and inventory">
            <div className="grid gap-2 lg:grid-cols-2">
              <SectionCard title="Inventory" icon={Package}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Total Stock Value
                    </span>
                    <span className="text-base font-bold tabular-nums">
                      {formatMoney(totalInventoryValue)}
                    </span>
                  </div>
                  {inventoryVal?.byBranch &&
                  inventoryVal.byBranch.length > 1 ? (
                    <div className="space-y-1.5">
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
                  <div className="space-y-1.5 rounded-lg border border-border/50 bg-muted/30 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="size-3" /> Expired
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatNumber(expiredQty)} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-primary">
                        <Clock className="size-3" /> Expires &lt; 7d
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatNumber(due7dQty)} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="size-3" /> Expires &lt; 30d
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatNumber(due30dQty)} units
                      </span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Top Products (30d)" icon={Zap}>
                {ownerSummary?.topSkus && ownerSummary.topSkus.length > 0 ? (
                  <div className="max-h-[min(14rem,40vh)] space-y-2 overflow-y-auto pr-1">
                    {ownerSummary.topSkus.map((sku, i) => (
                      <div key={sku.itemId} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                            i === 0
                              ? "bg-primary/15 text-primary"
                              : i === 1
                                ? "bg-secondary text-secondary-foreground"
                                : i === 2
                                  ? "bg-chart-4/20 text-chart-4"
                                  : "bg-muted text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {sku.itemName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatMoney(sku.revenueLast30Days)}
                          </p>
                        </div>
                        <span
                          title="Share relative to #1 product"
                          className="shrink-0"
                        >
                          <PercentageRing
                            value={
                              toNum(sku.revenueLast30Days) > 0
                                ? Math.min(
                                    (toNum(sku.revenueLast30Days) /
                                      Math.max(
                                        1,
                                        toNum(
                                          ownerSummary.topSkus[0]
                                            ?.revenueLast30Days,
                                        ),
                                      )) *
                                      100,
                                    100,
                                  )
                                : 0
                            }
                            size={28}
                            stroke={3}
                            color={
                              i === 0
                                ? "text-primary"
                                : i === 1
                                  ? "text-muted-foreground"
                                  : i === 2
                                    ? "text-chart-4"
                                    : "text-chart-2"
                            }
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No top product data.
                  </div>
                )}
              </SectionCard>
            </div>
          </AnalyticsSection>

          {/* ── Section 4: Catalog & Team ──────────────────────────── */}
          <AnalyticsSection id="analytics-catalog" title="Catalog and team">
            <div className="grid gap-2 lg:grid-cols-2">
              <SectionCard title="Revenue by Category" icon={Package}>
                {categoryRevenue.length > 0 ? (
                  <div className="max-h-[min(11rem,38vh)] space-y-2 overflow-y-auto overflow-x-hidden pr-1">
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
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No category data.
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Staff Performance" icon={Users}>
                {staffPerf.length > 0 ? (
                  <div className="max-h-[min(11rem,38vh)] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10 bg-card">
                        <tr className="border-b border-border/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="pb-1.5 font-medium">Staff</th>
                          <th className="pb-1.5 text-right font-medium">
                            Sales
                          </th>
                          <th className="pb-1.5 text-right font-medium">
                            Revenue
                          </th>
                          <th className="pb-1.5 text-right font-medium">
                            Profit
                          </th>
                          <th className="pb-1.5 text-right font-medium">
                            Margin
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {staffPerf.map((s) => {
                          const margin =
                            toNum(s.totalRevenue) > 0
                              ? (toNum(s.totalProfit) /
                                  toNum(s.totalRevenue)) *
                                100
                              : 0;
                          return (
                            <tr key={s.userId}>
                              <td className="py-1.5 font-medium">
                                {s.userName}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">
                                {formatNumber(s.saleCount)}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">
                                {formatMoney(s.totalRevenue)}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">
                                {formatMoney(s.totalProfit)}
                              </td>
                              <td className="py-1.5 text-right">
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
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No staff data.
                  </div>
                )}
              </SectionCard>
            </div>
          </AnalyticsSection>

          {/* ── Section 5: Signals & Insights ──────────────────────── */}
          <AnalyticsSection id="analytics-signals" title="Signals">
            {insights.length > 0 ? (
              <div className="grid max-h-[min(20rem,45vh)] gap-2 overflow-y-auto sm:grid-cols-2">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border border-border/50 p-2.5",
                      INSIGHT_TONE_STYLES[insight.tone],
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border bg-card",
                        insight.tone === "good" &&
                          "border-primary/25 text-primary",
                        insight.tone === "warn" &&
                          "border-destructive/25 text-destructive",
                        insight.tone === "info" &&
                          "border-ring text-foreground",
                        insight.tone === "neutral" &&
                          "border-border text-muted-foreground",
                      )}
                    >
                      <insight.icon className="size-3.5" aria-hidden />
                    </span>
                    <p className="text-xs leading-relaxed text-foreground">
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No signals for this slice yet — try a longer range or another
                branch.
              </p>
            )}
          </AnalyticsSection>
        </div>
      </section>
    </div>
  );
}

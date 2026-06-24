"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  ListOrdered,
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
  DashboardLoading,
  DashboardFeedback,
  DASHBOARD_MAX_WIDE,
} from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
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
        "group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-border/40 bg-linear-to-b from-card to-card/80 p-3 shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-border/70 hover:shadow-lg hover:shadow-foreground/[0.03]",
        "2xl:gap-3 2xl:rounded-2xl 2xl:p-4",
        className,
      )}
    >
      {/* Subtle top accent bar */}
      <div
        className={cn(
          "absolute left-0 right-0 top-0 h-[3px] bg-linear-to-r opacity-70",
          accent,
        )}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
          {label}
        </span>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/30 bg-muted/20 transition-all duration-300",
            "group-hover:border-border/50 group-hover:shadow-sm",
            "2xl:size-8 2xl:rounded-xl",
            accent,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>

      <div className="space-y-0.5">
        <p className="font-heading text-xl font-bold leading-none tracking-tight text-foreground 2xl:text-[1.65rem]">
          {value}
        </p>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
        {trend ? (
          <div className="flex items-center gap-1.5 pt-1">
            {up ? (
              <TrendingUp className="size-3 text-emerald-500" aria-hidden />
            ) : down ? (
              <TrendingDown className="size-3 text-destructive" aria-hidden />
            ) : (
              <Minus className="size-3 text-muted-foreground" aria-hidden />
            )}
            <span
              className={cn(
                "text-[11px] font-bold tabular-nums",
                up && "text-emerald-500",
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
        "overflow-hidden border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/30 bg-muted/10 px-3 py-2 2xl:px-4 2xl:py-2.5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground/90 2xl:text-[11px]">
          <Icon className="size-3.5 text-muted-foreground/60" aria-hidden />
          {title}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="p-3 2xl:p-4">{children}</div>
    </div>
  );
}

function AnalyticsSection({
  id,
  step,
  title,
  children,
  className,
}: {
  id: string;
  step: number;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const stepLabel = String(step).padStart(2, "0");

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-[calc(5.5rem+env(safe-area-inset-top,0px))] space-y-2",
        "sm:scroll-mt-24 sm:space-y-2.5 2xl:scroll-mt-28",
        className,
      )}
    >
      <header className="flex items-center gap-2 2xl:gap-3">
        <span
          className="hidden size-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-linear-to-br from-primary to-primary/90 text-[10px] font-bold tabular-nums text-primary-foreground shadow-sm shadow-primary/20 2xl:flex"
          aria-hidden
        >
          {stepLabel}
        </span>
        <h2 className="min-w-0 text-sm font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <span
          className="hidden h-px min-w-[2rem] flex-1 bg-linear-to-r from-border/70 via-border/30 to-transparent 2xl:block"
          aria-hidden
        />
      </header>
      {children}
    </section>
  );
}

type AnalyticsJourneyItem =
  | { kind: "hash"; id: string; label: string }
  | { kind: "route"; href: string; label: string };

const ANALYTICS_JOURNEY: AnalyticsJourneyItem[] = [
  { kind: "hash", id: "analytics-overview", label: "Metrics" },
  { kind: "hash", id: "analytics-revenue", label: "Revenue" },
  { kind: "hash", id: "analytics-stock", label: "Stock" },
  { kind: "hash", id: "analytics-catalog", label: "Catalog" },
  { kind: "hash", id: "analytics-signals", label: "Signals" },
  { kind: "route", href: "/analytics/activity", label: "Activity" },
];

function AnalyticsJourneyNav({ compact = false }: { compact?: boolean }) {
  const linkClass =
    "inline-flex shrink-0 items-center border border-transparent px-2 py-1 text-[10.5px] font-semibold text-muted-foreground transition-colors hover:border-border/80 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background 2xl:px-2.5 2xl:py-1.5 2xl:text-[11px]";

  return (
    <nav
      aria-label="Jump to section"
      className={cn(
        "overflow-x-auto",
        compact
          ? "py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "sticky top-0 z-20 border border-border/70 bg-background/80 py-1.5 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/65",
      )}
    >
      <div className="flex min-w-0 items-center gap-0.5 px-1.5">
        {!compact ? (
          <>
            <span className="flex shrink-0 items-center gap-1 pl-1 pr-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <ListOrdered className="size-3 opacity-70" aria-hidden />
              Flow
            </span>
            <div className="mx-1 h-4 w-px shrink-0 bg-border/70" aria-hidden />
          </>
        ) : null}
        <ul className="flex min-w-0 items-center gap-0.5">
          {ANALYTICS_JOURNEY.filter((i) => i.kind === "hash").map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className={linkClass}>
                {item.label}
              </a>
            </li>
          ))}
          <li
            className="mx-0.5 h-4 w-px shrink-0 self-center bg-border/60"
            aria-hidden
          />
          {ANALYTICS_JOURNEY.filter((i) => i.kind === "route").map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  linkClass,
                  "border-dashed border-border/60 text-muted-foreground/80",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
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

export default function AnalyticsPage() {
  const { branchId: sessionBranchId } = useDashboard();
  const prevSessionBranchIdRef = useRef<string | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>("today");
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

  useEffect(() => {
    const id = (sessionBranchId ?? "").trim();
    const valid = id.length > 0 && branches.some((b) => b.id === id);
    const prev = prevSessionBranchIdRef.current;

    if (valid) {
      const initialSync = prev === undefined;
      const sessionChanged = prev !== undefined && prev !== id;
      if (initialSync || sessionChanged) {
        setBranchId(id);
      }
      prevSessionBranchIdRef.current = id;
    } else if (prev === undefined) {
      prevSessionBranchIdRef.current = id || "";
    } else {
      prevSessionBranchIdRef.current = id;
    }
  }, [sessionBranchId, branches]);

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
    <div className="relative isolate h-full scroll-smooth overflow-y-auto overscroll-contain">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 -top-28 h-80 w-80 bg-primary/[0.06] blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-72 w-80 bg-chart-2/[0.08] blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[min(100%,32rem)] -translate-x-1/2 bg-accent/[0.08] blur-3xl" />
      </div>
      <div
        className={cn(
          DASHBOARD_MAX_WIDE,
          "!space-y-2 !pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:!space-y-3",
          "2xl:!space-y-4 2xl:!pb-12",
        )}
      >
        {/* ── Unified header bar ── */}
        <div className="sticky top-0 z-30 overflow-hidden border border-border/40 bg-linear-to-b from-card/95 via-card/90 to-card/85 shadow-lg shadow-foreground/[0.02] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 2xl:gap-x-4 2xl:px-4 2xl:py-2.5">
            {/* Icon + label + date — wide desktop only (tablet shell shows title) */}
            <div className="hidden min-w-0 items-center gap-2.5 2xl:flex">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-linear-to-br from-primary/10 to-primary/[0.04] text-primary/80 shadow-inner">
                <BarChart3 className="size-[15px]" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span className="text-[13px] font-bold leading-none tracking-tight text-foreground">
                  Analytics
                </span>
                {activeRangeSummary ? (
                  <span className="truncate text-[11px] leading-none text-muted-foreground/70">
                    {activeRangeSummary}
                  </span>
                ) : null}
              </div>
            </div>

            {activeRangeSummary ? (
              <span className="min-w-0 truncate text-[11px] font-medium text-muted-foreground 2xl:hidden">
                {activeRangeSummary}
              </span>
            ) : null}

            <span
              className="hidden h-5 w-px bg-border/60 2xl:block"
              aria-hidden
            />

            {/* Time presets — single scroll row on tablet */}
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ANALYTICS_PRESET_LABELS.map(({ key, label, hint }) => (
                <button
                  key={key}
                  type="button"
                  title={hint}
                  onClick={() => setPreset(key)}
                  className={cn(
                    "h-7 shrink-0 rounded-lg border px-2.5 text-[10px] font-semibold tracking-tight transition-all duration-200",
                    "hover:-translate-y-px 2xl:h-6.5 2xl:text-[10.5px]",
                    preset === key
                      ? "border-primary/20 bg-linear-to-b from-primary to-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                      : "border-transparent bg-muted/50 text-muted-foreground hover:border-border/60 hover:bg-muted/80 hover:text-foreground hover:shadow-sm",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Branch + Refresh */}
            <div className="ml-auto flex shrink-0 items-center gap-1.5 2xl:gap-2">
              <div className="relative">
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="h-7.5 appearance-none rounded-lg border border-border/50 bg-muted/40 py-0 pl-2.5 pr-7 text-[11px] font-medium text-foreground/90 outline-none transition-colors hover:border-border/80 hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
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
                className="group flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-muted-foreground/80 transition-all duration-200 hover:border-border/70 hover:bg-muted/50 hover:text-foreground hover:shadow-sm active:scale-95 disabled:opacity-40"
                onClick={() => {
                  setRefreshing(true);
                  load();
                }}
                disabled={refreshing}
                aria-label="Refresh"
              >
                <RefreshCw
                  className={cn(
                    "size-3.5 transition-transform duration-500",
                    refreshing && "animate-spin",
                  )}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          {/* Custom date row */}
          <div className="border-t border-border/30 2xl:hidden">
            <AnalyticsJourneyNav compact />
          </div>

          {preset === "custom" ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/30 bg-muted/[0.15] px-3 pb-2 pt-2 2xl:px-4 2xl:pb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                From
              </span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-7 rounded-lg border border-border/50 bg-muted/30 px-2.5 text-[11px] font-medium text-foreground outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
              />
              <span className="text-[11px] text-muted-foreground/60">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-7 rounded-lg border border-border/50 bg-muted/30 px-2.5 text-[11px] font-medium text-foreground outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
              />
            </div>
          ) : null}
        </div>

        {error ? <DashboardFeedback kind="error" text={error} /> : null}

        <div className="hidden 2xl:block">
          <AnalyticsJourneyNav />
        </div>

        {/* ── Section 1: Key Metrics ─────────────────────────────── */}
        <AnalyticsSection id="analytics-overview" step={1} title="Key metrics">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 2xl:gap-4">
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
          step={2}
          title="Revenue and tender mix"
        >
          <div className="grid gap-2 sm:gap-3 lg:grid-cols-3">
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
        <AnalyticsSection
          id="analytics-stock"
          step={3}
          title="Stock and inventory"
        >
          <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
            <SectionCard title="Inventory" icon={Package}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Total Stock Value
                  </span>
                  <span className="text-base font-bold">
                    {formatMoney(totalInventoryValue)}
                  </span>
                </div>
                {inventoryVal?.byBranch && inventoryVal.byBranch.length > 1 ? (
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
                <div className="border border-border/60 bg-muted/50 space-y-1.5 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-destructive flex items-center gap-1">
                      <AlertTriangle className="size-3" /> Expired
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatNumber(expiredQty)} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary flex items-center gap-1">
                      <Clock className="size-3" /> Expires &lt; 7d
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatNumber(due7dQty)} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
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
                          "flex size-6 shrink-0 items-center justify-center border border-border/60 text-[10px] font-bold",
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
                        <p className="text-xs text-muted-foreground">
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
                          size={32}
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
        <AnalyticsSection
          id="analytics-catalog"
          step={4}
          title="Catalog and team"
        >
          <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
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
                    <thead className="sticky top-0 z-10 bg-muted/30 backdrop-blur-sm">
                      <tr className="border-b border-border/30 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="pb-1.5 font-medium">Staff</th>
                        <th className="pb-1.5 font-medium text-right">Sales</th>
                        <th className="pb-1.5 font-medium text-right">
                          Revenue
                        </th>
                        <th className="pb-1.5 font-medium text-right">
                          Profit
                        </th>
                        <th className="pb-1.5 font-medium text-right">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {staffPerf.map((s) => {
                        const margin =
                          toNum(s.totalRevenue) > 0
                            ? (toNum(s.totalProfit) / toNum(s.totalRevenue)) *
                              100
                            : 0;
                        return (
                          <tr key={s.userId} className="group">
                            <td className="py-1.5 font-medium">{s.userName}</td>
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
        <AnalyticsSection id="analytics-signals" step={5} title="Signals">
          {insights.length > 0 ? (
            <div className="grid max-h-[min(20rem,45vh)] gap-2 overflow-y-auto sm:grid-cols-2">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 border border-border/50 p-2.5 shadow-sm",
                    INSIGHT_TONE_STYLES[insight.tone],
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center border bg-card/90 shadow-sm",
                      insight.tone === "good" &&
                        "border-primary/25 text-primary",
                      insight.tone === "warn" &&
                        "border-destructive/25 text-destructive",
                      insight.tone === "info" && "border-ring text-foreground",
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
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronRight,
  LayoutGrid,
  Minus,
  Package,
  PackageSearch,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DashboardLoading,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { APP_ROUTES, categorySlugPath } from "@/lib/config";
import {
  fetchCategories,
  fetchItemsPage,
  fetchSalesRevenueByCategory,
  fetchCategoryDailyRevenue,
  fetchCategoryItemRevenue,
  itemListThumbnailUrl,
  type CategoryRecord,
  type ItemSummaryRecord,
  type RevenueByCategoryRow,
  type CategoryDailyRevenueRow,
  type ItemRevenueRow,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/* ─── Date utilities ─────────────────────────────────────────────────────── */

type DatePreset =
  | "today"
  | "yesterday"
  | "last3"
  | "last7"
  | "last30"
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
    default:
      return null;
  }
}

function previousPeriod(from: string, to: string): { from: string; to: string } {
  const days = Math.max(1, diffDays(from, to));
  return {
    from: toISODate(addDays(parseISODate(from), -days - 1)),
    to: toISODate(addDays(parseISODate(from), -1)),
  };
}

/* ─── Money formatting ───────────────────────────────────────────────────── */

function formatMoney(n: number | string | null | undefined, currency = ""): string {
  const val = n == null ? 0 : typeof n === "number" ? n : Number(n);
  const num = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${num}` : num;
}

function rowAmount(row: RevenueByCategoryRow, key: "netRevenue" | "netProfit"): number {
  const v = row[key];
  return typeof v === "number" ? v : Number(v);
}

/* ─── Stock meta ─────────────────────────────────────────────────────────── */

function stockMeta(qty: number | string | null | undefined) {
  const n = qty == null ? null : Number(qty);
  if (n == null || !Number.isFinite(n)) return { tone: "neutral" as const, label: "—" };
  if (n <= 0) return { tone: "danger" as const, label: "Out" };
  if (n <= 5) return { tone: "warning" as const, label: "Low" };
  return { tone: "success" as const, label: "OK" };
}

const TONE_STYLES = {
  danger: "bg-red-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  neutral: "bg-muted",
};

const BADGE_STYLES = {
  danger: "bg-red-500/10 text-red-700 dark:text-red-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  neutral: "bg-muted text-muted-foreground",
};

/* ─── Components ─────────────────────────────────────────────────────────── */

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
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", accent)}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
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
            <span className="text-[11px] text-muted-foreground">{trend.label}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SparkBar({ value, max, tone }: { value: number; max: number; tone: keyof typeof TONE_STYLES }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-24">
      <div className={cn("h-full rounded-full transition-all", TONE_STYLES[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function CategoryAnalyticsPage() {
  const params = useParams();
  const slug = (params.slug as string) ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryRecord | null>(null);
  const [products, setProducts] = useState<ItemSummaryRecord[]>([]);
  const [preset, setPreset] = useState<DatePreset>("last7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Revenue data
  const [currentRevenue, setCurrentRevenue] = useState<number | null>(null);
  const [currentProfit, setCurrentProfit] = useState<number | null>(null);
  const [previousRevenue, setPreviousRevenue] = useState<number | null>(null);
  const [previousProfit, setPreviousProfit] = useState<number | null>(null);
  const [allCategoryRows, setAllCategoryRows] = useState<RevenueByCategoryRow[]>([]);
  const [dailyRows, setDailyRows] = useState<CategoryDailyRevenueRow[]>([]);
  const [itemRevenueRows, setItemRevenueRows] = useState<ItemRevenueRow[]>([]);

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
      const allCategories = await fetchCategories();
      const found = allCategories.find((c) => c.slug === slug);
      if (!found) {
        setError(`Category "${slug}" not found.`);
        setLoading(false);
        return;
      }
      setCategory(found);

      const [productPage] = await Promise.all([
        fetchItemsPage(undefined, {
          categoryId: found.id,
          includeCategoryDescendants: false,
          size: 200,
          includeInactive: true,
          catalogScope: "ALL",
        }),
      ]);
      setProducts(productPage.content);

      if (dateRange) {
        const prev = previousPeriod(dateRange.from, dateRange.to);
        const [
          currentRows,
          prevRows,
          daily,
          items,
        ] = await Promise.all([
          fetchSalesRevenueByCategory(dateRange.from, dateRange.to, found.id),
          fetchSalesRevenueByCategory(prev.from, prev.to, found.id),
          fetchCategoryDailyRevenue(found.id, dateRange.from, dateRange.to),
          fetchCategoryItemRevenue(found.id, dateRange.from, dateRange.to),
        ]);

        setAllCategoryRows(currentRows);
        const currentRow = currentRows.find((r) => r.categoryId === found.id);
        setCurrentRevenue(currentRow ? rowAmount(currentRow, "netRevenue") : 0);
        setCurrentProfit(currentRow ? rowAmount(currentRow, "netProfit") : 0);

        const prevRow = prevRows.find((r) => r.categoryId === found.id);
        setPreviousRevenue(prevRow ? rowAmount(prevRow, "netRevenue") : 0);
        setPreviousProfit(prevRow ? rowAmount(prevRow, "netProfit") : 0);

        setDailyRows(daily);
        setItemRevenueRows(items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [slug, dateRange]);

  useEffect(() => {
    if (!slug) return;
    void load();
  }, [load, slug]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const revenueTrend = useMemo(() => {
    if (currentRevenue == null || previousRevenue == null || previousRevenue === 0) return null;
    const delta = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    return { delta, label: "vs previous period" };
  }, [currentRevenue, previousRevenue]);

  const profitTrend = useMemo(() => {
    if (currentProfit == null || previousProfit == null || previousProfit === 0) return null;
    const delta = ((currentProfit - previousProfit) / previousProfit) * 100;
    return { delta, label: "vs previous period" };
  }, [currentProfit, previousProfit]);

  const productMetrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.active !== false).length;
    const totalStock = products.reduce((sum, p) => {
      const n = p.stockQty == null ? 0 : Number(p.stockQty);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const lowStock = products.filter((p) => {
      const n = p.stockQty == null ? null : Number(p.stockQty);
      return n != null && Number.isFinite(n) && n > 0 && n <= 5;
    }).length;
    const outOfStock = products.filter((p) => {
      const n = p.stockQty == null ? null : Number(p.stockQty);
      return n != null && Number.isFinite(n) && n <= 0;
    }).length;
    return { total, active, totalStock, lowStock, outOfStock };
  }, [products]);

  const categoryRank = useMemo(() => {
    if (!category || allCategoryRows.length === 0) return null;
    const sorted = [...allCategoryRows].sort((a, b) => rowAmount(b, "netRevenue") - rowAmount(a, "netRevenue"));
    const index = sorted.findIndex((r) => r.categoryId === category.id);
    return index >= 0 ? { rank: index + 1, total: sorted.length, topRow: sorted[0] } : null;
  }, [category, allCategoryRows]);

  const maxItemRevenue = useMemo(() => {
    return Math.max(...itemRevenueRows.map((r) => Math.abs(Number(r.netRevenue))), 1);
  }, [itemRevenueRows]);

  if (!slug) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center">
        <p className="text-sm text-muted-foreground">No category slug provided.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={APP_ROUTES.categories}>Back to categories</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return <DashboardLoading label="Loading analytics…" />;
  }

  if (error || !category) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <PackageSearch className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">{error ?? "Category not found"}</h1>
        <Button asChild variant="outline" className="mt-6 gap-2">
          <Link href={APP_ROUTES.categories}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to categories
          </Link>
        </Button>
      </div>
    );
  }

  const presets: { key: DatePreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last3", label: "Last 3 Days" },
    { key: "last7", label: "Last 7 Days" },
    { key: "last30", label: "Last 30 Days" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href={APP_ROUTES.categories} className="transition-colors hover:text-foreground">
            Categories
          </Link>
          <ChevronRight className="size-3.5 opacity-50" aria-hidden />
          <Link href={categorySlugPath(category.slug)} className="transition-colors hover:text-foreground">
            {category.name}
          </Link>
          <ChevronRight className="size-3.5 opacity-50" aria-hidden />
          <span className="truncate font-medium text-foreground">Analytics</span>
        </nav>

        {/* Hero */}
        <DashboardPageHero
          compact
          icon={BarChart3}
          eyebrow="Analytics"
          title={`${category.name}`}
          description={`Performance insights, revenue trends, and inventory health for ${category.name}.`}
        />

        {/* Time range selector */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  preset === p.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden />
              {refreshing ? "Loading…" : "Refresh"}
            </Button>
          </div>

          {preset === "custom" && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                From
                <input
                  type="date"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                To
                <input
                  type="date"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          )}

          {dateRange && (
            <p className="text-xs text-muted-foreground">
              <Calendar className="mr-1 inline size-3" aria-hidden />
              Showing data from <span className="font-medium text-foreground">{dateRange.from}</span> to{" "}
              <span className="font-medium text-foreground">{dateRange.to}</span>
            </p>
          )}
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Net Revenue"
            value={currentRevenue != null ? formatMoney(currentRevenue) : "—"}
            subtitle={dateRange ? `${dateRange.from} → ${dateRange.to}` : "Select a range"}
            icon={BarChart3}
            accent="bg-emerald-500/10 text-emerald-600"
            trend={revenueTrend}
          />
          <MetricCard
            label="Net Profit"
            value={currentProfit != null ? formatMoney(currentProfit) : "—"}
            subtitle={currentProfit != null && currentRevenue != null && currentRevenue > 0
              ? `Margin: ${((currentProfit / currentRevenue) * 100).toFixed(1)}%`
              : undefined}
            icon={TrendingUp}
            accent="bg-violet-500/10 text-violet-600"
            trend={profitTrend}
          />
          <MetricCard
            label="Total Products"
            value={productMetrics.total}
            subtitle={`${productMetrics.active} active · ${productMetrics.total - productMetrics.active} inactive`}
            icon={Package}
            accent="bg-primary/10 text-primary"
          />
          <MetricCard
            label="Category Rank"
            value={categoryRank ? `#${categoryRank.rank}` : "—"}
            subtitle={categoryRank ? `of ${categoryRank.total} categories by revenue` : "No data"}
            icon={TrendingUp}
            accent="bg-amber-500/10 text-amber-600"
          />
        </div>

        {/* Revenue & Profit Comparison */}
        {currentRevenue != null && previousRevenue != null && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Revenue Comparison</h3>
              <p className="text-xs text-muted-foreground">Current period vs. previous equal-length period</p>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Previous</span>
                    <span className="font-medium tabular-nums">{formatMoney(previousRevenue)}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-muted-foreground/30"
                      style={{ width: `${Math.min((previousRevenue / Math.max(currentRevenue, previousRevenue, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Current</span>
                    <span className="font-bold tabular-nums text-foreground">{formatMoney(currentRevenue)}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(((currentRevenue || 0) / Math.max(currentRevenue || 0, previousRevenue || 0, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              {revenueTrend && (
                <div className="mt-3 flex items-center gap-2">
                  {revenueTrend.delta > 0 ? (
                    <ArrowUpRight className="size-4 text-emerald-600" aria-hidden />
                  ) : revenueTrend.delta < 0 ? (
                    <ArrowDownRight className="size-4 text-red-600" aria-hidden />
                  ) : (
                    <Minus className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      revenueTrend.delta > 0 && "text-emerald-700 dark:text-emerald-400",
                      revenueTrend.delta < 0 && "text-red-700 dark:text-red-400",
                      revenueTrend.delta === 0 && "text-muted-foreground",
                    )}
                  >
                    {revenueTrend.delta > 0 ? "+" : ""}
                    {revenueTrend.delta.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Profit Comparison</h3>
              <p className="text-xs text-muted-foreground">Current period vs. previous equal-length period</p>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Previous</span>
                    <span className="font-medium tabular-nums">{formatMoney(previousProfit)}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-muted-foreground/30"
                      style={{ width: `${Math.min((Math.abs(previousProfit || 0) / Math.max(Math.abs(currentProfit || 0), Math.abs(previousProfit || 0), 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Current</span>
                    <span className="font-bold tabular-nums text-foreground">{formatMoney(currentProfit)}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${Math.min((Math.abs(currentProfit || 0) / Math.max(Math.abs(currentProfit || 0), Math.abs(previousProfit || 0), 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              {profitTrend && (
                <div className="mt-3 flex items-center gap-2">
                  {profitTrend.delta > 0 ? (
                    <ArrowUpRight className="size-4 text-emerald-600" aria-hidden />
                  ) : profitTrend.delta < 0 ? (
                    <ArrowDownRight className="size-4 text-red-600" aria-hidden />
                  ) : (
                    <Minus className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      profitTrend.delta > 0 && "text-emerald-700 dark:text-emerald-400",
                      profitTrend.delta < 0 && "text-red-700 dark:text-red-400",
                      profitTrend.delta === 0 && "text-muted-foreground",
                    )}
                  >
                    {profitTrend.delta > 0 ? "+" : ""}
                    {profitTrend.delta.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Daily Trend */}
        {dailyRows.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Daily Trend</h3>
              <p className="text-xs text-muted-foreground">{dailyRows.length} days</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-border/40 bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gross</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Refunds</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Revenue</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Profit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {dailyRows.map((row) => {
                    const net = Number(row.netRevenue);
                    const profit = Number(row.netProfit);
                    const margin = net > 0 ? (profit / net) * 100 : 0;
                    return (
                      <tr key={row.date} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-sm font-medium text-foreground">{row.date}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(row.grossRevenue)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatMoney(row.refundAmount)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(row.netRevenue)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span className={cn(profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700")}>
                            {formatMoney(row.netProfit)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs tabular-nums text-muted-foreground">{margin.toFixed(1)}%</span>
                            <SparkBar value={Math.abs(margin)} max={50} tone={margin >= 0 ? "success" : "danger"} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Product Sales Performance */}
        {itemRevenueRows.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Product Sales Performance</h3>
              <p className="text-xs text-muted-foreground">{itemRevenueRows.length} products sold</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-border/40 bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gross</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Refunds</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Revenue</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Profit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {itemRevenueRows.map((row) => {
                    const share = currentRevenue && currentRevenue > 0
                      ? (Number(row.netRevenue) / currentRevenue) * 100
                      : 0;
                    return (
                      <tr key={row.itemId} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{row.itemName}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{row.sku || "—"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{Number(row.quantitySold).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(row.grossRevenue)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatMoney(row.refundAmount)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(row.netRevenue)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span className={cn(Number(row.netProfit) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700")}>
                            {formatMoney(row.netProfit)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs tabular-nums text-muted-foreground">{share.toFixed(1)}%</span>
                            <SparkBar value={share} max={Math.min(maxItemRevenue / (currentRevenue || 1) * 100, 100)} tone="success" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Category Ranking Table */}
        {allCategoryRows.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Revenue by Category</h3>
              <p className="text-xs text-muted-foreground">{allCategoryRows.length} categories</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-border/40 bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Revenue</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Profit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(() => {
                    const totalRevenue = allCategoryRows.reduce((s, r) => s + rowAmount(r, "netRevenue"), 0);
                    const sorted = [...allCategoryRows].sort((a, b) => rowAmount(b, "netRevenue") - rowAmount(a, "netRevenue"));
                    return sorted.map((row, idx) => {
                      const amt = rowAmount(row, "netRevenue");
                      const profit = rowAmount(row, "netProfit");
                      const share = totalRevenue > 0 ? (amt / totalRevenue) * 100 : 0;
                      const isCurrent = row.categoryId === category?.id;
                      return (
                        <tr
                          key={row.categoryId}
                          className={cn(
                            "transition-colors",
                            isCurrent ? "bg-primary/[0.04]" : "hover:bg-muted/20",
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold",
                                idx === 0 && "bg-amber-500/15 text-amber-700",
                                idx === 1 && "bg-muted text-muted-foreground",
                                idx === 2 && "bg-orange-500/15 text-orange-700",
                                idx > 2 && "text-muted-foreground",
                              )}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn("font-medium", isCurrent && "text-primary")}>{row.categoryName}</span>
                            {isCurrent && <span className="ml-2 text-[10px] text-primary/70">(this)</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(amt)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            <span className={cn(profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700")}>
                              {formatMoney(profit)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs tabular-nums text-muted-foreground">{share.toFixed(1)}%</span>
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn("h-full rounded-full", isCurrent ? "bg-primary" : "bg-muted-foreground/30")}
                                  style={{ width: `${Math.min(share, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Product Inventory Table */}
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Product Inventory</h3>
            <p className="text-xs text-muted-foreground">{products.length} products</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border/50 bg-muted/40 backdrop-blur">
                <tr>
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SKU</th>
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Barcode</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No products in this category.
                    </td>
                  </tr>
                ) : (
                  products
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((product) => {
                      const thumb = itemListThumbnailUrl(product);
                      const stock = stockMeta(product.stockQty);

                      return (
                        <tr key={product.id} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border bg-muted">
                                {thumb ? (
                                  <Image src={thumb} alt="" fill className="object-cover" sizes="32px" unoptimized />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <Package className="size-3.5 text-muted-foreground/30" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{product.sku || "—"}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{product.barcode || "—"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-3">
                              <SparkBar
                                value={product.stockQty == null ? 0 : Number(product.stockQty)}
                                max={Math.max(...products.map((p) => Number(p.stockQty) || 0), 1)}
                                tone={stock.tone}
                              />
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {product.stockQty != null && Number.isFinite(Number(product.stockQty))
                                  ? Number(product.stockQty)
                                  : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", BADGE_STYLES[stock.tone])}>
                                {stock.label}
                              </span>
                              {product.active === false ? (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  Inactive
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                  Active
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer nav */}
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href={categorySlugPath(category.slug)}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Category products
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Link href={APP_ROUTES.categories}>
              <LayoutGrid className="size-3.5" aria-hidden />
              All categories
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

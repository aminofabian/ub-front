"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  CreditCard,
  DollarSign,
  LineChart,
  Package,
  RefreshCw,
  ShoppingCart,
  Truck,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DASHBOARD_FILTER_WELL,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardFilterFieldLabelClass,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchPurchasingIntelligenceDashboard,
  type PurchasingIntelligenceDashboardResponse,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function formatMoney(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(val)) return "0.00";
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoneyShort(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(val)) return "0";
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "k";
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPct(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(val)) return "0.00%";
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function formatUnit(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addLocalDays(d: Date, delta: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last3days", label: "Past 3 days" },
  { id: "last7days", label: "Last week" },
  { id: "last14days", label: "Last 2 weeks" },
  { id: "last30days", label: "Last month (30 days)" },
  { id: "last90days", label: "Last 3 months" },
  { id: "last180days", label: "Last 6 months" },
  { id: "last365days", label: "Last year" },
] as const;

type RangePresetId = (typeof RANGE_PRESETS)[number]["id"];

function isRangePresetId(v: string): v is RangePresetId {
  return RANGE_PRESETS.some((p) => p.id === v);
}

function rangeForPreset(id: RangePresetId): { from: string; to: string } {
  const today = startOfLocalDay(new Date());
  const to = toDateInputValue(today);
  if (id === "today") {
    return { from: to, to };
  }
  if (id === "yesterday") {
    const y = addLocalDays(today, -1);
    const ys = toDateInputValue(y);
    return { from: ys, to: ys };
  }
  const back =
    id === "last3days"
      ? 2
      : id === "last7days"
        ? 6
        : id === "last14days"
          ? 13
          : id === "last30days"
            ? 29
            : id === "last90days"
              ? 89
              : id === "last180days"
                ? 179
                : 364;
  const fromD = addLocalDays(today, -back);
  return { from: toDateInputValue(fromD), to };
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

/** Chart axes/grid: readable in light and dark without theme-aware SVG hacks */
const CHART_AXIS = "#71717a";
const CHART_GRID = "rgba(113, 113, 122, 0.22)";

function SummaryCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  subtext?: string;
}) {
  const styles = {
    default:
      "border-border/70 bg-card ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
    success:
      "border-emerald-500/20 bg-emerald-500/[0.07] dark:border-emerald-500/30 dark:bg-emerald-500/10",
    warning:
      "border-amber-500/25 bg-amber-500/[0.08] dark:border-amber-500/30 dark:bg-amber-500/10",
    danger:
      "border-rose-500/25 bg-rose-500/[0.07] dark:border-rose-500/35 dark:bg-rose-500/10",
    info: "border-sky-500/20 bg-sky-500/[0.07] dark:border-sky-500/30 dark:bg-sky-500/10",
  };
  const iconStyles = {
    default: "border border-border/50 bg-muted/80 text-muted-foreground",
    success: "border border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warning: "border border-amber-500/25 bg-amber-500/15 text-amber-800 dark:text-amber-200",
    danger: "border border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300",
    info: "border border-sky-500/20 bg-sky-500/15 text-sky-800 dark:text-sky-200",
  };
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-5",
        styles[variant],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">{value}</p>
          {subtext ? <p className={cn(dashboardHintClass(), "pt-0.5")}>{subtext}</p> : null}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
            iconStyles[variant],
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function Insights({ insights }: { insights: PurchasingIntelligenceDashboardResponse["insights"] }) {
  if (insights.length === 0) return null;
  return (
    <div className="space-y-3">
      {insights.map((insight, i) => {
        const isDanger = insight.kind === "danger";
        const isWarning = insight.kind === "warning";
        const isSuccess = insight.kind === "success";
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm leading-relaxed shadow-sm",
              isDanger &&
                "border-rose-500/25 bg-rose-500/[0.07] text-rose-950 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-50",
              isWarning &&
                "border-amber-500/25 bg-amber-500/[0.08] text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50",
              isSuccess &&
                "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50",
              !isDanger &&
                !isWarning &&
                !isSuccess &&
                "border-sky-500/20 bg-sky-500/[0.07] text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-50",
            )}
          >
            {isDanger ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
            ) : isWarning ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            ) : isSuccess ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            ) : (
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            )}
            <span className="min-w-0 font-medium text-foreground">{insight.message}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PurchasingIntelligencePage() {
  const { me } = useDashboard();
  const { branchId: headerBranchId, branchName: headerBranchName } =
    useSessionBranch();
  const allowed = hasPermission(me?.permissions, Permission.PurchasingIntelligenceRead);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PurchasingIntelligenceDashboardResponse | null>(null);

  const load = useCallback(async (range?: { from: string; to: string }) => {
    setMessage("");
    setLoading(true);
    try {
      const fromRaw = range?.from ?? from;
      const toRaw = range?.to ?? to;
      const fromArg = fromRaw.trim() || undefined;
      const toArg = toRaw.trim() || undefined;
      const branchArg = headerBranchId?.trim() || undefined;
      const dashboard = await fetchPurchasingIntelligenceDashboard(
        fromArg,
        toArg,
        branchArg,
      );
      setData(dashboard);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to, headerBranchId]);

  useEffect(() => {
    if (!allowed) return;
    load();
  }, [allowed, load]);

  const spendTrendData = useMemo(() => {
    if (!data) return [];
    return data.spendTrend.map((t) => ({
      date: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      spend: Number(t.spend),
    }));
  }, [data]);

  const supplierPieData = useMemo(() => {
    if (!data) return [];
    return data.topSuppliers.slice(0, 8).map((s) => ({
      name: s.supplierName.length > 18 ? s.supplierName.slice(0, 18) + "…" : s.supplierName,
      value: Number(s.spend),
    }));
  }, [data]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Supplier intelligence"
        description={
          <>
            You do not have permission to view purchasing intelligence. Ask an administrator to grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.PurchasingIntelligenceRead}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <section className={DASHBOARD_SECTION_SURFACE}>
        <DashboardPageHero
          showActiveScope
          icon={LineChart}
          eyebrow="Purchasing"
          title="Supplier intelligence"
          description={
            <>
              Spend analysis, price competitiveness, and supplier risk monitoring. Use quick ranges or set
              custom dates. Leave empty for the last 90 days.
              {headerBranchName ? (
                <>
                  {" "}
                  <span className="font-medium text-foreground/80">
                    Branch: {headerBranchName}
                  </span>
                </>
              ) : null}
            </>
          }
        />
        <div className="mt-8">
          <DashboardQuickLinks
            links={[
              { href: APP_ROUTES.purchasingApAging, label: "AP aging", desc: "Balances", icon: BarChart3 },
              { href: `${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`, label: "Pay open", desc: "Supply balances", icon: CreditCard },
              { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "Directory", icon: Truck },
            ]}
          />
        </div>
      </section>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex flex-col gap-2 border-b border-border/50 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-foreground shadow-sm">
              <CalendarRange className="size-[18px]" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Date range</h2>
            </div>
          </div>
        </div>

        <div
          className={cn(
            DASHBOARD_FILTER_WELL,
            "sticky top-0 z-30 backdrop-blur-md supports-[backdrop-filter]:bg-muted/40",
          )}
        >
          <form
            className="flex flex-wrap items-end gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              load().catch(() => setMessage("Failed to load reports."));
            }}
          >
            <div className="flex min-w-[12rem] flex-col gap-2">
              <span className={dashboardFilterFieldLabelClass()}>Quick range</span>
              <select
                className={dashboardSelectClass(loading)}
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!isRangePresetId(id)) return;
                  const r = rangeForPreset(id);
                  setFrom(r.from);
                  setTo(r.to);
                  void load(r).catch(() => setMessage("Failed to load reports."));
                }}
              >
                <option value="">Choose preset…</option>
                {RANGE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[10.5rem] flex-col gap-2">
              <span className={dashboardFilterFieldLabelClass()}>From</span>
              <input
                type="date"
                className={dashboardInputClass(loading)}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex min-w-[10.5rem] flex-col gap-2">
              <span className={dashboardFilterFieldLabelClass()}>To</span>
              <input
                type="date"
                className={dashboardInputClass(loading)}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-0.5">
              <Button
                type="submit"
                disabled={loading}
                className="min-h-10 gap-2 shadow-sm transition-shadow hover:shadow-md"
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
                {loading ? "Loading…" : "Refresh"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="min-h-10 shadow-sm"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                disabled={!from && !to}
              >
                <X className="size-4" aria-hidden />
                Clear
              </Button>
            </div>
          </form>
        </div>
      </section>

      {message ? <DashboardFeedback kind="error" text={message} /> : null}

      {data && (
        <div className="space-y-12">
          <section
            aria-labelledby="pi-summary-heading"
            className={cn(DASHBOARD_SECTION_SURFACE, "space-y-6")}
          >
            <h2 id="pi-summary-heading" className="sr-only">
              Summary
            </h2>
            <Insights insights={data.insights} />

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Total Spend"
                  value={formatMoneyShort(data.summary.totalSpend)}
                  icon={DollarSign}
                  variant="info"
                  subtext={formatMoney(data.summary.totalSpend)}
                />
                <SummaryCard
                  label="Suppliers"
                  value={String(data.summary.supplierCount)}
                  icon={Users}
                  variant="default"
                />
                <SummaryCard
                  label="Invoice Lines"
                  value={String(data.summary.invoiceLineCount)}
                  icon={ShoppingCart}
                  variant="default"
                />
                <SummaryCard
                  label="Items Purchased"
                  value={String(data.summary.itemCount)}
                  icon={Package}
                  variant="default"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Avg Variance"
                  value={formatPct(data.summary.avgVariancePercent)}
                  icon={TrendingUp}
                  variant={Number(data.summary.avgVariancePercent) > 0 ? "warning" : "success"}
                />
                <SummaryCard
                  label="Above Primary Cost"
                  value={String(data.summary.abovePrimaryCount)}
                  icon={TrendingUp}
                  variant={data.summary.abovePrimaryCount > 0 ? "warning" : "success"}
                />
                <SummaryCard
                  label="Below Primary Cost"
                  value={String(data.summary.belowPrimaryCount)}
                  icon={TrendingDown}
                  variant="success"
                />
                <SummaryCard
                  label="Single-Source Risks"
                  value={String(data.summary.singleSourceRiskCount)}
                  icon={AlertTriangle}
                  variant={data.summary.singleSourceRiskCount > 0 ? "danger" : "success"}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="pi-spend-heading" className="space-y-6 border-t border-border/50 pt-10">
            <h2 id="pi-spend-heading" className="sr-only">
              Spend and suppliers
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className={DASHBOARD_SECTION_SURFACE}>
                <div className="mb-5 flex items-center gap-3 border-b border-border/50 pb-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
                    <BarChart3 className="size-4" aria-hidden />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Spend Trend</h3>
                </div>
                <div className="h-64 min-h-[16rem]">
                  {spendTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
                        <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} tickFormatter={(v) => formatMoneyShort(v)} />
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                          contentStyle={{
                            borderRadius: 8,
                            border: "1px solid oklch(0.922 0 0)",
                            fontSize: 12,
                            backgroundColor: "oklch(1 0 0)",
                            boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                          }}
                          labelStyle={{ fontWeight: 600 }}
                        />
                        <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Spend" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
                      No spend data for this range
                    </div>
                  )}
                </div>
              </div>

              <div className={DASHBOARD_SECTION_SURFACE}>
                <div className="mb-5 flex items-center gap-3 border-b border-border/50 pb-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
                    <Banknote className="size-4" aria-hidden />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Spend by Supplier</h3>
                </div>
                <div className="h-64 min-h-[16rem]">
                  {supplierPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={supplierPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                          labelLine={false}
                        >
                          {supplierPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                          contentStyle={{
                            borderRadius: 8,
                            border: "1px solid oklch(0.922 0 0)",
                            fontSize: 12,
                            backgroundColor: "oklch(1 0 0)",
                            boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                          }}
                        />
                        <Legend verticalAlign="bottom" height={24} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
                      No supplier data
                    </div>
                  )}
                </div>
              </div>
            </div>

            {data.topSuppliers.length > 0 ? (
              <div className={DASHBOARD_TABLE_SURFACE}>
                <div className={DASHBOARD_TABLE_HEAD}>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Top Suppliers</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-border/50 bg-muted/25">
                      <tr>
                        <th
                          scope="col"
                          className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                        >
                          Supplier
                        </th>
                        <th
                          scope="col"
                          className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                        >
                          Lines
                        </th>
                        <th
                          scope="col"
                          className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                        >
                          Spend
                        </th>
                        <th
                          scope="col"
                          className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                        >
                          % of Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.topSuppliers.map((row) => {
                        const pct =
                          Number(data.summary.totalSpend) > 0
                            ? (Number(row.spend) / Number(data.summary.totalSpend)) * 100
                            : 0;
                        return (
                          <tr key={row.supplierId} className="transition-colors hover:bg-muted/30">
                            <td className="px-5 py-4 font-medium text-foreground sm:px-6">{row.supplierName}</td>
                            <td className="px-5 py-4 text-right tabular-nums text-foreground sm:px-6">{row.lineCount}</td>
                            <td className="px-5 py-4 text-right tabular-nums text-foreground sm:px-6">{formatMoney(row.spend)}</td>
                            <td className="px-5 py-4 text-right tabular-nums sm:px-6">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-2 w-20 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/40">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className={cn(dashboardHintClass(), "w-12 text-right tabular-nums")}>{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>

          {data.priceAlerts.length > 0 ? (
            <section aria-labelledby="pi-variance-heading" className="border-t border-border/50 pt-10">
              <div className={DASHBOARD_TABLE_SURFACE}>
                <div className={DASHBOARD_TABLE_HEAD}>
                  <h3 id="pi-variance-heading" className="text-base font-semibold tracking-tight text-foreground">
                    Price Variance Alerts
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/25">
                    <tr>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        SKU
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Paid / unit
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Primary cost
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Variance
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.priceAlerts.map((row, i) => (
                      <tr key={i} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-4 font-medium text-foreground sm:px-6">{row.itemSku}</td>
                        <td className="px-5 py-4 text-right tabular-nums text-foreground sm:px-6">
                          {formatUnit(Number(row.paidUnitCost))}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-muted-foreground sm:px-6">
                          {row.primaryLastCost ? formatUnit(Number(row.primaryLastCost)) : "—"}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums sm:px-6">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 font-medium",
                              Number(row.variancePercent) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            <span
                              className={cn("size-1.5 shrink-0 rounded-full bg-current opacity-80")}
                              aria-hidden
                            />
                            {formatPct(row.variancePercent)}
                          </span>
                        </td>
                        <td className="px-5 py-4 sm:px-6">
                          {Number(row.variancePercent) > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-800 dark:text-rose-200">
                              <TrendingUp className="size-3.5 shrink-0" aria-hidden /> Above primary
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                              <TrendingDown className="size-3.5 shrink-0" aria-hidden /> Below primary
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </section>
          ) : null}

          {data.topCategories.length > 0 ? (
            <section aria-labelledby="pi-categories-heading" className="border-t border-border/50 pt-10">
              <div className={DASHBOARD_TABLE_SURFACE}>
                <div className={DASHBOARD_TABLE_HEAD}>
                  <h3 id="pi-categories-heading" className="text-base font-semibold tracking-tight text-foreground">
                    Spend by Category
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/25">
                    <tr>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Category
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Lines
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Spend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.topCategories.map((row) => (
                      <tr key={row.categoryId} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-4 font-medium text-foreground sm:px-6">{row.categoryName}</td>
                        <td className="px-5 py-4 text-right tabular-nums text-foreground sm:px-6">{row.lineCount}</td>
                        <td className="px-5 py-4 text-right tabular-nums text-foreground sm:px-6">{formatMoney(row.spend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </section>
          ) : null}

          {data.singleSourceRisks.length > 0 ? (
            <section aria-labelledby="pi-risk-heading" className="border-t border-border/50 pt-10">
              <div className={DASHBOARD_TABLE_SURFACE}>
                <div className={DASHBOARD_TABLE_HEAD}>
                  <h3 id="pi-risk-heading" className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                    <AlertTriangle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
                    <span>
                      Single-Source Risk ({data.singleSourceRisks.length})
                    </span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/25">
                    <tr>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        SKU
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Sole Supplier
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.singleSourceRisks.map((row) => (
                      <tr key={row.itemId} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-4 font-medium text-foreground sm:px-6">{row.sku}</td>
                        <td className="px-5 py-4 text-foreground sm:px-6">{row.name}</td>
                        <td className="px-5 py-4 sm:px-6">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-800 dark:text-rose-200">
                            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                            {row.soleSupplierName}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

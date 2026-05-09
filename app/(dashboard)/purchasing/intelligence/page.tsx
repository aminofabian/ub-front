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
  DashboardAccessDenied,
  DashboardNotice,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchPurchasingIntelligenceDashboard,
  type PurchasingIntelligenceDashboardResponse,
  type PriceVarianceAlert,
  type SingleSourceRiskRow,
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
    default: "bg-card border-border/60",
    success: "bg-emerald-50/50 border-emerald-200/60",
    warning: "bg-amber-50/50 border-amber-200/60",
    danger: "bg-rose-50/50 border-rose-200/60",
    info: "bg-sky-50/50 border-sky-200/60",
  };
  const iconStyles = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-sky-100 text-sky-700",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${styles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
          {subtext ? <p className="text-[11px] text-muted-foreground">{subtext}</p> : null}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Insights({ insights }: { insights: PurchasingIntelligenceDashboardResponse["insights"] }) {
  if (insights.length === 0) return null;
  return (
    <div className="space-y-2">
      {insights.map((insight, i) => {
        const isDanger = insight.kind === "danger";
        const isWarning = insight.kind === "warning";
        const isSuccess = insight.kind === "success";
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm",
              isDanger && "border-rose-200 bg-rose-50 text-rose-900",
              isWarning && "border-amber-200 bg-amber-50 text-amber-900",
              isSuccess && "border-emerald-200 bg-emerald-50 text-emerald-900",
              !isDanger && !isWarning && !isSuccess && "border-sky-200 bg-sky-50 text-sky-900",
            )}
          >
            {isDanger ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            ) : isWarning ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : isSuccess ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            )}
            <span className="font-medium">{insight.message}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PurchasingIntelligencePage() {
  const { me } = useDashboard();
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
      const dashboard = await fetchPurchasingIntelligenceDashboard(fromArg, toArg);
      setData(dashboard);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

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
      <div className="space-y-8">
        <header className="space-y-4">
          <DashboardPageHero
            icon={LineChart}
            eyebrow="Purchasing"
            title="Supplier intelligence"
            description={
              <>
                Spend analysis, price competitiveness, and supplier risk monitoring. Use quick ranges or set
                custom dates. Leave empty for the last 90 days.
              </>
            }
          />
          <DashboardQuickLinks
            links={[
              { href: APP_ROUTES.purchasingApAging, label: "AP aging", desc: "Balances", icon: BarChart3 },
              { href: APP_ROUTES.purchasingRecordPayment, label: "Record payment", desc: "Cash & alloc", icon: CreditCard },
              { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "Directory", icon: Truck },
            ]}
          />
        </header>

        {/* Filters */}
        <div className="sticky top-0 z-30 -mx-2 rounded-xl border bg-background/95 px-4 py-3 shadow-sm backdrop-blur sm:mx-0">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              load().catch(() => setMessage("Failed to load reports."));
            }}
          >
            <div className="flex min-w-[12rem] flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Quick range</span>
              <select
                className="rounded-lg border bg-background px-2.5 py-2 text-sm"
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
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">From</span>
              <input
                type="date"
                className="rounded-lg border bg-background px-2.5 py-2 text-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">To</span>
              <input
                type="date"
                className="rounded-lg border bg-background px-2.5 py-2 text-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Button type="submit" disabled={loading}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Loading…" : "Refresh"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setFrom(""); setTo(""); }} disabled={!from && !to}>
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </form>
        </div>

        {message ? <DashboardNotice text={message} /> : null}

        {data && (
          <>
            {/* Insights */}
            <Insights insights={data.insights} />

            {/* Summary Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Spend Trend */}
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Spend Trend</h3>
                </div>
                <div className="h-64">
                  {spendTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoneyShort(v)} />
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                        />
                        <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No spend data for this range
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier Spend Distribution */}
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Spend by Supplier</h3>
                </div>
                <div className="h-64">
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
                          contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend verticalAlign="bottom" height={24} iconSize={8} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No supplier data
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price Variance Alerts */}
            {data.priceAlerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight">Price Variance Alerts</h3>
                <div className="overflow-x-auto rounded-xl border shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">SKU</th>
                        <th className="px-3 py-2 text-right font-medium">Paid / unit</th>
                        <th className="px-3 py-2 text-right font-medium">Primary cost</th>
                        <th className="px-3 py-2 text-right font-medium">Variance</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.priceAlerts.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{row.itemSku}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatUnit(Number(row.paidUnitCost))}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.primaryLastCost ? formatUnit(Number(row.primaryLastCost)) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <span className={Number(row.variancePercent) > 0 ? "text-rose-600" : "text-emerald-600"}>
                              {formatPct(row.variancePercent)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {Number(row.variancePercent) > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                                <TrendingUp className="h-3 w-3" /> Above primary
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                <TrendingDown className="h-3 w-3" /> Below primary
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Categories */}
            {data.topCategories.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight">Spend by Category</h3>
                <div className="overflow-x-auto rounded-xl border shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">Lines</th>
                        <th className="px-3 py-2 text-right font-medium">Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCategories.map((row) => (
                        <tr key={row.categoryId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{row.categoryName}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.lineCount}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.spend)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Suppliers Table */}
            {data.topSuppliers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight">Top Suppliers</h3>
                <div className="overflow-x-auto rounded-xl border shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Supplier</th>
                        <th className="px-3 py-2 text-right font-medium">Lines</th>
                        <th className="px-3 py-2 text-right font-medium">Spend</th>
                        <th className="px-3 py-2 text-right font-medium">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topSuppliers.map((row) => {
                        const pct =
                          Number(data.summary.totalSpend) > 0
                            ? (Number(row.spend) / Number(data.summary.totalSpend)) * 100
                            : 0;
                        return (
                          <tr key={row.supplierId} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium">{row.supplierName}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.lineCount}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.spend)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Single Source Risk */}
            {data.singleSourceRisks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight text-rose-700">
                  Single-Source Risk ({data.singleSourceRisks.length})
                </h3>
                <div className="overflow-x-auto rounded-xl border shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">SKU</th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Sole Supplier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.singleSourceRisks.map((row) => (
                        <tr key={row.itemId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{row.sku}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              {row.soleSupplierName}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

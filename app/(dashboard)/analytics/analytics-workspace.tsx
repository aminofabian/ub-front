"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  RefreshCw,
  ShoppingCart,
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
  DASHBOARD_MAX_WIDE,
} from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import {
  ANALYTICS_PRESET_LABELS,
  type DatePreset,
  formatDateRangeLabel,
  parseISODate,
  presetRange,
  toISODate,
} from "@/lib/analytics-date-range";
import {
  fetchBranches,
  fetchCategories,
  fetchCogsByBranch,
  fetchCustomersByMonth,
  fetchFinancePL,
  fetchItemsByProfit,
  fetchSalesRevenueByCategory,
  fetchStaffPerformance,
  type BranchCogsRow,
  type BranchRecord,
  type CategoryRecord,
  type CustomerTrendResponse,
  type ItemRevenueRow,
  type ProfitAndLossResponse,
  type RevenueByCategoryRow,
  type StaffPerformanceRow,
} from "@/lib/api";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function compactMoney(n: number | string | null | undefined, currency: string): string {
  const val = toNum(n);
  const abs = Math.abs(val);
  const sign = val < 0 ? "−" : "";
  let body: string;
  if (abs >= 1_000_000_000) {
    body = `${(abs / 1_000_000_000).toFixed(2).replace(/\.00$/, "")}B`;
  } else if (abs >= 1_000_000) {
    body = `${(abs / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  } else if (abs >= 10_000) {
    body = `${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  } else {
    body = abs.toLocaleString("en-KE", { maximumFractionDigits: 0 });
  }
  const prefix =
    currency === "KES" ? "KSh " : currency.trim() ? `${currency.trim()} ` : "";
  return `${sign}${prefix}${body}`;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-KE", {
    month: "short",
  });
}

function monthsCovered(from: string, to: string): { year: number; month: number }[] {
  const start = parseISODate(from);
  const end = parseISODate(to);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const out: { year: number; month: number }[] = [];
  while (cursor <= last) {
    out.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

function ChartFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:p-4">
      <h2 className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
        {title}
      </h2>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="flex h-40 items-center justify-center px-4 text-center text-xs text-muted-foreground">
      {message}
    </p>
  );
}

function LabeledBars({
  items,
  formatValue,
  empty,
}: {
  items: { key: string; label: string; value: number }[];
  formatValue: (n: number) => string;
  empty: string;
}) {
  if (items.length === 0) return <EmptyChart message={empty} />;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="flex h-52 items-end gap-1.5 sm:h-56 sm:gap-2">
      {items.map((item, index) => {
        const pct = Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0);
        const lead = index === 0;
        return (
          <li
            key={item.key}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <span className="w-full truncate text-center text-[10px] font-semibold tabular-nums text-foreground">
              {formatValue(item.value)}
            </span>
            <div className="flex h-36 w-full items-end sm:h-40">
              <div
                className={cn(
                  "mx-auto w-[72%] max-w-12 rounded-t-sm transition-[height] duration-200",
                  lead ? "bg-chart-4" : "bg-primary/80",
                )}
                style={{ height: `${pct}%` }}
                title={`${item.label}: ${formatValue(item.value)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">
              {item.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CustomerLine({
  points,
  incompleteKey,
}: {
  points: { key: string; label: string; value: number }[];
  incompleteKey?: string;
}) {
  if (points.length === 0) {
    return (
      <EmptyChart message="No named customers bought in this window." />
    );
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = 0;
  const w = 320;
  const h = 160;
  const padX = 18;
  const padY = 18;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? padX + innerW / 2
        : padX + (i / (points.length - 1)) * innerW;
    const y = padY + innerH - ((p.value - min) / (max - min || 1)) * innerH;
    return { ...p, x, y };
  });
  const d = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-44 w-full"
        role="img"
        aria-label="Customers by month"
      >
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          className="text-primary"
        />
        {coords.map((c) => {
          const incomplete = incompleteKey != null && c.key === incompleteKey;
          return (
            <g key={c.key}>
              <circle
                cx={c.x}
                cy={c.y}
                r={incomplete ? 5 : 3.5}
                className={incomplete ? "fill-chart-4" : "fill-primary"}
              />
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor="middle"
                className="fill-foreground text-[9px] font-semibold"
              >
                {c.value.toLocaleString("en-KE")}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between px-1">
        {coords.map((c) => (
          <span
            key={c.key}
            className="text-[10px] text-muted-foreground"
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Slicer({
  title,
  name,
  options,
  value,
  onChange,
  allLabel,
}: {
  title: string;
  name: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  allLabel?: string;
}) {
  const items = allLabel
    ? [{ id: "", label: allLabel }, ...options]
    : options;
  return (
    <fieldset className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
      <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
        {title}
      </legend>
      <div className="mt-1 flex max-h-40 flex-col gap-0.5 overflow-y-auto sm:max-h-none">
        {items.map((item) => {
          const selected = value === item.id;
          return (
            <label
              key={item.id || "all"}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm",
                selected ? "bg-primary/10 text-foreground" : "text-foreground/90 hover:bg-muted/60",
              )}
            >
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(item.id)}
                className="size-3.5 accent-primary"
              />
              <span className="truncate">{item.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AnalyticsWorkspace({
  activityHref = APP_ROUTES.analyticsActivity,
  showCategoryTable = false,
}: {
  activityHref?: string | null;
  showCategoryTable?: boolean;
} = {}) {
  const { business, setBranchId: setHeaderBranchId } = useDashboard();
  const { itemTypeId: headerItemTypeId } = useSessionItemType();
  const currency = business?.currency?.trim() || "KES";
  const money = useCallback(
    (n: number | string | null | undefined) => compactMoney(n, currency),
    [currency],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      if (!branchLocked) setHeaderBranchId(id.trim());
    },
    [branchLocked, setHeaderBranchId],
  );

  const [pl, setPl] = useState<ProfitAndLossResponse | null>(null);
  const [categoryRevenue, setCategoryRevenue] = useState<RevenueByCategoryRow[]>(
    [],
  );
  const [staffPerf, setStaffPerf] = useState<StaffPerformanceRow[]>([]);
  const [itemsByProfit, setItemsByProfit] = useState<ItemRevenueRow[]>([]);
  const [branchCogs, setBranchCogs] = useState<BranchCogsRow[]>([]);
  const [customerTrend, setCustomerTrend] = useState<CustomerTrendResponse | null>(
    null,
  );

  const dateRange = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const rangeLabel = useMemo(() => {
    if (!dateRange) {
      return preset === "custom" ? "Choose a start and end date." : "";
    }
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange, preset]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [branchList, categoryList] = await Promise.all([
        fetchBranches(),
        fetchCategories().catch(() => [] as CategoryRecord[]),
      ]);
      setBranches(branchList.filter((b) => b.active !== false));
      setCategories(categoryList.filter((c) => c.active !== false));

      if (!dateRange) {
        setPl(null);
        setCategoryRevenue([]);
        setStaffPerf([]);
        setItemsByProfit([]);
        setBranchCogs([]);
        setCustomerTrend(null);
        return;
      }

      const branchFilter = branchId || undefined;
      const typeFilter = headerItemTypeId?.trim() || undefined;
      const catFilter = categoryId || undefined;

      const [plRes, catRes, staffRes, itemsRes, cogsRes, customersRes] =
        await Promise.all([
          fetchFinancePL(
            dateRange.from,
            dateRange.to,
            branchFilter,
            typeFilter,
          ).catch(() => null),
          fetchSalesRevenueByCategory(
            dateRange.from,
            dateRange.to,
            catFilter,
            branchFilter,
            typeFilter,
          ).catch(() => []),
          fetchStaffPerformance(
            dateRange.from,
            dateRange.to,
            branchFilter,
            typeFilter,
          ).catch(() => []),
          fetchItemsByProfit(dateRange.from, dateRange.to, {
            categoryId: catFilter,
            branchId: branchFilter,
            itemTypeId: typeFilter,
            limit: 10,
          }).catch(() => []),
          fetchCogsByBranch(
            dateRange.from,
            dateRange.to,
            catFilter,
            branchFilter,
            typeFilter,
          ).catch(() => []),
          fetchCustomersByMonth(
            dateRange.from,
            dateRange.to,
            branchFilter,
          ).catch(() => null),
        ]);

      setPl(plRes);
      setCategoryRevenue(Array.isArray(catRes) ? catRes : []);
      setStaffPerf(Array.isArray(staffRes) ? staffRes : []);
      setItemsByProfit(Array.isArray(itemsRes) ? itemsRes : []);
      setBranchCogs(Array.isArray(cogsRes) ? cogsRes : []);
      setCustomerTrend(customersRes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, branchId, categoryId, headerItemTypeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCategory = categoryRevenue[0];
  const categoryFiltered = Boolean(categoryId);
  const totalRevenue = categoryFiltered
    ? toNum(selectedCategory?.netRevenue)
    : toNum(pl?.revenue);
  const totalProfit = categoryFiltered
    ? toNum(selectedCategory?.netProfit)
    : toNum(pl?.grossProfit);
  const totalCogs = categoryFiltered
    ? totalRevenue - totalProfit
    : toNum(pl?.cogs);
  const totalCustomers = customerTrend?.totalDistinct ?? 0;

  const productBars = itemsByProfit.map((row) => ({
    key: row.itemId,
    label: row.itemName,
    value: toNum(row.netProfit),
  }));

  const staffBars = [...staffPerf]
    .sort((a, b) => toNum(b.totalRevenue) - toNum(a.totalRevenue))
    .slice(0, 8)
    .map((row) => ({
      key: row.userId,
      label: row.userName,
      value: toNum(row.totalRevenue),
    }));

  const cogsBars = branchCogs.map((row) => ({
    key: row.branchId,
    label: row.branchName,
    value: toNum(row.cogs),
  }));

  const today = new Date();
  const todayStr = toISODate(today);
  const currentMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
  const customerPoints = useMemo(() => {
    if (!dateRange) return [];
    const byKey = new Map(
      (customerTrend?.months ?? []).map((m) => [
        `${m.year}-${m.month}`,
        m.customerCount,
      ]),
    );
    return monthsCovered(dateRange.from, dateRange.to).map(({ year, month }) => ({
      key: `${year}-${month}`,
      label: monthLabel(year, month),
      value: byKey.get(`${year}-${month}`) ?? 0,
    }));
  }, [customerTrend, dateRange]);

  const incompleteMonth =
    dateRange && dateRange.to === todayStr ? currentMonthKey : undefined;

  if (loading && !refreshing) {
    return (
      <div className={cn(DASHBOARD_MAX_WIDE, "space-y-5 pb-16")}>
        <DashboardLoading label="Loading sales performance…" />
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-4 pb-16")}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Sales performance
          </h1>
          <p className="text-sm text-muted-foreground">
            {rangeLabel || "Revenue, cost, profit, and who is selling."}
          </p>
          <ActiveScopeSubtitle className="text-[11px] text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {activityHref ? (
            <Link
              href={activityHref}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border/55 bg-background px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Zap className="size-3.5" aria-hidden />
              Activity
            </Link>
          ) : null}
          <Link
            href={APP_ROUTES.salesTransactions}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border/55 bg-background px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ShoppingCart className="size-3.5" aria-hidden />
            Transactions
          </Link>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md border border-border/55 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
          </button>
        </div>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

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
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 rounded-md border border-border/55 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 rounded-md border border-border/55 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
            />
          </label>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total revenue", value: money(totalRevenue) },
          { label: "Total cost of goods", value: money(totalCogs) },
          { label: "Total profit", value: money(totalProfit) },
          {
            label: "Customers",
            value: totalCustomers.toLocaleString("en-KE"),
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13.5rem]">
        <div className="grid gap-3 md:grid-cols-2">
          <ChartFrame title="Product by profit">
            <LabeledBars
              items={productBars}
              formatValue={money}
              empty="No product profit in this slice."
            />
          </ChartFrame>
          <ChartFrame title="Sales by revenue">
            <LabeledBars
              items={staffBars}
              formatValue={money}
              empty="No cashier sales in this slice."
            />
          </ChartFrame>
          <ChartFrame title="Branch by COGS">
            <LabeledBars
              items={cogsBars}
              formatValue={money}
              empty="No cost of goods in this slice."
            />
          </ChartFrame>
          <ChartFrame title="Monthly customers">
            <CustomerLine
              points={customerPoints}
              incompleteKey={incompleteMonth}
            />
          </ChartFrame>
        </div>

        <aside className="flex flex-col gap-3">
          <Slicer
            title="Category"
            name="analytics-category"
            allLabel="All categories"
            options={categories.map((c) => ({ id: c.id, label: c.name }))}
            value={categoryId}
            onChange={setCategoryId}
          />
          <Slicer
            title="Branch"
            name="analytics-branch"
            allLabel={branchLocked ? undefined : "All branches"}
            options={branches.map((b) => ({ id: b.id, label: b.name }))}
            value={branchId}
            onChange={onChangeBranch}
          />
        </aside>
      </div>

      {showCategoryTable ? (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
            <BarChart3 className="size-3.5 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">Net revenue by category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Net revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {categoryRevenue.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No category rows for this window.
                    </td>
                  </tr>
                ) : (
                  categoryRevenue.map((row) => (
                    <tr key={row.categoryId} className="border-b last:border-0">
                      <td className="px-3 py-2">{row.categoryName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.netRevenue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(row.netProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

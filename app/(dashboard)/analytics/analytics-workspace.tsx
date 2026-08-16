"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { RefreshCw, ShoppingCart, Zap } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  useSessionItemType,
  useSyncBranchFilter,
} from "@/hooks/use-session-scope";
import { DashboardFeedback, DASHBOARD_MAX_WIDE } from "@/components/dashboard-page-ui";
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

function compactMoney(
  n: number | string | null | undefined,
  currency: string,
): string {
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

function monthsCovered(
  from: string,
  to: string,
): { year: number; month: number }[] {
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

function useSettlingNumber(value: number): number {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fromRef.current = value;
      setShown(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const duration = 220;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - (1 - t) ** 3;
      const next = from + (value - from) * ease;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

function ChipRail({
  legend,
  name,
  items,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div
        role="radiogroup"
        aria-label={legend}
        className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const selected = value === item.id;
          return (
            <label
              key={item.id || `${name}-all`}
              className={cn(
                "inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md border px-2.5 text-[11px] font-medium transition-colors duration-150",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-foreground/80 hover:border-foreground/25 hover:bg-muted hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={selected}
                onChange={() => onChange(item.id)}
              />
              {item.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function MixTrack({
  cogs,
  profit,
  revenue,
  money,
}: {
  cogs: number;
  profit: number;
  revenue: number;
  money: (n: number) => string;
}) {
  const total = Math.max(revenue, cogs + profit, 1);
  const cogsPct = Math.max(0, Math.min(100, (cogs / total) * 100));
  const profitPct = Math.max(0, Math.min(100 - cogsPct, (profit / total) * 100));
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div
        className="flex h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Cost ${money(cogs)}, profit ${money(profit)}, margin ${margin.toFixed(0)} percent`}
      >
        <div
          className="h-full bg-foreground/25 transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ width: `${cogsPct}%` }}
        />
        <div
          className="h-full bg-primary transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ width: `${profitPct}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Cost {money(cogs)}
          <span className="mx-2 text-border">·</span>
          Profit {money(profit)}
        </span>
        <span className="tabular-nums text-foreground">
          {margin.toFixed(0)}% margin
        </span>
      </div>
    </div>
  );
}

function EmptyPlot({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex h-44 items-center justify-center px-3 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function ColumnPlot({
  items,
  formatValue,
  empty,
}: {
  items: { key: string; label: string; value: number }[];
  formatValue: (n: number) => string;
  empty: string;
}) {
  if (items.length === 0) return <EmptyPlot>{empty}</EmptyPlot>;
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <ul className="flex h-[13.5rem] items-end gap-1 sm:gap-1.5">
      {items.map((item, index) => {
        const pct = Math.max((Math.abs(item.value) / max) * 100, item.value ? 3 : 0);
        const lead = index === 0;
        return (
          <li key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="w-full truncate text-center text-[10px] font-medium tabular-nums text-foreground">
              {formatValue(item.value)}
            </span>
            <div className="flex h-36 w-full items-end justify-center">
              <div
                className={cn(
                  "w-[70%] max-w-11 origin-bottom rounded-t-[3px] transition-[height] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                  lead ? "bg-primary" : "bg-foreground/20",
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

function CustomerPlot({
  points,
  incompleteKey,
}: {
  points: { key: string; label: string; value: number }[];
  incompleteKey?: string;
}) {
  if (points.length === 0) {
    return (
      <EmptyPlot>
        Named customers who bought in this window will plot here. Walk-in sales
        are not counted.
      </EmptyPlot>
    );
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const w = 360;
  const h = 168;
  const padX = 16;
  const padY = 22;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? padX + innerW / 2
        : padX + (i / (points.length - 1)) * innerW;
    const y = padY + innerH - (p.value / max) * innerH;
    return { ...p, x, y };
  });
  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${padY + innerH} L ${coords[0].x.toFixed(1)} ${padY + innerH} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-44 w-full"
        role="img"
        aria-label="Customers by month"
      >
        <path d={area} className="fill-primary/12" />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          className="text-primary"
        />
        {coords.map((c) => {
          const incomplete = incompleteKey != null && c.key === incompleteKey;
          return (
            <g key={c.key}>
              <circle
                cx={c.x}
                cy={c.y}
                r={incomplete ? 4.5 : 3}
                className={incomplete ? "fill-foreground" : "fill-primary"}
              />
              <text
                x={c.x}
                y={c.y - 9}
                textAnchor="middle"
                className="fill-foreground text-[9px] font-medium"
              >
                {c.value.toLocaleString("en-KE")}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between px-1">
        {coords.map((c) => (
          <span key={c.key} className="text-[10px] text-muted-foreground">
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlotCell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 p-4 sm:p-5">
      <h2 className="mb-3 text-[11px] font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BoardSkeleton() {
  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-5 pb-16")} aria-busy="true">
      <div className="h-10 w-64 rounded-md bg-muted" />
      <div className="h-20 rounded-xl bg-muted/70" />
      <div className="h-28 rounded-xl bg-muted/50" />
      <div className="grid gap-px overflow-hidden rounded-xl bg-border/60 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-56 bg-muted/40" />
        ))}
      </div>
      <span className="sr-only">Loading sales performance</span>
    </div>
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
  const hasLoadedRef = useRef(false);

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
  const [customerTrend, setCustomerTrend] =
    useState<CustomerTrendResponse | null>(null);

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
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
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
          fetchCustomersByMonth(dateRange.from, dateRange.to, branchFilter).catch(
            () => null,
          ),
        ]);

      setPl(plRes);
      setCategoryRevenue(Array.isArray(catRes) ? catRes : []);
      setStaffPerf(Array.isArray(staffRes) ? staffRes : []);
      setItemsByProfit(Array.isArray(itemsRes) ? itemsRes : []);
      setBranchCogs(Array.isArray(cogsRes) ? cogsRes : []);
      setCustomerTrend(customersRes);
      hasLoadedRef.current = true;
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
  const settlingProfit = useSettlingNumber(totalProfit);

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

  const categoryChips = [
    { id: "", label: "All categories" },
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ];
  const branchChips = [
    ...(branchLocked ? [] : [{ id: "", label: "All branches" }]),
    ...branches.map((b) => ({ id: b.id, label: b.name })),
  ];

  const categoryName =
    categories.find((c) => c.id === categoryId)?.name ?? "All categories";
  const branchName =
    branches.find((b) => b.id === branchId)?.name ??
    (branchId ? branchId : "All branches");

  if (loading) return <BoardSkeleton />;

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-5 pb-16")}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
            Sales performance
          </h1>
          <p className="text-sm text-muted-foreground">
            {rangeLabel
              ? `${rangeLabel} · ${categoryName} · ${branchName}`
              : "Set a period to read the till."}
          </p>
          <ActiveScopeSubtitle className="text-[11px] text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {activityHref ? (
            <Link
              href={activityHref}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Zap className="size-3.5" aria-hidden />
              Activity
            </Link>
          ) : null}
          <Link
            href={APP_ROUTES.salesTransactions}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <ShoppingCart className="size-3.5" aria-hidden />
            Transactions
          </Link>
        </div>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="sticky top-0 z-20 -mx-1 space-y-3 border-b border-border/70 bg-background px-1 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ChipRail
            legend="Period"
            name="analytics-period"
            items={ANALYTICS_PRESET_LABELS.map(({ key, label }) => ({
              id: key,
              label,
            }))}
            value={preset}
            onChange={(id) => setPreset(id as DatePreset)}
          />
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40"
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
        {preset === "custom" ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </label>
          </div>
        ) : null}
        <div className="grid gap-2 lg:grid-cols-2">
          <ChipRail
            legend="Category"
            name="analytics-category"
            items={categoryChips}
            value={categoryId}
            onChange={setCategoryId}
          />
          <ChipRail
            legend="Branch"
            name="analytics-branch"
            items={branchChips}
            value={branchId}
            onChange={onChangeBranch}
          />
        </div>
      </div>

      <div
        className={cn(
          "space-y-5 transition-opacity duration-200",
          refreshing && "opacity-60",
        )}
      >
        <section className="grid gap-6 border-b border-border/60 pb-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end">
          <div className="min-w-0 space-y-3">
            <p className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
              Profit
            </p>
            <p className="font-heading text-4xl font-medium tabular-nums tracking-[-0.03em] text-foreground sm:text-5xl">
              {money(settlingProfit)}
            </p>
            <MixTrack
              cogs={totalCogs}
              profit={totalProfit}
              revenue={totalRevenue}
              money={money}
            />
          </div>
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
                Revenue
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
                {money(totalRevenue)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
                Cost
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
                {money(totalCogs)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
                Customers
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
                {totalCustomers.toLocaleString("en-KE")}
              </dd>
            </div>
          </dl>
        </section>

        <div className="grid overflow-hidden rounded-xl border border-border/70 bg-card md:grid-cols-2">
          <PlotCell title="Product by profit">
            <ColumnPlot
              items={productBars}
              formatValue={money}
              empty="Sell through this slice and products will rank here by profit."
            />
          </PlotCell>
          <PlotCell title="Sales by revenue">
            <ColumnPlot
              items={staffBars}
              formatValue={money}
              empty="Completed sales will rank cashiers here."
            />
          </PlotCell>
          <PlotCell title="Branch by cost">
            <ColumnPlot
              items={cogsBars}
              formatValue={money}
              empty="Cost of goods will split across branches here."
            />
          </PlotCell>
          <PlotCell title="Monthly customers">
            <CustomerPlot
              points={customerPoints}
              incompleteKey={incompleteMonth}
            />
          </PlotCell>
        </div>
      </div>

      {showCategoryTable ? (
        <section className="overflow-hidden rounded-xl border border-border/70">
          <h2 className="border-b border-border/60 px-4 py-2.5 text-sm font-semibold tracking-[-0.02em]">
            Net revenue by category
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-[11px] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Net revenue
                  </th>
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
                    <tr key={row.categoryId} className="border-b border-border/50 last:border-0">
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

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { BarChart3, Filter, RefreshCw, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  useSessionItemType,
  useSyncBranchFilter,
} from "@/hooks/use-session-scope";
import { DashboardFeedback } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import {
  ANALYTICS_PRESET_LABELS,
  type DatePreset,
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

const NAVY = "#0c3a66";
const NAVY_DEEP = "#082c4f";
const BAR = "#2a6aa3";
const BAR_LEAD = "#0c3a66";
const SLICE = "#1e5a94";

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

function WhiteCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-none bg-white text-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <WhiteCard className="flex min-h-0 flex-col px-3 pb-3 pt-3 sm:px-4">
      <h2 className="mb-2 text-center text-[13px] font-bold uppercase tracking-[0.04em]" style={{ color: NAVY }}>
        {title}
      </h2>
      <div className="min-h-0 flex-1">{children}</div>
    </WhiteCard>
  );
}

function EmptyPlot({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex h-44 items-center justify-center px-4 text-center text-xs text-[#4a5568]">
      {children}
    </p>
  );
}

function ColumnChart({
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
    <ul className="flex h-[15.5rem] items-end gap-1 pb-8 sm:gap-1.5">
      {items.map((item, index) => {
        const pct = Math.max(
          (Math.abs(item.value) / max) * 100,
          item.value ? 6 : 0,
        );
        const lead = index === 0;
        return (
          <li
            key={item.key}
            className="relative flex min-w-0 flex-1 flex-col items-center"
          >
            <span className="mb-1 w-full truncate text-center text-[10px] font-semibold tabular-nums text-[#111]">
              {formatValue(item.value)}
            </span>
            <div className="flex h-36 w-full items-end justify-center sm:h-40">
              <div
                className="w-[68%] max-w-12"
                style={{
                  height: `${pct}%`,
                  background: lead ? BAR_LEAD : BAR,
                  boxShadow: "3px 4px 0 rgba(0,0,0,0.18)",
                }}
                title={`${item.label}: ${formatValue(item.value)}`}
              />
            </div>
            <span
              className="absolute bottom-0 left-1/2 w-[4.5rem] origin-top truncate text-center text-[10px] leading-tight text-[#222]"
              style={{ transform: "translateX(-50%) rotate(-32deg)" }}
            >
              {item.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CustomerTrend({
  points,
  incompleteKey,
}: {
  points: { key: string; label: string; value: number }[];
  incompleteKey?: string;
}) {
  if (points.length === 0) {
    return (
      <EmptyPlot>
        Completed sales in this window will plot here.
      </EmptyPlot>
    );
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const w = 360;
  const h = 176;
  const padX = 18;
  const padY = 24;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2 - 14;
  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? padX + innerW / 2
        : padX + (i / (points.length - 1)) * innerW;
    const y = padY + innerH - (p.value / max) * innerH;
    return { ...p, x, y };
  });
  const splitAt = incompleteKey
    ? Math.max(
        0,
        coords.findIndex((c) => c.key === incompleteKey) - 1,
      )
    : coords.length - 1;
  const solid = coords.slice(0, Math.max(splitAt + 1, 1));
  const tail = coords.slice(Math.max(splitAt, 0));
  const toPath = (pts: typeof coords) =>
    pts
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-48 w-full"
        role="img"
        aria-label="Customers by month"
      >
        {solid.length > 1 ? (
          <path
            d={toPath(solid)}
            fill="none"
            stroke={NAVY}
            strokeWidth="2.4"
            strokeLinejoin="miter"
          />
        ) : null}
        {tail.length > 1 ? (
          <path
            d={toPath(tail)}
            fill="none"
            stroke={BAR_LEAD}
            strokeWidth="2.6"
            strokeLinejoin="miter"
          />
        ) : null}
        {coords.map((c) => {
          const incomplete = incompleteKey != null && c.key === incompleteKey;
          return (
            <g key={c.key}>
              {incomplete ? (
                <rect
                  x={c.x - 16}
                  y={c.y - 22}
                  width="32"
                  height="16"
                  rx="0"
                  fill={NAVY}
                />
              ) : null}
              <text
                x={c.x}
                y={incomplete ? c.y - 11 : c.y - 10}
                textAnchor="middle"
                fill={incomplete ? "#fff" : "#111"}
                fontSize="10"
                fontWeight="700"
              >
                {c.value.toLocaleString("en-KE")}
              </text>
              <rect
                x={c.x - (incomplete ? 4 : 3)}
                y={c.y - (incomplete ? 4 : 3)}
                width={incomplete ? 8 : 6}
                height={incomplete ? 8 : 6}
                fill={incomplete ? BAR_LEAD : NAVY}
              />
            </g>
          );
        })}
        {coords.map((c) => (
          <text
            key={`${c.key}-lbl`}
            x={c.x}
            y={h - 4}
            textAnchor="middle"
            fill="#222"
            fontSize="11"
          >
            {c.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function SlicerPanel({
  title,
  name,
  items,
  value,
  onChange,
  onClear,
}: {
  title: string;
  name: string;
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  onClear?: () => void;
}) {
  return (
    <section
      className="overflow-hidden rounded-none"
      style={{ background: NAVY_DEEP }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-1.5 text-white/90">
          <Filter className="size-3.5" aria-hidden />
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="p-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label={`Clear ${title}`}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex max-h-52 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {items.map((item) => {
          const selected = value === item.id;
          return (
            <label key={item.id || `${name}-all`} className="block">
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={selected}
                onChange={() => onChange(item.id)}
              />
              <span
                className={cn(
                  "flex min-h-9 cursor-pointer items-center justify-center px-3 py-1.5 text-center text-[13px] font-medium text-white transition-colors",
                  selected
                    ? "ring-2 ring-white/80"
                    : "hover:brightness-110",
                )}
                style={{ background: SLICE }}
              >
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function BoardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1100px] rounded-none p-4 pb-10 sm:p-5"
      style={{ background: NAVY }}
      aria-busy="true"
    >
      <div className="mb-4 h-10 w-2/3 bg-white/10" />
      <div className="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-white/90" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13.5rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 bg-white/90" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-36 bg-white/10" />
          <div className="h-36 bg-white/10" />
        </div>
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
  const { business, me, setBranchId: setHeaderBranchId } = useDashboard();
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

  const productBars = itemsByProfit.map((row) => ({
    key: row.itemId,
    label: row.itemName,
    value: toNum(row.netProfit),
  }));

  const staffBars = [...staffPerf]
    .sort((a, b) => toNum(b.totalRevenue) - toNum(a.totalRevenue))
    .slice(0, 6)
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

  const categoryItems = [
    { id: "", label: "All categories" },
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ];
  const branchItems = [
    ...(branchLocked ? [] : [{ id: "", label: "All branches" }]),
    ...branches.map((b) => ({ id: b.id, label: b.name })),
  ];

  if (loading) return <BoardSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-16">
      {error ? (
        <div className="mb-3">
          <DashboardFeedback kind="error" text={error} />
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-none p-3 sm:p-4",
          refreshing && "opacity-80",
        )}
        style={{ background: NAVY }}
      >
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center bg-white">
              <BarChart3 className="size-6" aria-hidden style={{ color: NAVY }} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[1.35rem] font-extrabold uppercase leading-none tracking-[0.04em] text-white sm:text-[1.7rem]">
                Sales performance dashboard
              </h1>
              <div className="mt-2 flex flex-wrap gap-1">
                {ANALYTICS_PRESET_LABELS.filter((p) => p.key !== "custom").map(
                  ({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreset(key)}
                      className={cn(
                        "h-6 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-white",
                        preset === key ? "ring-2 ring-white" : "opacity-80 hover:opacity-100",
                      )}
                      style={{ background: SLICE }}
                    >
                      {label}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => setPreset("custom")}
                  className={cn(
                    "h-6 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-white",
                    preset === "custom" ? "ring-2 ring-white" : "opacity-80 hover:opacity-100",
                  )}
                  style={{ background: SLICE }}
                >
                  Custom
                </button>
                <button
                  type="button"
                  className="flex size-6 items-center justify-center text-white/90 hover:bg-white/10"
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
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/90">
              {me?.name || business?.name || ""}
            </p>
            {activityHref ? (
              <Link
                href={activityHref}
                className="text-[11px] text-white/80 underline-offset-2 hover:text-white hover:underline"
              >
                Activity
              </Link>
            ) : null}
          </div>
        </header>

        {preset === "custom" ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 px-1 text-[11px] text-white">
            <label className="flex items-center gap-1.5">
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-7 rounded-none border-0 bg-white px-2 text-xs text-[#111]"
              />
            </label>
            <label className="flex items-center gap-1.5">
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-7 rounded-none border-0 bg-white px-2 text-xs text-[#111]"
              />
            </label>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13.75rem]">
          <div className="min-w-0 space-y-3">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: "Total Revenue", value: money(totalRevenue) },
                {
                  label: "Total Cost Of Goods Sold",
                  value: money(totalCogs),
                },
                { label: "Total profit", value: money(totalProfit) },
                {
                  label: "Total Customer",
                  value: totalCustomers.toLocaleString("en-KE"),
                },
              ].map((kpi) => (
                <WhiteCard key={kpi.label} className="px-4 py-3">
                  <p className="text-[13px] font-medium" style={{ color: NAVY }}>{kpi.label}</p>
                  <p className="mt-2 text-center text-[1.65rem] font-extrabold tabular-nums leading-none tracking-tight" style={{ color: NAVY }}>
                    {kpi.value}
                  </p>
                </WhiteCard>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ChartCard title="Product by profit">
                <ColumnChart
                  items={productBars}
                  formatValue={money}
                  empty="No product profit in this slice."
                />
              </ChartCard>
              <ChartCard title="Sales by revenue">
                <ColumnChart
                  items={staffBars}
                  formatValue={money}
                  empty="No cashier sales in this slice."
                />
              </ChartCard>
              <ChartCard title="Branch by COGS">
                <ColumnChart
                  items={cogsBars}
                  formatValue={money}
                  empty="No cost of goods in this slice."
                />
              </ChartCard>
              <ChartCard title="Monthly customers trend">
                <CustomerTrend
                  points={customerPoints}
                  incompleteKey={incompleteMonth}
                />
              </ChartCard>
            </div>
          </div>

          <aside className="flex flex-col gap-3">
            <SlicerPanel
              title="Category"
              name="analytics-category"
              items={categoryItems}
              value={categoryId}
              onChange={setCategoryId}
              onClear={() => setCategoryId("")}
            />
            <SlicerPanel
              title="Branch"
              name="analytics-branch"
              items={branchItems}
              value={branchId}
              onChange={onChangeBranch}
              onClear={branchLocked ? undefined : () => onChangeBranch("")}
            />
          </aside>
        </div>
      </div>

      {showCategoryTable ? (
        <WhiteCard className="mt-4 overflow-hidden">
          <h2 className="border-b border-[#e5e7eb] px-4 py-2.5 text-sm font-semibold">
            Net revenue by category
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-[#e5e7eb] bg-[#f4f6f8] text-[11px] text-[#4a5568]">
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
                      className="px-3 py-6 text-center text-[#4a5568]"
                    >
                      No category rows for this window.
                    </td>
                  </tr>
                ) : (
                  categoryRevenue.map((row) => (
                    <tr
                      key={row.categoryId}
                      className="border-b border-[#eef1f4] last:border-0"
                    >
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
        </WhiteCard>
      ) : null}
    </div>
  );
}

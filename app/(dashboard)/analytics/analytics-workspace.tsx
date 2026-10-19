"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Filter,
  Gauge,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  useSessionItemType,
  useSyncBranchFilter,
} from "@/hooks/use-session-scope";
import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import {
  SalesHeroMetric,
  SalesMetricTile,
  SalesPeriodChip,
  SalesStage,
  salesHair,
  salesInk,
  salesMute,
  salesPaper,
  salesSurface,
  salesTeal,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
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
  fetchAuditEvents,
  fetchBranches,
  fetchCategories,
  fetchCogsByBranch,
  fetchCreditsActivitySummary,
  fetchCustomersByMonth,
  fetchFinancePL,
  fetchFinancePulse,
  fetchItemsByProfit,
  fetchOutstandingTabs,
  fetchPaymentLedger,
  fetchSalesRevenueByCategory,
  fetchStaffPerformance,
  type AuditEventRecord,
  type BranchCogsRow,
  type BranchRecord,
  type CategoryRecord,
  type CreditCollectionRowRecord,
  type CustomerTrendResponse,
  type ItemRevenueRow,
  type OutstandingTabRowRecord,
  type PaymentLedgerRow,
  type ProfitAndLossResponse,
  type RevenueByCategoryRow,
  type StaffPerformanceRow,
} from "@/lib/api";
import { AnalyticsOpsBoard } from "./analytics-ops-board";

const BAR = `color-mix(in srgb, ${salesTeal} 28%, transparent)`;
const BAR_LEAD = salesTeal;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function formatQty(n: number | string | null | undefined): string {
  const value = toNum(n);
  return value.toLocaleString("en-KE", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

type ProductSortKey = "quantitySold" | "netRevenue" | "netProfit";

const PRODUCT_SORTS: { key: ProductSortKey; label: string }[] = [
  { key: "quantitySold", label: "Qty" },
  { key: "netRevenue", label: "Revenue" },
  { key: "netProfit", label: "Profit" },
];

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

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(salesSurface, "overflow-hidden", className)}>{children}</div>;
}

function EmptyPlot({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex h-40 items-center justify-center px-4 text-center text-[13px] leading-relaxed",
        salesMute,
      )}
    >
      {children}
    </p>
  );
}

/** Horizontal ranked bars — readable on phones where vertical columns crush. */
function RankedBars({
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
    <ul className="space-y-2.5">
      {items.map((item, index) => {
        const pct = Math.max(
          (Math.abs(item.value) / max) * 100,
          item.value ? 4 : 0,
        );
        return (
          <li key={item.key} className="min-w-0">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className={cn("min-w-0 truncate text-[13px] font-medium tracking-[-0.015em]", salesInk)}>
                <span className={cn("mr-1.5 tabular-nums", salesMute)}>
                  {index + 1}.
                </span>
                {item.label}
              </span>
              <span className={cn("shrink-0 text-[12px] font-semibold tabular-nums tracking-[-0.02em]", salesInk)}>
                {formatValue(item.value)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,white)]">
              <div
                className="h-full w-full origin-left rounded-full motion-reduce:transition-none"
                style={{
                  transform: `scaleX(${pct / 100})`,
                  background: index === 0 ? BAR_LEAD : BAR,
                  transition: `transform 200ms ${EASE}`,
                }}
              />
            </div>
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
      <EmptyPlot>Completed sales in this window will plot here.</EmptyPlot>
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
    ? Math.max(0, coords.findIndex((c) => c.key === incompleteKey) - 1)
    : coords.length - 1;
  const solid = coords.slice(0, Math.max(splitAt + 1, 1));
  const tail = coords.slice(Math.max(splitAt, 0));
  const toPath = (pts: typeof coords) =>
    pts
      .map(
        (c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
      )
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
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="miter"
          />
        ) : null}
        {tail.length > 1 ? (
          <path
            d={toPath(tail)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinejoin="miter"
            opacity="0.55"
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
                  fill="currentColor"
                />
              ) : null}
              <text
                x={c.x}
                y={incomplete ? c.y - 11 : c.y - 10}
                textAnchor="middle"
                fill={incomplete ? "var(--background)" : "currentColor"}
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
                fill="currentColor"
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
            fill="color-mix(in oklab, currentColor 55%, transparent)"
            fontSize="11"
          >
            {c.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div
      className={cn(DASHBOARD_MAX_WIDE, salesPaper)}
      aria-busy="true"
    >
      <div className={cn(salesSurface, "h-11 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]")} />
      <div className={cn(salesSurface, "h-12 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,white)]")} />
      <div className={cn(salesSurface, "h-36 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]")} />
      <div className="grid gap-2 md:grid-cols-2">
        <div className={cn(salesSurface, "h-56 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]")} />
        <div className={cn(salesSurface, "h-56 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]")} />
      </div>
      <span className="sr-only">Loading sales performance</span>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  items: { id: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className={cn("hidden shrink-0 text-[11px] font-semibold sm:inline", salesMute)}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "h-9 max-w-[11rem] cursor-pointer appearance-none rounded-xl border bg-white py-0 pl-2.5 pr-7 text-[12px] font-semibold outline-none",
          salesHair,
          salesInk,
          "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/25",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {items.map((item) => (
          <option key={item.id || "all"} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AnalyticsWorkspace({
  activityHref = APP_ROUTES.analyticsActivity,
  showCategoryTable = false,
}: {
  activityHref?: string | null;
  showCategoryTable?: boolean;
} = {}) {
  const {
    business,
    setBranchId: setHeaderBranchId,
    canViewAuditLog,
  } = useDashboard();
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      if (!branchLocked) setHeaderBranchId(id.trim());
    },
    [branchLocked, setHeaderBranchId],
  );

  const [pl, setPl] = useState<ProfitAndLossResponse | null>(null);
  const [categoryRevenue, setCategoryRevenue] = useState<
    RevenueByCategoryRow[]
  >([]);
  const [staffPerf, setStaffPerf] = useState<StaffPerformanceRow[]>([]);
  const [itemsByProfit, setItemsByProfit] = useState<ItemRevenueRow[]>([]);
  const [branchCogs, setBranchCogs] = useState<BranchCogsRow[]>([]);
  const [customerTrend, setCustomerTrend] =
    useState<CustomerTrendResponse | null>(null);
  const [payments, setPayments] = useState<PaymentLedgerRow[]>([]);
  const [tabs, setTabs] = useState<OutstandingTabRowRecord[]>([]);
  const [collections, setCollections] = useState<CreditCollectionRowRecord[]>(
    [],
  );
  const [owedTotal, setOwedTotal] = useState(0);
  const [audit, setAudit] = useState<AuditEventRecord[]>([]);
  const [openShifts, setOpenShifts] = useState(0);
  const [reportView, setReportView] = useState<"products" | "categories">(
    "products",
  );
  const [productSort, setProductSort] = useState<ProductSortKey>("quantitySold");
  const [productQuery, setProductQuery] = useState("");

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
        setPayments([]);
        setTabs([]);
        setCollections([]);
        setOwedTotal(0);
        setAudit([]);
        setOpenShifts(0);
        return;
      }

      const branchFilter = branchId || undefined;
      const typeFilter = headerItemTypeId?.trim() || undefined;
      const catFilter = categoryId || undefined;
      const fromIso = parseISODate(dateRange.from).toISOString();
      const toEnd = parseISODate(dateRange.to);
      toEnd.setHours(23, 59, 59, 999);
      const toIso = toEnd.toISOString();

      const [
        plRes,
        catRes,
        staffRes,
        itemsRes,
        cogsRes,
        customersRes,
        payRes,
        tabRes,
        creditRes,
        pulseRes,
        auditRes,
      ] = await Promise.all([
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
          limit: showCategoryTable ? 500 : 10,
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
        fetchPaymentLedger(dateRange.from, dateRange.to, branchFilter).catch(
          () => [] as PaymentLedgerRow[],
        ),
        fetchOutstandingTabs().catch(() => [] as OutstandingTabRowRecord[]),
        fetchCreditsActivitySummary(dateRange.from, dateRange.to).catch(
          () => null,
        ),
        fetchFinancePulse(dateRange.to, branchFilter, typeFilter).catch(
          () => null,
        ),
        canViewAuditLog
          ? fetchAuditEvents({
              branchId: branchFilter ?? null,
              from: fromIso,
              to: toIso,
              page: 0,
              size: 8,
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      setPl(plRes);
      setCategoryRevenue(Array.isArray(catRes) ? catRes : []);
      setStaffPerf(Array.isArray(staffRes) ? staffRes : []);
      setItemsByProfit(Array.isArray(itemsRes) ? itemsRes : []);
      setBranchCogs(Array.isArray(cogsRes) ? cogsRes : []);
      setCustomerTrend(customersRes);
      setPayments(Array.isArray(payRes) ? payRes : []);
      setTabs(Array.isArray(tabRes) ? tabRes : []);
      setCollections(
        Array.isArray(creditRes?.collections) ? creditRes.collections : [],
      );
      setOwedTotal(Number(creditRes?.totalOwed ?? 0) || 0);
      setOpenShifts(pulseRes?.openShifts ?? 0);
      setAudit(Array.isArray(auditRes?.content) ? auditRes.content : []);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    dateRange,
    branchId,
    categoryId,
    headerItemTypeId,
    canViewAuditLog,
    showCategoryTable,
  ]);

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

  const productProfitBars = [...itemsByProfit]
    .sort((a, b) => toNum(b.netProfit) - toNum(a.netProfit))
    .slice(0, 8)
    .map((row) => ({
      key: row.itemId,
      label: row.itemName,
      value: toNum(row.netProfit),
    }));

  const productQtyBars = [...itemsByProfit]
    .sort((a, b) => toNum(b.quantitySold) - toNum(a.quantitySold))
    .slice(0, 8)
    .map((row) => ({
      key: `qty-${row.itemId}`,
      label: row.itemName,
      value: toNum(row.quantitySold),
    }));

  const staffBars = [...staffPerf]
    .sort((a, b) => toNum(b.totalRevenue) - toNum(a.totalRevenue))
    .slice(0, 8)
    .map((row) => ({
      key: row.userId,
      label: row.userName,
      value: toNum(row.totalRevenue),
    }));

  const cogsBars = branchCogs
    .slice(0, 8)
    .map((row) => ({
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
    return monthsCovered(dateRange.from, dateRange.to).map(
      ({ year, month }) => ({
        key: `${year}-${month}`,
        label: monthLabel(year, month),
        value: byKey.get(`${year}-${month}`) ?? 0,
      }),
    );
  }, [customerTrend, dateRange]);

  const incompleteMonth =
    dateRange && dateRange.to === todayStr ? currentMonthKey : undefined;

  const productRows = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    const matched = query
      ? itemsByProfit.filter((row) =>
          `${row.itemName} ${row.sku ?? ""}`.toLowerCase().includes(query),
        )
      : itemsByProfit;
    return [...matched].sort(
      (a, b) => toNum(b[productSort]) - toNum(a[productSort]),
    );
  }, [itemsByProfit, productQuery, productSort]);

  const categoryItems = [
    { id: "", label: "All categories" },
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ];
  const branchItems = [
    ...(branchLocked ? [] : [{ id: "", label: "All branches" }]),
    ...branches.map((b) => ({ id: b.id, label: b.name })),
  ];

  const imported = payments.reduce((sum, row) => sum + toNum(row.amount), 0);
  const unverifiedMpesa = payments.filter((row) => {
    const method = row.method.trim().toLowerCase();
    return (
      (method === "mpesa" || method === "mpesa_manual") &&
      row.mpesaVerified === false
    );
  }).length;
  const unallocated = payments
    .filter((row) => {
      const status = row.status.trim().toLowerCase();
      const method = row.method.trim().toLowerCase();
      const open = status && status !== "completed" && status !== "paid";
      const unverified =
        (method === "mpesa" || method === "mpesa_manual") &&
        row.mpesaVerified === false;
      return open || unverified;
    })
    .reduce((sum, row) => sum + toNum(row.amount), 0);
  const allocated = Math.max(imported - unallocated, 0);
  const balanced =
    unallocated === 0 && openShifts === 0 && unverifiedMpesa === 0;

  if (loading) return <BoardSkeleton />;

  const periodLabel =
    ANALYTICS_PRESET_LABELS.find((p) => p.key === preset)?.label ?? "Period";
  const categoryLabel =
    categoryItems.find((c) => c.id === categoryId)?.label ?? "Category";
  const branchLabel =
    branchItems.find((b) => b.id === branchId)?.label ?? "Branch";
  const filtersActive = Boolean(categoryId || (!branchLocked && branchId));

  const primaryPeriods: DatePreset[] = showCategoryTable
    ? ["thisMonth", "lastMonth", "last30", "today"]
    : ["today", "last7", "last30", "thisMonth"];


  const rangeLabel = dateRange
    ? dateRange.from === dateRange.to
      ? dateRange.from
      : `${dateRange.from} → ${dateRange.to}`
    : periodLabel;

  const attention = unallocated + owedTotal;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        salesPaper,
        salesInk,
        refreshing && "opacity-80",
      )}
    >
      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <DashboardPageHero
        icon={TrendingUp}
        title="Trends"
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <ActiveScopeSubtitle className="text-[11px]" />
            {rangeLabel ? (
              <span className="tabular-nums">{rangeLabel}</span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                balanced
                  ? "text-[var(--pos-primary,#0f766e)]"
                  : "text-[#9a2e16]",
              )}
            >
              {balanced ? <Check className="size-3" aria-hidden /> : null}
              {balanced ? "Balanced" : "Needs review"}
            </span>
          </span>
        }
      >
        {activityHref ? (
          <Link href={activityHref} className={salesToolBtnClass()}>
            <Gauge className="size-3.5" aria-hidden />
            Activity
          </Link>
        ) : null}
        <Link
          href={APP_ROUTES.analyticsCustomers}
          className={salesToolBtnClass()}
        >
          <Users className="size-3.5" aria-hidden />
          Shoppers
        </Link>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
          disabled={refreshing}
          aria-label="Refresh"
          className={cn(
            salesToolBtnClass(),
            "size-8 justify-center px-0 disabled:opacity-40",
          )}
        >
          <RefreshCw
            className={cn("size-3.5", refreshing && "animate-spin")}
            aria-hidden
          />
        </button>
      </DashboardPageHero>

      {/* Period + scope strip — one control surface, not a side rail */}
      <div className={cn(salesSurface, "px-2.5 py-2 sm:px-3")}>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Period"
          >
            {primaryPeriods.map((key) => {
              const label =
                ANALYTICS_PRESET_LABELS.find((p) => p.key === key)?.label ??
                key;
              return (
                <SalesPeriodChip
                  key={key}
                  active={preset === key}
                  onClick={() => setPreset(key)}
                >
                  {label}
                </SalesPeriodChip>
              );
            })}
            <SalesPeriodChip
              active={
                preset === "custom" || !primaryPeriods.includes(preset)
              }
              onClick={() => {
                setPreset("custom");
                setMobileFiltersOpen(true);
              }}
            >
              More
            </SalesPeriodChip>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <FilterSelect
              label="Category"
              value={categoryId}
              onChange={setCategoryId}
              items={categoryItems}
            />
            <FilterSelect
              label="Branch"
              value={branchId}
              onChange={onChangeBranch}
              items={branchItems}
              disabled={branchLocked}
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className={cn(
              "relative inline-flex h-9 items-center gap-1 rounded-xl border bg-white px-2.5 text-[12px] font-semibold sm:hidden",
              salesHair,
              filtersActive || mobileFiltersOpen
                ? "text-[var(--pos-primary,#0f766e)]"
                : salesMute,
            )}
            aria-expanded={mobileFiltersOpen}
          >
            <Filter className="size-3.5" aria-hidden />
            Filters
            {filtersActive ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--pos-primary,#0f766e)] ring-2 ring-white" />
            ) : null}
          </button>
        </div>

        {mobileFiltersOpen || preset === "custom" || !primaryPeriods.includes(preset) ? (
          <div className={cn("mt-2 space-y-2 border-t pt-2 sm:mt-2.5", salesHair)}>
            <div className="flex flex-wrap gap-1.5 sm:hidden">
              {ANALYTICS_PRESET_LABELS.map(({ key, label }) => (
                <SalesPeriodChip
                  key={key}
                  active={preset === key}
                  onClick={() => setPreset(key)}
                  className="h-8 px-2.5 text-[11px]"
                >
                  {label}
                </SalesPeriodChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 sm:hidden">
              <FilterSelect
                label="Category"
                value={categoryId}
                onChange={setCategoryId}
                items={categoryItems}
              />
              <FilterSelect
                label="Branch"
                value={branchId}
                onChange={onChangeBranch}
                items={branchItems}
                disabled={branchLocked}
              />
            </div>
            {preset === "custom" ? (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <label className={cn("flex flex-col gap-1 text-[11px] font-semibold", salesMute)}>
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className={cn(
                      "h-10 rounded-xl border bg-white px-2.5 text-[13px] font-medium outline-none",
                      salesHair,
                      salesInk,
                      "focus-visible:border-[var(--pos-primary,#0f766e)]",
                    )}
                  />
                </label>
                <label className={cn("flex flex-col gap-1 text-[11px] font-semibold", salesMute)}>
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className={cn(
                      "h-10 rounded-xl border bg-white px-2.5 text-[13px] font-medium outline-none",
                      salesHair,
                      salesInk,
                      "focus-visible:border-[var(--pos-primary,#0f766e)]",
                    )}
                  />
                </label>
              </div>
            ) : null}
            <p className={cn("truncate text-[12px] sm:hidden", salesMute)}>
              <span className={cn("font-semibold", salesInk)}>{periodLabel}</span>
              <span className="mx-1.5 opacity-40">·</span>
              {categoryLabel}
              <span className="mx-1.5 opacity-40">·</span>
              {branchLabel}
            </p>
          </div>
        ) : null}
      </div>

      {/* What we made — one composition, not five equal cards */}
      <section className={cn(salesSurface, "overflow-hidden")}>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div
            className={cn(
              "border-b lg:border-b-0 lg:border-r",
              salesHair,
            )}
          >
            <SalesHeroMetric
              label="Net profit"
              value={money(totalProfit)}
              hint={`After cost of goods${categoryFiltered ? " in this category" : ""} for the period.`}
            />
          </div>
          <div className="grid grid-cols-2">
            {[
              {
                label: "Revenue",
                value: money(totalRevenue),
              },
              {
                label: "Cost of goods",
                value: money(totalCogs),
              },
              {
                label: "Customers",
                value: (customerTrend?.totalDistinct ?? 0).toLocaleString(
                  "en-KE",
                ),
              },
              {
                label: "Unallocated",
                value: money(attention),
                warn: attention > 0,
              },
            ].map((kpi, i) => (
              <SalesMetricTile
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                warn={"warn" in kpi && kpi.warn}
                className={cn(
                  i % 2 === 1 && "border-l",
                  i >= 2 && "border-t",
                  salesHair,
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Floors — what moved and who sold it */}
      <div className="grid gap-2 lg:grid-cols-2">
        <SalesStage
          title="What left the shelf"
          hint="Units sold — a quiet category can still hide a hot product."
        >
          <RankedBars
            items={productQtyBars}
            formatValue={(n) => formatQty(n)}
            empty="No products sold in this slice."
          />
        </SalesStage>
        <SalesStage
          title="Profit by product"
          hint="Where the margin actually came from."
        >
          <RankedBars
            items={productProfitBars}
            formatValue={money}
            empty="No product profit in this slice."
          />
        </SalesStage>
        <SalesStage
          title="Who sold it"
          hint="Cashiers and tills ranked by revenue."
        >
          <RankedBars
            items={staffBars}
            formatValue={money}
            empty="No cashier sales in this slice."
          />
        </SalesStage>
        <SalesStage
          title="Branch cost of goods"
          hint="What each branch spent to make those sales."
        >
          {cogsBars.length > 0 ? (
            <RankedBars
              items={cogsBars}
              formatValue={money}
              empty="No cost of goods in this slice."
            />
          ) : (
            <div>
              <p className={cn("mb-3 text-[13px] font-semibold", salesInk)}>
                Customers by month
              </p>
              <CustomerTrend
                points={customerPoints}
                incompleteKey={incompleteMonth}
              />
            </div>
          )}
        </SalesStage>
      </div>

      {cogsBars.length > 0 ? (
        <SalesStage
          title="Customers by month"
          hint="Distinct shoppers with a completed sale."
        >
          <CustomerTrend
            points={customerPoints}
            incompleteKey={incompleteMonth}
          />
        </SalesStage>
      ) : null}

      <div className="pt-1">
        <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
          <h2
            className={cn(
              "font-heading text-[15px] font-semibold tracking-[-0.02em]",
              salesInk,
            )}
          >
            Money desk
          </h2>
          <p className={cn("text-[12px]", salesMute)}>
            Tenders, tabs, and what still needs a pass
          </p>
        </div>
        <AnalyticsOpsBoard
          money={money}
          payments={payments}
          tabs={tabs}
          collections={collections}
          audit={audit}
          imported={payments.length > 0 ? imported : totalRevenue}
          allocated={payments.length > 0 ? allocated : totalRevenue}
          unallocated={unallocated + owedTotal}
          balanced={balanced}
          openShifts={openShifts}
          unverifiedMpesa={unverifiedMpesa}
          canViewAudit={canViewAuditLog}
        />
      </div>

      {showCategoryTable ? (
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1" role="group" aria-label="Report breakdown">
              {(
                [
                  ["products", "By product"],
                  ["categories", "By category"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setReportView(id)}
                  aria-pressed={reportView === id}
                  className={cn(
                    "h-8 border px-2.5 text-[12px] font-semibold tracking-[-0.01em]",
                    reportView === id
                      ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {reportView === "products" ? (
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md sm:justify-end">
                <input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Find a product"
                  aria-label="Find a product"
                  className="h-8 min-w-0 flex-1 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-transparent px-2.5 text-[13px] outline-none focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:ring-1 focus-visible:ring-[var(--pos-primary,#0f766e)]/30"
                />
                <div className="flex shrink-0" role="group" aria-label="Sort products">
                  {PRODUCT_SORTS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setProductSort(option.key)}
                      aria-pressed={productSort === option.key}
                      className={cn(
                        "h-8 border px-2 text-[11px] font-semibold",
                        option.key !== "quantitySold" && "-ml-px",
                        productSort === option.key
                          ? "z-[1] border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                {categoryRevenue.length.toLocaleString("en-KE")} categories
              </p>
            )}
          </div>

          {reportView === "products" ? (
            <>
              <p className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-2 text-[12px] text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">
                  {productRows.length.toLocaleString("en-KE")}
                </span>
                {" products sold"}
                {itemsByProfit.length >= 500 ? " · first 500 by profit" : ""}
                {". Qty is what left the shelf in this period."}
              </p>
              <div className="divide-y divide-border sm:hidden">
                {productRows.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    {productQuery.trim()
                      ? "No product matches that search."
                      : "No products sold in this period."}
                  </p>
                ) : (
                  productRows.map((row) => (
                    <div
                      key={row.itemId}
                      className="flex items-start justify-between gap-3 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium">
                          {row.itemName}
                        </p>
                        {row.sku ? (
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                            {row.sku}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                          {money(row.netRevenue)}
                          <span className="mx-1 opacity-40">·</span>
                          Profit {money(row.netProfit)}
                        </p>
                      </div>
                      <p className="shrink-0 text-right">
                        <span className="block text-[1.15rem] font-semibold tabular-nums leading-none">
                          {formatQty(row.quantitySold)}
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-muted-foreground">
                          qty
                        </span>
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[11px] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 text-right font-medium">Qty sold</th>
                      <th className="px-3 py-2 text-right font-medium">Net revenue</th>
                      <th className="px-3 py-2 text-right font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          {productQuery.trim()
                            ? "No product matches that search."
                            : "No products sold in this period."}
                        </td>
                      </tr>
                    ) : (
                      productRows.map((row) => (
                        <tr
                          key={row.itemId}
                          className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] last:border-0"
                        >
                          <td className="px-3 py-2">
                            <p className="font-medium">{row.itemName}</p>
                            {row.sku ? (
                              <p className="font-mono text-[10px] text-muted-foreground/70">
                                {row.sku}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right text-[15px] font-semibold tabular-nums">
                            {formatQty(row.quantitySold)}
                          </td>
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
            </>
          ) : (
            <>
              <div className="divide-y divide-border sm:hidden">
                {categoryRevenue.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No category rows for this window.
                  </p>
                ) : (
                  categoryRevenue.map((row) => (
                    <div
                      key={row.categoryId}
                      className="flex items-start justify-between gap-3 px-3 py-3"
                    >
                      <p className="min-w-0 text-[14px] font-medium">
                        {row.categoryName}
                      </p>
                      <div className="shrink-0 text-right">
                        <p className="text-[14px] font-semibold tabular-nums">
                          {money(row.netRevenue)}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          Profit {money(row.netProfit)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[11px] text-muted-foreground">
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
                        <tr
                          key={row.categoryId}
                          className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] last:border-0"
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
            </>
          )}
        </Panel>
      ) : null}
    </div>
  );
}

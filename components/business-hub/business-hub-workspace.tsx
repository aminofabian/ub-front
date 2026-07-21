"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Package,
  RefreshCw,
  ScanLine,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { ActionItemsStrip } from "@/components/business-hub/action-items-strip";
import { BusinessHubEmptyState } from "@/components/business-hub/business-hub-empty-state";
import { BusinessHubSkeleton } from "@/components/business-hub/business-hub-skeleton";
import { CommandGrid } from "@/components/business-hub/command-grid";
import { HubAllClear } from "@/components/business-hub/hub-all-clear";
import { PeriodToggle } from "@/components/business-hub/period-toggle";
import { PostSetupChecklist } from "@/components/business-hub/post-setup-checklist";
import { PulseHero } from "@/components/business-hub/pulse-hero";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { StockHealthPanel } from "@/components/business-hub/stock-health-panel";
import { TopMoversPanel } from "@/components/business-hub/top-movers-panel";
import { APP_ROUTES } from "@/lib/config";
import { isButcherPosEnabled } from "@/lib/butcher-feature";
import {
  buildActionItems,
  expiringBatchCount,
  isHubSalesEmpty,
  payablesTotalOpen,
} from "@/lib/business-hub/build-action-items";
import { HUB_MUTED } from "@/lib/business-hub/constants";
import {
  buildDailyRevenueSeries,
  type DailyRevenuePoint,
} from "@/lib/business-hub/build-daily-revenue-series";
import {
  fmtCount,
  fmtKes,
  fmtPct,
  fmtTrendPct,
  formatPeriodSubtitle,
  toNum,
} from "@/lib/business-hub/formatters";
import {
  averageTicket,
  buildChartCaption,
  buildPulseHeadline,
  marginPct,
} from "@/lib/business-hub/pulse-insights";
import type { Period } from "@/lib/business-hub/types";
import { cn } from "@/lib/utils";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  addDays,
  presetRange,
  previousPeriod,
  toISODate,
} from "@/lib/analytics-date-range";
import {
  fetchBatchDashboard,
  fetchDashboardOwnerSummary,
  fetchFinancePL,
  fetchFinancePulse,
  fetchInventoryExpiryPipeline,
  fetchInventoryValuation,
  fetchItemsPage,
  fetchSalesRegister,
  type BatchDashboardResponse,
  type FinancePulseResponse,
  type InventoryExpiryPipelineResponse,
  type InventoryValuationResponseRecord,
  type OwnerDashboardResponse,
  type ProfitAndLossResponse,
  type SalesRegisterResponse,
} from "@/lib/api";

export function BusinessHubWorkspace() {
  const {
    me,
    business,
    branchId,
    itemTypeId,
    canManageBusinessSettings,
    canListUsers,
    canQuickSale,
    canViewAnalytics,
    canViewInventoryValuation,
    canViewSupplyBatches,
    canViewShifts,
    canViewApAging,
    canViewCustomers,
  } = useDashboard();
  const featureFlags = useFeatureFlags();
  const showButcherCounter =
    isButcherPosEnabled(featureFlags) && canQuickSale;

  const roleKey = me?.role?.key?.trim().toLowerCase();
  const canApproveStockTake = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );
  const canViewOwnerSummary =
    roleKey !== "stock_manager" && roleKey !== "cashier";

  const [period, setPeriod] = useState<Period>("today");
  const [pulse, setPulse] = useState<FinancePulseResponse | null>(null);
  const [prevPulse, setPrevPulse] = useState<FinancePulseResponse | null>(null);
  const [weekPl, setWeekPl] = useState<ProfitAndLossResponse | null>(null);
  const [prevWeekPl, setPrevWeekPl] = useState<ProfitAndLossResponse | null>(
    null,
  );
  const [weekRegister, setWeekRegister] =
    useState<SalesRegisterResponse | null>(null);
  const [prevWeekRegister, setPrevWeekRegister] =
    useState<SalesRegisterResponse | null>(null);
  const [valuation, setValuation] =
    useState<InventoryValuationResponseRecord | null>(null);
  const [ownerSummary, setOwnerSummary] =
    useState<OwnerDashboardResponse | null>(null);
  const [batchDashboard, setBatchDashboard] =
    useState<BatchDashboardResponse | null>(null);
  const [expiryPipeline, setExpiryPipeline] =
    useState<InventoryExpiryPipelineResponse | null>(null);
  const [catalogueCount, setCatalogueCount] = useState<number | null>(null);
  const [chartPoints, setChartPoints] = useState<DailyRevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const todayRange = presetRange("today")!;
      const weekRange = presetRange("last7")!;
      const activeRange = period === "today" ? todayRange : weekRange;
      const prevRange = previousPeriod(activeRange.from, activeRange.to);
      const chartFrom =
        period === "today"
          ? toISODate(addDays(new Date(), -11))
          : weekRange.from;
      const chartTo = period === "today" ? toISODate(new Date()) : weekRange.to;
      const branch = branchId || undefined;
      const type = itemTypeId?.trim() || undefined;

      const [
        owner,
        v,
        itemsPage,
        chartReg,
        pulseRes,
        prevPulseRes,
        plRes,
        prevPlRes,
        weekReg,
        prevWeekReg,
        batchDash,
        expiryRes,
      ] = await Promise.all([
        canViewOwnerSummary
          ? fetchDashboardOwnerSummary(branch, type).catch(() => null)
          : Promise.resolve(null),
        canViewInventoryValuation
          ? fetchInventoryValuation(branch, type).catch(() => null)
          : Promise.resolve(null),
        fetchItemsPage(undefined, {
          page: 0,
          size: 1,
          branchId: branch,
          itemTypeId: type,
        }).catch(() => null),
        fetchSalesRegister(chartFrom, chartTo, branch, type).catch(() => null),
        fetchFinancePulse(activeRange.to, branch, type).catch(() => null),
        fetchFinancePulse(prevRange.to, branch, type).catch(() => null),
        period === "week"
          ? fetchFinancePL(
              activeRange.from,
              activeRange.to,
              branch,
              type,
            ).catch(() => null)
          : Promise.resolve(null),
        period === "week"
          ? fetchFinancePL(prevRange.from, prevRange.to, branch, type).catch(
              () => null,
            )
          : Promise.resolve(null),
        period === "week"
          ? fetchSalesRegister(
              activeRange.from,
              activeRange.to,
              branch,
              type,
            ).catch(() => null)
          : Promise.resolve(null),
        period === "week"
          ? fetchSalesRegister(
              prevRange.from,
              prevRange.to,
              branch,
              type,
            ).catch(() => null)
          : Promise.resolve(null),
        canViewSupplyBatches
          ? fetchBatchDashboard({ branchId: branch }).catch(() => null)
          : Promise.resolve(null),
        canViewSupplyBatches
          ? fetchInventoryExpiryPipeline(branch, undefined, type).catch(
              () => null,
            )
          : Promise.resolve(null),
      ]);

      setPulse(pulseRes ?? owner?.pulseToday ?? null);
      setPrevPulse(prevPulseRes);
      setWeekPl(plRes);
      setPrevWeekPl(prevPlRes);
      setWeekRegister(weekReg);
      setPrevWeekRegister(prevWeekReg);
      setValuation(v ?? null);
      setOwnerSummary(owner ?? null);
      setBatchDashboard(batchDash);
      setExpiryPipeline(expiryRes);
      setCatalogueCount(itemsPage?.totalElements ?? null);
      setChartPoints(
        buildDailyRevenueSeries(chartReg?.days ?? [], chartFrom, chartTo),
      );
    } catch {
      /* gracefully degrade */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    branchId,
    itemTypeId,
    canViewOwnerSummary,
    canViewInventoryValuation,
    canViewSupplyBatches,
    period,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRange = useMemo(
    () => (period === "today" ? presetRange("today")! : presetRange("last7")!),
    [period],
  );

  const periodSubtitle = useMemo(
    () => formatPeriodSubtitle(period, activeRange.from, activeRange.to),
    [period, activeRange],
  );

  const isToday = period === "today";

  const revenue = isToday ? toNum(pulse?.revenue) : toNum(weekPl?.revenue);
  const prevRevenue = isToday
    ? toNum(prevPulse?.revenue)
    : toNum(prevWeekPl?.revenue);
  const grossProfit = isToday
    ? toNum(pulse?.grossProfit)
    : toNum(weekPl?.grossProfit);
  const orders = isToday
    ? (pulse?.salesCount ?? null)
    : weekRegister
      ? toNum(weekRegister.totalQty)
      : null;
  const prevOrders = isToday
    ? (prevPulse?.salesCount ?? null)
    : prevWeekRegister
      ? toNum(prevWeekRegister.totalQty)
      : null;
  const salesCountForTicket = isToday ? (pulse?.salesCount ?? null) : null;
  const ticket = averageTicket(revenue, salesCountForTicket);
  const margin = canViewAnalytics
    ? marginPct(
        revenue,
        grossProfit,
        isToday ? pulse?.grossMarginPct : null,
      )
    : null;

  const revenueTrend = fmtTrendPct(revenue, prevRevenue);
  const ordersTrend = fmtTrendPct(orders ?? 0, prevOrders ?? 0);
  const revenueFooterTone = !revenueTrend
    ? "muted"
    : revenueTrend.startsWith("-") || revenueTrend.startsWith("<-")
      ? "muted"
      : "positive";
  const profitTone =
    grossProfit < 0 || (margin != null && margin < 0) ? "negative" : "positive";

  const openShifts = pulse?.openShifts ?? 0;
  const lowStockCount = batchDashboard?.lowStockProducts?.length ?? 0;
  const expiringCount = expiringBatchCount(batchDashboard, expiryPipeline);
  const payablesOpen = payablesTotalOpen(ownerSummary);

  const actionItems = useMemo(
    () =>
      buildActionItems({
        openShifts,
        lowStockCount,
        batchDashboard,
        expiryPipeline,
        storefrontEnabled: business?.storefront?.enabled,
        payablesOpen,
        canViewShifts,
        canViewSupplyBatches,
        canManageBusinessSettings,
        canViewApAging,
      }),
    [
      batchDashboard,
      business?.storefront?.enabled,
      canManageBusinessSettings,
      canViewApAging,
      canViewShifts,
      canViewSupplyBatches,
      expiryPipeline,
      lowStockCount,
      openShifts,
      payablesOpen,
    ],
  );

  const showAttentionSection =
    canViewShifts ||
    canViewSupplyBatches ||
    canManageBusinessSettings ||
    canViewApAging;

  const chartRevenue = chartPoints.map((p) => p.value);
  const salesEmpty = isHubSalesEmpty(revenue, orders, chartRevenue);

  const headline = buildPulseHeadline({
    period,
    revenue,
    prevRevenue,
    orders,
    chartPoints,
    salesEmpty,
  });
  const chartCaption = buildChartCaption({ period, points: chartPoints });
  const chartAriaLabel = isToday
    ? "Daily revenue over the last twelve days"
    : "Daily revenue over the last seven days";

  const pulseMetrics = useMemo(() => {
    const metrics = [
      {
        label: isToday ? "Orders" : "Units sold",
        value: fmtCount(orders),
        hint: ordersTrend ?? (isToday ? "Completed sales" : "Quantity moved"),
        tone: (!ordersTrend
          ? "muted"
          : ordersTrend.startsWith("-") || ordersTrend.startsWith("<-")
            ? "muted"
            : "positive") as "muted" | "positive",
        href: APP_ROUTES.salesTransactions,
      },
      {
        label: "Gross profit",
        value: canViewAnalytics ? fmtKes(grossProfit) : "—",
        hint: canViewAnalytics
          ? margin != null
            ? `${fmtPct(margin)} margin`
            : "After cost of goods"
          : "Analytics access required",
        tone: (canViewAnalytics ? profitTone : "muted") as
          | "muted"
          | "positive"
          | "negative",
        href: canViewAnalytics ? APP_ROUTES.analytics : APP_ROUTES.sales,
      },
      {
        label: isToday ? "Avg ticket" : "Avg / day",
        value: isToday
          ? ticket != null
            ? fmtKes(ticket)
            : "—"
          : chartPoints.length > 0
            ? fmtKes(revenue / chartPoints.length)
            : "—",
        hint: isToday
          ? ticket != null
            ? "Revenue ÷ sales"
            : "Needs at least one sale"
          : "Across this week's window",
        href: APP_ROUTES.sales,
      },
      {
        label: "Open shifts",
        value: fmtCount(openShifts),
        hint: openShifts > 0 ? "Needs review" : "All closed",
        tone: (openShifts > 0 ? "warning" : "muted") as "warning" | "muted",
        href: APP_ROUTES.shifts,
      },
    ];
    return metrics;
  }, [
    canViewAnalytics,
    chartPoints.length,
    grossProfit,
    isToday,
    margin,
    openShifts,
    orders,
    ordersTrend,
    profitTone,
    revenue,
    ticket,
  ]);

  const stockItems = useMemo(() => {
    const items = [];
    if (canViewInventoryValuation) {
      items.push({
        id: "catalogue",
        label: "Catalogue",
        value: fmtCount(catalogueCount),
        detail:
          catalogueCount && catalogueCount > 0
            ? "Sellable items in scope"
            : "Add products to start trading",
        href: APP_ROUTES.products,
        tone: (catalogueCount && catalogueCount > 0 ? "ok" : "watch") as
          | "ok"
          | "watch",
      });
      items.push({
        id: "stock-value",
        label: "Stock value",
        value: fmtKes(valuation?.totalExtensionValue),
        detail: "Inventory at cost on hand",
        href: APP_ROUTES.inventoryValuation,
        tone: "ok" as const,
      });
      items.push({
        id: "branches",
        label: "Branches with stock",
        value: fmtCount(valuation?.byBranch?.length ?? null),
        detail: "Locations holding inventory",
        href: APP_ROUTES.branches,
        tone: "ok" as const,
      });
    }
    if (canViewSupplyBatches && lowStockCount > 0) {
      items.push({
        id: "low-stock",
        label: "Low stock",
        value: fmtCount(lowStockCount),
        detail: "Products below reorder comfort",
        href: APP_ROUTES.inventoryRestock,
        tone: "alert" as const,
      });
    }
    if (canViewSupplyBatches && expiringCount > 0) {
      items.push({
        id: "expiring",
        label: "Expiring soon",
        value: fmtCount(expiringCount),
        detail: "Batches to clear or discount",
        href: APP_ROUTES.inventorySupplyBatches,
        tone: "alert" as const,
      });
    }
    if (canViewApAging && payablesOpen > 0) {
      items.push({
        id: "payables",
        label: "Open payables",
        value: fmtKes(payablesOpen),
        detail: "Supplier bills still outstanding",
        href: APP_ROUTES.purchasingApAging,
        tone: "watch" as const,
      });
    }
    return items;
  }, [
    canViewApAging,
    canViewInventoryValuation,
    canViewSupplyBatches,
    catalogueCount,
    expiringCount,
    lowStockCount,
    payablesOpen,
    valuation?.byBranch?.length,
    valuation?.totalExtensionValue,
  ]);

  const commandLinks = useMemo(() => {
    const links = [
      {
        href: APP_ROUTES.sales,
        label: "Sales",
        hint: "Till, receipts, and today's floor",
        icon: ShoppingCart,
      },
      {
        href: APP_ROUTES.products,
        label: "Catalogue",
        hint: "Prices, barcodes, and product truth",
        icon: Package,
      },
      {
        href: APP_ROUTES.inventoryStock,
        label: "Inventory",
        hint: "Stock levels and movement",
        icon: Boxes,
      },
      {
        href: APP_ROUTES.analytics,
        label: "Analytics",
        hint: "Deeper trends and margins",
        icon: BarChart3,
      },
      {
        href: "/storefront",
        label: "Storefront",
        hint: "Your public shop window",
        icon: Store,
      },
    ];
    if (canApproveStockTake) {
      links.splice(3, 0, {
        href: APP_ROUTES.inventoryStockTakeDailyAuditReview,
        label: "Audit review",
        hint: "Approve stock-take findings",
        icon: ClipboardCheck,
      });
    }
    if (canViewCustomers) {
      links.push({
        href: APP_ROUTES.customers,
        label: "Credit customers",
        hint: "Balances and reminders",
        icon: Users,
      });
    }
    if (canListUsers) {
      links.push({
        href: APP_ROUTES.users,
        label: "Team",
        hint: "Roles, access, and staff",
        icon: Users,
      });
    }
    if (showButcherCounter) {
      links.push({
        href: APP_ROUTES.butcher,
        label: "Butcher counter",
        hint: "Weigh, cut, and sell",
        icon: ScanLine,
      });
    }
    if (canManageBusinessSettings) {
      links.push({
        href: APP_ROUTES.businessConfiguration,
        label: "Configuration",
        hint: "Inventory and till policies",
        icon: Settings,
      });
    }
    return links;
  }, [
    canApproveStockTake,
    canListUsers,
    canManageBusinessSettings,
    canViewCustomers,
    showButcherCounter,
  ]);

  if (loading) return <BusinessHubSkeleton />;

  const title = business?.name ?? me?.name ?? "Business";
  const tier = business?.subscriptionTier ?? "starter";
  const isActive = business?.active !== false;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-5 2xl:pb-16">
      <header className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="hidden flex-wrap items-center gap-2 2xl:flex">
            <p className={cn("text-sm font-medium", HUB_MUTED)}>Morning board</p>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isActive
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isActive ? "Live" : "Paused"}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-[#AAAAAA] capitalize">
              {tier}
            </span>
          </div>
          <h1
            className="hidden text-2xl font-medium tracking-tight text-black 2xl:mt-0.5 2xl:block"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            {title}
          </h1>
          <ActiveScopeSubtitle className={cn("mt-0 2xl:mt-0.5", HUB_MUTED)} />
          <p className={cn("mt-0.5 text-sm", HUB_MUTED)}>{periodSubtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg border border-[#EEEEEE] bg-white text-[#666666] shadow-sm",
              "transition-colors hover:bg-[#F9F6F0] hover:text-[#B08D48]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/30",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            aria-label="Refresh business hub"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
          </button>
          <PeriodToggle value={period} onChange={setPeriod} />
          {canManageBusinessSettings ? (
            <Link
              href={APP_ROUTES.businessSettings}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg border border-[#EEEEEE] bg-white text-[#666666] shadow-sm",
                "transition-colors hover:bg-[#F9F6F0] hover:text-[#B08D48]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/30",
              )}
              aria-label="Business settings"
            >
              <Settings className="size-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </header>

      {salesEmpty ? (
        <BusinessHubEmptyState
          period={period}
          showStorefrontLink={canManageBusinessSettings}
        />
      ) : null}

      <PulseHero
        eyebrow={isToday ? "Today's pulse" : "This week's pulse"}
        revenueLabel={isToday ? "Revenue today" : "Revenue this week"}
        revenue={fmtKes(revenue)}
        headline={headline}
        trend={revenueTrend}
        trendTone={revenueFooterTone}
        metrics={pulseMetrics}
      />

      <RevenueBarChart
        points={chartPoints}
        ariaLabel={chartAriaLabel}
        caption={chartCaption}
        title={isToday ? "Twelve-day runway" : "Seven-day runway"}
      />

      {showAttentionSection ? (
        actionItems.length > 0 ? (
          <ActionItemsStrip items={actionItems} />
        ) : (
          <HubAllClear />
        )
      ) : null}

      <StockHealthPanel items={stockItems} />

      {canViewOwnerSummary ? (
        <TopMoversPanel movers={ownerSummary?.topSkusLast30Days ?? []} />
      ) : null}

      <CommandGrid links={commandLinks} />

      <PostSetupChecklist />
    </div>
  );
}

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
import { HubAllClear } from "@/components/business-hub/hub-all-clear";
import { PeriodToggle } from "@/components/business-hub/period-toggle";
import { PostSetupChecklist } from "@/components/business-hub/post-setup-checklist";
import { QuickChip } from "@/components/business-hub/quick-chip";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { StatCard } from "@/components/business-hub/stat-card";
import { APP_ROUTES } from "@/lib/config";
import { isButcherPosEnabled } from "@/lib/butcher-feature";
import {
  buildActionItems,
  isHubSalesEmpty,
  payablesTotalOpen,
} from "@/lib/business-hub/build-action-items";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import {
  fmtCount,
  fmtKes,
  fmtPct,
  fmtTrendPct,
  formatPeriodSubtitle,
  toNum,
} from "@/lib/business-hub/formatters";
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
  const [chartRevenue, setChartRevenue] = useState<number[]>([]);
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
          ? fetchDashboardOwnerSummary().catch(() => null)
          : Promise.resolve(null),
        canViewInventoryValuation
          ? fetchInventoryValuation(branch).catch(() => null)
          : Promise.resolve(null),
        fetchItemsPage(undefined, {
          page: 0,
          size: 1,
          branchId: branch,
          itemTypeId: type,
        }).catch(() => null),
        fetchSalesRegister(chartFrom, chartTo, branch).catch(() => null),
        fetchFinancePulse(activeRange.to, branch).catch(() => null),
        fetchFinancePulse(prevRange.to, branch).catch(() => null),
        period === "week"
          ? fetchFinancePL(activeRange.from, activeRange.to, branch).catch(
              () => null,
            )
          : Promise.resolve(null),
        period === "week"
          ? fetchFinancePL(prevRange.from, prevRange.to, branch).catch(
              () => null,
            )
          : Promise.resolve(null),
        period === "week"
          ? fetchSalesRegister(activeRange.from, activeRange.to, branch).catch(
              () => null,
            )
          : Promise.resolve(null),
        period === "week"
          ? fetchSalesRegister(prevRange.from, prevRange.to, branch).catch(
              () => null,
            )
          : Promise.resolve(null),
        canViewSupplyBatches
          ? fetchBatchDashboard({ branchId: branch }).catch(() => null)
          : Promise.resolve(null),
        canViewSupplyBatches
          ? fetchInventoryExpiryPipeline(branch).catch(() => null)
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
      setChartRevenue((chartReg?.days ?? []).map((d) => toNum(d.revenue)));
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

  const marginFooter = useMemo(() => {
    if (!canViewAnalytics) return undefined;
    if (isToday && pulse && pulse.grossMarginPct != null) {
      return `${fmtPct(pulse.grossMarginPct)} margin`;
    }
    if (!isToday && weekPl && revenue > 0) {
      return `${fmtPct((grossProfit / revenue) * 100)} margin`;
    }
    return undefined;
  }, [canViewAnalytics, isToday, pulse, weekPl, revenue, grossProfit]);

  const revenueTrend = fmtTrendPct(revenue, prevRevenue);
  const ordersTrend = fmtTrendPct(orders ?? 0, prevOrders ?? 0);
  const revenueFooter = revenueTrend ?? marginFooter;
  const revenueFooterTone = revenueTrend?.startsWith("-")
    ? "muted"
    : "positive";

  const openShifts = pulse?.openShifts ?? 0;
  const lowStockCount = batchDashboard?.lowStockProducts?.length ?? 0;
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

  const salesEmpty = isHubSalesEmpty(revenue, orders, chartRevenue);

  const pulseSectionTitle = isToday ? "Today's pulse" : "This week's pulse";
  const revenueLabel = isToday ? "Revenue today" : "Revenue this week";
  const ordersLabel = isToday ? "Orders" : "Units sold";
  const chartBarCount = isToday ? 12 : 7;
  const chartAriaLabel = isToday
    ? "Revenue over the last twelve days"
    : "Revenue over the last seven days";

  if (loading) return <BusinessHubSkeleton />;

  const title = business?.name ?? me?.name ?? "Business";
  const tier = business?.subscriptionTier ?? "starter";
  const isActive = business?.active !== false;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-8 2xl:space-y-8 2xl:pb-20">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="hidden flex-wrap items-center gap-2 2xl:flex">
            <p className={cn("text-sm font-medium", HUB_MUTED)}>Business</p>
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
          <h1 className="hidden text-2xl font-bold tracking-tight text-black 2xl:mt-1 2xl:block">
            {title}
          </h1>
          <ActiveScopeSubtitle className={cn("mt-0 2xl:mt-1", HUB_MUTED)} />
          <p className={cn("mt-1 text-sm", HUB_MUTED)}>{periodSubtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-lg border border-[#EEEEEE] bg-white text-[#666666] shadow-sm",
              "transition-colors hover:bg-[#F9F6F0] hover:text-[#B08D48]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/30",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            aria-label="Refresh business hub"
          >
            <RefreshCw
              className={cn("size-4", refreshing && "animate-spin")}
              aria-hidden
            />
          </button>
          <PeriodToggle value={period} onChange={setPeriod} />
          {canManageBusinessSettings ? (
            <Link
              href={APP_ROUTES.businessSettings}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-lg border border-[#EEEEEE] bg-white text-[#666666] shadow-sm",
                "transition-colors hover:bg-[#F9F6F0] hover:text-[#B08D48]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/30",
              )}
              aria-label="Business settings"
            >
              <Settings className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </header>

      {salesEmpty ? <BusinessHubEmptyState period={period} showStorefrontLink={canManageBusinessSettings} /> : null}

      <section className="space-y-4">
        <h2 className={cn("text-sm font-medium", HUB_MUTED)}>
          {pulseSectionTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label={revenueLabel}
            value={fmtKes(revenue)}
            footer={revenueFooter}
            footerTone={revenueFooterTone}
            href={APP_ROUTES.sales}
          />
          <StatCard
            label={ordersLabel}
            value={fmtCount(orders)}
            footer={ordersTrend ?? undefined}
            footerTone={
              ordersTrend?.startsWith("-")
                ? "muted"
                : ordersTrend
                  ? "positive"
                  : "muted"
            }
            href={APP_ROUTES.salesTransactions}
          />
          {canViewAnalytics ? (
            <StatCard
              label="Gross profit"
              value={fmtKes(grossProfit)}
              footer={marginFooter}
              footerTone="positive"
              href={APP_ROUTES.analytics}
            />
          ) : (
            <StatCard
              label="Gross profit"
              value="—"
              footer="Analytics access required"
              href={APP_ROUTES.sales}
            />
          )}
          <StatCard
            label="Open shifts"
            value={fmtCount(openShifts)}
            footer={openShifts > 0 ? "Needs review" : undefined}
            footerTone={openShifts > 0 ? "warning" : "muted"}
            href={APP_ROUTES.shifts}
          />
        </div>
      </section>

      <div className="space-y-2">
        <RevenueBarChart
          values={chartRevenue}
          barCount={chartBarCount}
          ariaLabel={chartAriaLabel}
        />
        {salesEmpty ? (
          <p className={cn("text-center text-xs", HUB_MUTED)}>
            Revenue trend will appear after your first sale.
          </p>
        ) : null}
      </div>

      {showAttentionSection ? (
        actionItems.length > 0 ? (
          <ActionItemsStrip items={actionItems} />
        ) : (
          <HubAllClear />
        )
      ) : null}

      {canViewInventoryValuation ? (
        <section className="space-y-4">
          <h2 className={cn("text-sm font-medium", HUB_MUTED)}>Inventory</h2>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            <StatCard
              label="Catalogue items"
              value={fmtCount(catalogueCount)}
              href={APP_ROUTES.products}
            />
            <StatCard
              label="Stock value"
              value={fmtKes(valuation?.totalExtensionValue)}
              href={APP_ROUTES.inventoryValuation}
            />
            <StatCard
              label="Branches"
              value={fmtCount(valuation?.byBranch?.length ?? null)}
              href={APP_ROUTES.branches}
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className={cn("text-sm font-medium", HUB_MUTED)}>Quick access</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <QuickChip
            href={APP_ROUTES.sales}
            label="Sales"
            icon={ShoppingCart}
          />
          <QuickChip href={APP_ROUTES.products} label="Catalogue" icon={Package} />
          <QuickChip href={APP_ROUTES.inventoryStock} label="Inventory" icon={Boxes} />
          {canApproveStockTake ? (
            <QuickChip
              href={APP_ROUTES.inventoryStockTakeDailyAuditReview}
              label="Audit review"
              icon={ClipboardCheck}
            />
          ) : null}
          <QuickChip href={APP_ROUTES.analytics} label="Analytics" icon={BarChart3} />
          <QuickChip href="/storefront" label="Storefront" icon={Store} />
          {canViewCustomers ? (
            <QuickChip
              href={APP_ROUTES.customers}
              label="Credit customers"
              icon={Users}
            />
          ) : null}
          {canListUsers ? (
            <QuickChip href={APP_ROUTES.users} label="Team" icon={Users} />
          ) : null}
          {showButcherCounter ? (
            <QuickChip
              href={APP_ROUTES.butcher}
              label="Butcher counter"
              icon={ScanLine}
            />
          ) : null}
          {canManageBusinessSettings ? (
            <QuickChip
              href={APP_ROUTES.businessSettings}
              label="Settings"
              icon={Settings}
            />
          ) : null}
        </div>
      </section>

      <PostSetupChecklist />

      {ownerSummary?.topSkusLast30Days &&
      ownerSummary.topSkusLast30Days.length > 0 ? (
        <section className="space-y-4">
          <h2 className={cn("text-sm font-medium", HUB_MUTED)}>
            Top products — last 30 days
          </h2>
          <div className={cn(HUB_SURFACE, "overflow-hidden")}>
            <div className="divide-y divide-[#EEEEEE]">
              {ownerSummary.topSkusLast30Days.slice(0, 5).map((sku, i) => (
                <Link
                  key={sku.itemId}
                  href={`/products?search=${encodeURIComponent(sku.itemName)}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#F9F6F0]/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#EEEEEE] bg-[#F9F6F0] text-[11px] font-semibold text-[#666666]">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-black">
                      {sku.itemName}
                    </span>
                  </div>
                  <span className="ml-4 shrink-0 text-sm font-semibold tabular-nums text-black">
                    {fmtKes(sku.revenueLast30Days)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Package,
  RefreshCw,
  ScanLine,
  Settings,
  ShoppingCart,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { ActionItemsStrip } from "@/components/business-hub/action-items-strip";
import { BusinessHubEmptyState } from "@/components/business-hub/business-hub-empty-state";
import { BusinessHubSkeleton } from "@/components/business-hub/business-hub-skeleton";
import { CashierStageTabs } from "@/components/business-hub/cashier-stage-tabs";
import { CashierTillDrawer } from "@/components/business-hub/cashier-till-drawer";
import { CommandGrid, type CommandLink } from "@/components/business-hub/command-grid";
import { PeriodToggle } from "@/components/business-hub/period-toggle";
import { PostSetupChecklist } from "@/components/business-hub/post-setup-checklist";
import { StockShelvesBanner } from "@/components/business-hub/stock-shelves-banner";
import { PulseHero } from "@/components/business-hub/pulse-hero";
import { RecentTicksRail } from "@/components/business-hub/recent-ticks-rail";
import { CreditTabsRail } from "@/components/business-hub/credit-tabs-rail";
import { SupplyBillsRail } from "@/components/business-hub/supply-bills-rail";
import { WebOrdersRail } from "@/components/business-hub/web-orders-rail";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { StockHealthPanel } from "@/components/business-hub/stock-health-panel";
import { TopMoversPanel } from "@/components/business-hub/top-movers-panel";
import { MarkPaidDialog } from "@/components/credits/mark-paid-dialog";
import { useBusinessHubRealtime } from "@/hooks/use-business-hub-realtime";
import { useOptionalRealtime } from "@/components/realtime-provider";
import { playCashierChime } from "@/lib/cashier-chime";
import { hubAlertsFromBusiness } from "@/lib/hub-alert-settings";
import { APP_ROUTES } from "@/lib/config";
import {
  buildActionItems,
  expiringBatchCount,
  isHubSalesEmpty,
  payablesTotalOpen,
} from "@/lib/business-hub/build-action-items";
import {
  buildDailyRevenueSeries,
  type DailyRevenuePoint,
} from "@/lib/business-hub/build-daily-revenue-series";
import {
  fmtCount,
  fmtMoney,
  fmtPct,
  fmtTrendPct,
  toNum,
} from "@/lib/business-hub/formatters";
import {
  averageTicket,
  buildChartCaption,
  buildPulseHeadline,
  marginPct,
  paymentTenderTotals,
} from "@/lib/business-hub/pulse-insights";
import type { Period } from "@/lib/business-hub/types";
import { cn } from "@/lib/utils";
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
  fetchCreditsActivitySummary,
  fetchOutstandingTabs,
  fetchPaymentsByMethod,
  fetchRecentSales,
  fetchPathBSupplies,
  fetchSalesRegister,
  fetchShiftDrawouts,
  fetchShifts,
  fetchWebOrders,
  type BatchDashboardResponse,
  type CreditsActivitySummaryRecord,
  type DrawoutRecord,
  type FinancePulseResponse,
  type InventoryExpiryPipelineResponse,
  type InventoryValuationResponseRecord,
  type OutstandingTabRowRecord,
  type OwnerDashboardResponse,
  type PathBSupplyListRowRecord,
  type PaymentMethodBreakdownRow,
  type ProfitAndLossResponse,
  type RecentSaleRow,
  type SalesRegisterResponse,
  type WebOrderSummary,
} from "@/lib/api";
import { filterAndSortSupplyRows } from "@/app/(dashboard)/supplies/_components/supplies-bill-filters";
import { PaySupplyDrawer } from "@/app/(dashboard)/supplies/_components/pay-supply-drawer";
import { groupLinesIntoTransactions } from "@/lib/sale-transactions";
import {
  cashiersFromDrawouts,
  filterDrawoutsByCashiers,
  hubDrawoutsFromRecords,
  type HubDrawout,
} from "@/lib/business-hub/drawouts-for-hub";
import {
  cashiersFromTicks,
  filterTicksByCashiers,
  ticksFromTransactions,
  TICK_POOL_LIMIT,
  type RecentTick,
} from "@/lib/business-hub/ticks-from-transactions";

const SUPPLY_DISPLAY_LIMIT = 24;
const CREDIT_TABS_DISPLAY_LIMIT = 24;
const WEB_ORDERS_DISPLAY_LIMIT = 12;

function sortOutstandingTabs(
  rows: OutstandingTabRowRecord[],
): OutstandingTabRowRecord[] {
  return [...rows].sort((a, b) => toNum(b.balanceOwed) - toNum(a.balanceOwed));
}

function isOpenWebOrder(order: WebOrderSummary): boolean {
  const fulfillment = (order.fulfillmentStatus ?? "awaiting_confirmation")
    .trim()
    .toLowerCase();
  if (fulfillment === "completed") return false;
  const status = (order.status ?? "").trim().toLowerCase();
  if (status === "cancelled" || status === "failed") return false;
  return true;
}

export function BusinessHubWorkspace() {
  const {
    me,
    business,
    branchId,
    itemTypeId,
    headerScopeReady,
    canManageBusinessSettings,
    canQuickSale,
    canViewAnalytics,
    canViewInventoryValuation,
    canViewSupplyBatches,
    canViewShifts,
    canViewApAging,
    canViewCustomers,
    canViewSalesIntelligence,
    canViewStorefrontOrders,
    canPathBRead,
    canRecordSupplierPayment,
    canReviewPaymentClaims,
  } = useDashboard();
  const featureFlags = useFeatureFlags();
  const hubAlerts = useMemo(
    () =>
      hubAlertsFromBusiness({
        flags: featureFlags,
        volume: business?.hubAlerts?.volume,
      }),
    [featureFlags, business?.hubAlerts?.volume],
  );
  const shopEnabled = featureFlags?.shop !== false;

  const roleKey = me?.role?.key?.trim().toLowerCase();
  const canViewOwnerSummary =
    roleKey !== "stock_manager" && roleKey !== "cashier";
  const canViewSupplyBills = canPathBRead || canViewApAging;
  const canOpenSupplyPay =
    canViewSupplyBills &&
    (canRecordSupplierPayment || canViewApAging);
  const canViewCreditTabs = canViewCustomers;
  const canOpenCreditPay = canViewCreditTabs && canReviewPaymentClaims;
  const canShowWebOrders =
    canViewStorefrontOrders && shopEnabled;

  const [period, setPeriod] = useState<Period>("today");
  const [pulse, setPulse] = useState<FinancePulseResponse | null>(null);
  const [prevPulse, setPrevPulse] = useState<FinancePulseResponse | null>(null);
  const [weekPl, setWeekPl] = useState<ProfitAndLossResponse | null>(null);
  const [prevWeekPl, setPrevWeekPl] = useState<ProfitAndLossResponse | null>(
    null,
  );
  const [weekRegister, setWeekRegister] =
    useState<SalesRegisterResponse | null>(null);
  const currency = business?.currency;
  const money = useCallback(
    (n: number | string | null | undefined) => fmtMoney(n, currency),
    [currency],
  );
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
  const [paymentBreakdown, setPaymentBreakdown] = useState<
    PaymentMethodBreakdownRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [supplyJustUpdated, setSupplyJustUpdated] = useState(false);
  const [creditJustUpdated, setCreditJustUpdated] = useState(false);
  const [recentTicks, setRecentTicks] = useState<RecentTick[]>([]);
  const [todaySupplies, setTodaySupplies] = useState<PathBSupplyListRowRecord[]>(
    [],
  );
  const [openCreditTabs, setOpenCreditTabs] = useState<
    OutstandingTabRowRecord[]
  >([]);
  const [creditActivity, setCreditActivity] =
    useState<CreditsActivitySummaryRecord | null>(null);
  const [payBillRow, setPayBillRow] =
    useState<PathBSupplyListRowRecord | null>(null);
  const [payBillOpen, setPayBillOpen] = useState(false);
  const [payCreditTab, setPayCreditTab] =
    useState<OutstandingTabRowRecord | null>(null);
  const [payCreditOpen, setPayCreditOpen] = useState(false);
  const [openWebOrders, setOpenWebOrders] = useState<WebOrderSummary[]>([]);
  const [recentDrawouts, setRecentDrawouts] = useState<HubDrawout[]>([]);
  const [selectedCashiers, setSelectedCashiers] = useState<string[]>([]);
  const loadGen = useRef(0);
  const justUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supplyJustUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const creditJustUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const webOrdersJustUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [webOrdersJustUpdated, setWebOrdersJustUpdated] = useState(false);

  const load = useCallback(async () => {
    // Wait until header branch/department seed finishes. An early fetch with
    // empty scope is treated as "all" and raced with the scoped fetch — which
    // made Stock value flip between totals like ~2.6m and ~4.6m.
    if (!headerScopeReady) return;

    const gen = ++loadGen.current;
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

      const ticksFrom = toISODate(addDays(new Date(), -7));
      const ticksTo = toISODate(new Date());

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
        openShiftsRes,
        recentSalesRes,
        suppliesRes,
        creditTabsRes,
        creditSummaryRes,
        webOrdersRes,
        paymentBreakdownRes,
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
        canViewShifts
          ? fetchShifts({
              branchId: branch,
              status: "OPEN",
              size: 30,
            }).catch(() => null)
          : Promise.resolve(null),
        canViewSalesIntelligence
          ? fetchRecentSales(ticksFrom, ticksTo, branch, type).catch(
              () => [] as RecentSaleRow[],
            )
          : Promise.resolve([] as RecentSaleRow[]),
        canViewSupplyBills
          ? fetchPathBSupplies({ branchId: branch }).catch(
              () => [] as PathBSupplyListRowRecord[],
            )
          : Promise.resolve([] as PathBSupplyListRowRecord[]),
        canViewCreditTabs
          ? fetchOutstandingTabs().catch(() => [] as OutstandingTabRowRecord[])
          : Promise.resolve([] as OutstandingTabRowRecord[]),
        canViewCreditTabs
          ? fetchCreditsActivitySummary(
              activeRange.from,
              activeRange.to,
            ).catch(() => null)
          : Promise.resolve(null),
        canShowWebOrders
          ? fetchWebOrders(0, 50).catch(() => [] as WebOrderSummary[])
          : Promise.resolve([] as WebOrderSummary[]),
        canViewSalesIntelligence
          ? fetchPaymentsByMethod(
              activeRange.from,
              activeRange.to,
              branch,
              type,
            ).catch(() => [] as PaymentMethodBreakdownRow[])
          : Promise.resolve([] as PaymentMethodBreakdownRow[]),
      ]);

      if (gen !== loadGen.current) return;

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
      setPaymentBreakdown(
        Array.isArray(paymentBreakdownRes) ? paymentBreakdownRes : [],
      );
      setRecentTicks(
        ticksFromTransactions(
          groupLinesIntoTransactions(
            Array.isArray(recentSalesRes) ? recentSalesRes : [],
          ),
          TICK_POOL_LIMIT,
        ),
      );
      setTodaySupplies(
        filterAndSortSupplyRows(
          Array.isArray(suppliesRes) ? suppliesRes : [],
          "today",
        ).slice(0, SUPPLY_DISPLAY_LIMIT),
      );
      setOpenCreditTabs(
        sortOutstandingTabs(
          Array.isArray(creditTabsRes) ? creditTabsRes : [],
        ).slice(0, CREDIT_TABS_DISPLAY_LIMIT),
      );
      setCreditActivity(creditSummaryRes);
      const branchScope = branch?.trim();
      const webRows = (Array.isArray(webOrdersRes) ? webOrdersRes : [])
        .filter((order) =>
          branchScope ? order.catalogBranchId === branchScope : true,
        )
        .filter(isOpenWebOrder)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, WEB_ORDERS_DISPLAY_LIMIT);
      setOpenWebOrders(webRows);

      const openShiftRows = openShiftsRes?.shifts ?? [];
      if (openShiftRows.length > 0) {
        const drawoutLists = await Promise.all(
          openShiftRows.map(async (shift) => {
            const list = await fetchShiftDrawouts(shift.id).catch(
              () => [] as DrawoutRecord[],
            );
            return list.map((row) => ({
              ...row,
              shiftCashierName: shift.cashierName,
            }));
          }),
        );
        if (gen !== loadGen.current) return;
        setRecentDrawouts(hubDrawoutsFromRecords(drawoutLists.flat()));
      } else {
        setRecentDrawouts([]);
      }
    } catch {
      /* gracefully degrade */
    } finally {
      if (gen === loadGen.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    headerScopeReady,
    branchId,
    itemTypeId,
    canViewOwnerSummary,
    canViewInventoryValuation,
    canViewSupplyBatches,
    period,
    canViewSalesIntelligence,
    canViewSupplyBills,
    canViewCreditTabs,
    canViewShifts,
    canShowWebOrders,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current);
      if (supplyJustUpdatedTimer.current) {
        clearTimeout(supplyJustUpdatedTimer.current);
      }
      if (creditJustUpdatedTimer.current) {
        clearTimeout(creditJustUpdatedTimer.current);
      }
      if (webOrdersJustUpdatedTimer.current) {
        clearTimeout(webOrdersJustUpdatedTimer.current);
      }
    };
  }, []);

  const markLiveEvent = useCallback(() => {
    setJustUpdated(true);
    if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current);
    justUpdatedTimer.current = setTimeout(() => {
      setJustUpdated(false);
      justUpdatedTimer.current = null;
    }, 2400);
  }, []);

  const markSupplyLiveEvent = useCallback(() => {
    setSupplyJustUpdated(true);
    if (supplyJustUpdatedTimer.current) {
      clearTimeout(supplyJustUpdatedTimer.current);
    }
    supplyJustUpdatedTimer.current = setTimeout(() => {
      setSupplyJustUpdated(false);
      supplyJustUpdatedTimer.current = null;
    }, 2400);
  }, []);

  const markCreditLiveEvent = useCallback(() => {
    setCreditJustUpdated(true);
    if (creditJustUpdatedTimer.current) {
      clearTimeout(creditJustUpdatedTimer.current);
    }
    creditJustUpdatedTimer.current = setTimeout(() => {
      setCreditJustUpdated(false);
      creditJustUpdatedTimer.current = null;
    }, 2400);
  }, []);

  const markWebOrdersLiveEvent = useCallback(() => {
    setWebOrdersJustUpdated(true);
    if (webOrdersJustUpdatedTimer.current) {
      clearTimeout(webOrdersJustUpdatedTimer.current);
    }
    webOrdersJustUpdatedTimer.current = setTimeout(() => {
      setWebOrdersJustUpdated(false);
      webOrdersJustUpdatedTimer.current = null;
    }, 2400);
  }, []);

  const openSupplyPay = useCallback((bill: PathBSupplyListRowRecord) => {
    setPayBillRow(bill);
    setPayBillOpen(true);
  }, []);

  const openCreditPay = useCallback((tab: OutstandingTabRowRecord) => {
    setPayCreditTab(tab);
    setPayCreditOpen(true);
  }, []);

  useBusinessHubRealtime({
    branchId,
    enabled: headerScopeReady,
    onInvalidate: () => {
      void load();
    },
    onLiveEvent: markLiveEvent,
    onSaleCompleted: () => {
      if (hubAlerts.beepOnSale) {
        playCashierChime("order", { volume: hubAlerts.volume });
      }
      markCreditLiveEvent();
    },
    onSupplyPosted: () => {
      if (hubAlerts.beepOnSupply) {
        playCashierChime("supply", { volume: hubAlerts.volume });
      }
      markSupplyLiveEvent();
    },
    onWebOrderEvent: () => {
      if (hubAlerts.beepOnSale) {
        playCashierChime("order", { volume: hubAlerts.volume });
      }
      markWebOrdersLiveEvent();
    },
  });

  const realtime = useOptionalRealtime();
  const pulseLive =
    business?.active !== false && realtime?.connectionState === "connected";

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
  const revenueBreakdown = useMemo(() => {
    if (!canViewSalesIntelligence) return null;
    const { cash, mpesa, credit } = paymentTenderTotals(paymentBreakdown);
    return { cash: money(cash), mpesa: money(mpesa), credit: money(credit) };
  }, [canViewSalesIntelligence, money, paymentBreakdown]);
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
        openWebOrders: openWebOrders.length,
        payablesOpen,
        canViewShifts,
        canViewSupplyBatches,
        canManageBusinessSettings,
        canViewApAging,
        canViewStorefrontOrders: canShowWebOrders,
      }),
    [
      batchDashboard,
      business?.storefront?.enabled,
      canManageBusinessSettings,
      canShowWebOrders,
      canViewApAging,
      canViewShifts,
      canViewSupplyBatches,
      expiryPipeline,
      lowStockCount,
      openShifts,
      openWebOrders.length,
      payablesOpen,
    ],
  );

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
        label: isToday ? "Sales" : "Items sold",
        value: fmtCount(orders),
        hint: ordersTrend ?? (isToday ? "Completed today" : "How many went out"),
        tone: (!ordersTrend
          ? "muted"
          : ordersTrend.startsWith("-") || ordersTrend.startsWith("<-")
            ? "muted"
            : "positive") as "muted" | "positive",
        href: APP_ROUTES.salesTransactions,
      },
      {
        label: "Profit",
        value: canViewAnalytics ? money(grossProfit) : "—",
        hint: canViewAnalytics
          ? margin != null
            ? `${fmtPct(margin)} after cost`
            : "After what you paid for stock"
          : "Need permission to see this",
        tone: (canViewAnalytics ? profitTone : "muted") as
          | "muted"
          | "positive"
          | "negative",
        href: canViewAnalytics ? APP_ROUTES.analytics : APP_ROUTES.sales,
      },
      {
        label: isToday ? "Average sale" : "Average day",
        value: isToday
          ? ticket != null
            ? money(ticket)
            : "—"
          : chartPoints.length > 0
            ? money(revenue / chartPoints.length)
            : "—",
        hint: isToday
          ? ticket != null
            ? "Money in ÷ number of sales"
            : "Needs at least one sale"
          : "This week's typical day",
        href: APP_ROUTES.sales,
      },
      {
        label: "Open tills",
        value: fmtCount(openShifts),
        hint: openShifts > 0 ? "Still need closing" : "All closed",
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
        label: "Products",
        value: fmtCount(catalogueCount),
        detail:
          catalogueCount && catalogueCount > 0
            ? "Items you can sell"
            : "Add products to start selling",
        href: APP_ROUTES.products,
        tone: (catalogueCount && catalogueCount > 0 ? "ok" : "watch") as
          | "ok"
          | "watch",
      });
      items.push({
        id: "stock-value",
        label: "Stock value",
        value: money(valuation?.totalExtensionValue),
        detail: "What you paid for goods on the shelf",
        href: APP_ROUTES.inventoryValuation,
        tone: "ok" as const,
      });
      items.push({
        id: "branches",
        label: "Shops with stock",
        value: fmtCount(valuation?.byBranch?.length ?? null),
        detail: "Locations holding goods",
        href: APP_ROUTES.branches,
        tone: "ok" as const,
      });
    }
    if (canViewSupplyBatches && lowStockCount > 0) {
      items.push({
        id: "low-stock",
        label: "Low stock",
        value: fmtCount(lowStockCount),
        detail: "Need restocking",
        href: APP_ROUTES.inventoryRestock,
        tone: "alert" as const,
      });
    }
    if (canViewSupplyBatches && expiringCount > 0) {
      items.push({
        id: "expiring",
        label: "Expiring soon",
        value: fmtCount(expiringCount),
        detail: "Use or sell soon",
        href: APP_ROUTES.inventorySupplyBatches,
        tone: "alert" as const,
      });
    }
    if (canViewApAging && payablesOpen > 0) {
      items.push({
        id: "payables",
        label: "Unpaid bills",
        value: money(payablesOpen),
        detail: "Still owing suppliers",
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
    const links: CommandLink[] = [
      {
        href: APP_ROUTES.sales,
        label: "Sales",
        hint: "Receipts and today's till",
        icon: ShoppingCart,
      },
      {
        href: APP_ROUTES.products,
        label: "Products",
        hint: "Add items, prices, and barcodes",
        icon: Package,
      },
      {
        href: APP_ROUTES.inventoryStock,
        label: "Stock",
        hint: "What's in the shop",
        icon: Boxes,
      },
    ];
    if (canQuickSale) {
      links.unshift({
        href: APP_ROUTES.salesQuick,
        label: "Open till",
        hint: "Sell now",
        icon: ScanLine,
      });
    }
    if (canManageBusinessSettings) {
      links.push({
        href: APP_ROUTES.businessSettings,
        label: "Shop settings",
        hint: "Name, hours, and how the shop looks",
        icon: Settings,
      });
    }
    return links;
  }, [canManageBusinessSettings, canQuickSale]);

  const cashierNames = useMemo(() => {
    const fromSales = cashiersFromTicks(recentTicks);
    const fromDrawouts = cashiersFromDrawouts(recentDrawouts);
    const seen = new Set(fromSales.map((name) => name.toLowerCase()));
    const names = [...fromSales];
    for (const name of fromDrawouts) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
    return names;
  }, [recentTicks, recentDrawouts]);
  const tickLanes = useMemo(() => {
    if (selectedCashiers.length >= 3) {
      return [];
    }
    if (selectedCashiers.length === 0) {
      const drawouts = filterDrawoutsByCashiers(recentDrawouts, []);
      return [
        {
          key: "floor",
          title: "Recent sales",
          subtitle:
            drawouts.length > 0
              ? "Sales and cash taken out"
              : "Last few sales · every cashier",
          ticks: filterTicksByCashiers(recentTicks, []),
          drawouts,
          showCashier: true,
          accent: "brass" as const,
        },
      ];
    }
    return selectedCashiers.map((name, index) => {
      const drawouts = filterDrawoutsByCashiers(recentDrawouts, [name]);
      const short = name.split(/\s+/)[0] ?? name;
      return {
        key: name,
        title: name,
        subtitle:
          drawouts.length > 0
            ? `Open shift · ${short}`
            : `Last 3 · ${short}`,
        ticks: filterTicksByCashiers(recentTicks, [name]),
        drawouts,
        showCashier: false,
        accent: (index === 0 ? "brass" : "ink") as "brass" | "ink",
      };
    });
  }, [recentTicks, recentDrawouts, selectedCashiers]);
  const dualLanes = tickLanes.length === 2;
  const galleryOpen = selectedCashiers.length >= 3;
  const showTillStage = canViewSalesIntelligence;

  useEffect(() => {
    setSelectedCashiers((prev) => {
      const next = prev
        .map((name) => {
          const match = cashierNames.find(
            (candidate) => candidate.toLowerCase() === name.toLowerCase(),
          );
          return match ?? null;
        })
        .filter((name): name is string => Boolean(name));
      const unique: string[] = [];
      const seen = new Set<string>();
      for (const name of next) {
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(name);
      }
      if (
        unique.length === prev.length &&
        unique.every((name, i) => name === prev[i])
      ) {
        return prev;
      }
      return unique;
    });
  }, [cashierNames]);

  if (loading) return <BusinessHubSkeleton />;

  const topMovers = ownerSummary?.topSkusLast30Days ?? [];
  const showMovers = canViewOwnerSummary && topMovers.length > 0;

  return (
    <div className="hub-paper -mx-3 min-h-full px-3 py-4 sm:-mx-4 sm:px-4 sm:py-5 lg:mx-0 lg:px-0 lg:py-4">
      <div
        className={cn(
          "mx-auto w-full max-w-5xl border border-[#E6E1D8] bg-white/70 p-3 shadow-[0_1px_0_rgba(20,20,20,0.03)] sm:p-4",
          "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-4",
          showTillStage && "max-w-6xl xl:max-w-7xl",
          dualLanes && "max-w-7xl",
        )}
      >
        <div className="flex flex-col gap-3">
          {showTillStage ? (
            <CashierStageTabs
              cashiers={cashierNames}
              selected={selectedCashiers}
              onChange={setSelectedCashiers}
              live={pulseLive}
            />
          ) : null}

          <div
            className={cn(
              "xl:grid xl:items-start xl:gap-0",
              showTillStage &&
                !dualLanes &&
                !galleryOpen &&
                "xl:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]",
              showTillStage &&
                dualLanes &&
                "xl:grid-cols-[minmax(0,1fr)_minmax(200px,240px)_minmax(200px,240px)]",
              showTillStage && galleryOpen && "xl:grid-cols-1",
            )}
          >
            <div
              className={cn(
                "flex flex-col gap-3",
                showTillStage &&
                  !galleryOpen &&
                  "xl:border-r xl:border-[#E6E1D8] xl:pr-4",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-[15px] font-semibold tracking-tight text-[#141414]">
                    {business?.branding?.displayName?.trim() ||
                      business?.name?.trim() ||
                      "Your shop"}
                  </h1>
                  <p className="text-[12px] text-[#666666]">
                    {isToday ? "How today is going" : "How this week is going"}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={refreshing}
                  className={cn(
                    "inline-flex size-8 items-center justify-center border border-[#E6E1D8] bg-white text-[#666666]",
                    "transition-colors hover:border-[#B08D48] hover:text-[#8A6B2E]",
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
                      "inline-flex size-8 items-center justify-center border border-[#E6E1D8] bg-white text-[#666666]",
                      "transition-colors hover:border-[#B08D48] hover:text-[#8A6B2E]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/30",
                    )}
                    aria-label="Business settings"
                  >
                    <Settings className="size-3.5" aria-hidden />
                  </Link>
                ) : null}
                </div>
              </div>

              {salesEmpty ? (
                <BusinessHubEmptyState
                  period={period}
                  showStorefrontLink={canManageBusinessSettings}
                />
              ) : null}

              {showTillStage && !galleryOpen ? (
                <div
                  className={cn(
                    "grid gap-3 xl:hidden",
                    dualLanes && "sm:grid-cols-2",
                  )}
                >
                  {tickLanes.map((lane, index) => (
                    <RecentTicksRail
                      key={lane.key}
                      ticks={lane.ticks}
                      drawouts={lane.drawouts}
                      currency={currency}
                      live={pulseLive}
                      justUpdated={justUpdated && index === 0}
                      title={lane.title}
                      subtitle={lane.subtitle}
                      showCashier={lane.showCashier}
                      accent={lane.accent}
                      laneIndex={dualLanes ? index : undefined}
                      fillViewport={false}
                      className="max-h-[22rem]"
                    />
                  ))}
                </div>
              ) : null}

              <PulseHero
                eyebrow={isToday ? "Today" : "This week"}
                revenueLabel={isToday ? "Money taken" : "Money taken this week"}
                revenue={money(revenue)}
                revenueBreakdown={revenueBreakdown}
                headline={headline}
                trend={revenueTrend}
                trendTone={revenueFooterTone}
                metrics={pulseMetrics}
                live={pulseLive}
                justUpdated={justUpdated}
              />

              {actionItems.length > 0 ? (
                <ActionItemsStrip items={actionItems} />
              ) : null}

              {canViewSupplyBills ? (
                <SupplyBillsRail
                  bills={todaySupplies}
                  currency={currency}
                  live={pulseLive}
                  justUpdated={supplyJustUpdated}
                  onPayBill={canOpenSupplyPay ? openSupplyPay : undefined}
                />
              ) : null}

              {canViewCreditTabs ? (
                <CreditTabsRail
                  tabs={openCreditTabs}
                  currency={currency}
                  live={pulseLive}
                  justUpdated={creditJustUpdated}
                  onPayTab={canOpenCreditPay ? openCreditPay : undefined}
                  paidTotal={creditActivity?.totalPaid ?? null}
                  paidCount={creditActivity?.paymentCount ?? null}
                  paidPeriodLabel={isToday ? "today" : "this week"}
                />
              ) : null}

              {canShowWebOrders ? (
                <WebOrdersRail
                  orders={openWebOrders}
                  currency={currency}
                  live={pulseLive}
                  justUpdated={webOrdersJustUpdated}
                />
              ) : null}

              <RevenueBarChart
                points={chartPoints}
                ariaLabel={chartAriaLabel}
                caption={chartCaption}
                title={isToday ? "Last 12 days" : "This week"}
              />

              {(stockItems.length > 0 || showMovers) ? (
                <div
                  className={cn(
                    "grid gap-3 lg:items-start",
                    stockItems.length > 0 &&
                      showMovers &&
                      "lg:grid-cols-[1.15fr_0.85fr]",
                  )}
                >
                  <StockHealthPanel items={stockItems} />
                  {showMovers ? <TopMoversPanel movers={topMovers} /> : null}
                </div>
              ) : null}

              <CommandGrid links={commandLinks} />

              <div className="space-y-3 xl:hidden">
                <StockShelvesBanner catalogueCount={catalogueCount} />
                <PostSetupChecklist catalogueCount={catalogueCount} />
              </div>
            </div>

            {showTillStage && !galleryOpen
              ? tickLanes.map((lane, index) => (
                  <div
                    key={lane.key}
                    className={cn(
                      "hidden xl:block xl:self-stretch",
                      dualLanes &&
                        index === 0 &&
                        "xl:border-r xl:border-[#E6E1D8]",
                    )}
                  >
                    <RecentTicksRail
                      ticks={lane.ticks}
                      drawouts={lane.drawouts}
                      currency={currency}
                      live={pulseLive}
                      justUpdated={justUpdated && index === 0}
                      title={lane.title}
                      subtitle={lane.subtitle}
                      showCashier={lane.showCashier}
                      accent={lane.accent}
                      laneIndex={dualLanes ? index : undefined}
                      fillViewport={false}
                      className="h-full max-h-[min(40rem,72dvh)] border-0 border-l border-[#E6E1D8]"
                    />
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>

      {showTillStage ? (
        <CashierTillDrawer
          open={galleryOpen}
          cashiers={selectedCashiers}
          ticks={recentTicks}
          drawouts={recentDrawouts}
          currency={currency}
          live={pulseLive}
          justUpdated={justUpdated}
          onClose={() => setSelectedCashiers((prev) => prev.slice(0, 2))}
          onRemoveCashier={(name) =>
            setSelectedCashiers((prev) => prev.filter((n) => n !== name))
          }
        />
      ) : null}

      {canOpenSupplyPay ? (
        <PaySupplyDrawer
          open={payBillOpen}
          onOpenChange={(open) => {
            setPayBillOpen(open);
            if (!open) setPayBillRow(null);
          }}
          row={payBillRow}
          onPaid={() => {
            void load();
          }}
        />
      ) : null}

      {canOpenCreditPay ? (
        <MarkPaidDialog
          open={payCreditOpen}
          onOpenChange={(open) => {
            setPayCreditOpen(open);
            if (!open) setPayCreditTab(null);
          }}
          customer={payCreditTab}
          onPaid={() => {
            markCreditLiveEvent();
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

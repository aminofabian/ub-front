"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  CreditCard,
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
import { ActionItemsStrip } from "@/components/business-hub/action-items-strip";
import { BusinessHubEmptyState } from "@/components/business-hub/business-hub-empty-state";
import { BusinessHubSkeleton } from "@/components/business-hub/business-hub-skeleton";
import { CashierStageTabs } from "@/components/business-hub/cashier-stage-tabs";
import { CashierTillDrawer } from "@/components/business-hub/cashier-till-drawer";
import { CommandGrid } from "@/components/business-hub/command-grid";
import { HubAllClear } from "@/components/business-hub/hub-all-clear";
import { PeriodToggle } from "@/components/business-hub/period-toggle";
import { PostSetupChecklist } from "@/components/business-hub/post-setup-checklist";
import { StockShelvesBanner } from "@/components/business-hub/stock-shelves-banner";
import { PulseHero } from "@/components/business-hub/pulse-hero";
import { RecentTicksRail } from "@/components/business-hub/recent-ticks-rail";
import { SupplyBillsRail } from "@/components/business-hub/supply-bills-rail";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { StockHealthPanel } from "@/components/business-hub/stock-health-panel";
import { TopMoversPanel } from "@/components/business-hub/top-movers-panel";
import { useBusinessHubRealtime } from "@/hooks/use-business-hub-realtime";
import { useOptionalRealtime } from "@/components/realtime-provider";
import { playCashierChime } from "@/lib/cashier-chime";
import { hubAlertsFromFlags } from "@/lib/hub-alert-settings";
import { APP_ROUTES } from "@/lib/config";
import { isButcherPosEnabled } from "@/lib/butcher-feature";
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
  fetchRecentSales,
  fetchPathBSupplies,
  fetchSalesRegister,
  fetchShiftDrawouts,
  fetchShifts,
  type BatchDashboardResponse,
  type DrawoutRecord,
  type FinancePulseResponse,
  type InventoryExpiryPipelineResponse,
  type InventoryValuationResponseRecord,
  type OwnerDashboardResponse,
  type PathBSupplyListRowRecord,
  type ProfitAndLossResponse,
  type RecentSaleRow,
  type SalesRegisterResponse,
} from "@/lib/api";
import { filterAndSortSupplyRows } from "@/app/(dashboard)/supplies/_components/supplies-bill-filters";
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

export function BusinessHubWorkspace() {
  const {
    me,
    business,
    branchId,
    itemTypeId,
    headerScopeReady,
    canManageBusinessSettings,
    canListUsers,
    canQuickSale,
    canViewAnalytics,
    canViewInventoryValuation,
    canViewSupplyBatches,
    canViewShifts,
    canViewApAging,
    canViewCustomers,
    canViewSalesIntelligence,
    canPathBRead,
  } = useDashboard();
  const featureFlags = useFeatureFlags();
  const hubAlerts = useMemo(
    () => hubAlertsFromFlags(featureFlags),
    [featureFlags],
  );
  const showButcherCounter =
    isButcherPosEnabled(featureFlags) && canQuickSale;

  const roleKey = me?.role?.key?.trim().toLowerCase();
  const canApproveStockTake = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );
  const canViewOwnerSummary =
    roleKey !== "stock_manager" && roleKey !== "cashier";
  const canViewSupplyBills = canPathBRead || canViewApAging;

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [supplyJustUpdated, setSupplyJustUpdated] = useState(false);
  const [recentTicks, setRecentTicks] = useState<RecentTick[]>([]);
  const [todaySupplies, setTodaySupplies] = useState<PathBSupplyListRowRecord[]>(
    [],
  );
  const [recentDrawouts, setRecentDrawouts] = useState<HubDrawout[]>([]);
  const [selectedCashiers, setSelectedCashiers] = useState<string[]>([]);
  const loadGen = useRef(0);
  const justUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supplyJustUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
    canViewShifts,
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

  useBusinessHubRealtime({
    branchId,
    enabled: headerScopeReady,
    onInvalidate: () => {
      void load();
    },
    onLiveEvent: markLiveEvent,
    onSaleCompleted: () => {
      if (hubAlerts.beepOnSale) playCashierChime("order");
    },
    onSupplyPosted: () => {
      if (hubAlerts.beepOnSupply) playCashierChime("supply");
      markSupplyLiveEvent();
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
        value: canViewAnalytics ? money(grossProfit) : "—",
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
            ? money(ticket)
            : "—"
          : chartPoints.length > 0
            ? money(revenue / chartPoints.length)
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
        value: money(valuation?.totalExtensionValue),
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
        value: money(payablesOpen),
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
    if (canViewSalesIntelligence) {
      links.push({
        href: APP_ROUTES.creditsOnTab,
        label: "On tab",
        hint: "Credit sales today",
        icon: CreditCard,
      });
    } else if (canViewCustomers) {
      links.push({
        href: APP_ROUTES.customers,
        label: "Credit customers",
        hint: "Balances and reminders",
        icon: Users,
      });
    }
    if (canViewCustomers && canViewSalesIntelligence) {
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
    canViewSalesIntelligence,
    showButcherCounter,
  ]);

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
          title: "Floor tape",
          subtitle:
            drawouts.length > 0
              ? "Open-shift sales & drawouts"
              : "Last 3 · every cashier",
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
                eyebrow={isToday ? "01 · Today's pulse" : "01 · This week's pulse"}
                revenueLabel={isToday ? "Revenue today" : "Revenue this week"}
                revenue={money(revenue)}
                headline={headline}
                trend={revenueTrend}
                trendTone={revenueFooterTone}
                metrics={pulseMetrics}
                live={pulseLive}
                justUpdated={justUpdated}
              />

              {canViewSupplyBills ? (
                <SupplyBillsRail
                  bills={todaySupplies}
                  currency={currency}
                  live={pulseLive}
                  justUpdated={supplyJustUpdated}
                />
              ) : null}

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
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Globe,
  MessageCircle,
  MonitorSmartphone,
  Package,
  RefreshCw,
  ScanLine,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { ActionItemsStrip } from "@/components/business-hub/action-items-strip";
import { BusinessHubEmptyState } from "@/components/business-hub/business-hub-empty-state";
import { BusinessHubSkeleton } from "@/components/business-hub/business-hub-skeleton";
import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { ShopOpenBoard } from "@/components/business-hub/shop-open-board";
import { CashierStageTabs } from "@/components/business-hub/cashier-stage-tabs";
import { CashierTillDrawer } from "@/components/business-hub/cashier-till-drawer";
import { type JumpInLink } from "@/components/business-hub/jump-in-grid";
import { BusinessHubMenuButton } from "@/components/business-hub/hub-menu";
import { FloorTapeDrawer } from "@/components/business-hub/floor-tape-drawer";
import { HubAllClear } from "@/components/business-hub/hub-all-clear";
import { HubGreeting } from "@/components/business-hub/hub-greeting";
import { HubKpiRow, type HubKpi } from "@/components/business-hub/hub-kpi-row";
import { HubLiveStatus } from "@/components/business-hub/hub-live-status";
import { HubPaymentSplit } from "@/components/business-hub/hub-payment-split";
import { HubQuickActions } from "@/components/business-hub/hub-quick-actions";
import { HubTipCard } from "@/components/business-hub/hub-tip-card";
import { HubWorkSummary } from "@/components/business-hub/hub-work-summary";
import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { OpenWorkBoard } from "@/components/business-hub/open-work-board";
import { PeriodToggle } from "@/components/business-hub/period-toggle";
import { MarginLeaksDrawer } from "@/components/business-hub/margin-leaks-drawer";
import { ProfitPocketDrawer } from "@/components/business-hub/profit-pocket-drawer";
import { ReceiveMpesaSetupCard } from "@/components/business-hub/receive-mpesa-setup-card";
import { ManageTillsHubCard } from "@/components/business-hub/manage-tills-hub-card";
import { SetupProgressBanner } from "@/components/setup-progress/setup-progress-banner";
import { QuestionnaireResumeBanner } from "@/components/business-hub/questionnaire-resume-banner";
import { RecentTicksRail } from "@/components/business-hub/recent-ticks-rail";
import { CreditTabsRail } from "@/components/business-hub/credit-tabs-rail";
import { SupplyBillsRail } from "@/components/business-hub/supply-bills-rail";
import { WebOrdersRail } from "@/components/business-hub/web-orders-rail";
import {
  HubHistoryDrawer,
  type HubHistoryTarget,
} from "@/components/business-hub/hub-history-drawer";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { StockHealthPanel } from "@/components/business-hub/stock-health-panel";
import { TopMoversPanel } from "@/components/business-hub/top-movers-panel";
import { MarkPaidDialog } from "@/components/credits/mark-paid-dialog";
import { useBusinessHubRealtime } from "@/hooks/use-business-hub-realtime";
import { playCashierChime } from "@/lib/cashier-chime";
import { hubAlertsFromBusiness } from "@/lib/hub-alert-settings";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
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
  paymentTenderTotals,
} from "@/lib/business-hub/pulse-insights";
import type { Period } from "@/lib/business-hub/types";
import { monthlyCommitmentForSchedule } from "@/lib/fixed-costs-utils";
import { cn } from "@/lib/utils";
import { HUB_ICON_BTN } from "@/lib/business-hub/constants";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  completeOnboardingQuestionnaire,
  getOnboardingQuestionnaireState,
  QUESTIONNAIRE_STOCK_STEP,
} from "@/lib/onboarding-questionnaire";
import {
  addDays,
  presetRange,
  previousPeriod,
  toISODate,
} from "@/lib/analytics-date-range";
import {
  fetchBatchDashboard,
  fetchExpenseSchedules,
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
  withSuppressedHttpErrorToasts,
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
import { filterAndSortSupplyRows, summarizeSupplyRows } from "@/app/(dashboard)/supplies/_components/supplies-bill-filters";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageTillsInitiallyOpen =
    searchParams.get("manageTills") === "1" ||
    searchParams.get("manageTills") === "true";
  const openPocketFromQuery =
    searchParams.get("pocket") === "1" ||
    searchParams.get("pocket") === "true";
  const {
    me,
    business,
    branches,
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
    canViewStorefrontOrders,
    canPathBRead,
    canRecordSupplierPayment,
    canReviewPaymentClaims,
    canReadFinanceExpenses,
    canWriteFinanceExpenses,
    canReadFinanceReports,
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
  const showButcherCounter = isButcherPosEnabled(featureFlags) && canQuickSale;
  const shopEnabled = featureFlags?.shop !== false;

  const roleKey = me?.role?.key?.trim().toLowerCase();
  const canApproveStockTake = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );
  const canViewOwnerSummary =
    roleKey !== "stock_manager" && roleKey !== "cashier";
  const canViewSupplyBills = canPathBRead || canViewApAging;
  const canOpenSupplyPay =
    canViewSupplyBills && (canRecordSupplierPayment || canViewApAging);
  const canViewCreditTabs = canViewCustomers;
  const canOpenCreditPay = canViewCreditTabs && canReviewPaymentClaims;
  const canShowWebOrders = canViewStorefrontOrders && shopEnabled;

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
  const [todaySupplies, setTodaySupplies] = useState<
    PathBSupplyListRowRecord[]
  >([]);
  const [openCreditTabs, setOpenCreditTabs] = useState<
    OutstandingTabRowRecord[]
  >([]);
  const [creditActivity, setCreditActivity] =
    useState<CreditsActivitySummaryRecord | null>(null);
  const [fixedCostCommitment, setFixedCostCommitment] = useState<number | null>(
    null,
  );
  const [payBillRow, setPayBillRow] = useState<PathBSupplyListRowRecord | null>(
    null,
  );
  const [payBillOpen, setPayBillOpen] = useState(false);
  const [payCreditTab, setPayCreditTab] =
    useState<OutstandingTabRowRecord | null>(null);
  const [payCreditOpen, setPayCreditOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<HubHistoryTarget | null>(
    null,
  );
  const [marginLeaksOpen, setMarginLeaksOpen] = useState(false);
  const [profitPocketOpen, setProfitPocketOpen] = useState(false);

  useEffect(() => {
    if (!openPocketFromQuery) return;
    if (!(canReadFinanceReports || canWriteFinanceExpenses)) return;
    setProfitPocketOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("pocket");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "/business", { scroll: false });
  }, [
    openPocketFromQuery,
    canReadFinanceReports,
    canWriteFinanceExpenses,
    router,
    searchParams,
  ]);
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
  const webOrdersJustUpdatedTimer = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [webOrdersJustUpdated, setWebOrdersJustUpdated] = useState(false);
  const [lastLiveUpdateAt, setLastLiveUpdateAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    // Wait until header branch/department seed finishes. An early fetch with
    // empty scope is treated as "all" and raced with the scoped fetch — which
    // made Stock value flip between totals like ~2.6m and ~4.6m.
    if (!headerScopeReady) return;

    const gen = ++loadGen.current;
    setRefreshing(true);
    try {
      await withSuppressedHttpErrorToasts(async () => {
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
        expenseSchedulesRes,
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
          ? fetchCreditsActivitySummary(activeRange.from, activeRange.to).catch(
              () => null,
            )
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
        canReadFinanceExpenses
          ? fetchExpenseSchedules().catch(() => [])
          : Promise.resolve([]),
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
      if (canReadFinanceExpenses && Array.isArray(expenseSchedulesRes)) {
        const hubNow = new Date();
        const hubYear = hubNow.getFullYear();
        const hubMonth = hubNow.getMonth() + 1;
        const branchScope = branch?.trim();
        const filteredSchedules = branchScope
          ? expenseSchedulesRes.filter(
              (s) => !s.branchId || s.branchId === branchScope,
            )
          : expenseSchedulesRes;
        setFixedCostCommitment(
          filteredSchedules.reduce(
            (sum, s) =>
              sum +
              monthlyCommitmentForSchedule({
                amount: Number(s.amount),
                frequency: s.frequency,
                startDate: s.startDate,
                endDate: s.endDate,
                active: s.active,
                year: hubYear,
                month: hubMonth,
              }),
            0,
          ),
        );
      } else {
        setFixedCostCommitment(null);
      }
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
      });
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
    setLastLiveUpdateAt(Date.now());
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

  const openSupplyHistory = useCallback((bill: PathBSupplyListRowRecord) => {
    setHistoryTarget({
      kind: "supplier",
      supplierId: bill.supplierId,
      name: bill.supplierName?.trim() || "Supplier",
    });
  }, []);

  const openCreditHistory = useCallback((tab: OutstandingTabRowRecord) => {
    setHistoryTarget({
      kind: "credit",
      customerId: tab.customerId,
      name: tab.name?.trim() || "Customer",
      phone: tab.primaryPhone,
      balanceOwed: tab.balanceOwed,
    });
  }, []);

  const openShopperHistory = useCallback((order: WebOrderSummary) => {
    setHistoryTarget({
      kind: "shopper",
      name: order.customerName?.trim() || "Customer",
      phone: order.customerPhone,
      seed: order,
    });
  }, []);

  useBusinessHubRealtime({
    branchId,
    enabled: headerScopeReady,
    onInvalidate: () => {
      setLastLiveUpdateAt(Date.now());
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

  const isToday = period === "today";
  const hubPeriodRange = useMemo(() => {
    const todayRange = presetRange("today")!;
    const weekRange = presetRange("last7")!;
    return period === "today" ? todayRange : weekRange;
  }, [period]);
  const hubPeriodLabel = isToday ? "Today" : "This week";

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
    ? marginPct(revenue, grossProfit, isToday ? pulse?.grossMarginPct : null)
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

  const showAttentionSection =
    canViewShifts ||
    canViewSupplyBatches ||
    canManageBusinessSettings ||
    canViewApAging ||
    canShowWebOrders;

  const chartRevenue = chartPoints.map((p) => p.value);
  const salesEmpty = isHubSalesEmpty(revenue, orders, chartRevenue);
  const shopNotReady = catalogueCount === 0;

  // Configure-shop can finish with an empty shelf. When sellable items appear
  // (import, manual create, etc.), mark onboarding completed so setup progress
  // and first-sale CTAs take over.
  useEffect(() => {
    if (!canManageBusinessSettings) {
      return;
    }
    if (catalogueCount == null || catalogueCount <= 0) {
      return;
    }
    const local = getOnboardingQuestionnaireState();
    const server = business?.onboarding?.status?.trim().toLowerCase() ?? "";
    const status = server || local.status;
    if (status === "completed" || status === "idle") {
      return;
    }
    if (local.step < QUESTIONNAIRE_STOCK_STEP && status !== "dismissed") {
      return;
    }
    completeOnboardingQuestionnaire(local.answers);
  }, [
    canManageBusinessSettings,
    catalogueCount,
    business?.onboarding?.status,
  ]);

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
        href:
          canViewAnalytics && !canViewSalesIntelligence && !canReadFinanceReports
            ? APP_ROUTES.analytics
            : undefined,
        actions:
          canViewAnalytics &&
          (canViewSalesIntelligence ||
            canReadFinanceReports ||
            canWriteFinanceExpenses)
            ? [
                ...(canViewSalesIntelligence &&
                (grossProfit < 0 || (margin != null && margin < 0))
                  ? [
                      {
                        label: "Why negative?",
                        onClick: () => setMarginLeaksOpen(true),
                        emphasize: true,
                      },
                    ]
                  : canViewSalesIntelligence && Math.abs(grossProfit) > 0.009
                    ? [
                        {
                          label: "See items",
                          onClick: () => setMarginLeaksOpen(true),
                        },
                      ]
                    : []),
                ...(canReadFinanceReports || canWriteFinanceExpenses
                  ? [
                      {
                        label: "Pocket cash…",
                        onClick: () => setProfitPocketOpen(true),
                      },
                      {
                        label: "Calendar",
                        onClick: () => router.push(APP_ROUTES.profitPocketing),
                      },
                    ]
                  : []),
              ]
            : undefined,
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
      ...(canReadFinanceExpenses &&
      fixedCostCommitment != null &&
      fixedCostCommitment > 0
        ? [
            {
              label: "Fixed costs",
              value: money(fixedCostCommitment),
              hint: "Committed this month",
              tone: "muted" as const,
              href: APP_ROUTES.fixedCosts,
            },
          ]
        : []),
    ];
    return metrics;
  }, [
    canViewAnalytics,
    canViewSalesIntelligence,
    canReadFinanceReports,
    canWriteFinanceExpenses,
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
    canReadFinanceExpenses,
    fixedCostCommitment,
    money,
    router,
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

  const jumpInLinks = useMemo(() => {
    // Board order = how often a busy shop reaches for it. The sheet regroups the
    // same links by the job they do, so order here never costs discoverability.
    const links: JumpInLink[] = [
      {
        href: APP_ROUTES.sales,
        label: "Sales",
        hint: "Till, receipts, refunds",
        icon: ShoppingCart,
        group: "Sell",
      },
      {
        href: APP_ROUTES.products,
        label: "Products",
        hint: "Items, prices, barcodes",
        icon: Package,
        group: "Stock",
      },
      {
        href: APP_ROUTES.inventoryStock,
        label: "Stock",
        hint: "On hand and to restock",
        icon: Boxes,
        group: "Stock",
      },
      {
        href: canShowWebOrders
          ? APP_ROUTES.storefrontWebOrders
          : APP_ROUTES.businessSettings,
        label: canShowWebOrders ? "Web orders" : "Storefront",
        hint: canShowWebOrders
          ? "Online pickup orders"
          : "Set up your shop",
        icon: Store,
        group: "Sell",
      },
      {
        href: APP_ROUTES.analytics,
        label: "Analytics",
        hint: "Trends and margins",
        icon: BarChart3,
        group: "Insight",
      },
    ];
    if (canViewSalesIntelligence) {
      links.push({
        href: APP_ROUTES.creditsOnTab,
        label: "On tab",
        hint: "Who owes you money",
        icon: CreditCard,
        group: "Customers",
      });
    } else if (canViewCustomers) {
      links.push({
        href: APP_ROUTES.customers,
        label: "Customers",
        hint: "Directory and history",
        icon: Users,
        group: "Customers",
      });
    }
    if (canViewAnalytics) {
      links.push({
        href: APP_ROUTES.customerSegments,
        label: "Segments",
        hint: "Shoppers who bought",
        icon: Users,
        group: "Customers",
      });
    }
    if (canApproveStockTake) {
      links.push({
        href: APP_ROUTES.inventoryStockTakeDailyAuditReview,
        label: "Audit review",
        hint: "Approve stock-take",
        icon: ClipboardCheck,
        group: "Stock",
      });
    }
    if (canListUsers) {
      links.push({
        href: APP_ROUTES.users,
        label: "Team",
        hint: "Roles, access, staff",
        icon: Users,
        group: "Shop setup",
      });
    }
    if (showButcherCounter) {
      links.push({
        href: APP_ROUTES.butcher,
        label: "Butcher",
        hint: "Weigh, cut, and sell",
        icon: ScanLine,
        group: "Sell",
      });
    }
    if (canManageBusinessSettings) {
      links.push({
        href: `${APP_ROUTES.business}?manageTills=1`,
        label: "Tills",
        hint: "Register, activate, deactivate",
        icon: MonitorSmartphone,
        group: "Shop setup",
      });
      links.push({
        href: APP_ROUTES.businessConfiguration,
        label: "Configuration",
        hint: "How the shop runs",
        icon: Settings,
        group: "Shop setup",
      });
      links.push({
        href: `${APP_ROUTES.businessConfiguration}#settings-whatsapp-alerts`,
        label: "Alerts",
        hint: "WhatsApp order notices",
        icon: MessageCircle,
        group: "Shop setup",
      });
    }
    if (canViewCustomers && canViewSalesIntelligence) {
      links.push({
        href: APP_ROUTES.analyticsCustomers,
        label: "Shoppers",
        hint: "Spend and visits",
        icon: Users,
        group: "Customers",
      });
    }
    return links;
  }, [
    canApproveStockTake,
    canListUsers,
    canManageBusinessSettings,
    canShowWebOrders,
    canViewAnalytics,
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
          accent: "teal" as const,
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
          drawouts.length > 0 ? `Open shift · ${short}` : `Last 3 · ${short}`,
        ticks: filterTicksByCashiers(recentTicks, [name]),
        drawouts,
        showCashier: false,
        accent: (index === 0 ? "teal" : "ink") as "teal" | "ink",
      };
    });
  }, [recentTicks, recentDrawouts, selectedCashiers]);
  const dualLanes = tickLanes.length === 2;
  const galleryOpen = selectedCashiers.length >= 3;
  const showTillStage =
    canViewSalesIntelligence && !shopNotReady && !salesEmpty;
  /** Clean right rail: live activity, shortcuts, payment, tills. */
  const showCleanRail = !shopNotReady && !galleryOpen;

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
  const shopName =
    business?.branding?.displayName?.trim() ||
    business?.name?.trim() ||
    "Your shop";
  const shopHost =
    business?.primaryDomain?.trim() ||
    (business?.slug?.trim() ? `${business.slug.trim()}.${PLATFORM_DOMAIN}` : "");
  const shopMeta = [shopHost, business?.currency?.trim().toUpperCase()]
    .filter(Boolean)
    .join(" · ");
  const identity = {
    name: shopName,
    meta: shopMeta,
    logoUrl: business?.branding?.logoUrl,
    faviconUrl: business?.branding?.faviconUrl,
  };

  const canShowPaymentMethod =
    hasPermission(me?.permissions, Permission.PaymentsGatewaysRead) ||
    hasPermission(me?.permissions, Permission.PaymentsGatewaysWrite);

  const tenderTotals = useMemo(() => {
    if (!canViewSalesIntelligence) return null;
    return paymentTenderTotals(paymentBreakdown);
  }, [canViewSalesIntelligence, paymentBreakdown]);

  const hubKpis = useMemo((): HubKpi[] => {
    const profitActions =
      canViewAnalytics &&
      (canViewSalesIntelligence ||
        canReadFinanceReports ||
        canWriteFinanceExpenses)
        ? [
            ...(canViewSalesIntelligence &&
            (grossProfit < 0 || (margin != null && margin < 0))
              ? [
                  {
                    label: "Why negative?",
                    onClick: () => setMarginLeaksOpen(true),
                    emphasize: true,
                  },
                ]
              : canViewSalesIntelligence && Math.abs(grossProfit) > 0.009
                ? [
                    {
                      label: "See items",
                      onClick: () => setMarginLeaksOpen(true),
                    },
                  ]
                : []),
            ...(canReadFinanceReports || canWriteFinanceExpenses
              ? [
                  {
                    label: "Pocket cash…",
                    onClick: () => setProfitPocketOpen(true),
                  },
                ]
              : []),
          ]
        : undefined;

    return [
      {
        id: "revenue",
        label: "Revenue",
        value: money(revenue),
        trend: revenueTrend,
        hint: isToday ? "vs. yesterday" : "vs. last week",
        icon: BarChart3,
        tint: "teal",
        href: APP_ROUTES.sales,
      },
      {
        id: "profit",
        label: "Gross profit",
        value: canViewAnalytics ? money(grossProfit) : "—",
        hint: canViewAnalytics
          ? margin != null
            ? `${fmtPct(margin)} margin`
            : "After cost of goods"
          : "Analytics access required",
        icon: CircleDollarSign,
        tint: "emerald",
        actions: profitActions,
      },
      {
        id: "orders",
        label: isToday ? "Orders" : "Units sold",
        value: fmtCount(orders),
        trend: ordersTrend,
        hint: isToday ? "vs. yesterday" : "Quantity moved",
        icon: ShoppingCart,
        tint: "violet",
        href: APP_ROUTES.salesTransactions,
      },
      {
        id: "ticket",
        label: isToday ? "Avg. ticket" : "Avg / day",
        value: isToday
          ? ticket != null
            ? money(ticket)
            : "—"
          : chartPoints.length > 0
            ? money(revenue / chartPoints.length)
            : "—",
        hint: isToday ? "Revenue ÷ sales" : "Across this week",
        icon: CreditCard,
        tint: "amber",
        href: APP_ROUTES.sales,
      },
    ];
  }, [
    canReadFinanceReports,
    canViewAnalytics,
    canViewSalesIntelligence,
    canWriteFinanceExpenses,
    chartPoints.length,
    grossProfit,
    isToday,
    margin,
    money,
    orders,
    ordersTrend,
    revenue,
    revenueTrend,
    ticket,
  ]);

  const workCards = useMemo(() => {
    const cards = [];
    if (canViewSupplyBills) {
      const summary = summarizeSupplyRows(todaySupplies);
      cards.push({
        id: "supply",
        label: "Supplier bills",
        meta:
          summary.count > 0
            ? `${summary.count} · ${money(summary.openBalance)}`
            : "None today",
        href: APP_ROUTES.purchasingAddSupplies,
        icon: Truck,
      });
    }
    if (canViewCreditTabs) {
      const owed = openCreditTabs.reduce(
        (sum, tab) => sum + toNum(tab.balanceOwed),
        0,
      );
      cards.push({
        id: "credit",
        label: "Customer credit",
        meta:
          openCreditTabs.length > 0
            ? `${openCreditTabs.length} · ${money(owed)}`
            : "None open",
        href: APP_ROUTES.creditsOnTab,
        icon: Wallet,
      });
    }
    if (canShowWebOrders) {
      const total = openWebOrders.reduce(
        (sum, order) => sum + toNum(order.grandTotal),
        0,
      );
      cards.push({
        id: "web",
        label: "Web orders",
        meta:
          openWebOrders.length > 0
            ? `${openWebOrders.length} · ${money(total)}`
            : "None open",
        href: APP_ROUTES.storefrontWebOrders,
        icon: Globe,
      });
    }
    return cards;
  }, [
    canShowWebOrders,
    canViewCreditTabs,
    canViewSupplyBills,
    money,
    openCreditTabs,
    openWebOrders,
    todaySupplies,
  ]);

  return (
    <BusinessPageLayout
      title={shopNotReady ? "Open the shop" : null}
      description={
        shopNotReady
          ? "Stock the shelves, dress the window, then invite the people who will sell. The till waits until there is something to sell."
          : null
      }
      setupHome={shopNotReady}
      identity={identity}
      menu={<BusinessHubMenuButton identity={identity} setupHome={shopNotReady} />}
      toolbarLeading={
        shopNotReady ? null : (
          <PeriodToggle value={period} onChange={setPeriod} />
        )
      }
      headerActions={
        <>
          <HubLiveStatus
            businessActive={business?.active !== false}
            lastLiveUpdateAt={lastLiveUpdateAt}
            justUpdated={justUpdated}
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className={HUB_ICON_BTN}
            aria-label="Refresh business hub"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
          </button>
        </>
      }
      stage={
        showTillStage ? (
          <CashierStageTabs
            cashiers={cashierNames}
            selected={selectedCashiers}
            onChange={setSelectedCashiers}
          />
        ) : null
      }
    >
      <div
        className={cn(
          "mx-auto w-full max-w-5xl",
          showTillStage && "max-w-6xl xl:max-w-7xl",
          dualLanes && "max-w-7xl",
        )}
      >
        <div className="flex flex-col gap-2">
          {canManageBusinessSettings ? (
            <QuestionnaireResumeBanner
              businessOnboardingStatus={business?.onboarding?.status}
              catalogEmpty={catalogueCount === 0}
            />
          ) : null}
          {canManageBusinessSettings ? <SetupProgressBanner /> : null}

          <div
            className={cn(
              "xl:grid xl:items-start xl:gap-4",
              showCleanRail &&
                "xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]",
            )}
          >
            <div className={cn("flex flex-col gap-2", showCleanRail && "xl:pr-1")}>
              {shopNotReady ? (
                <>
                  <ShopOpenBoard
                    shopName={
                      business?.branding?.displayName?.trim() ||
                      business?.name?.trim() ||
                      ""
                    }
                    shopHost={
                      business?.primaryDomain?.trim() ||
                      (business?.slug?.trim()
                        ? `${business.slug.trim()}.${PLATFORM_DOMAIN}`
                        : null)
                    }
                    storefrontEnabled={Boolean(business?.storefront?.enabled)}
                    themeId={business?.storefront?.storeThemeId}
                    landingTemplateId={business?.storefront?.landingTemplateId}
                    logoUrl={business?.branding?.logoUrl}
                    brandPrimary={business?.branding?.primaryColor}
                    hours={business?.storefront?.landingContent?.hours}
                    address={business?.storefront?.landingContent?.address}
                    currency={business?.currency}
                    shopEnabled={shopEnabled}
                    canManageStorefront={canManageBusinessSettings}
                    canListUsers={canListUsers}
                  />
                  <ReceiveMpesaSetupCard
                    compact
                    ownerPhone={me?.phone}
                    countryCode={business?.countryCode}
                    permissions={me?.permissions}
                  />
                  {canManageBusinessSettings ? (
                    <ManageTillsHubCard
                      compact
                      branches={branches}
                      branchId={branchId}
                      initiallyOpen={manageTillsInitiallyOpen}
                    />
                  ) : null}
                </>
              ) : salesEmpty ? (
                <BusinessHubEmptyState
                  period={period}
                  showStorefrontLink={canManageBusinessSettings && shopEnabled}
                  showThemeLink={canManageBusinessSettings && shopEnabled}
                  showUsersLink={canListUsers}
                  storefrontEnabled={Boolean(business?.storefront?.enabled)}
                />
              ) : null}

              {shopNotReady ? null : (
                <div className="flex flex-col gap-3.5 sm:gap-4">
                  <HubGreeting
                    name={me?.name}
                    subtitle={
                      isToday
                        ? "Here's what's happening at your shop today."
                        : "Here's how the shop did this week."
                    }
                  />

                  {salesEmpty ? null : <HubKpiRow items={hubKpis} />}

                  {tenderTotals ? (
                    <HubPaymentSplit
                      cash={tenderTotals.cash}
                      mpesa={tenderTotals.mpesa}
                      credit={tenderTotals.credit}
                      format={money}
                      periodLabel={isToday ? "Today" : "This week"}
                    />
                  ) : null}

                  {showAttentionSection ? (
                    actionItems.length > 0 ? (
                      <ActionItemsStrip items={actionItems} />
                    ) : salesEmpty ? null : (
                      <HubAllClear />
                    )
                  ) : null}

                  {salesEmpty ? null : (
                    <section className="space-y-2">
                      <div className="flex items-baseline justify-between px-0.5">
                        <h3 className="text-[12px] font-semibold tracking-[-0.02em] text-[#141414]">
                          Revenue · {isToday ? "Today" : "This week"}
                        </h3>
                        {revenueTrend ? (
                          <p className="text-[12px] font-semibold tabular-nums text-[#047857]">
                            {revenueTrend}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-xl border border-[color-mix(in_srgb,#141414_9%,transparent)] bg-white p-3 shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
                        <p
                          className="mb-2 text-[22px] font-semibold leading-none tracking-[-0.03em] text-[#141414] tabular-nums"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {money(revenue)}
                        </p>
                        <RevenueBarChart
                          bare
                          points={chartPoints}
                          ariaLabel={chartAriaLabel}
                          caption={chartCaption}
                        />
                      </div>
                    </section>
                  )}

                  <HubWorkSummary cards={workCards} />

                  <div className="flex flex-col gap-3 xl:hidden">
                    <HubQuickActions links={jumpInLinks} />
                    {canShowPaymentMethod ? (
                      <ReceiveMpesaSetupCard
                        rail
                        ownerPhone={me?.phone}
                        countryCode={business?.countryCode}
                        permissions={me?.permissions}
                      />
                    ) : null}
                    {canManageBusinessSettings ? (
                      <ManageTillsHubCard
                        rail
                        branches={branches}
                        branchId={branchId}
                        initiallyOpen={manageTillsInitiallyOpen}
                      />
                    ) : null}
                    <HubTipCard />
                  </div>

                  {/* 5 — Open work (phone: column tabs; sm+: multi-column grid) */}
                  {(canViewSupplyBills &&
                    !(salesEmpty && todaySupplies.length === 0)) ||
                  (canViewCreditTabs &&
                    !(salesEmpty && openCreditTabs.length === 0)) ||
                  (canShowWebOrders &&
                    !(salesEmpty && openWebOrders.length === 0)) ? (
                    <OpenWorkBoard
                      columns={[
                        ...(canViewSupplyBills &&
                        !(salesEmpty && todaySupplies.length === 0)
                          ? [
                              {
                                id: "supply",
                                label: "Supply",
                                meta: (() => {
                                  const summary =
                                    summarizeSupplyRows(todaySupplies);
                                  return summary.count > 0
                                    ? `${summary.count}`
                                    : "None";
                                })(),
                                panel: (
                                  <SupplyBillsRail
                                    bills={todaySupplies}
                                    currency={currency}
                                    justUpdated={supplyJustUpdated}
                                    onPayBill={
                                      canOpenSupplyPay
                                        ? openSupplyPay
                                        : undefined
                                    }
                                    onInspect={openSupplyHistory}
                                  />
                                ),
                              },
                            ]
                          : []),
                        ...(canViewCreditTabs &&
                        !(salesEmpty && openCreditTabs.length === 0)
                          ? [
                              {
                                id: "credit",
                                label: "Credit",
                                meta:
                                  openCreditTabs.length > 0
                                    ? `${openCreditTabs.length}`
                                    : "None",
                                panel: (
                                  <CreditTabsRail
                                    tabs={openCreditTabs}
                                    currency={currency}
                                    justUpdated={creditJustUpdated}
                                    onPayTab={
                                      canOpenCreditPay
                                        ? openCreditPay
                                        : undefined
                                    }
                                    onInspect={openCreditHistory}
                                    paidTotal={
                                      creditActivity?.totalPaid ?? null
                                    }
                                    paidCount={
                                      creditActivity?.paymentCount ?? null
                                    }
                                    paidPeriodLabel={
                                      isToday ? "today" : "this week"
                                    }
                                  />
                                ),
                              },
                            ]
                          : []),
                        ...(canShowWebOrders &&
                        !(salesEmpty && openWebOrders.length === 0)
                          ? [
                              {
                                id: "web",
                                label: "Web",
                                meta:
                                  openWebOrders.length > 0
                                    ? `${openWebOrders.length}`
                                    : "None",
                                panel: (
                                  <WebOrdersRail
                                    orders={openWebOrders}
                                    currency={currency}
                                    justUpdated={webOrdersJustUpdated}
                                    onInspect={openShopperHistory}
                                  />
                                ),
                                className: "sm:col-span-2 xl:col-span-1",
                              },
                            ]
                          : []),
                      ]}
                    />
                  ) : null}

                  {/* 5 — Floor tape: the last ticks, one thumb away. The desk
                      reads the same tape in the lane rail beside this column. */}
                  {showTillStage && !galleryOpen ? (
                    <section className="space-y-1.5 xl:hidden">
                      <HubSectionLabel
                        title="Floor tape"
                        meta={
                          recentTicks.length > 0
                            ? `${recentTicks.length} recent`
                            : isToday
                              ? "Today"
                              : "This week"
                        }
                        className="px-0.5"
                      />
                      <FloorTapeDrawer
                        lanes={tickLanes}
                        currency={currency}
                        justUpdated={justUpdated}
                        dualLanes={dualLanes}
                      />
                    </section>
                  ) : null}

                  {/* 6 — Stock: the checks, then what is actually moving */}
                  {stockItems.length > 0 || showMovers ? (
                    <section className="space-y-1.5">
                      <HubSectionLabel
                        title="Stock"
                        meta={
                          stockItems.length > 0
                            ? `${stockItems.length} checks`
                            : undefined
                        }
                        className="px-0.5"
                      />
                      <div
                        className={cn(
                          "grid gap-2",
                          stockItems.length > 0 &&
                            showMovers &&
                            "lg:grid-cols-[1.4fr_0.6fr] lg:items-start",
                        )}
                      >
                        <StockHealthPanel items={stockItems} />
                        {showMovers ? (
                          <TopMoversPanel movers={topMovers} />
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>

            {showCleanRail ? (
              <aside className="hidden xl:flex xl:flex-col xl:gap-3">
                {showTillStage
                  ? tickLanes.map((lane, index) => (
                      <RecentTicksRail
                        key={lane.key}
                        ticks={lane.ticks}
                        drawouts={lane.drawouts}
                        currency={currency}
                        justUpdated={justUpdated && index === 0}
                        title={index === 0 ? "Live activity" : lane.title}
                        subtitle={lane.subtitle}
                        showCashier={lane.showCashier}
                        accent={lane.accent}
                        fillViewport={false}
                        className="max-h-[min(24rem,46dvh)]"
                      />
                    ))
                  : null}
                <HubQuickActions links={jumpInLinks} />
                {canShowPaymentMethod ? (
                  <ReceiveMpesaSetupCard
                    rail
                    ownerPhone={me?.phone}
                    countryCode={business?.countryCode}
                    permissions={me?.permissions}
                  />
                ) : null}
                {canManageBusinessSettings ? (
                  <ManageTillsHubCard
                    rail
                    branches={branches}
                    branchId={branchId}
                    initiallyOpen={manageTillsInitiallyOpen}
                  />
                ) : null}
                <HubTipCard />
              </aside>
            ) : null}
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

      <HubHistoryDrawer
        target={historyTarget}
        currency={currency}
        onOpenChange={(next) => {
          if (!next) setHistoryTarget(null);
        }}
      />

      {canViewSalesIntelligence ? (
        <MarginLeaksDrawer
          open={marginLeaksOpen}
          onOpenChange={setMarginLeaksOpen}
          from={hubPeriodRange.from}
          to={hubPeriodRange.to}
          branchId={branchId || null}
          itemTypeId={itemTypeId || null}
          grossProfit={grossProfit}
          periodLabel={hubPeriodLabel}
        />
      ) : null}

      {canReadFinanceReports || canWriteFinanceExpenses ? (
        <ProfitPocketDrawer
          open={profitPocketOpen}
          onOpenChange={setProfitPocketOpen}
          from={hubPeriodRange.from}
          to={hubPeriodRange.to}
          branchId={branchId || null}
          periodLabel={hubPeriodLabel}
          onPocketed={() => {
            void load();
          }}
        />
      ) : null}
    </BusinessPageLayout>
  );
}

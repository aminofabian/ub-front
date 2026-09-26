"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Plus, RefreshCw, Scale } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { ProfitPocketDrawer } from "@/components/business-hub/profit-pocket-drawer";
import { OneOffExpenseDrawer } from "@/components/payments/one-off-expense-drawer";
import { Button } from "@/components/ui/button";
import { ScheduleFormDrawer } from "@/app/(dashboard)/fixed-costs/_components/schedule-form-drawer";
import {
  approveFinanceExpense,
  cancelExpenseKopokopoPay,
  fetchExpenseKopokopoPayStatus,
  fetchExpensePayOptions,
  fetchExpenseScheduleOccurrences,
  fetchExpenseSchedules,
  fetchFinanceExpensesRange,
  fetchFinancePL,
  fetchPayrollPeriodPayslips,
  fetchPendingDrawouts,
  fetchShiftDrawouts,
  fetchShifts,
  initiateExpenseKopokopoPay,
  postExpenseScheduleOccurrence,
  postExpenseScheduleOccurrenceByDate,
  rejectFinanceExpense,
  skipExpenseScheduleOccurrence,
  skipExpenseScheduleOccurrenceByDate,
  type DrawoutRecord,
  type ExpenseScheduleOccurrenceRecord,
  type ExpenseScheduleRecord,
  type FinanceExpenseResponse,
  type ProfitAndLossResponse,
  type ShiftListItem,
} from "@/lib/api";
import {
  drawoutCategoryLabel,
  drawoutStatusLabel,
  hubDrawoutsFromRecords,
  isActiveDrawoutStatus,
  totalDrawoutAmount,
  type HubDrawout,
} from "@/lib/business-hub/drawouts-for-hub";
import { APP_ROUTES } from "@/lib/config";
import {
  expensesHubPresetRange,
  moneyNumber,
  monthsOverlappingRange,
  type ExpensesHubPreset,
} from "@/lib/expenses-hub-utils";
import {
  EXPENSE_CATEGORY_CODE_OPTIONS,
  categoryTypeLabel,
  expenseCategoryCodeLabel,
  expenseSourceLabel,
  formatFixedCostMoney,
  formatFixedCostDate,
  paymentMethodLabel,
} from "@/lib/fixed-costs-utils";
import { hasPermission, Permission } from "@/lib/permissions";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import { cn } from "@/lib/utils";

type Feedback = { kind: "success" | "error"; text: string } | null;

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PAPER = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,#faf8f4)]";
const PRIMARY_BTN =
  "h-9 rounded-none border-0 bg-[var(--pos-primary,#0f766e)] px-3 text-[13px] font-semibold text-white shadow-none hover:bg-[#0d6b63]";
const OUTLINE_BTN =
  "h-9 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-3 text-[13px] font-semibold text-[var(--order-ink,#15231f)] shadow-none hover:border-[var(--pos-primary,#0f766e)]";


export function ExpensesHubWorkspace() {
  const {
    loading: dashLoading,
    canReadFinanceExpenses,
    canWriteFinanceExpenses,
    canManageFinanceExpenses,
    canReadFinanceReports,
    canViewPayroll,
    canViewShifts,
    branches,
    business,
    me,
  } = useDashboard();

  const shopName =
    business?.branding?.displayName?.trim() ||
    business?.name?.trim() ||
    "Your shop";
  const brandPrimary =
    parseStorefrontHex(business?.branding?.primaryColor) ?? "#0f766e";
  const canApproveDrawouts = hasPermission(
    me?.permissions,
    Permission.ShiftsDrawoutsApprove,
  );

  const canOpen = canReadFinanceExpenses || canReadFinanceReports;

  const [preset, setPreset] = useState<ExpensesHubPreset>("month");
  const [from, setFrom] = useState(() => expensesHubPresetRange("month").from);
  const [to, setTo] = useState(() => expensesHubPresetRange("month").to);
  const [branchFilter, setBranchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryCodeFilter, setCategoryCodeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(0);

  const [pl, setPl] = useState<ProfitAndLossResponse | null>(null);
  const [expenses, setExpenses] = useState<FinanceExpenseResponse[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<
    FinanceExpenseResponse[]
  >([]);
  const [schedules, setSchedules] = useState<ExpenseScheduleRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [occurrences, setOccurrences] = useState<
    ExpenseScheduleOccurrenceRecord[]
  >([]);
  const [unpostedPayroll, setUnpostedPayroll] = useState<{
    count: number;
    netTotal: number;
  } | null>(null);
  const [periodDrawouts, setPeriodDrawouts] = useState<HubDrawout[]>([]);
  const [pendingDrawouts, setPendingDrawouts] = useState<HubDrawout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [profitPocketOpen, setProfitPocketOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringSaving, setRecurringSaving] = useState(false);

  const pageSize = 50;

  const periodLabel = useMemo(() => {
    if (preset === "week") return "This week";
    if (preset === "month") return "This month";
    if (preset === "today") return "Today";
    return `${from} → ${to}`;
  }, [preset, from, to]);

  const canPocket =
    canReadFinanceReports || canWriteFinanceExpenses;

  const applyPreset = (next: ExpensesHubPreset) => {
    setPreset(next);
    if (next === "custom") return;
    const range = expensesHubPresetRange(next);
    setFrom(range.from);
    setTo(range.to);
    setPage(0);
  };

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    setError(null);
    try {
      const branch = branchFilter || undefined;
      const year = Number(from.slice(0, 4));
      const month = Number(from.slice(5, 7));

      const [plRes, listRes, occRes, payrollGap, pendingRes, schedulesRes, drawoutBundle] =
        await Promise.all([
        canReadFinanceReports
          ? fetchFinancePL(from, to, branch).catch((err) => {
              throw err;
            })
          : Promise.resolve(null),
        canReadFinanceExpenses
          ? fetchFinanceExpensesRange({
              from,
              to,
              branchId: branch,
              categoryType: categoryFilter || undefined,
              categoryCode: categoryCodeFilter || undefined,
              q: searchApplied || undefined,
              page,
              size: pageSize,
            })
          : Promise.resolve(null),
        canReadFinanceExpenses && Number.isFinite(year) && Number.isFinite(month)
          ? fetchExpenseScheduleOccurrences(year, month, {
              branchId: branch,
            }).catch(() => [])
          : Promise.resolve([]),
        canViewPayroll
          ? loadUnpostedPayrollGap(from, to)
          : Promise.resolve(null),
        canManageFinanceExpenses
          ? fetchFinanceExpensesRange({
              from,
              to,
              branchId: branch,
              approvalStatus: "pending_approval",
              page: 0,
              size: 50,
            }).catch(() => null)
          : Promise.resolve(null),
        canReadFinanceExpenses
          ? fetchExpenseSchedules().catch(() => [])
          : Promise.resolve([]),
        canViewShifts
          ? loadDrawoutsForExpensesHub({
              from,
              to,
              branchId: branch,
              includePending: canApproveDrawouts,
            }).catch(() => ({ period: [] as HubDrawout[], pending: [] as HubDrawout[] }))
          : Promise.resolve({ period: [] as HubDrawout[], pending: [] as HubDrawout[] }),
      ]);

      setPl(plRes);
      if (listRes) {
        setExpenses(listRes.expenses);
        setTotalCount(listRes.totalCount);
        setHasMore(listRes.hasMore);
      } else {
        setExpenses([]);
        setTotalCount(0);
        setHasMore(false);
      }
      setOccurrences(Array.isArray(occRes) ? occRes : []);
      setUnpostedPayroll(payrollGap);
      setPendingApprovals(pendingRes?.expenses ?? []);
      setSchedules(Array.isArray(schedulesRes) ? schedulesRes : []);
      setPeriodDrawouts(drawoutBundle.period);
      setPendingDrawouts(drawoutBundle.pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
      setPl(null);
      setExpenses([]);
      setOccurrences([]);
      setUnpostedPayroll(null);
      setPendingApprovals([]);
      setSchedules([]);
      setPeriodDrawouts([]);
      setPendingDrawouts([]);
    } finally {
      setLoading(false);
    }
  }, [
    canOpen,
    canReadFinanceReports,
    canReadFinanceExpenses,
    canManageFinanceExpenses,
    canViewPayroll,
    canViewShifts,
    canApproveDrawouts,
    from,
    to,
    branchFilter,
    categoryFilter,
    categoryCodeFilter,
    searchApplied,
    page,
  ]);

  useEffect(() => {
    if (!dashLoading && canOpen) {
      void load();
    }
  }, [dashLoading, canOpen, load, refreshKey]);

  const tableSum = useMemo(
    () => expenses.reduce((s, e) => s + moneyNumber(e.amount), 0),
    [expenses],
  );

  const ledgerOpEx = moneyNumber(pl?.operatingExpenses);
  // Approximate adjustments using the current page only when page 0 and !hasMore;
  // otherwise show null so we don't lie with a partial sum.
  const otherAdjustments =
    pl && canReadFinanceExpenses && page === 0 && !hasMore
      ? ledgerOpEx -
        expenses.reduce((s, e) => s + moneyNumber(e.amount), 0)
      : null;

  const categoryBreakdown = useMemo(() => {
    const byCode = new Map<string, number>();
    for (const e of expenses) {
      const key = e.categoryCode || "other";
      byCode.set(key, (byCode.get(key) ?? 0) + moneyNumber(e.amount));
    }
    return [...byCode.entries()]
      .map(([code, total]) => ({ code, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const salaryScheduleWarning = useMemo(() => {
    return schedules.some((s) => {
      if (!s.active) return false;
      if (s.categoryCode === "salaries") return true;
      const n = (s.name || "").toLowerCase();
      return n.includes("salary") || n.includes("wage");
    });
  }, [schedules]);

  const upcoming = useMemo(() => {
    return occurrences
      .filter((o) => o.status === "due" || o.status === "failed" || o.status === "upcoming")
      .filter((o) => !branchFilter || !o.branchId || o.branchId === branchFilter)
      .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate))
      .slice(0, 8);
  }, [occurrences, branchFilter]);

  const drawoutApprovedTotal = useMemo(
    () =>
      periodDrawouts
        .filter((d) => d.status === "APPROVED")
        .reduce((sum, d) => sum + d.amount, 0),
    [periodDrawouts],
  );
  const drawoutActiveTotal = useMemo(
    () => totalDrawoutAmount(periodDrawouts),
    [periodDrawouts],
  );
  const recentDrawouts = useMemo(
    () => periodDrawouts.filter((d) => isActiveDrawoutStatus(d.status)).slice(0, 8),
    [periodDrawouts],
  );

  const bump = () => setRefreshKey((k) => k + 1);

  const downloadExpensesCsv = () => {
    const header = [
      "date",
      "name",
      "categoryType",
      "categoryCode",
      "source",
      "paymentMethod",
      "amount",
      "approvalStatus",
    ];
    const rows = expenses.map((e) =>
      [
        e.expenseDate,
        csvEscape(e.name),
        e.categoryType,
        e.categoryCode ?? "",
        e.source ?? "",
        e.paymentMethod,
        moneyNumber(e.amount),
        e.approvalStatus ?? "",
      ].join(","),
    );
    triggerCsvDownload(
      `expenses-${from}-${to}.csv`,
      [header.join(","), ...rows].join("\n"),
    );
  };

  const downloadPlCsv = () => {
    if (!pl) return;
    const lines = [
      "metric,amount",
      `sales,${moneyNumber(pl.revenue)}`,
      `cogs,${moneyNumber(pl.cogs)}`,
      `gross_profit,${moneyNumber(pl.grossProfit)}`,
      `operating_expenses,${moneyNumber(pl.operatingExpenses)}`,
      `net_operating_profit,${moneyNumber(pl.netOperating)}`,
    ];
    triggerCsvDownload(`pl-${from}-${to}.csv`, lines.join("\n"));
  };

  const approvePending = async (id: string) => {
    try {
      await approveFinanceExpense(id);
      setFeedback({ kind: "success", text: "Expense approved" });
      bump();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not approve",
      });
    }
  };

  const rejectPending = async (id: string) => {
    try {
      await rejectFinanceExpense(id);
      setFeedback({ kind: "success", text: "Expense rejected" });
      bump();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not reject",
      });
    }
  };

  const payViaMpesa = async (expense: FinanceExpenseResponse) => {
    if (!canManageFinanceExpenses) return;
    setPayingId(expense.id);
    try {
      const options = await fetchExpensePayOptions(expense.id);
      if (options.alreadyPaid) {
        setFeedback({ kind: "success", text: "Already paid" });
        bump();
        return;
      }
      if (options.pendingDisbursement) {
        const status = await fetchExpenseKopokopoPayStatus(expense.id);
        setFeedback({
          kind: status.accepted ? "success" : "error",
          text: status.message ?? status.status,
        });
        bump();
        return;
      }
      if (!options.kopokopoPayEligible) {
        const reason =
          options.platformPayoutGatewayEnabled === false
            ? "Send Money is disabled for this platform"
            : !options.payoutEnabled
              ? "Enable payouts under Payments → Supplier payouts"
              : !options.payoutGatewayReady
                ? "No active payout gateway"
                : !options.destinationConfigured
                  ? "Add a vendor M-Pesa number on the expense or schedule"
                  : "Not eligible for Send Money";
        setFeedback({ kind: "error", text: reason });
        return;
      }
      const result = await initiateExpenseKopokopoPay(expense.id);
      setFeedback({
        kind: "success",
        text: result.message ?? "Send Money submitted — waiting for confirmation",
      });
      // Poll a few times for webhook/poller confirmation
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const status = await fetchExpenseKopokopoPayStatus(expense.id);
        if (status.status === "success") {
          setFeedback({ kind: "success", text: status.message ?? "Paid via M-Pesa" });
          bump();
          return;
        }
        if (status.status === "failed") {
          setFeedback({
            kind: "error",
            text: status.message ?? "Send Money failed",
          });
          bump();
          return;
        }
      }
      bump();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not Send Money",
      });
    } finally {
      setPayingId(null);
    }
  };

  const cancelPay = async (expenseId: string) => {
    if (!canManageFinanceExpenses) return;
    setPayingId(expenseId);
    try {
      const result = await cancelExpenseKopokopoPay(expenseId);
      setFeedback({
        kind: "success",
        text: result.message ?? "Payment cancelled",
      });
      bump();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not cancel",
      });
    } finally {
      setPayingId(null);
    }
  };

  const postOcc = async (o: ExpenseScheduleOccurrenceRecord) => {
    try {
      if (o.id) {
        await postExpenseScheduleOccurrence(o.id);
      } else {
        await postExpenseScheduleOccurrenceByDate({
          scheduleId: o.scheduleId,
          occurrenceDate: o.occurrenceDate,
        });
      }
      setFeedback({ kind: "success", text: `Posted ${o.scheduleName}` });
      bump();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not post",
      });
    }
  };

  const skipOcc = async (o: ExpenseScheduleOccurrenceRecord) => {
    try {
      if (o.id) {
        await skipExpenseScheduleOccurrence(o.id);
      } else {
        await skipExpenseScheduleOccurrenceByDate({
          scheduleId: o.scheduleId,
          occurrenceDate: o.occurrenceDate,
        });
      }
      setFeedback({ kind: "success", text: `Skipped ${o.scheduleName}` });
      bump();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not skip",
      });
    }
  };

  if (dashLoading) {
    return <DashboardLoading label="Loading…" />;
  }

  if (!canOpen) {
    return (
      <DashboardAccessDenied
        title="Expenses & profit"
        description="You need finance expense or report access to open this page."
      />
    );
  }

  return (
    <div
      className={cn(DASHBOARD_MAX_WIDE, "overflow-hidden border", HAIRLINE, PAPER)}
      style={
        {
          "--pos-primary": brandPrimary,
        } as CSSProperties
      }
    >
      {/* Storefront-style utility strip */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 text-[11px] font-medium text-white/90 sm:px-4"
        style={{ backgroundColor: brandPrimary }}
      >
        <p className="min-w-0 truncate">
          <span className="font-semibold opacity-100">{shopName}</span>
          <span className="opacity-80"> · Expenses &amp; profit</span>
        </p>
        <p className="shrink-0 opacity-85">
          Posted books · not proof money left the account
        </p>
      </div>

      {/* Brand hero — mirrors storefront banner energy */}
      <section
        className="relative overflow-hidden text-white"
        style={{ backgroundColor: brandPrimary }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 78% 35%, color-mix(in srgb, white 35%, transparent), transparent 48%), linear-gradient(135deg, color-mix(in srgb, white 12%, transparent), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col gap-4 px-3 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-4 sm:py-7">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center border border-white/35 bg-white/10">
                <Scale className="size-4" aria-hidden />
              </span>
              <h1 className="text-[1.45rem] font-bold leading-none tracking-[-0.03em] sm:text-[1.75rem]">
                Expenses &amp; profit
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-white/80">
              Sales, cost of goods, operating expenses, and net operating profit
              — for {shopName}, in one place.
            </p>
            {canReadFinanceReports && pl && !loading ? (
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  Net operating profit
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[1.85rem] font-semibold tabular-nums tracking-tight sm:text-[2.15rem]",
                    moneyNumber(pl.netOperating) < 0 && "text-[#ffe4e0]",
                  )}
                >
                  {formatFixedCostMoney(moneyNumber(pl.netOperating))}
                </p>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canPocket ? (
              <Button
                type="button"
                className="h-9 rounded-none border-0 bg-[#d8f3ee] px-3 text-[13px] font-semibold text-[#0a4f48] shadow-none hover:bg-white"
                onClick={() => setProfitPocketOpen(true)}
              >
                Pocket cash…
              </Button>
            ) : null}
            {canWriteFinanceExpenses ? (
              <Button
                type="button"
                className={cn(
                  "h-9 rounded-none border-0 px-3 text-[13px] font-semibold shadow-none",
                  canPocket
                    ? "border border-white/50 bg-transparent text-white hover:bg-white/10"
                    : "bg-[#d8f3ee] text-[#0a4f48] hover:bg-white",
                )}
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4" />
                Add expense
              </Button>
            ) : null}
            {canManageFinanceExpenses ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-none border-white/50 bg-transparent px-3 text-[13px] font-semibold text-white shadow-none hover:bg-white/10 hover:text-white"
                onClick={() => setRecurringOpen(true)}
              >
                Recurring
              </Button>
            ) : null}
            {canReadFinanceExpenses ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-none border-white/50 bg-transparent px-3 text-[13px] font-semibold text-white shadow-none hover:bg-white/10 hover:text-white"
                onClick={downloadExpensesCsv}
              >
                CSV expenses
              </Button>
            ) : null}
            {pl ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-none border-white/50 bg-transparent px-3 text-[13px] font-semibold text-white shadow-none hover:bg-white/10 hover:text-white"
                onClick={downloadPlCsv}
              >
                CSV P&amp;L
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-none border border-white/40 text-white hover:bg-white/10 hover:text-white"
              onClick={() => bump()}
              aria-label="Refresh"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <div className="space-y-3 px-0 pb-16 pt-0 sm:space-y-3">
      {feedback ? (
        <div className="px-0 sm:px-0">
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        </div>
      ) : null}

      <section
        className={cn(
          "space-y-3 border border-x-0 border-t-0 bg-white p-3 sm:border-x sm:p-4",
          HAIRLINE,
        )}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["today", "Today"],
                ["week", "This week"],
                ["month", "This month"],
                ["custom", "Custom"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={preset === key ? "default" : "outline"}
                className={cn(
                  "h-8 rounded-none px-2.5 text-[12px] font-semibold shadow-none",
                  preset === key
                    ? "border-0 bg-[var(--pos-primary,#0f766e)] text-white hover:bg-[#0d6b63]"
                    : OUTLINE_BTN,
                )}
                onClick={() => applyPreset(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <label className="text-sm">
            <span className={cn("mb-1 block", dashboardHintClass())}>From</span>
            <input
              type="date"
              className={cn(dashboardInputClass(), "rounded-none")}
              value={from}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="text-sm">
            <span className={cn("mb-1 block", dashboardHintClass())}>To</span>
            <input
              type="date"
              className={cn(dashboardInputClass(), "rounded-none")}
              value={to}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="text-sm">
            <span className={cn("mb-1 block", dashboardHintClass())}>Branch</span>
            <select
              className={cn(dashboardSelectClass(), "rounded-none")}
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className={dashboardHintClass()}>
          Stock purchases stay in inventory / COGS — they are not operating
          expenses. Till drawouts are cash from the drawer — they are{" "}
          <span className="font-semibold text-[var(--order-ink,#15231f)]">not OpEx</span>.
          Amounts below are{" "}
          <span className="font-semibold text-[var(--order-ink,#15231f)]">Posted (books)</span>,
          not proof that money left the account.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold text-[var(--pos-primary,#0f766e)]">
          <Link
            href={APP_ROUTES.fixedCosts}
            className="underline-offset-2 hover:underline"
          >
            Fixed costs
          </Link>
          <Link
            href={APP_ROUTES.payroll}
            className="underline-offset-2 hover:underline"
          >
            Payroll
          </Link>
          <Link
            href={APP_ROUTES.purchasingApAging}
            className="underline-offset-2 hover:underline"
          >
            Supplier bills
          </Link>
          <Link
            href={APP_ROUTES.paymentsDayLedger}
            className="underline-offset-2 hover:underline"
          >
            Today&apos;s takings
          </Link>
          {canViewShifts ? (
            <Link
              href={APP_ROUTES.shifts}
              className="underline-offset-2 hover:underline"
            >
              Shifts &amp; drawouts
            </Link>
          ) : null}
        </div>
      </section>

      {loading ? (
        <DashboardLoading label="Loading profit & expenses…" />
      ) : error ? (
        <DashboardLoadError
          title="Couldn’t load"
          message={error}
          onRetry={() => bump()}
        />
      ) : (
        <>
          {canReadFinanceReports && pl ? (
            <section
              className={cn(
                "grid overflow-hidden border border-x-0 bg-white sm:grid-cols-2 sm:border-x lg:grid-cols-5",
                HAIRLINE,
              )}
            >
              <MetricCard label="Sales" value={pl.revenue} />
              <MetricCard label="COGS" value={pl.cogs} />
              <MetricCard
                label="Gross profit"
                value={pl.grossProfit}
                action={
                  canPocket
                    ? {
                        label: "Pocket cash…",
                        onClick: () => setProfitPocketOpen(true),
                      }
                    : undefined
                }
              />
              <MetricCard label="Operating expenses" value={pl.operatingExpenses} />
              <MetricCard
                label="Net operating profit"
                value={pl.netOperating}
                emphasize
              />
            </section>
          ) : canReadFinanceReports ? (
            <p className={cn("px-3 text-sm sm:px-4", dashboardHintClass())}>
              No P&amp;L data for this period.
            </p>
          ) : null}

          {otherAdjustments != null && Math.abs(otherAdjustments) >= 0.01 ? (
            <p className={cn("px-3 text-sm sm:px-4", dashboardHintClass())}>
              Other adjustments (ledger OpEx not in the expense table):{" "}
              <span className="font-semibold text-[var(--order-ink,#15231f)]">
                {formatFixedCostMoney(otherAdjustments)}
              </span>
            </p>
          ) : null}

          {unpostedPayroll && unpostedPayroll.count > 0 ? (
            <div
              className={cn(
                "border border-x-0 border-amber-800/25 bg-[#fff8e8] px-3 py-3 text-sm sm:border-x sm:px-4",
                HAIRLINE,
              )}
            >
              <p className="font-semibold text-[#5c3d0a]">
                {unpostedPayroll.count} payslip
                {unpostedPayroll.count === 1 ? "" : "s"} not posted to expenses
              </p>
              <p className="mt-1 text-[#5c3d0a]/80">
                Net paid{" "}
                <span className="font-semibold tabular-nums">
                  {formatFixedCostMoney(unpostedPayroll.netTotal)}
                </span>{" "}
                is missing from operating expenses for this period. Post from
                payroll (enable “post expense”) — this hub does not invent OpEx
                rows.
              </p>
              <Link
                href={APP_ROUTES.payroll}
                className="mt-2 inline-block font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
              >
                Open payroll
              </Link>
            </div>
          ) : null}

          {salaryScheduleWarning ? (
            <div
              className={cn(
                "border border-x-0 border-amber-800/25 bg-[#fff8e8] px-3 py-3 text-sm sm:border-x sm:px-4",
                HAIRLINE,
              )}
            >
              <p className="font-semibold text-[#5c3d0a]">
                Salary-like recurring schedule detected
              </p>
              <p className="mt-1 text-[#5c3d0a]/80">
                Paying staff through a fixed-cost schedule can double-count
                salaries already posted from payroll. Prefer{" "}
                <Link
                  href={APP_ROUTES.payroll}
                  className="font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                >
                  payroll
                </Link>{" "}
                for wages.
              </p>
            </div>
          ) : null}

          {canViewShifts ? (
            <section
              className={cn(
                "space-y-3 border border-x-0 bg-white p-3 sm:border-x sm:p-4",
                HAIRLINE,
              )}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--order-ink,#15231f)]">
                    Till drawouts
                  </h2>
                  <p className={cn("mt-1", dashboardHintClass())}>
                    Cash pulled from the drawer — not operating expenses.
                    {periodDrawouts.length > 0 ? (
                      <>
                        {" "}
                        Approved{" "}
                        <span className="font-semibold text-[var(--order-ink,#15231f)]">
                          {formatFixedCostMoney(drawoutApprovedTotal)}
                        </span>
                        {drawoutActiveTotal !== drawoutApprovedTotal ? (
                          <>
                            {" "}
                            · active (incl. pending){" "}
                            <span className="font-semibold text-[var(--order-ink,#15231f)]">
                              {formatFixedCostMoney(drawoutActiveTotal)}
                            </span>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={APP_ROUTES.shifts}
                  className="text-[13px] font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                >
                  Open shifts
                </Link>
              </div>

              {pendingDrawouts.length > 0 ? (
                <div
                  className={cn(
                    "border border-amber-800/25 bg-[#fff8e8] px-3 py-2.5 text-sm",
                    HAIRLINE,
                  )}
                >
                  <p className="font-semibold text-[#5c3d0a]">
                    {pendingDrawouts.length} drawout
                    {pendingDrawouts.length === 1 ? "" : "s"} waiting for approval
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {pendingDrawouts.slice(0, 5).map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 text-[#5c3d0a]/90"
                      >
                        <span>
                          {d.recipientName || d.description || "Drawout"} ·{" "}
                          {drawoutCategoryLabel(d.category)}
                          {d.shiftCashierName ? ` · ${d.shiftCashierName}` : ""}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatFixedCostMoney(d.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {recentDrawouts.length > 0 ? (
                <ul
                  className={cn(
                    "divide-y border-t",
                    "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
                    HAIRLINE,
                  )}
                >
                  {recentDrawouts.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[var(--order-ink,#15231f)]">
                          {d.recipientName || d.description || "Drawout"}
                        </p>
                        <p className={dashboardHintClass()}>
                          {drawoutCategoryLabel(d.category)} ·{" "}
                          {drawoutStatusLabel(d.status)}
                          {d.shiftCashierName ? ` · ${d.shiftCashierName}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                        {formatFixedCostMoney(d.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={dashboardHintClass()}>
                  No till drawouts on open or recent shifts in this period.
                </p>
              )}
            </section>
          ) : null}

          {canManageFinanceExpenses && pendingApprovals.length > 0 ? (
            <section
              className={cn(
                "space-y-3 border border-x-0 bg-white p-3 sm:border-x sm:p-4",
                HAIRLINE,
              )}
            >
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--order-ink,#15231f)]">
                Pending approval
              </h2>
              <ul
                className={cn(
                  "divide-y border-t",
                  "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
                  HAIRLINE,
                )}
              >
                {pendingApprovals.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-[var(--order-ink,#15231f)]">
                        {e.name}
                      </p>
                      <p className={dashboardHintClass()}>
                        {formatFixedCostDate(e.expenseDate)} ·{" "}
                        {formatFixedCostMoney(moneyNumber(e.amount))} ·{" "}
                        {expenseSourceLabel(e.source)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className={PRIMARY_BTN}
                        onClick={() => void approvePending(e.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 rounded-none px-3 text-[13px] font-semibold text-[var(--order-ink,#15231f)]"
                        onClick={() => void rejectPending(e.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canReadFinanceExpenses && upcoming.length > 0 ? (
            <section
              className={cn(
                "space-y-3 border border-x-0 bg-white p-3 sm:border-x sm:p-4",
                HAIRLINE,
              )}
            >
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--order-ink,#15231f)]">
                Upcoming & overdue
              </h2>
              <ul
                className={cn(
                  "divide-y border-t",
                  "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
                  HAIRLINE,
                )}
              >
                {upcoming.map((o) => (
                  <li
                    key={`${o.scheduleId}-${o.occurrenceDate}-${o.id ?? "x"}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-[var(--order-ink,#15231f)]">
                        {o.scheduleName}
                      </p>
                      <p className={dashboardHintClass()}>
                        {formatFixedCostDate(o.occurrenceDate)} ·{" "}
                        {formatFixedCostMoney(o.amount)} · {o.status}
                      </p>
                    </div>
                    {canWriteFinanceExpenses &&
                    (o.status === "due" || o.status === "failed" || o.status === "upcoming") ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className={PRIMARY_BTN}
                          onClick={() => void postOcc(o)}
                        >
                          Post
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 rounded-none px-3 text-[13px] font-semibold text-[var(--order-ink,#15231f)]"
                          onClick={() => void skipOcc(o)}
                        >
                          Skip
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canReadFinanceExpenses ? (
            <section
              className={cn(
                "space-y-4 border border-x-0 bg-white p-3 sm:border-x sm:p-4",
                HAIRLINE,
              )}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--order-ink,#15231f)]">
                    Expenses
                  </h2>
                  <p className={cn("mt-1", dashboardHintClass())}>
                    {totalCount} in range · this page{" "}
                    <span className="font-semibold text-[var(--order-ink,#15231f)]">
                      {formatFixedCostMoney(tableSum)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className={cn(dashboardSelectClass(), "rounded-none")}
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">All types</option>
                    <option value="fixed">Fixed</option>
                    <option value="variable">Variable</option>
                  </select>
                  <select
                    className={cn(dashboardSelectClass(), "rounded-none")}
                    value={categoryCodeFilter}
                    onChange={(e) => {
                      setCategoryCodeFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">All categories</option>
                    {EXPENSE_CATEGORY_CODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={cn(dashboardInputClass(), "w-40 rounded-none")}
                    placeholder="Search name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearchApplied(search.trim());
                        setPage(0);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className={OUTLINE_BTN}
                    onClick={() => {
                      setSearchApplied(search.trim());
                      setPage(0);
                    }}
                  >
                    Search
                  </Button>
                </div>
              </div>

              {categoryBreakdown.length > 0 ? (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                  {categoryBreakdown.map((row) => (
                    <li key={row.code} className={dashboardHintClass()}>
                      <span className="font-semibold text-[var(--order-ink,#15231f)]">
                        {expenseCategoryCodeLabel(row.code)}
                      </span>{" "}
                      {formatFixedCostMoney(row.total)}
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Mobile cards */}
              <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] border md:hidden">
                {expenses.length === 0 ? (
                  <li
                    className={cn(
                      "px-3 py-10 text-center text-sm",
                      dashboardHintClass(),
                    )}
                  >
                    No expenses in this range.
                  </li>
                ) : (
                  expenses.map((e) => (
                    <li key={e.id} className="space-y-2 bg-white px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold leading-snug text-[var(--order-ink,#15231f)]">
                            {e.name}
                          </p>
                          <p className={cn("mt-0.5 text-[12px]", dashboardHintClass())}>
                            {formatFixedCostDate(e.expenseDate)}
                            <span className="mx-1 opacity-40">·</span>
                            {expenseCategoryCodeLabel(e.categoryCode)}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-[14px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                          {formatFixedCostMoney(moneyNumber(e.amount))}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                        <span className={dashboardHintClass()}>
                          {expenseSourceLabel(e.source)}
                        </span>
                        <span className={dashboardHintClass()}>
                          {paymentMethodLabel(e.paymentMethod)}
                        </span>
                        <span className={dashboardHintClass()}>
                          {e.approvalStatus === "pending_approval"
                            ? "Pending"
                            : e.approvalStatus === "rejected"
                              ? "Rejected"
                              : "Posted"}
                        </span>
                        <span className={dashboardHintClass()}>
                          {e.paidAt
                            ? "Paid"
                            : e.paymentMethod === "mpesa_manual"
                              ? "Unpaid"
                              : "—"}
                        </span>
                      </div>
                      {e.approvalStatus === "posted" &&
                      e.paymentMethod === "mpesa_manual" &&
                      !e.paidAt &&
                      canManageFinanceExpenses ? (
                        <div className="flex gap-2 pt-0.5">
                          <Button
                            type="button"
                            size="sm"
                            className={cn(
                              PRIMARY_BTN,
                              "h-11 flex-1 rounded-2xl text-[13px]",
                            )}
                            disabled={payingId === e.id}
                            onClick={() => void payViaMpesa(e)}
                          >
                            {payingId === e.id ? "…" : "Send Money"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-11 rounded-2xl px-3 text-[13px] font-semibold"
                            disabled={payingId === e.id}
                            onClick={() => void cancelPay(e.id)}
                            title="Stop waiting on a pending Send Money"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>

              <div
                className={cn(
                  "hidden overflow-x-auto border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_1.5%,white)] md:block",
                  HAIRLINE,
                )}
              >
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead
                    className={cn(
                      "border-b bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3.5%,white)] text-[10px] font-semibold uppercase tracking-[0.1em]",
                      HAIRLINE,
                      dashboardHintClass(),
                    )}
                  >
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Source</th>
                      <th className="px-3 py-2.5">Method</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5">Books</th>
                      <th className="px-3 py-2.5">Paid</th>
                      <th className="px-3 py-2.5">Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className={cn("px-3 py-10 text-center", dashboardHintClass())}
                        >
                          No expenses in this range.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr
                          key={e.id}
                          className={cn(
                            "border-b last:border-0",
                            "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]",
                          )}
                        >
                          <td className="px-3 py-2.5 whitespace-nowrap text-[var(--order-ink,#15231f)]">
                            {formatFixedCostDate(e.expenseDate)}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-[var(--order-ink,#15231f)]">
                            {e.name}
                          </td>
                          <td className="px-3 py-2.5 text-[var(--order-ink,#15231f)]">
                            {expenseCategoryCodeLabel(e.categoryCode)}{" "}
                            <span className={dashboardHintClass()}>
                              ({categoryTypeLabel(e.categoryType)})
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-block border px-1.5 py-0.5 text-[11px] font-medium",
                                HAIRLINE,
                              )}
                            >
                              {expenseSourceLabel(e.source)}
                            </span>
                          </td>
                          <td className={cn("px-3 py-2.5", dashboardHintClass())}>
                            {paymentMethodLabel(e.paymentMethod)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                            {formatFixedCostMoney(moneyNumber(e.amount))}
                          </td>
                          <td className={cn("px-3 py-2.5", dashboardHintClass())}>
                            {e.approvalStatus === "pending_approval"
                              ? "Pending"
                              : e.approvalStatus === "rejected"
                                ? "Rejected"
                                : "Posted"}
                          </td>
                          <td className={cn("px-3 py-2.5", dashboardHintClass())}>
                            {e.paidAt
                              ? "Paid"
                              : e.paymentMethod === "mpesa_manual"
                                ? "Unpaid"
                                : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {e.approvalStatus === "posted" &&
                            e.paymentMethod === "mpesa_manual" &&
                            !e.paidAt &&
                            canManageFinanceExpenses ? (
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  className={cn(PRIMARY_BTN, "h-8 px-2 text-[12px]")}
                                  disabled={payingId === e.id}
                                  onClick={() => void payViaMpesa(e)}
                                >
                                  {payingId === e.id ? "…" : "Send Money"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 rounded-none px-2 text-[12px] font-semibold"
                                  disabled={payingId === e.id}
                                  onClick={() => void cancelPay(e.id)}
                                  title="Stop waiting on a pending Send Money"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2 text-sm">
                <Button
                  type="button"
                  size="sm"
                  className={OUTLINE_BTN}
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className={dashboardHintClass()}>
                  Page {page + 1}
                  {totalCount > 0 ? ` · ${totalCount} total` : null}
                </span>
                <Button
                  type="button"
                  size="sm"
                  className={OUTLINE_BTN}
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </section>
          ) : null}
        </>
      )}

      <OneOffExpenseDrawer
        open={addOpen}
        onOpenChange={setAddOpen}
        expenseDate={to}
        branches={branches}
        canManage={canWriteFinanceExpenses}
        onSaved={() => {
          setFeedback({ kind: "success", text: "Expense posted" });
          bump();
        }}
        onError={(message) => setFeedback({ kind: "error", text: message })}
      />

      {canPocket ? (
        <ProfitPocketDrawer
          open={profitPocketOpen}
          onOpenChange={setProfitPocketOpen}
          from={from}
          to={to}
          branchId={branchFilter || null}
          periodLabel={periodLabel}
          onPocketed={() => {
            setFeedback({
              kind: "success",
              text: "Cash surplus pocketed (owner drawings — does not change GP)",
            });
            bump();
          }}
        />
      ) : null}

      <ScheduleFormDrawer
        open={recurringOpen}
        onOpenChange={setRecurringOpen}
        branches={branches}
        saving={recurringSaving}
        onSavingChange={setRecurringSaving}
        onCreated={() => {
          setFeedback({ kind: "success", text: "Recurring expense saved" });
          setRecurringOpen(false);
          bump();
        }}
        onError={(message) => setFeedback({ kind: "error", text: message })}
      />
      </div>
    </div>
  );
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function triggerCsvDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  emphasize,
  action,
}: {
  label: string;
  value: number | string;
  emphasize?: boolean;
  action?: { label: string; onClick: () => void };
}) {
  const n = moneyNumber(value);
  return (
    <div
      className={cn(
        "border-b px-3 py-3.5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0",
        "lg:[&:nth-child(2)]:border-r lg:[&:nth-child(5)]:border-r-0",
        emphasize && "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]",
        HAIRLINE,
      )}
    >
      <p className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", dashboardHintClass())}>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 tabular-nums tracking-tight text-[var(--order-ink,#15231f)]",
          emphasize ? "text-2xl font-semibold" : "text-xl font-semibold",
          n < 0 && "text-[#9a2e16]",
        )}
      >
        {formatFixedCostMoney(n)}
      </p>
      {action ? (
        <button
          type="button"
          className="mt-2 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

async function loadUnpostedPayrollGap(
  from: string,
  to: string,
): Promise<{ count: number; netTotal: number } | null> {
  try {
    const months = monthsOverlappingRange(from, to);
    if (months.length === 0) return null;
    const batches = await Promise.all(
      months.map(({ year, month }) =>
        fetchPayrollPeriodPayslips(year, month).catch(() => []),
      ),
    );
    const seen = new Set<string>();
    let count = 0;
    let netTotal = 0;
    for (const slips of batches) {
      for (const slip of slips) {
        if (slip.expenseId) continue;
        if (seen.has(slip.id)) continue;
        seen.add(slip.id);
        count += 1;
        netTotal += moneyNumber(slip.netPaid);
      }
    }
    return { count, netTotal };
  } catch {
    return null;
  }
}

function shiftOverlapsRange(shift: ShiftListItem, from: string, to: string) {
  const opened = shift.openedAt.slice(0, 10);
  const closed = shift.closedAt?.slice(0, 10) ?? to;
  return opened <= to && closed >= from;
}

async function loadDrawoutsForExpensesHub(opts: {
  from: string;
  to: string;
  branchId?: string;
  includePending: boolean;
}): Promise<{ period: HubDrawout[]; pending: HubDrawout[] }> {
  const branchId = opts.branchId;
  const [openRes, recentRes, pendingRaw] = await Promise.all([
    fetchShifts({ branchId, status: "OPEN", page: 0, size: 50 }).catch(() => null),
    fetchShifts({ branchId, page: 0, size: 40 }).catch(() => null),
    opts.includePending
      ? fetchPendingDrawouts().catch(() => [] as DrawoutRecord[])
      : Promise.resolve([] as DrawoutRecord[]),
  ]);

  const byId = new Map<string, ShiftListItem>();
  for (const shift of openRes?.shifts ?? []) {
    byId.set(shift.id, shift);
  }
  for (const shift of recentRes?.shifts ?? []) {
    if (shift.status === "OPEN" || shiftOverlapsRange(shift, opts.from, opts.to)) {
      byId.set(shift.id, shift);
    }
  }

  const shifts = [...byId.values()].slice(0, 24);
  const drawoutLists = await Promise.all(
    shifts.map(async (shift) => {
      const list = await fetchShiftDrawouts(shift.id).catch(
        () => [] as DrawoutRecord[],
      );
      return list
        .filter((row) => {
          const day = row.createdAt.slice(0, 10);
          return day >= opts.from && day <= opts.to;
        })
        .map((row) => ({
          ...row,
          shiftCashierName: shift.cashierName,
        }));
    }),
  );

  return {
    period: hubDrawoutsFromRecords(drawoutLists.flat()),
    pending: hubDrawoutsFromRecords(pendingRaw),
  };
}

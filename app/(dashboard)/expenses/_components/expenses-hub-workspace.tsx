"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Scale } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
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
  initiateExpenseKopokopoPay,
  postExpenseScheduleOccurrence,
  postExpenseScheduleOccurrenceByDate,
  rejectFinanceExpense,
  skipExpenseScheduleOccurrence,
  skipExpenseScheduleOccurrenceByDate,
  type ExpenseScheduleOccurrenceRecord,
  type ExpenseScheduleRecord,
  type FinanceExpenseResponse,
  type ProfitAndLossResponse,
} from "@/lib/api";
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
import { cn } from "@/lib/utils";

type Feedback = { kind: "success" | "error"; text: string } | null;

export function ExpensesHubWorkspace() {
  const {
    loading: dashLoading,
    canReadFinanceExpenses,
    canWriteFinanceExpenses,
    canManageFinanceExpenses,
    canReadFinanceReports,
    canViewPayroll,
    branches,
  } = useDashboard();

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringSaving, setRecurringSaving] = useState(false);

  const pageSize = 50;

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

      const [plRes, listRes, occRes, payrollGap, pendingRes, schedulesRes] =
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
      setPl(null);
      setExpenses([]);
      setOccurrences([]);
      setUnpostedPayroll(null);
      setPendingApprovals([]);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [
    canOpen,
    canReadFinanceReports,
    canReadFinanceExpenses,
    canManageFinanceExpenses,
    canViewPayroll,
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
        const reason = !options.payoutEnabled
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
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-6 pb-16")}>
      <DashboardPageHero
        icon={Scale}
        title="Expenses & profit"
        description="Sales, cost of goods, operating expenses, and net operating profit — in one place."
      >
        <div className="flex flex-wrap gap-2">
          {canWriteFinanceExpenses ? (
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add expense
            </Button>
          ) : null}
          {canManageFinanceExpenses ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setRecurringOpen(true)}
            >
              Recurring
            </Button>
          ) : null}
          {canReadFinanceExpenses ? (
            <Button
              type="button"
              variant="outline"
              onClick={downloadExpensesCsv}
            >
              CSV expenses
            </Button>
          ) : null}
          {pl ? (
            <Button type="button" variant="outline" onClick={downloadPlCsv}>
              CSV P&amp;L
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => bump()}
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </DashboardPageHero>

      {feedback ? (
        <DashboardFeedback kind={feedback.kind} text={feedback.text} />
      ) : null}

      <section className={cn(DASHBOARD_SECTION_SURFACE, "space-y-3 p-4")}>
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
                onClick={() => applyPreset(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">From</span>
            <input
              type="date"
              className={dashboardInputClass}
              value={from}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">To</span>
            <input
              type="date"
              className={dashboardInputClass}
              value={to}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Branch</span>
            <select
              className={dashboardSelectClass}
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
        <p className="text-xs text-muted-foreground">
          Stock purchases stay in inventory / COGS — they are not operating
          expenses. Amounts below are{" "}
          <span className="font-medium text-foreground">Posted (books)</span>,
          not proof that money left the account.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={APP_ROUTES.fixedCosts}
            className="text-primary underline-offset-2 hover:underline"
          >
            Fixed costs
          </Link>
          <Link
            href={APP_ROUTES.payroll}
            className="text-primary underline-offset-2 hover:underline"
          >
            Payroll
          </Link>
          <Link
            href={APP_ROUTES.purchasingApAging}
            className="text-primary underline-offset-2 hover:underline"
          >
            Supplier bills
          </Link>
          <Link
            href={APP_ROUTES.paymentsDayLedger}
            className="text-primary underline-offset-2 hover:underline"
          >
            Today&apos;s takings
          </Link>
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
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Sales" value={pl.revenue} />
              <MetricCard label="COGS" value={pl.cogs} />
              <MetricCard label="Gross profit" value={pl.grossProfit} />
              <MetricCard label="Operating expenses" value={pl.operatingExpenses} />
              <MetricCard
                label="Net operating profit"
                value={pl.netOperating}
                emphasize
              />
            </section>
          ) : canReadFinanceReports ? (
            <p className="text-sm text-muted-foreground">
              No P&amp;L data for this period.
            </p>
          ) : null}

          {otherAdjustments != null && Math.abs(otherAdjustments) >= 0.01 ? (
            <p className="text-sm text-muted-foreground">
              Other adjustments (ledger OpEx not in the expense table):{" "}
              <span className="font-medium text-foreground">
                {formatFixedCostMoney(otherAdjustments)}
              </span>
            </p>
          ) : null}

          {unpostedPayroll && unpostedPayroll.count > 0 ? (
            <div
              className={cn(
                DASHBOARD_SECTION_SURFACE,
                "border-amber-700/30 bg-amber-50/40 px-4 py-3 text-sm",
              )}
            >
              <p className="font-medium text-amber-950">
                {unpostedPayroll.count} payslip
                {unpostedPayroll.count === 1 ? "" : "s"} not posted to expenses
              </p>
              <p className="mt-1 text-amber-900/80">
                Net paid{" "}
                <span className="font-medium tabular-nums">
                  {formatFixedCostMoney(unpostedPayroll.netTotal)}
                </span>{" "}
                is missing from operating expenses for this period. Post from
                payroll (enable “post expense”) — this hub does not invent OpEx
                rows.
              </p>
              <Link
                href={APP_ROUTES.payroll}
                className="mt-2 inline-block text-primary underline-offset-2 hover:underline"
              >
                Open payroll
              </Link>
            </div>
          ) : null}

          {salaryScheduleWarning ? (
            <div
              className={cn(
                DASHBOARD_SECTION_SURFACE,
                "border-amber-700/30 bg-amber-50/40 px-4 py-3 text-sm",
              )}
            >
              <p className="font-medium text-amber-950">
                Salary-like recurring schedule detected
              </p>
              <p className="mt-1 text-amber-900/80">
                Paying staff through a fixed-cost schedule can double-count
                salaries already posted from payroll. Prefer{" "}
                <Link
                  href={APP_ROUTES.payroll}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  payroll
                </Link>{" "}
                for wages.
              </p>
            </div>
          ) : null}

          {canManageFinanceExpenses && pendingApprovals.length > 0 ? (
            <section className={cn(DASHBOARD_SECTION_SURFACE, "space-y-3 p-4")}>
              <h2 className="text-sm font-semibold tracking-tight">
                Pending approval
              </h2>
              <ul className="divide-y divide-border/60">
                {pendingApprovals.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-muted-foreground">
                        {formatFixedCostDate(e.expenseDate)} ·{" "}
                        {formatFixedCostMoney(moneyNumber(e.amount))} ·{" "}
                        {expenseSourceLabel(e.source)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void approvePending(e.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
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
            <section className={cn(DASHBOARD_SECTION_SURFACE, "space-y-3 p-4")}>
              <h2 className="text-sm font-semibold tracking-tight">
                Upcoming & overdue
              </h2>
              <ul className="divide-y divide-border/60">
                {upcoming.map((o) => (
                  <li
                    key={`${o.scheduleId}-${o.occurrenceDate}-${o.id ?? "x"}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{o.scheduleName}</p>
                      <p className="text-muted-foreground">
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
                          variant="outline"
                          onClick={() => void postOcc(o)}
                        >
                          Post
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
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
            <section className={cn(DASHBOARD_SECTION_SURFACE, "space-y-4 p-4")}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    Expenses
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {totalCount} in range · this page{" "}
                    {formatFixedCostMoney(tableSum)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className={dashboardSelectClass}
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
                    className={dashboardSelectClass}
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
                    className={cn(dashboardInputClass, "w-40")}
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
                    variant="outline"
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
                <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {categoryBreakdown.map((row) => (
                    <li key={row.code}>
                      <span className="font-medium text-foreground">
                        {expenseCategoryCodeLabel(row.code)}
                      </span>{" "}
                      {formatFixedCostMoney(row.total)}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className={cn(DASHBOARD_TABLE_SURFACE, "overflow-x-auto")}>
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Method</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Amount
                      </th>
                      <th className="px-3 py-2 font-medium">Books</th>
                      <th className="px-3 py-2 font-medium">Paid</th>
                      <th className="px-3 py-2 font-medium">Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          No expenses in this range.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr
                          key={e.id}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatFixedCostDate(e.expenseDate)}
                          </td>
                          <td className="px-3 py-2">{e.name}</td>
                          <td className="px-3 py-2">
                            {expenseCategoryCodeLabel(e.categoryCode)}{" "}
                            <span className="text-muted-foreground">
                              ({categoryTypeLabel(e.categoryType)})
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-block border border-border/60 px-1.5 py-0.5 text-xs">
                              {expenseSourceLabel(e.source)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {paymentMethodLabel(e.paymentMethod)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatFixedCostMoney(moneyNumber(e.amount))}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {e.approvalStatus === "pending_approval"
                              ? "Pending"
                              : e.approvalStatus === "rejected"
                                ? "Rejected"
                                : "Posted"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {e.paidAt
                              ? "Paid"
                              : e.paymentMethod === "mpesa_manual"
                                ? "Unpaid"
                                : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {e.approvalStatus === "posted" &&
                            e.paymentMethod === "mpesa_manual" &&
                            !e.paidAt &&
                            canManageFinanceExpenses ? (
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={payingId === e.id}
                                  onClick={() => void payViaMpesa(e)}
                                >
                                  {payingId === e.id ? "…" : "Send Money"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
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
                  variant="outline"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {page + 1}
                  {totalCount > 0
                    ? ` · ${totalCount} total`
                    : null}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
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
}: {
  label: string;
  value: number | string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        DASHBOARD_SECTION_SURFACE,
        "p-4",
        emphasize && "ring-1 ring-foreground/15",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 tabular-nums tracking-tight",
          emphasize ? "text-2xl font-semibold" : "text-xl font-medium",
        )}
      >
        {formatFixedCostMoney(moneyNumber(value))}
      </p>
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

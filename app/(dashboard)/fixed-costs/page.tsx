"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Receipt } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";
import {
  fetchExpenseSchedules,
  fetchFinancePulse,
  type ExpenseScheduleRecord,
} from "@/lib/api";
import {
  formatFixedCostMoney,
  monthlyCommitmentForSchedule,
} from "@/lib/fixed-costs-utils";

import { ExpenseHistoryPanel } from "./_components/expense-history-panel";
import { FixedCostsCalendarPanel } from "./_components/fixed-costs-calendar-panel";
import { FixedCostsMonthNav } from "./_components/fixed-costs-month-nav";
import { OccurrencesPanel } from "./_components/occurrences-panel";
import { ScheduleEditDrawer } from "./_components/schedule-edit-drawer";
import { ScheduleFormDrawer } from "./_components/schedule-form-drawer";
import { SchedulesPanel } from "./_components/schedules-panel";

type Tab = "schedules" | "calendar" | "history";

export default function FixedCostsPage() {
  const {
    loading: dashLoading,
    canReadFinanceExpenses,
    canWriteFinanceExpenses,
    branches,
  } = useDashboard();

  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<Tab>("schedules");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [branchFilter, setBranchFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExpenseScheduleRecord | null>(
    null,
  );
  const [commitment, setCommitment] = useState(0);
  const [activeScheduleCount, setActiveScheduleCount] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState<number | null>(null);

  const loadSummary = useCallback(async () => {
    if (!canReadFinanceExpenses) return;
    try {
      const schedules = await fetchExpenseSchedules();
      const filtered = branchFilter
        ? schedules.filter((s) => !s.branchId || s.branchId === branchFilter)
        : schedules;
      setCommitment(
        filtered.reduce(
          (sum, s) =>
            sum +
            monthlyCommitmentForSchedule({
              amount: Number(s.amount),
              frequency: s.frequency,
              startDate: s.startDate,
              endDate: s.endDate,
              active: s.active,
              year,
              month,
            }),
          0,
        ),
      );
      setActiveScheduleCount(filtered.filter((s) => s.active).length);
      const isCurrentMonth =
        year === now.getFullYear() && month === now.getMonth() + 1;
      if (isCurrentMonth) {
        const pulse = await fetchFinancePulse().catch(() => null);
        if (pulse) setExpensesTotal(Number(pulse.expensesTotal));
        else setExpensesTotal(null);
      } else {
        setExpensesTotal(null);
      }
    } catch {
      /* summary is best-effort */
    }
  }, [canReadFinanceExpenses, branchFilter, year, month, now]);

  useEffect(() => {
    if (!dashLoading && canReadFinanceExpenses) {
      void loadSummary();
    }
  }, [dashLoading, canReadFinanceExpenses, loadSummary, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const selectCalendarMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setTab("schedules");
  };

  if (dashLoading) {
    return null;
  }

  if (!canReadFinanceExpenses) {
    return (
      <DashboardAccessDenied
        title="Fixed costs"
        description="You don't have permission to view fixed costs."
      />
    );
  }

  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className={cn("mx-auto space-y-6", DASHBOARD_MAX_WIDE)}>
      <DashboardPageHero
        icon={Building2}
        eyebrow="Finance"
        title="Fixed costs"
        description="Shop rent, utilities, and repeating bills — scheduled once, posted to finance automatically."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "schedules"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("schedules")}
        >
          Schedules
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "calendar"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("calendar")}
        >
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            Calendar
          </span>
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "history"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("history")}
        >
          <span className="inline-flex items-center gap-1.5">
            <Receipt className="size-3.5" aria-hidden />
            Posted expenses
          </span>
        </button>
      </div>

      {tab !== "calendar" ? (
        <FixedCostsMonthNav
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
          onRefresh={refresh}
        />
      ) : null}

      {tab === "schedules" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard
              label="Monthly commitment"
              value={formatFixedCostMoney(commitment)}
              hint="Expected from active schedules"
            />
            <SummaryCard
              label="Active schedules"
              value={String(activeScheduleCount)}
              hint="Rent, utilities, and other repeating costs below"
            />
            {expensesTotal != null ? (
              <SummaryCard
                label="Posted today (finance)"
                value={formatFixedCostMoney(expensesTotal)}
                hint="All expenses recorded today in the ledger"
              />
            ) : null}
          </div>

          {branches.length > 0 ? (
            <label className="flex w-fit flex-col gap-1 text-xs font-medium text-muted-foreground">
              Branch
              <select
                className={dashboardSelectClass(false, "min-w-[10rem]")}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      ) : null}

      {feedback ? (
        <DashboardFeedback kind={feedback.kind} text={feedback.text} />
      ) : null}

      {tab === "schedules" ? (
        <>
          <OccurrencesPanel
            year={year}
            month={month}
            branchFilter={branchFilter}
            canManage={canWriteFinanceExpenses}
            refreshKey={refreshKey}
            onFeedback={(kind, text) => setFeedback({ kind, text })}
            onChanged={refresh}
          />
          <SchedulesPanel
            year={year}
            month={month}
            branchFilter={branchFilter}
            branches={branchOptions}
            canManage={canWriteFinanceExpenses}
            onAdd={() => setScheduleOpen(true)}
            onEdit={(schedule) => {
              setEditingSchedule(schedule);
              setEditOpen(true);
            }}
            refreshKey={refreshKey}
            onFeedback={(kind, text) => setFeedback({ kind, text })}
          />
        </>
      ) : null}

      {tab === "calendar" ? (
        <FixedCostsCalendarPanel
          year={calendarYear}
          branchFilter={branchFilter}
          branches={branchOptions}
          onYearChange={setCalendarYear}
          onBranchFilterChange={setBranchFilter}
          onSelectMonth={selectCalendarMonth}
        />
      ) : null}

      {tab === "history" ? (
        <ExpenseHistoryPanel year={year} month={month} refreshKey={refreshKey} />
      ) : null}

      <ScheduleFormDrawer
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        branches={branchOptions}
        saving={scheduleSaving}
        onSavingChange={setScheduleSaving}
        onCreated={() => {
          setFeedback({ kind: "success", text: "Fixed cost schedule saved." });
          refresh();
        }}
        onError={(text) => setFeedback({ kind: "error", text })}
      />

      <ScheduleEditDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        schedule={editingSchedule}
        branches={branchOptions}
        saving={editSaving}
        onSavingChange={setEditSaving}
        onSaved={() => {
          setFeedback({ kind: "success", text: "Schedule updated." });
          refresh();
        }}
        onError={(text) => setFeedback({ kind: "error", text })}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "space-y-1")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

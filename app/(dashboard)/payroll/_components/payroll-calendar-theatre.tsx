"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
} from "lucide-react";

import {
  DashboardLoadError,
  DashboardLoading,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchPayrollCalendar,
  type PayrollCalendarMonth,
  type PayrollCalendarStatus,
} from "@/lib/api";
import {
  formatPayrollMoney,
  payrollCalendarMonthName,
  payrollCalendarMonthProgress,
  payrollCalendarShortMonth,
  payrollCalendarStatusHint,
  payrollCalendarStatusLabel,
} from "@/lib/payroll-utils";
import { cn } from "@/lib/utils";

type BranchOption = { id: string; name: string };

type StatusFilter = "all" | "open" | "closed" | "upcoming";

type Props = {
  year: number;
  branchFilter: string;
  branches: BranchOption[];
  onYearChange: (year: number) => void;
  onBranchFilterChange: (branchId: string) => void;
  onSelectMonth: (year: number, month: number) => void;
};

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function statusTone(status: PayrollCalendarStatus): string {
  if (status === "paid") {
    return "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white";
  }
  if (status === "pending" || status === "missing_salary") {
    return "border-[#9a2e16]/35 bg-transparent text-[#9a2e16]";
  }
  return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground";
}

export function PayrollCalendarTheatre({
  year,
  branchFilter,
  branches,
  onYearChange,
  onBranchFilterChange,
  onSelectMonth,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<PayrollCalendarMonth[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPayrollCalendar(year, {
        branchId: branchFilter || undefined,
      });
      setMonths(data.months);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
      setMonths([]);
    } finally {
      setLoading(false);
    }
  }, [year, branchFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedMonth(null);
  }, [year, branchFilter]);

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : null;

  const summary = useMemo(() => {
    const actionable = months.filter(
      (m) => m.status !== "future" && m.status !== "empty",
    );
    const closed = actionable.filter((m) => m.status === "paid");
    const open = actionable.filter(
      (m) => m.status === "pending" || m.status === "missing_salary",
    );
    return {
      paid: closed.length,
      pending: months.filter((m) => m.status === "pending").length,
      missingSalary: months.filter((m) => m.status === "missing_salary")
        .length,
      openCount: open.length,
      actionable: actionable.length,
      totalNetPaid: months.reduce((sum, m) => sum + Number(m.totalNetPaid), 0),
      yearProgress:
        actionable.length > 0
          ? Math.round((closed.length / actionable.length) * 100)
          : 0,
    };
  }, [months]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return months.filter((month) => {
      const name = payrollCalendarMonthName(month.month).toLowerCase();
      const short = payrollCalendarShortMonth(month.month).toLowerCase();
      const matchesQuery = !q || name.includes(q) || short.includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" &&
          (month.status === "pending" || month.status === "missing_salary")) ||
        (statusFilter === "closed" && month.status === "paid") ||
        (statusFilter === "upcoming" &&
          (month.status === "future" || month.status === "empty"));
      return matchesQuery && matchesStatus;
    });
  }, [months, query, statusFilter]);

  const selected = useMemo(
    () => months.find((m) => m.month === selectedMonth) ?? null,
    [months, selectedMonth],
  );

  const counts = useMemo(
    () => ({
      all: months.length,
      open: months.filter(
        (m) => m.status === "pending" || m.status === "missing_salary",
      ).length,
      closed: months.filter((m) => m.status === "paid").length,
      upcoming: months.filter(
        (m) => m.status === "future" || m.status === "empty",
      ).length,
    }),
    [months],
  );

  if (loading) {
    return <DashboardLoading label="Loading payroll calendar…" />;
  }
  if (error) {
    return (
      <DashboardLoadError
        title="Couldn't load calendar"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search month…"
              aria-label="Search calendar months"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "All", counts.all],
                ["open", "Open", counts.open],
                ["closed", "Closed", counts.closed],
                ["upcoming", "Later", counts.upcoming],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                aria-pressed={statusFilter === id}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-none border px-1.5 text-[10px] font-semibold",
                  statusFilter === id
                    ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                )}
                onClick={() => setStatusFilter(id)}
              >
                {label}
                <span className="tabular-nums opacity-80">{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {filtered.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              No months match.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((month) => {
                const active = selectedMonth === month.month;
                return (
                  <li key={month.month}>
                    <button
                      type="button"
                      onClick={() => setSelectedMonth(month.month)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center border text-[10px] font-bold uppercase",
                          active || month.status === "paid"
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {payrollCalendarShortMonth(month.month).slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em]",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {payrollCalendarMonthName(month.month)}
                          {currentMonth === month.month ? (
                            <span className="ml-1.5 text-[10px] font-medium text-[var(--pos-primary,#0f766e)]">
                              Now
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {payrollCalendarStatusHint(month)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-none border px-1.5 py-0.5 text-[9px] font-semibold",
                          statusTone(month.status),
                        )}
                      >
                        {payrollCalendarStatusLabel(month.status)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = selected ? (
    <MonthFocus
      month={selected}
      year={year}
      isCurrent={currentMonth === selected.month}
      onOpenRun={() => onSelectMonth(year, selected.month)}
      className="h-full min-h-0"
    />
  ) : (
    <YearPulse
      year={year}
      summary={summary}
      months={months}
      currentMonth={currentMonth}
      onSelect={(m) => setSelectedMonth(m)}
      className="h-full min-h-0"
    />
  );

  const inspect = selected ? (
    <MonthInspect
      month={selected}
      year={year}
      isCurrent={currentMonth === selected.month}
      onOpenRun={() => onSelectMonth(year, selected.month)}
      onClear={() => setSelectedMonth(null)}
    />
  ) : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a month
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The map in the middle is the year. The list on the left names each
          pay period.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
          "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Previous year"
              onClick={() => onYearChange(year - 1)}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </Button>
            <p className="flex items-center gap-1.5 text-[12px]">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <LiveDot />
                {year}
              </span>
              <span className={dashboardHintClass()}>
                {summary.paid}/{summary.actionable || 12} closed ·{" "}
                {summary.yearProgress}%
              </span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Next year"
              onClick={() => onYearChange(year + 1)}
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
          {branches.length > 0 ? (
            <select
              className={cn(
                dashboardSelectClass(false),
                "h-7 w-auto max-w-[10rem] py-0 text-[11px]",
              )}
              value={branchFilter}
              onChange={(e) => onBranchFilterChange(e.target.value)}
              aria-label="Filter by branch"
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 text-[11px]"
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            The year
          </p>
          {room}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
        {selected ? (
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3">
            <MonthInspect
              month={selected}
              year={year}
              isCurrent={currentMonth === selected.month}
              onOpenRun={() => onSelectMonth(year, selected.month)}
              onClear={() => setSelectedMonth(null)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function YearPulse({
  year,
  summary,
  months,
  currentMonth,
  onSelect,
  className,
}: {
  year: number;
  summary: {
    paid: number;
    openCount: number;
    actionable: number;
    yearProgress: number;
    totalNetPaid: number;
    missingSalary: number;
  };
  months: PayrollCalendarMonth[];
  currentMonth: number | null;
  onSelect: (month: number) => void;
  className?: string;
}) {
  const attention = months
    .filter((m) => m.status === "pending" || m.status === "missing_salary")
    .slice(0, 4);
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M22 42 C 38 28, 58 22, 72 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M28 48 C 48 58, 62 52, 74 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <article className={cn(card, "left-[8%] top-[18%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Year progress
        </p>
        <p
          className="mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.04em] tabular-nums"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {summary.paid}/{summary.actionable || 12}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          months closed in {year}
        </p>
        <div className="mt-3 h-1 overflow-hidden bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
          <div
            className="h-full bg-[var(--pos-primary,#0f766e)] transition-all"
            style={{ width: `${summary.yearProgress}%` }}
          />
        </div>
      </article>

      <article className={cn(card, "right-[6%] top-[42%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Snapshot
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <div>
            <dt className="text-[10px] text-muted-foreground">Open</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                summary.openCount > 0 && "text-[#9a2e16]",
              )}
            >
              {summary.openCount}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Blocked</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                summary.missingSalary > 0 && "text-[#9a2e16]",
              )}
            >
              {summary.missingSalary}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] text-muted-foreground">Net paid</dt>
            <dd className="font-semibold tabular-nums">
              {formatPayrollMoney(summary.totalNetPaid)}
            </dd>
          </div>
        </dl>
      </article>

      {attention.length > 0 ? (
        <article
          className={cn(
            card,
            "bottom-[12%] left-[14%] w-[min(19rem,calc(100%-1.5rem))]",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Needs attention
          </p>
          <ul className="mt-2 space-y-1.5">
            {attention.map((month) => (
              <li key={month.month}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left text-[12px] hover:text-[var(--pos-primary,#0f766e)]"
                  onClick={() => onSelect(month.month)}
                >
                  <span className="font-medium">
                    {payrollCalendarMonthName(month.month)}
                    {currentMonth === month.month ? " · now" : ""}
                  </span>
                  <span className="text-[10px] text-[#9a2e16]">
                    {payrollCalendarStatusLabel(month.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function MonthFocus({
  month,
  year,
  isCurrent,
  onOpenRun,
  className,
}: {
  month: PayrollCalendarMonth;
  year: number;
  isCurrent: boolean;
  onOpenRun: () => void;
  className?: string;
}) {
  const progress = payrollCalendarMonthProgress(month);
  const card =
    "absolute z-[1] w-[min(18rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-4 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <article className={cn(card, "left-1/2 top-[28%] -translate-x-1/2")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {year}
          {isCurrent ? " · this month" : ""}
        </p>
        <p
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {payrollCalendarMonthName(month.month)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {payrollCalendarStatusHint(month)}
        </p>
        {month.headcount > 0 ? (
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Staff paid</span>
              <span className="tabular-nums font-semibold">
                {month.paidCount}/{month.headcount} · {progress}%
              </span>
            </div>
            <div className="h-1 overflow-hidden bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
              <div
                className="h-full bg-[var(--pos-primary,#0f766e)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="mt-4 h-8 w-full gap-1.5 rounded-none shadow-none"
          onClick={onOpenRun}
        >
          Open pay run
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
      </article>
    </div>
  );
}

function MonthInspect({
  month,
  year,
  isCurrent,
  onOpenRun,
  onClear,
}: {
  month: PayrollCalendarMonth;
  year: number;
  isCurrent: boolean;
  onOpenRun: () => void;
  onClear: () => void;
}) {
  const Icon =
    month.status === "paid"
      ? CheckCircle2
      : month.status === "pending" || month.status === "missing_salary"
        ? Clock
        : CalendarDays;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain bg-white">
      <div className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.25rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {payrollCalendarMonthName(month.month)} {year}
        </h3>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {isCurrent ? "Current period · " : ""}
          {payrollCalendarStatusHint(month)}
        </p>
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-none border px-1.5 py-0.5 text-[10px] font-semibold",
            statusTone(month.status),
          )}
        >
          <Icon className="size-3" aria-hidden />
          {payrollCalendarStatusLabel(month.status)}
        </span>
      </div>
      <dl className="space-y-2 px-4 py-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Headcount</dt>
          <dd className="tabular-nums font-semibold">{month.headcount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="tabular-nums font-semibold">{month.paidCount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Pending</dt>
          <dd className="tabular-nums font-semibold">{month.pendingCount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Missing salary</dt>
          <dd className="tabular-nums font-semibold">
            {month.missingSalaryCount}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Net paid</dt>
          <dd className="tabular-nums font-semibold">
            {formatPayrollMoney(month.totalNetPaid)}
          </dd>
        </div>
      </dl>
      <div className="mt-auto space-y-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 py-3">
        <Button
          type="button"
          size="sm"
          className="h-8 w-full gap-1.5 rounded-none shadow-none"
          onClick={onOpenRun}
        >
          Open pay run
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full rounded-none shadow-none"
          onClick={onClear}
        >
          Clear selection
        </Button>
      </div>
    </div>
  );
}

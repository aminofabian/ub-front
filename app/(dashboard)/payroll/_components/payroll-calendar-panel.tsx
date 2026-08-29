"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

import {
  DashboardLoadError,
  DashboardLoading,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

type BranchOption = { id: string; name: string };

type Props = {
  year: number;
  branchFilter: string;
  branches: BranchOption[];
  onYearChange: (year: number) => void;
  onBranchFilterChange: (branchId: string) => void;
  onSelectMonth: (year: number, month: number) => void;
};

const STATUS_META: Record<
  PayrollCalendarStatus,
  {
    label: string;
    ring: string;
    bg: string;
    text: string;
    bar: string;
    icon: typeof CheckCircle2;
  }
> = {
  paid: {
    label: "Closed",
    ring: "ring-emerald-500/30",
    bg: "from-emerald-500/12 via-emerald-500/5 to-transparent",
    text: "text-emerald-800 dark:text-emerald-200",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
  },
  pending: {
    label: "Open",
    ring: "ring-amber-500/40",
    bg: "from-amber-500/14 via-amber-500/5 to-transparent",
    text: "text-amber-950 dark:text-amber-100",
    bar: "bg-amber-500",
    icon: Clock,
  },
  missing_salary: {
    label: "Blocked",
    ring: "ring-red-500/35",
    bg: "from-red-500/12 via-red-500/5 to-transparent",
    text: "text-red-900 dark:text-red-100",
    bar: "bg-red-500",
    icon: AlertCircle,
  },
  future: {
    label: "Upcoming",
    ring: "ring-border/60",
    bg: "from-muted/30 to-transparent",
    text: "text-muted-foreground",
    bar: "bg-muted-foreground/35",
    icon: CalendarDays,
  },
  empty: {
    label: "Empty",
    ring: "ring-border/40",
    bg: "from-muted/20 to-transparent",
    text: "text-muted-foreground",
    bar: "bg-muted-foreground/25",
    icon: CalendarDays,
  },
};

export function PayrollCalendarPanel({
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
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

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
      missingSalary: months.filter((m) => m.status === "missing_salary").length,
      openCount: open.length,
      actionable: actionable.length,
      totalNetPaid: months.reduce((sum, m) => sum + Number(m.totalNetPaid), 0),
      yearProgress:
        actionable.length > 0
          ? Math.round((closed.length / actionable.length) * 100)
          : 0,
    };
  }, [months]);

  const grouped = useMemo(() => {
    const needsAction = months.filter(
      (m) => m.status === "pending" || m.status === "missing_salary",
    );
    const closed = months.filter((m) => m.status === "paid");
    const rest = months.filter(
      (m) => m.status === "future" || m.status === "empty",
    );
    return { needsAction, closed, rest };
  }, [months]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onYearChange(year - 1)}
            aria-label="Previous year"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Calendar year
            </p>
            <p className="text-lg font-semibold tabular-nums">{year}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onYearChange(year + 1)}
            aria-label="Next year"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {branches.length > 0 ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Branch
            <select
              className={dashboardSelectClass(false, "min-w-[10rem]")}
              value={branchFilter}
              onChange={(e) => onBranchFilterChange(e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/25 shadow-sm">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Year progress
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {summary.paid}/{summary.actionable || 12}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  months closed
                </span>
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${summary.yearProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.openCount > 0
                ? `${summary.openCount} month${summary.openCount === 1 ? "" : "s"} still need a pay run`
                : summary.actionable > 0
                  ? "All due months are closed for this year"
                  : "No pay runs due yet this year"}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <StatTile label="Open runs" value={String(summary.openCount)} warn={summary.openCount > 0} />
            <StatTile label="Closed" value={String(summary.paid)} success />
            <StatTile label="Blocked" value={String(summary.missingSalary)} warn={summary.missingSalary > 0} />
            <StatTile
              label="Net paid"
              value={`KES ${formatPayrollMoney(summary.totalNetPaid)}`}
            />
          </dl>
        </div>

        <div className="border-t border-border/50 px-4 py-4 sm:px-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {year} at a glance
          </p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {months.map((month) => (
              <TimelineCell
                key={month.month}
                month={month}
                isCurrent={currentMonth === month.month}
                isHovered={hoverMonth === month.month}
                onHover={setHoverMonth}
                onSelect={() => onSelectMonth(year, month.month)}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {(["paid", "pending", "missing_salary", "future"] as const).map((status) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <span
                  className={cn("size-2 rounded-full", STATUS_META[status].bar)}
                  aria-hidden
                />
                {payrollCalendarStatusLabel(status)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {grouped.needsAction.length > 0 ? (
        <section className="space-y-3">
          <header className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Clock className="size-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Needs your attention</h3>
              <p className="text-xs text-muted-foreground">
                Open or blocked months — jump straight into the pay run
              </p>
            </div>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {grouped.needsAction.map((month) => (
              <MonthCard
                key={month.month}
                month={month}
                year={year}
                isCurrent={currentMonth === month.month}
                emphasis
                onSelect={() => onSelectMonth(year, month.month)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {grouped.closed.length > 0 ? (
        <section className="space-y-3">
          <header className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Closed months</h3>
              <p className="text-xs text-muted-foreground">
                Pay run complete — tap to review payslips
              </p>
            </div>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {grouped.closed.map((month) => (
              <MonthCard
                key={month.month}
                month={month}
                year={year}
                isCurrent={currentMonth === month.month}
                onSelect={() => onSelectMonth(year, month.month)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {grouped.rest.length > 0 ? (
        <section className="space-y-3">
          <header>
            <h3 className="text-sm font-semibold text-muted-foreground">Upcoming & empty</h3>
          </header>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {grouped.rest.map((month) => (
              <MonthCard
                key={month.month}
                month={month}
                year={year}
                isCurrent={currentMonth === month.month}
                compact
                onSelect={() => onSelectMonth(year, month.month)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TimelineCell({
  month,
  isCurrent,
  isHovered,
  onHover,
  onSelect,
}: {
  month: PayrollCalendarMonth;
  isCurrent: boolean;
  isHovered: boolean;
  onHover: (month: number | null) => void;
  onSelect: () => void;
}) {
  const progress = payrollCalendarMonthProgress(month);
  const partial =
    month.status === "pending" && month.paidCount > 0 && month.pendingCount > 0;

  return (
    <button
      type="button"
      title={`${payrollCalendarMonthName(month.month)} — ${payrollCalendarStatusLabel(month.status)}`}
      className={cn(
        "group relative flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        month.status === "paid" && "border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20",
        month.status === "pending" && "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20",
        month.status === "missing_salary" && "border-red-500/35 bg-red-500/10 hover:bg-red-500/20",
        month.status === "future" && "border-border/50 bg-muted/20 hover:bg-muted/30",
        month.status === "empty" && "border-border/40 bg-muted/10 hover:bg-muted/15",
        isCurrent && "ring-2 ring-primary/40",
        isHovered && "scale-105 shadow-sm",
      )}
      onMouseEnter={() => onHover(month.month)}
      onMouseLeave={() => onHover(null)}
      onClick={onSelect}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {payrollCalendarShortMonth(month.month)}
      </span>
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
          month.status === "paid" && "bg-emerald-500 text-white",
          month.status === "pending" && "bg-amber-500 text-white",
          month.status === "missing_salary" && "bg-red-500 text-white",
          (month.status === "future" || month.status === "empty") &&
            "bg-muted text-muted-foreground",
        )}
      >
        {month.status === "paid" ? (
          <CheckCircle2 className="size-3.5" aria-hidden />
        ) : month.status === "pending" ? (
          partial ? `${progress}%` : "!"
        ) : month.status === "missing_salary" ? (
          "!"
        ) : (
          "·"
        )}
      </span>
    </button>
  );
}

function MonthCard({
  month,
  year,
  isCurrent,
  emphasis,
  compact,
  onSelect,
}: {
  month: PayrollCalendarMonth;
  year: number;
  isCurrent: boolean;
  emphasis?: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  const meta = STATUS_META[month.status];
  const Icon = meta.icon;
  const progress = payrollCalendarMonthProgress(month);
  const showProgress =
    month.headcount > 0 &&
    (month.status === "pending" || month.status === "paid");

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-muted/20",
          meta.ring,
          isCurrent && "ring-2 ring-primary/30",
        )}
      >
        <p className="text-xs font-medium">{payrollCalendarShortMonth(month.month)}</p>
        <p className={cn("text-[10px]", meta.text)}>
          {payrollCalendarStatusLabel(month.status)}
        </p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden rounded-2xl border text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        emphasis ? "border-amber-500/30 p-5" : "border-border/60 p-4",
        isCurrent && "ring-2 ring-primary/35",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
          meta.bg,
        )}
        aria-hidden
      />

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {year}
            </p>
            <p className="text-lg font-semibold">{payrollCalendarMonthName(month.month)}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
              month.status === "paid" && "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
              month.status === "pending" && "bg-amber-500/20 text-amber-950 dark:text-amber-100",
              month.status === "missing_salary" &&
                "bg-red-500/20 text-red-900 dark:text-red-100",
              (month.status === "future" || month.status === "empty") &&
                "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-3" aria-hidden />
            {meta.label}
          </span>
        </div>

        {isCurrent ? (
          <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            This month
          </span>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {payrollCalendarStatusHint(month)}
        </p>

        {showProgress ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Staff paid</span>
              <span className="tabular-nums font-medium">
                {month.paidCount}/{month.headcount}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
              <div
                className={cn("h-full rounded-full transition-all", meta.bar)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {Number(month.totalNetPaid) > 0 ? (
          <p className="text-sm font-semibold tabular-nums">
            KES {formatPayrollMoney(Number(month.totalNetPaid))}{" "}
            <span className="text-xs font-normal text-muted-foreground">net paid</span>
          </p>
        ) : month.status === "pending" || month.status === "missing_salary" ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            Open pay run
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
    </button>
  );
}

function StatTile({
  label,
  value,
  warn,
  success,
}: {
  label: string;
  value: string;
  warn?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          warn && "text-amber-800 dark:text-amber-200",
          success && "text-emerald-700 dark:text-emerald-300",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
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
  payrollCalendarCellClass,
  payrollCalendarDotClass,
  payrollCalendarMonthName,
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

const LEGEND: PayrollCalendarStatus[] = [
  "paid",
  "pending",
  "missing_salary",
  "future",
];

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

  const summary = useMemo(() => {
    const actionable = months.filter(
      (m) => m.status !== "future" && m.status !== "empty",
    );
    return {
      paid: actionable.filter((m) => m.status === "paid").length,
      pending: actionable.filter((m) => m.status === "pending").length,
      missingSalary: actionable.filter((m) => m.status === "missing_salary")
        .length,
      totalNetPaid: months.reduce((sum, m) => sum + Number(m.totalNetPaid), 0),
    };
  }, [months]);

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : null;

  if (loading) {
    return <DashboardLoading label="Loading payroll calendar…" />;
  }

  if (error) {
    return (
      <DashboardLoadError
        title="Couldn’t load calendar"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-4">
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
          <p className="min-w-[5rem] text-center text-lg font-semibold tabular-nums">
            {year}
          </p>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Months paid"
          value={String(summary.paid)}
          hint="All staff paid for the month"
        />
        <SummaryCard
          label="Months pending"
          value={String(summary.pending)}
          hint="Pay run still open"
        />
        <SummaryCard
          label="Missing salary"
          value={String(summary.missingSalary)}
          hint="Blockers to fix before pay"
        />
        <SummaryCard
          label="Net paid this year"
          value={formatPayrollMoney(summary.totalNetPaid)}
          hint="From issued payslips"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {LEGEND.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", payrollCalendarDotClass(status))}
              aria-hidden
            />
            {payrollCalendarStatusLabel(status)}
          </span>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((month) => (
          <button
            key={month.month}
            type="button"
            onClick={() => onSelectMonth(year, month.month)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              payrollCalendarCellClass(month.status),
              currentMonth === month.month && "ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{payrollCalendarMonthName(month.month)}</p>
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  payrollCalendarDotClass(month.status),
                )}
                aria-hidden
              />
            </div>
            <p className="mt-1 text-xs font-medium text-foreground/80">
              {payrollCalendarStatusLabel(month.status)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {payrollCalendarStatusHint(month)}
            </p>
            {Number(month.totalNetPaid) > 0 ? (
              <p className="mt-2 text-sm font-semibold tabular-nums">
                {formatPayrollMoney(Number(month.totalNetPaid))}
              </p>
            ) : null}
          </button>
        ))}
      </div>
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

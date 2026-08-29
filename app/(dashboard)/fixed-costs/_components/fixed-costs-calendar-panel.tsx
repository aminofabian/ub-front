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
import { fetchFixedCostCalendar, type FixedCostCalendarMonth } from "@/lib/api";
import {
  fixedCostCalendarCellClass,
  fixedCostCalendarDotClass,
  fixedCostCalendarMonthName,
  fixedCostCalendarStatusHint,
  fixedCostCalendarStatusLabel,
  formatFixedCostMoney,
} from "@/lib/fixed-costs-utils";

type BranchOption = { id: string; name: string };

type Props = {
  year: number;
  branchFilter: string;
  branches: BranchOption[];
  onYearChange: (year: number) => void;
  onBranchFilterChange: (branchId: string) => void;
  onSelectMonth: (year: number, month: number) => void;
};

const LEGEND = ["posted", "pending", "failed", "future"] as const;

export function FixedCostsCalendarPanel({
  year,
  branchFilter,
  branches,
  onYearChange,
  onBranchFilterChange,
  onSelectMonth,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<FixedCostCalendarMonth[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFixedCostCalendar(year, {
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
      posted: actionable.filter((m) => m.status === "posted").length,
      pending: actionable.filter((m) => m.status === "pending").length,
      failed: actionable.filter((m) => m.status === "failed").length,
      postedTotal: months.reduce((sum, m) => sum + Number(m.postedTotal), 0),
    };
  }, [months]);

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : null;

  if (loading) {
    return <DashboardLoading label="Loading fixed costs calendar…" />;
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
          label="Months complete"
          value={String(summary.posted)}
          hint="All due bills posted"
        />
        <SummaryCard
          label="Months pending"
          value={String(summary.pending)}
          hint="Due dates still open"
        />
        <SummaryCard
          label="Months failed"
          value={String(summary.failed)}
          hint="Posting errors to fix"
        />
        <SummaryCard
          label="Posted this year"
          value={formatFixedCostMoney(summary.postedTotal)}
          hint="From recurring schedules"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {LEGEND.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", fixedCostCalendarDotClass(status))}
              aria-hidden
            />
            {fixedCostCalendarStatusLabel(status)}
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
              fixedCostCalendarCellClass(month.status),
              currentMonth === month.month && "ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{fixedCostCalendarMonthName(month.month)}</p>
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  fixedCostCalendarDotClass(month.status),
                )}
                aria-hidden
              />
            </div>
            <p className="mt-1 text-xs font-medium text-foreground/80">
              {fixedCostCalendarStatusLabel(month.status)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {fixedCostCalendarStatusHint(month)}
            </p>
            {Number(month.commitment) > 0 ? (
              <p className="mt-2 text-sm font-semibold tabular-nums">
                {formatFixedCostMoney(Number(month.commitment))}
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

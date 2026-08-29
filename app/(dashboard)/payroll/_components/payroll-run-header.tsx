"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatPayrollMoney,
  payrollMonthLabel,
  shiftPayrollMonth,
} from "@/lib/payroll-utils";

type Summary = {
  headcount: number;
  paidCount: number;
  pendingCount: number;
  totalNetPending: number;
  totalBase: number;
  totalAdvances: number;
};

type Props = {
  year: number;
  month: number;
  summary: Summary;
  applyStatutory: boolean;
  totalStatutory: number;
  onMonthChange: (year: number, month: number) => void;
  onRefresh?: () => void;
};

export function PayrollRunHeader({
  year,
  month,
  summary,
  applyStatutory,
  totalStatutory,
  onMonthChange,
  onRefresh,
}: Props) {
  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const progress =
    summary.headcount > 0
      ? Math.round((summary.paidCount / summary.headcount) * 100)
      : 0;
  const complete = progress === 100 && summary.headcount > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Previous month"
            onClick={() => {
              const next = shiftPayrollMonth(year, month, -1);
              onMonthChange(next.year, next.month);
            }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Pay period
            </p>
            <p className="text-base font-semibold tabular-nums sm:text-lg">
              {payrollMonthLabel(year, month)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Next month"
            onClick={() => {
              const next = shiftPayrollMonth(year, month, 1);
              onMonthChange(next.year, next.month);
            }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isCurrentMonth ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMonthChange(now.getFullYear(), now.getMonth() + 1)}
            >
              This month
            </Button>
          ) : null}
          {onRefresh ? (
            <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
              Refresh
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Net to disburse
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
              KES {formatPayrollMoney(summary.totalNetPending)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.pendingCount} staff awaiting payment
              {summary.paidCount > 0 ? ` · ${summary.paidCount} already paid` : ""}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Run completion</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  complete ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                )}
              >
                {summary.paidCount}/{summary.headcount} paid · {progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  complete
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-primary to-primary/70",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <MetricTile label="Staff" value={String(summary.headcount)} />
          <MetricTile
            label="Gross base"
            value={`KES ${formatPayrollMoney(summary.totalBase)}`}
          />
          <MetricTile
            label="Advances owed"
            value={`KES ${formatPayrollMoney(summary.totalAdvances)}`}
            warn={summary.totalAdvances > 0}
          />
          <MetricTile
            label="Statutory"
            value={
              applyStatutory
                ? `KES ${formatPayrollMoney(totalStatutory)}`
                : "Not applied"
            }
            muted={!applyStatutory}
          />
        </dl>
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  warn,
  muted,
}: {
  label: string;
  value: string;
  warn?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-sm font-semibold tabular-nums",
          warn && "text-amber-800 dark:text-amber-200",
          muted && "text-muted-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

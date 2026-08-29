"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  PAYROLL_MONTHS,
  defaultPayrollPeriod,
  isPayrollFocusPeriod,
  payrollMonthLabel,
  shiftPayrollMonth,
} from "@/lib/payroll-utils";

type Props = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  onRefresh?: () => void;
};

export function PayrollMonthNav({ year, month, onChange, onRefresh }: Props) {
  const focus = defaultPayrollPeriod();
  const isFocusPeriod = isPayrollFocusPeriod(year, month);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/20 p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Previous month"
          onClick={() => {
            const next = shiftPayrollMonth(year, month, -1);
            onChange(next.year, next.month);
          }}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <div className="min-w-[9rem] px-2 text-center text-sm font-medium tabular-nums">
          {payrollMonthLabel(year, month)}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Next month"
          onClick={() => {
            const next = shiftPayrollMonth(year, month, 1);
            onChange(next.year, next.month);
          }}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Month
        <select
          className={dashboardSelectClass(false, "w-36")}
          value={month}
          onChange={(e) => onChange(year, Number(e.target.value))}
        >
          {PAYROLL_MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Year
        <input
          type="number"
          className={dashboardInputClass(false, "w-24")}
          value={year}
          min={2000}
          max={2100}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 2000 && v <= 2100) onChange(v, month);
          }}
        />
      </label>

      {!isFocusPeriod ? (
        <Button
          type="button"
          variant="outline"
          className="h-[42px]"
          onClick={() => {
            onChange(focus.year, focus.month);
          }}
        >
          {focus.month !== new Date().getMonth() + 1 ||
          focus.year !== new Date().getFullYear()
            ? `Focus · ${payrollMonthLabel(focus.year, focus.month)}`
            : "This month"}
        </Button>
      ) : null}

      {onRefresh ? (
        <Button type="button" variant="outline" className="h-[42px]" onClick={onRefresh}>
          Refresh
        </Button>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { DashboardLoading } from "@/components/dashboard-page-ui";
import {
  fetchExpenseScheduleOccurrences,
  type ExpenseScheduleOccurrenceRecord,
  type ExpenseScheduleRecord,
} from "@/lib/api";
import {
  fixedCostMonthLabel,
  formatFixedCostDate,
  formatFixedCostMoney,
  occurrenceStatusLabel,
  shiftFixedCostMonth,
} from "@/lib/fixed-costs-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ExpenseScheduleRecord | null;
  year: number;
  month: number;
};

export function ScheduleHistoryDrawer({
  open,
  onOpenChange,
  schedule,
  year,
  month,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExpenseScheduleOccurrenceRecord[]>([]);
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);

  useEffect(() => {
    if (open) {
      setViewYear(year);
      setViewMonth(month);
    }
  }, [open, year, month]);

  const load = useCallback(async () => {
    if (!schedule) return;
    setLoading(true);
    try {
      const data = await fetchExpenseScheduleOccurrences(viewYear, viewMonth);
      setRows(data.filter((r) => r.scheduleId === schedule.id));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [schedule, viewYear, viewMonth]);

  useEffect(() => {
    if (open && schedule) void load();
  }, [open, schedule, load]);

  const summary = useMemo(() => {
    const posted = rows.filter((r) => r.status === "posted").length;
    const due = rows.filter((r) => r.status === "due" || r.status === "failed").length;
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    return { posted, due, total, count: rows.length };
  }, [rows]);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={schedule ? schedule.name : "Occurrence history"}
      description={
        schedule
          ? `${formatFixedCostMoney(Number(schedule.amount))} · ${schedule.frequency}`
          : undefined
      }
    >
      <FormDrawerFields>
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              const p = shiftFixedCostMonth(viewYear, viewMonth, -1);
              setViewYear(p.year);
              setViewMonth(p.month);
            }}
          >
            ← Prev
          </button>
          <span className="font-medium">{fixedCostMonthLabel(viewYear, viewMonth)}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              const n = shiftFixedCostMonth(viewYear, viewMonth, 1);
              setViewYear(n.year);
              setViewMonth(n.month);
            }}
          >
            Next →
          </button>
        </div>

        {loading ? (
          <DashboardLoading label="Loading occurrences…" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No due dates for this schedule in {fixedCostMonthLabel(viewYear, viewMonth)}.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {summary.count} due date{summary.count === 1 ? "" : "s"} ·{" "}
              {summary.posted} posted
              {summary.due > 0 ? ` · ${summary.due} open` : ""}
            </p>
            <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
              {rows.map((row) => (
                <li
                  key={row.id ?? `${row.scheduleId}:${row.occurrenceDate}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{formatFixedCostDate(row.occurrenceDate)}</p>
                    {row.failureReason ? (
                      <p className="text-xs text-red-600">{row.failureReason}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">{formatFixedCostMoney(Number(row.amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      {occurrenceStatusLabel(row.status)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </FormDrawerFields>
    </FormDrawer>
  );
}

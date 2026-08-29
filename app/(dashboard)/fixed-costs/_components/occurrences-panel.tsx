"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchExpenseScheduleOccurrences,
  postExpenseScheduleOccurrence,
  postExpenseScheduleOccurrenceByDate,
  skipExpenseScheduleOccurrence,
  skipExpenseScheduleOccurrenceByDate,
  type ExpenseScheduleOccurrenceRecord,
} from "@/lib/api";
import {
  fixedCostMonthLabel,
  formatFixedCostDate,
  formatFixedCostMoney,
  occurrenceStatusLabel,
  paymentMethodLabel,
} from "@/lib/fixed-costs-utils";

type Props = {
  year: number;
  month: number;
  branchFilter: string;
  canManage: boolean;
  refreshKey: number;
  onFeedback: (kind: "success" | "error", text: string) => void;
  onChanged: () => void;
};

export function OccurrencesPanel({
  year,
  month,
  branchFilter,
  canManage,
  refreshKey,
  onFeedback,
  onChanged,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExpenseScheduleOccurrenceRecord[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await fetchExpenseScheduleOccurrences(year, month, {
          branchId: branchFilter || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load due dates");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, branchFilter]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const actionable = useMemo(
    () => rows.filter((r) => r.status === "due" || r.status === "failed"),
    [rows],
  );

  const rowKey = (row: ExpenseScheduleOccurrenceRecord) =>
    row.id ?? `${row.scheduleId}:${row.occurrenceDate}`;

  const postRow = async (row: ExpenseScheduleOccurrenceRecord) => {
    const key = rowKey(row);
    setBusyKey(key);
    try {
      if (row.id) {
        await postExpenseScheduleOccurrence(row.id);
      } else {
        await postExpenseScheduleOccurrenceByDate({
          scheduleId: row.scheduleId,
          occurrenceDate: row.occurrenceDate.slice(0, 10),
        });
      }
      onFeedback("success", `"${row.scheduleName}" posted.`);
      onChanged();
      await load();
    } catch (err) {
      onFeedback("error", err instanceof Error ? err.message : "Failed to post");
    } finally {
      setBusyKey(null);
    }
  };

  const skipRow = async (row: ExpenseScheduleOccurrenceRecord) => {
    if (!confirm(`Skip "${row.scheduleName}" on ${formatFixedCostDate(row.occurrenceDate)}?`)) {
      return;
    }
    const key = rowKey(row);
    setBusyKey(key);
    try {
      if (row.id) {
        await skipExpenseScheduleOccurrence(row.id);
      } else {
        await skipExpenseScheduleOccurrenceByDate({
          scheduleId: row.scheduleId,
          occurrenceDate: row.occurrenceDate.slice(0, 10),
        });
      }
      onFeedback("success", `"${row.scheduleName}" skipped for this date.`);
      onChanged();
      await load();
    } catch (err) {
      onFeedback("error", err instanceof Error ? err.message : "Failed to skip");
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <DashboardLoading label="Loading due dates…" />;
  }

  if (error) {
    return (
      <DashboardLoadError
        title="Couldn’t load due dates"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {actionable.length > 0 ? (
        <div
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "flex flex-wrap items-start gap-3 border-amber-500/30 bg-amber-500/5",
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium">
              {actionable.length} bill{actionable.length === 1 ? "" : "s"} need attention in{" "}
              {fixedCostMonthLabel(year, month)}
            </p>
            <p className="text-xs text-muted-foreground">
              Post now to record the expense, or skip if you paid outside Palmart.
            </p>
          </div>
        </div>
      ) : null}

      <section className={cn(DASHBOARD_TABLE_SURFACE)}>
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-sm font-medium">Due dates — {fixedCostMonthLabel(year, month)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Bill</th>
                <th className="px-4 py-3 font-medium">Due date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage ? <th className="px-4 py-3 font-medium" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = rowKey(row);
                const busy = busyKey === key;
                const canAct =
                  canManage && (row.status === "due" || row.status === "failed");
                return (
                  <tr key={key} className="border-b border-border/40">
                    <td className="px-4 py-3 font-medium">{row.scheduleName}</td>
                    <td className="px-4 py-3">{formatFixedCostDate(row.occurrenceDate)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatFixedCostMoney(Number(row.amount))}
                    </td>
                    <td className="px-4 py-3">{paymentMethodLabel(row.paymentMethod)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                      {row.failureReason ? (
                        <p className="mt-1 max-w-xs text-xs text-red-600">{row.failureReason}</p>
                      ) : null}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        {canAct ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() => void postRow(row)}
                            >
                              {busy ? (
                                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                              ) : null}
                              Post now
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void skipRow(row)}
                            >
                              Skip
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "posted"
      ? "bg-emerald-500/10 text-emerald-700"
      : status === "failed"
        ? "bg-red-500/10 text-red-700"
        : status === "due"
          ? "bg-amber-500/10 text-amber-800"
          : status === "skipped"
            ? "bg-muted text-muted-foreground"
            : "bg-muted/60 text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {occurrenceStatusLabel(status)}
    </span>
  );
}

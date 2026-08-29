"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, History, Pencil, Trash2 } from "lucide-react";

import {
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deactivateExpenseSchedule,
  fetchExpenseSchedules,
  type ExpenseScheduleRecord,
} from "@/lib/api";
import {
  automationModeLabel,
  categoryTypeLabel,
  exportFixedCostSchedulesCsv,
  formatFixedCostDate,
  formatFixedCostMoney,
  frequencyLabel,
  monthlyCommitmentForSchedule,
  nextDueFromSchedule,
  paymentMethodLabel,
} from "@/lib/fixed-costs-utils";

import { ScheduleHistoryDrawer } from "./schedule-history-drawer";

type BranchOption = { id: string; name: string };

type Props = {
  year: number;
  month: number;
  branchFilter: string;
  branches: BranchOption[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (schedule: ExpenseScheduleRecord) => void;
  refreshKey: number;
  onFeedback: (kind: "success" | "error", text: string) => void;
};

export function SchedulesPanel({
  year,
  month,
  branchFilter,
  branches,
  canManage,
  onAdd,
  onEdit,
  refreshKey,
  onFeedback,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExpenseScheduleRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [historySchedule, setHistorySchedule] = useState<ExpenseScheduleRecord | null>(
    null,
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  const branchName = useCallback(
    (id: string | null) =>
      id ? branches.find((b) => b.id === id)?.name ?? "—" : "All branches",
    [branches],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchExpenseSchedules());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const filtered = useMemo(
    () =>
      branchFilter
        ? rows.filter((r) => !r.branchId || r.branchId === branchFilter)
        : rows,
    [rows, branchFilter],
  );

  const enriched = useMemo(
    () =>
      filtered.map((row) => ({
        ...row,
        branchName: branchName(row.branchId),
        nextDue: nextDueFromSchedule(row),
        commitment: monthlyCommitmentForSchedule({
          amount: Number(row.amount),
          frequency: row.frequency,
          startDate: row.startDate,
          endDate: row.endDate,
          active: row.active,
          year,
          month,
        }),
      })),
    [filtered, branchName, year, month],
  );

  const summary = useMemo(() => {
    const commitment = enriched.reduce((s, r) => s + r.commitment, 0);
    const dueThisMonth = enriched.filter((r) => {
      if (!r.nextDue) return false;
      const [y, m] = r.nextDue.split("-").map(Number);
      return y === year && m === month;
    }).length;
    return {
      count: enriched.length,
      commitment,
      dueThisMonth,
    };
  }, [enriched, year, month]);

  const deactivate = async (row: ExpenseScheduleRecord) => {
    if (!confirm(`Stop "${row.name}"? Future due dates will not post.`)) return;
    setBusyId(row.id);
    try {
      await deactivateExpenseSchedule(row.id);
      onFeedback("success", `"${row.name}" deactivated.`);
      await load();
    } catch (err) {
      onFeedback(
        "error",
        err instanceof Error ? err.message : "Failed to deactivate",
      );
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    exportFixedCostSchedulesCsv(
      enriched.map((row) => ({
        name: row.name,
        branchName: row.branchName,
        amount: Number(row.amount),
        frequency: row.frequency,
        nextDue: row.nextDue,
        paymentMethod: row.paymentMethod,
        categoryType: row.categoryType,
        includeInCashDrawer: row.includeInCashDrawer,
      })),
    );
  };

  if (loading) {
    return <DashboardLoading label="Loading fixed costs…" />;
  }
  if (error) {
    return (
      <DashboardLoadError
        title="Couldn’t load schedules"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {summary.count} active schedule{summary.count === 1 ? "" : "s"} ·{" "}
          <span className="font-medium text-foreground">
            {formatFixedCostMoney(summary.commitment)}
          </span>{" "}
          committed this month · {summary.dueThisMonth} with a due date this month
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 size-3.5" aria-hidden />
            Export CSV
          </Button>
          {canManage ? (
            <Button type="button" size="sm" onClick={onAdd}>
              Add fixed cost
            </Button>
          ) : null}
        </div>
      </div>

      <section className={cn(DASHBOARD_TABLE_SURFACE)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Rhythm</th>
                <th className="px-4 py-3 font-medium">When due</th>
                <th className="px-4 py-3 font-medium">Next due</th>
                <th className="px-4 py-3 font-medium">This month</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No fixed costs yet. Add shop rent, KPLC, or other repeating bills.
                  </td>
                </tr>
              ) : (
                enriched.map((row) => (
                  <tr key={row.id} className="border-b border-border/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryTypeLabel(row.categoryType)}
                        {row.includeInCashDrawer ? " · Till cash" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.branchName}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatFixedCostMoney(Number(row.amount))}
                    </td>
                    <td className="px-4 py-3">{frequencyLabel(row.frequency)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {automationModeLabel(row.automationMode)}
                    </td>
                    <td className="px-4 py-3">
                      {row.nextDue ? formatFixedCostDate(row.nextDue) : "—"}
                      {row.lastGeneratedOn ? (
                        <p className="text-xs text-muted-foreground">
                          Last posted {formatFixedCostDate(row.lastGeneratedOn)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatFixedCostMoney(row.commitment)}
                    </td>
                    <td className="px-4 py-3">
                      {paymentMethodLabel(row.paymentMethod)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            setHistorySchedule(row);
                            setHistoryOpen(true);
                          }}
                          aria-label={`History for ${row.name}`}
                        >
                          <History className="size-4" aria-hidden />
                        </Button>
                        {canManage ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => onEdit(row)}
                              aria-label={`Edit ${row.name}`}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={busyId === row.id}
                              onClick={() => void deactivate(row)}
                              aria-label={`Deactivate ${row.name}`}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ScheduleHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        schedule={historySchedule}
        year={year}
        month={month}
      />
    </div>
  );
}

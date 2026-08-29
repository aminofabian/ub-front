"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import { fetchFinanceExpenses, type FinanceExpenseResponse } from "@/lib/api";
import {
  daysInMonth,
  fixedCostMonthLabel,
  formatFixedCostDate,
  formatFixedCostMoney,
  paymentMethodLabel,
} from "@/lib/fixed-costs-utils";

type Props = {
  year: number;
  month: number;
  refreshKey: number;
};

export function ExpenseHistoryPanel({ year, month, refreshKey }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FinanceExpenseResponse[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dates = daysInMonth(year, month);
      const batches = await Promise.all(
        dates.map((date) => fetchFinanceExpenses(date)),
      );
      const merged = batches
        .flat()
        .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
      setRows(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  if (loading) {
    return <DashboardLoading label="Loading posted expenses…" />;
  }
  if (error) {
    return (
      <DashboardLoadError
        title="Couldn’t load expenses"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {rows.length} expense{rows.length === 1 ? "" : "s"} in{" "}
        <span className="font-medium text-foreground">
          {fixedCostMonthLabel(year, month)}
        </span>
        {rows.length > 0 ? (
          <>
            {" "}
            · total{" "}
            <span className="font-medium text-foreground">
              {formatFixedCostMoney(total)}
            </span>
          </>
        ) : null}
      </p>

      <section className={cn(DASHBOARD_TABLE_SURFACE)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No expenses posted for this month yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/40">
                    <td className="px-4 py-3">
                      {formatFixedCostDate(row.expenseDate)}
                    </td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatFixedCostMoney(Number(row.amount))}
                    </td>
                    <td className="px-4 py-3">
                      {paymentMethodLabel(row.paymentMethod)}
                    </td>
                    <td className="px-4 py-3 capitalize">{row.categoryType}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

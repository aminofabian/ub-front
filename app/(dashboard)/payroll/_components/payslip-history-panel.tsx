"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

import {
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchPayrollPeriodPayslips,
  type PayslipRecord,
} from "@/lib/api";
import {
  exportPayslipHistoryCsv,
  formatPayrollDateTime,
  formatPayrollMoney,
  payrollMonthLabel,
} from "@/lib/payroll-utils";

type Props = {
  year: number;
  month: number;
  onOpenPayslip: (payslip: PayslipRecord) => void;
};

export function PayslipHistoryPanel({ year, month, onOpenPayslip }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PayslipRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchPayrollPeriodPayslips(year, month));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payslips");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = rows.reduce(
    (acc, row) => ({
      base: acc.base + Number(row.baseSalary),
      advances: acc.advances + Number(row.advancesDeducted),
      other: acc.other + Number(row.otherDeductions),
      net: acc.net + Number(row.netPaid),
    }),
    { base: 0, advances: 0, other: 0, net: 0 },
  );

  if (loading) {
    return <DashboardLoading label="Loading payslip history…" />;
  }
  if (error) {
    return (
      <DashboardLoadError
        title="Couldn’t load payslips"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} payslip{rows.length === 1 ? "" : "s"} for{" "}
          <span className="font-medium text-foreground">
            {payrollMonthLabel(year, month)}
          </span>
          {rows.length > 0 ? (
            <>
              {" "}
              · net paid{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatPayrollMoney(totals.net)}
              </span>
            </>
          ) : null}
        </p>
        {rows.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportPayslipHistoryCsv(rows, year, month)}
          >
            <Download className="mr-1.5 size-3.5" aria-hidden />
            Export CSV
          </Button>
        ) : null}
      </div>

      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium text-right">Base</th>
                <th className="px-4 py-3 font-medium text-right">Advances</th>
                <th className="px-4 py-3 font-medium text-right">Other</th>
                <th className="px-4 py-3 font-medium text-right">Net paid</th>
                <th className="px-4 py-3 font-medium">Paid on</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No payslips for this month yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-medium underline-offset-2 hover:underline"
                        onClick={() => onOpenPayslip(row)}
                      >
                        {row.displayName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPayrollMoney(Number(row.baseSalary))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-800 dark:text-amber-200">
                      {formatPayrollMoney(Number(row.advancesDeducted))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPayrollMoney(Number(row.otherDeductions))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatPayrollMoney(Number(row.netPaid))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatPayrollDateTime(row.paidAt)}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground">
                      {row.note || "—"}
                    </td>
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

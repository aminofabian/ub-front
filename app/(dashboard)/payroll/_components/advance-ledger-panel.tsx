"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import {
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchPayrollAdvances,
  type PayrollAdvanceLedgerRow,
} from "@/lib/api";
import {
  exportAdvanceLedgerCsv,
  formatPayrollDate,
  formatPayrollMoney,
} from "@/lib/payroll-utils";

type Props = {
  canReadStaffProfile: boolean;
  onOpenStaff?: (userId: string, name: string) => void;
};

export function AdvanceLedgerPanel({
  canReadStaffProfile,
  onOpenStaff,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PayrollAdvanceLedgerRow[]>([]);
  const [filter, setFilter] = useState<"all" | "outstanding" | "repaid">(
    "outstanding",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchPayrollAdvances());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load advance ledger");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (filter === "outstanding") return row.status === "outstanding";
        if (filter === "repaid") return row.status === "repaid";
        return true;
      }),
    [rows, filter],
  );

  const outstandingTotal = useMemo(
    () =>
      rows
        .filter((r) => r.status === "outstanding")
        .reduce((sum, r) => sum + Number(r.balanceOutstanding ?? r.amount), 0),
    [rows],
  );

  if (loading) {
    return <DashboardLoading label="Loading advance ledger…" />;
  }
  if (error) {
    return (
      <DashboardLoadError
        title="Couldn’t load advance ledger"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Shop-wide outstanding advances:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatPayrollMoney(outstandingTotal)}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
            {(["outstanding", "all", "repaid"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  filter === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setFilter(key)}
              >
                {key}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportAdvanceLedgerCsv(filtered)}
          >
            <Download className="mr-1.5 size-3.5" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>

      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium text-right">Original</th>
                <th className="px-4 py-3 font-medium text-right">Repaid</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No advances in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatPayrollDate(row.advancedOn)}
                    </td>
                    <td className="px-4 py-3">
                      {canReadStaffProfile && onOpenStaff ? (
                        <button
                          type="button"
                          className="font-medium underline-offset-2 hover:underline"
                          onClick={() => onOpenStaff(row.userId, row.displayName)}
                        >
                          {row.displayName}
                        </button>
                      ) : (
                        <span className="font-medium">{row.displayName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.branchName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPayrollMoney(Number(row.amount))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatPayrollMoney(Number(row.amountRepaid ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatPayrollMoney(Number(row.balanceOutstanding ?? row.amount))}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "repaid" ? (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                          Repaid
                        </span>
                      ) : Number(row.amountRepaid) > 0 ? (
                        <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-900 dark:text-sky-200">
                          Partial
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs text-amber-900 dark:text-amber-200">
                          Outstanding
                        </span>
                      )}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-muted-foreground">
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

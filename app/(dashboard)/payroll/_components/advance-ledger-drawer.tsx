"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Receipt, Wallet } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchStaffAdvances,
  type SalaryAdvanceRecord,
} from "@/lib/api";
import {
  formatPayrollDate,
  formatPayrollMoney,
} from "@/lib/payroll-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  staffName: string;
  canManage: boolean;
  onLogAdvance?: () => void;
};

export function AdvanceLedgerDrawer({
  open,
  onOpenChange,
  userId,
  staffName,
  canManage,
  onLogAdvance,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SalaryAdvanceRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "outstanding" | "repaid">("all");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStaffAdvances(userId);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load advances");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) void load();
    if (!open) {
      setRows([]);
      setError(null);
      setFilter("all");
    }
  }, [open, userId, load]);

  const filtered = rows.filter((row) => {
    if (filter === "outstanding") return row.status === "outstanding";
    if (filter === "repaid") return row.status === "repaid";
    return true;
  });

  const outstandingTotal = rows
    .filter((r) => r.status === "outstanding")
    .reduce((sum, r) => sum + Number(r.balanceOutstanding ?? r.amount), 0);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Salary advances"
      description={staffName}
      contextLabel="Payroll"
      icon={<Wallet className="size-5 text-primary" aria-hidden />}
      width="wide"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canManage && onLogAdvance ? (
            <Button type="button" onClick={onLogAdvance}>
              Log advance
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Outstanding:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatPayrollMoney(outstandingTotal)}
          </span>
        </p>
        <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
          {(["all", "outstanding", "repaid"] as const).map((key) => (
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
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading advances…
        </div>
      ) : error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <FormDrawerFields
          legend="Ledger"
          hint="Partial repayments reduce the balance each pay run until fully repaid."
        >
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No advances in this view.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium text-right">Original</th>
                    <th className="px-3 py-2 font-medium text-right">Balance</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {formatPayrollDate(row.advancedOn)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatPayrollMoney(Number(row.amount))}
                        {Number(row.amountRepaid) > 0 ? (
                          <div className="text-xs text-muted-foreground">
                            repaid {formatPayrollMoney(Number(row.amountRepaid))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                        {formatPayrollMoney(Number(row.balanceOutstanding ?? row.amount))}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.status === "repaid" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                            <Receipt className="size-3" aria-hidden />
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
                      <td className="max-w-[12rem] truncate px-3 py-2.5 text-muted-foreground">
                        {row.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FormDrawerFields>
      )}
    </FormDrawer>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Receipt, Wallet, X } from "lucide-react";

import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchStaffAdvances,
  patchStaffAdvance,
  type SalaryAdvanceRecord,
} from "@/lib/api";
import {
  type AdvanceRepaymentMode,
  advanceRepaymentModeSummary,
  formatPayrollDate,
  formatPayrollMoney,
  parseRepaymentMoneyInput,
  parseRepaymentPercentInput,
} from "@/lib/payroll-utils";
import {
  AdvanceRepaymentArrangement,
} from "./advance-repayment-arrangement";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  staffName: string;
  canManage: boolean;
  onLogAdvance?: () => void;
  onUpdated?: () => void;
};

export function AdvanceLedgerDrawer({
  open,
  onOpenChange,
  userId,
  staffName,
  canManage,
  onLogAdvance,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SalaryAdvanceRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "outstanding" | "repaid">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<AdvanceRepaymentMode>("full_balance");
  const [editValue, setEditValue] = useState("");
  const [editNote, setEditNote] = useState("");

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
      setEditingId(null);
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

  const scheduledTotal = rows
    .filter((r) => r.status === "outstanding")
    .reduce((sum, r) => sum + Number(r.scheduledDeductionThisRun ?? 0), 0);

  function startEdit(row: SalaryAdvanceRecord) {
    setEditingId(row.id);
    setEditMode((row.repaymentMode as AdvanceRepaymentMode) ?? "full_balance");
    setEditValue(
      row.repaymentValue != null && row.repaymentValue > 0
        ? String(row.repaymentValue)
        : "",
    );
    setEditNote(row.note ?? "");
  }

  async function saveEdit(row: SalaryAdvanceRecord) {
    if (!userId) return;
    const parsedValue =
      editMode === "percent_of_original"
        ? Number(parseRepaymentPercentInput(editValue)) || 0
        : editMode === "fixed_per_pay"
          ? Number(parseRepaymentMoneyInput(editValue)) || 0
          : 0;
    if (editMode === "percent_of_original" && (parsedValue <= 0 || parsedValue > 100)) {
      setError("Enter a repayment percentage between 1 and 100.");
      return;
    }
    if (editMode === "fixed_per_pay" && parsedValue <= 0) {
      setError("Enter a fixed repayment amount per pay.");
      return;
    }
    setSavingId(row.id);
    setError(null);
    try {
      await patchStaffAdvance(userId, row.id, {
        repaymentMode: editMode,
        repaymentValue:
          editMode === "percent_of_original" || editMode === "fixed_per_pay"
            ? parsedValue
            : undefined,
        note: editNote.trim() || undefined,
      });
      setEditingId(null);
      await load();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update arrangement");
    } finally {
      setSavingId(null);
    }
  }

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
        <div className="text-sm text-muted-foreground">
          <p>
            Outstanding:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatPayrollMoney(outstandingTotal)}
            </span>
          </p>
          {scheduledTotal > 0 && scheduledTotal < outstandingTotal ? (
            <p className="text-xs">
              Scheduled this pay:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatPayrollMoney(scheduledTotal)}
              </span>
            </p>
          ) : null}
        </div>
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
          hint="Each advance can have its own repayment plan — percent, fixed slice, full balance, or manual at pay time."
        >
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No advances in this view.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((row) => (
                <article
                  key={row.id}
                  className="rounded-xl border border-border/50 bg-muted/15 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium tabular-nums">
                        {formatPayrollMoney(Number(row.balanceOutstanding ?? row.amount))}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          of {formatPayrollMoney(Number(row.amount))}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatPayrollDate(row.advancedOn)}
                        {row.note ? ` · ${row.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      {canManage && row.status === "outstanding" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={() =>
                            editingId === row.id ? setEditingId(null) : startEdit(row)
                          }
                        >
                          {editingId === row.id ? (
                            <X className="size-3.5" aria-hidden />
                          ) : (
                            <Pencil className="size-3.5" aria-hidden />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {row.status === "outstanding" && editingId !== row.id ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {advanceRepaymentModeSummary(
                        row.repaymentMode,
                        row.repaymentValue,
                        Number(row.amount),
                      )}
                      {Number(row.scheduledDeductionThisRun) > 0 ? (
                        <>
                          {" "}
                          · next pay{" "}
                          <span className="font-medium tabular-nums text-foreground">
                            {formatPayrollMoney(Number(row.scheduledDeductionThisRun))}
                          </span>
                        </>
                      ) : row.repaymentMode === "manual" ? (
                        " · skipped until you confirm pay"
                      ) : null}
                    </p>
                  ) : null}

                  {editingId === row.id ? (
                    <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
                      <AdvanceRepaymentArrangement
                        mode={editMode}
                        value={editValue}
                        onModeChange={setEditMode}
                        onValueChange={setEditValue}
                        originalAmount={Number(row.amount)}
                        balanceOutstanding={Number(row.balanceOutstanding ?? row.amount)}
                      />
                      <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                        Note <span className="font-normal">(optional — not the repayment %)</span>
                        <input
                          className={dashboardInputClass()}
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="e.g. Emergency medical, car repair…"
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={savingId === row.id}
                          onClick={() => void saveEdit(row)}
                        >
                          {savingId === row.id ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            "Save arrangement"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </FormDrawerFields>
      )}
    </FormDrawer>
  );
}

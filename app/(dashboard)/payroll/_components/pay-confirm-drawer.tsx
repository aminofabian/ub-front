"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Scale } from "lucide-react";

import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PayrollRunRow } from "@/lib/api";
import { formatPayrollMoney, payrollMonthLabel } from "@/lib/payroll-utils";

const DEDUCTION_TEMPLATES = [
  { label: "Uniform", amount: 500 },
  { label: "Lost stock", amount: 1000 },
  { label: "Staff loan", amount: 2000 },
] as const;

export type PayConfirmPayload = {
  otherDeductions: number;
  note: string;
  applyStatutory: boolean;
  postExpense: boolean;
  paymentMethod: string;
  advancesToDeduct: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PayrollRunRow | null;
  year: number;
  month: number;
  applyStatutoryDefault: boolean;
  postExpenseDefault: boolean;
  saving: boolean;
  onConfirm: (payload: PayConfirmPayload) => void;
};

export function PayConfirmDrawer({
  open,
  onOpenChange,
  row,
  year,
  month,
  applyStatutoryDefault,
  postExpenseDefault,
  saving,
  onConfirm,
}: Props) {
  const [otherDeductions, setOtherDeductions] = useState("0");
  const [advancesToDeduct, setAdvancesToDeduct] = useState("");
  const [note, setNote] = useState("");
  const [applyStatutory, setApplyStatutory] = useState(applyStatutoryDefault);
  const [postExpense, setPostExpense] = useState(postExpenseDefault);
  const [paymentMethod, setPaymentMethod] = useState("mpesa_manual");

  useEffect(() => {
    if (!open || !row) return;
    setOtherDeductions("0");
    setNote("");
    setApplyStatutory(applyStatutoryDefault);
    setPostExpense(postExpenseDefault);
    setPaymentMethod("mpesa_manual");

    const other = 0;
    const statutory = applyStatutoryDefault ? Number(row.statutoryTotal) || 0 : 0;
    const pool = Math.max(0, Number(row.baseSalary) - statutory - other);
    const defaultAdvance = Math.min(Number(row.advancesOutstanding), pool);
    setAdvancesToDeduct(defaultAdvance > 0 ? String(defaultAdvance) : "0");
  }, [open, row, applyStatutoryDefault, postExpenseDefault]);

  const other = Number(otherDeductions) || 0;
  const statutory = applyStatutory ? Number(row?.statutoryTotal) || 0 : 0;
  const advancePool = row
    ? Math.max(0, Number(row.baseSalary) - statutory - other)
    : 0;
  const maxAdvanceDeduct = row
    ? Math.min(Number(row.advancesOutstanding), advancePool)
    : 0;
  const advanceInput = advancesToDeduct.trim() === "" ? maxAdvanceDeduct : Number(advancesToDeduct) || 0;
  const advancesApplied = Math.min(maxAdvanceDeduct, Math.max(0, advanceInput));
  const net = row
    ? Math.max(0, Number(row.baseSalary) - statutory - advancesApplied - other)
    : 0;

  const statutoryLines = useMemo(
    () =>
      row && applyStatutory
        ? [
            ["PAYE", row.payeSuggested],
            ["NSSF", row.nssfSuggested],
            ["SHIF", row.shifSuggested],
            ["Housing Levy", row.housingLevySuggested],
          ]
        : [],
    [row, applyStatutory],
  );

  if (!row) return null;

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm payment"
      description={`${row.displayName} · ${payrollMonthLabel(year, month)}`}
      contextLabel="Payroll"
      icon={<Banknote className="size-5 text-primary" aria-hidden />}
      width="wide"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || row.employmentStatus === "on_leave"}
            onClick={() =>
              onConfirm({
                otherDeductions: other,
                note: note.trim(),
                applyStatutory,
                postExpense,
                paymentMethod,
                advancesToDeduct: advancesApplied,
              })
            }
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Paying…
              </>
            ) : (
              "Mark paid"
            )}
          </Button>
        </div>
      }
    >
      {row.employmentStatus === "on_leave" ? (
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          This employee is on leave. Update their status before paying.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <FormDrawerFields
          legend="Deductions"
          hint="Advances repay oldest-first up to the amount you set below."
        >
          <button
            type="button"
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
              applyStatutory
                ? "border-primary/40 bg-primary/5"
                : "border-border/60 bg-muted/20",
            )}
            onClick={() => setApplyStatutory((v) => !v)}
          >
            <Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="block text-sm font-medium">Kenya statutory</span>
              <span className="block text-xs text-muted-foreground">
                PAYE, NSSF, SHIF, Housing Levy
              </span>
            </span>
          </button>

          {statutoryLines.length > 0 ? (
            <dl className="space-y-1 rounded-lg bg-muted/30 px-3 py-2 text-xs">
              {statutoryLines.map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular-nums">− {formatPayrollMoney(Number(amount))}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Deduct from advances this run (max {formatPayrollMoney(maxAdvanceDeduct)})
            <input
              type="number"
              min="0"
              max={maxAdvanceDeduct}
              step="0.01"
              className={dashboardInputClass()}
              value={advancesToDeduct}
              onChange={(e) => setAdvancesToDeduct(e.target.value)}
            />
          </label>
          <p className="text-[11px] text-muted-foreground">
            Outstanding: {formatPayrollMoney(row.advancesOutstanding)} · Pool after statutory &
            other: {formatPayrollMoney(advancePool)}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {DEDUCTION_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className="rounded-md border border-border/60 px-2 py-0.5 text-xs hover:bg-muted/50"
                onClick={() => setOtherDeductions(String(template.amount))}
              >
                {template.label} ({template.amount})
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Other deductions
            <input
              type="number"
              min="0"
              step="0.01"
              className={dashboardInputClass()}
              value={otherDeductions}
              onChange={(e) => setOtherDeductions(e.target.value)}
            />
          </label>
        </FormDrawerFields>

        <FormDrawerFields legend="Summary & finance">
          <dl className="space-y-2 rounded-xl border border-border/50 bg-muted/25 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Base salary</dt>
              <dd className="tabular-nums font-medium">{formatPayrollMoney(row.baseSalary)}</dd>
            </div>
            {statutory > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Statutory</dt>
                <dd className="tabular-nums">− {formatPayrollMoney(statutory)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Advances</dt>
              <dd className="tabular-nums text-amber-800 dark:text-amber-200">
                − {formatPayrollMoney(advancesApplied)}
              </dd>
            </div>
            {other > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Other</dt>
                <dd className="tabular-nums">− {formatPayrollMoney(other)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border/50 pt-2">
              <dt className="font-medium">Net to pay</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatPayrollMoney(net)}</dd>
            </div>
          </dl>

          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={postExpense}
              onChange={(e) => setPostExpense(e.target.checked)}
            />
            Post to finance as salary expense
          </label>
          {postExpense ? (
            <label className="mt-2 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Payment method
              <select
                className={dashboardSelectClass()}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="mpesa_manual">M-Pesa</option>
                <option value="bank">Bank transfer</option>
                <option value="cash">Cash</option>
              </select>
            </label>
          ) : null}

          <label className="mt-4 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Note (optional)
            <input
              className={dashboardInputClass()}
              placeholder="e.g. Paid via M-Pesa"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </FormDrawerFields>
      </div>
    </FormDrawer>
  );
}

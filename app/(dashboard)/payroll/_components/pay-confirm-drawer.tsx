"use client";

import { useEffect, useState } from "react";
import { Banknote, Loader2 } from "lucide-react";

import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
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
  const [note, setNote] = useState("");
  const [applyStatutory, setApplyStatutory] = useState(applyStatutoryDefault);
  const [postExpense, setPostExpense] = useState(postExpenseDefault);
  const [paymentMethod, setPaymentMethod] = useState("mpesa_manual");

  useEffect(() => {
    if (open) {
      setOtherDeductions("0");
      setNote("");
      setApplyStatutory(applyStatutoryDefault);
      setPostExpense(postExpenseDefault);
      setPaymentMethod("mpesa_manual");
    }
  }, [open, row?.userId, applyStatutoryDefault, postExpenseDefault]);

  if (!row) return null;

  const other = Number(otherDeductions) || 0;
  const statutory = applyStatutory ? Number(row.statutoryTotal) || 0 : 0;
  const advancePool = Math.max(0, row.baseSalary - statutory - other);
  const advancesApplied = Math.min(row.advancesOutstanding, advancePool);
  const net = Math.max(0, row.baseSalary - statutory - advancesApplied - other);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm payment"
      description={`${row.displayName} · ${payrollMonthLabel(year, month)}`}
      contextLabel="Payroll"
      icon={<Banknote className="size-5 text-primary" aria-hidden />}
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

      <FormDrawerFields
        legend="Pay breakdown"
        hint="Kenya statutory deductions are estimates — confirm with your accountant before remitting. Advances repay oldest-first; partial amounts carry to the next pay run."
      >
        <dl className="space-y-2 rounded-xl border border-border/50 bg-muted/25 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Base salary</dt>
            <dd className="tabular-nums font-medium">{formatPayrollMoney(row.baseSalary)}</dd>
          </div>
          <label className="flex items-center gap-2 pt-1 text-xs">
            <input
              type="checkbox"
              checked={applyStatutory}
              onChange={(e) => setApplyStatutory(e.target.checked)}
            />
            Apply Kenya statutory (PAYE, NSSF, SHIF, Housing Levy)
          </label>
          {applyStatutory && statutory > 0 ? (
            <>
              <div className="flex justify-between gap-4 pl-4 text-xs">
                <dt className="text-muted-foreground">PAYE</dt>
                <dd className="tabular-nums">− {formatPayrollMoney(row.payeSuggested)}</dd>
              </div>
              <div className="flex justify-between gap-4 pl-4 text-xs">
                <dt className="text-muted-foreground">NSSF</dt>
                <dd className="tabular-nums">− {formatPayrollMoney(row.nssfSuggested)}</dd>
              </div>
              <div className="flex justify-between gap-4 pl-4 text-xs">
                <dt className="text-muted-foreground">SHIF</dt>
                <dd className="tabular-nums">− {formatPayrollMoney(row.shifSuggested)}</dd>
              </div>
              <div className="flex justify-between gap-4 pl-4 text-xs">
                <dt className="text-muted-foreground">Housing Levy</dt>
                <dd className="tabular-nums">− {formatPayrollMoney(row.housingLevySuggested)}</dd>
              </div>
            </>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Salary advances</dt>
            <dd className="tabular-nums text-amber-800 dark:text-amber-200">
              − {formatPayrollMoney(advancesApplied)}
            </dd>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
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
          <label className="flex flex-col gap-1.5 pt-1 text-xs font-medium text-muted-foreground">
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
          <div className="flex justify-between gap-4 border-t border-border/50 pt-2">
            <dt className="font-medium">Net to pay</dt>
            <dd className="tabular-nums text-base font-semibold">
              {formatPayrollMoney(net)}
            </dd>
          </div>
        </dl>

        <label className="mt-4 flex items-center gap-2 text-xs">
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
    </FormDrawer>
  );
}

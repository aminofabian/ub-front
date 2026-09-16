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
import {
  fetchStaffAdvances,
  type PayrollRunRow,
  type SalaryAdvanceRecord,
} from "@/lib/api";
import {
  advanceBalanceLabel,
  advanceRepaymentCap,
  advanceRepaymentModeSummary,
  allocateAdvanceRepayments,
  buildStaffAdvancePayPreview,
  formatPayrollMoney,
  payrollArrearMonthsLabel,
  payrollArrearsNet,
  payrollIsJoinMonth,
  payrollMonthLabel,
} from "@/lib/payroll-utils";

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
  /** One-off: pay full monthly amount for this period. */
  skipProration: boolean;
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
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [deductionPreset, setDeductionPreset] = useState<
    "scheduled" | "full" | "half" | "none" | "custom"
  >("scheduled");
  const [skipProration, setSkipProration] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setOtherDeductions("0");
    setNote("");
    setApplyStatutory(applyStatutoryDefault);
    setPostExpense(postExpenseDefault);
    setPaymentMethod("mpesa_manual");
    setDeductionPreset("scheduled");
    setSkipProration(false);
    setAdvances([]);
    setLoadingAdvances(true);
    void fetchStaffAdvances(row.userId)
      .then((data) => {
        const outstanding = data.filter((a) => a.status === "outstanding");
        setAdvances(outstanding);
      })
      .catch(() => setAdvances([]))
      .finally(() => setLoadingAdvances(false));
  }, [open, row, applyStatutoryDefault, postExpenseDefault]);

  const other = Number(otherDeductions) || 0;
  const periodBase =
    row && skipProration
      ? Number(row.monthlySalary ?? row.baseSalary)
      : Number(row?.baseSalary ?? 0);
  const currentStatutory = applyStatutory
    ? Number(row?.statutoryTotal) || 0
    : 0;
  const arrearsStatutory = applyStatutory
    ? Number(row?.arrearsStatutoryTotal ?? 0)
    : 0;
  const combinedStatutory = currentStatutory + arrearsStatutory;
  // Arrear payslips are disbursed in full as their own payslips, so advances can
  // only be recovered from the current month's pay — mirrors the backend pool.
  const advancePool = row
    ? Math.max(0, periodBase - currentStatutory - other)
    : 0;

  const payPreview = useMemo(() => {
    if (!row) return null;
    return buildStaffAdvancePayPreview(
      periodBase,
      currentStatutory,
      other,
      advances.map((a) => ({
        id: a.id,
        amount: Number(a.amount),
        amountRepaid: Number(a.amountRepaid) || 0,
        balanceOutstanding: Number(a.balanceOutstanding),
        advancedOn: a.advancedOn,
        repaymentMode: a.repaymentMode,
        repaymentValue: a.repaymentValue,
        status: a.status,
      })),
    );
  }, [row, periodBase, currentStatutory, other, advances]);

  const scheduledThisRun = payPreview?.totalAllocatedThisRun ?? 0;

  const fullDeductCap = useMemo(() => {
    if (!row || advances.length === 0) {
      return Math.min(Number(row?.advancesOutstanding ?? 0), advancePool);
    }
    const withManual = advances.reduce(
      (sum, adv) => sum + advanceRepaymentCap(adv, true),
      0,
    );
    return Math.min(withManual, advancePool);
  }, [row, advances, advancePool]);

  useEffect(() => {
    if (!open || !row || loadingAdvances) return;
    if (deductionPreset === "custom") return;

    let next = 0;
    switch (deductionPreset) {
      case "scheduled":
        next = Math.min(scheduledThisRun, advancePool);
        break;
      case "full":
        next = fullDeductCap;
        break;
      case "half":
        next = Math.round(Math.min(scheduledThisRun, advancePool) * 50) / 100;
        break;
      case "none":
        next = 0;
        break;
    }
    setAdvancesToDeduct(next > 0 ? String(next) : "0");
  }, [
    open,
    row,
    loadingAdvances,
    deductionPreset,
    scheduledThisRun,
    fullDeductCap,
    advancePool,
    applyStatutory,
    other,
  ]);

  const maxAdvanceDeduct = fullDeductCap;
  const advanceInput =
    advancesToDeduct.trim() === ""
      ? maxAdvanceDeduct
      : Number(advancesToDeduct) || 0;
  const advancesApplied = Math.min(maxAdvanceDeduct, Math.max(0, advanceInput));
  const includeManualAdvances = advancesApplied > scheduledThisRun + 0.009;

  const allocationPreview = useMemo(() => {
    const { allocations } = allocateAdvanceRepayments(
      advancesApplied,
      advances,
      includeManualAdvances,
    );
    return allocations.map((item) => ({
      advance: advances.find((a) => a.id === item.advanceId),
      amount: item.amount,
    }));
  }, [advancesApplied, advances, includeManualAdvances]);
  const currentPeriodNet = row
    ? Math.max(
        0,
        periodBase - currentStatutory - advancesApplied - other,
      )
    : 0;
  const arrearNet = row ? payrollArrearsNet(row) : 0;
  const cashOut = arrearNet + currentPeriodNet;

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

  function applyPreset(kind: "scheduled" | "full" | "half" | "none") {
    setDeductionPreset(kind);
  }

  function handleAdvanceInputChange(raw: string) {
    setDeductionPreset("custom");
    setAdvancesToDeduct(raw);
  }

  if (!row) return null;

  const salaryLocked = row.salaryReleased === false;
  const deferredJoinMonth =
    row.joinPayMode === "deferred" &&
    payrollIsJoinMonth(row.startDate, year, month);

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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-none bg-[var(--pos-primary,#0f766e)] text-white"
            disabled={
              saving ||
              row.employmentStatus === "on_leave" ||
              salaryLocked ||
              deferredJoinMonth
            }
            onClick={() =>
              onConfirm({
                otherDeductions: other,
                note: note.trim(),
                applyStatutory,
                postExpense,
                paymentMethod,
                advancesToDeduct: advancesApplied,
                skipProration,
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
        <p className="mb-4 rounded-none border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_5%,white)] px-3 py-2 text-sm text-[#9a2e16]">
          This employee is on leave. Update their status before paying.
        </p>
      ) : null}

      {salaryLocked ? (
        <p className="mb-4 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] px-3 py-2 text-sm text-[var(--order-ink,#15231f)]">
          Salaries for {payrollMonthLabel(year, month)} unlock on the 25th —
          this month shows zero until then.
        </p>
      ) : null}

      {deferredJoinMonth ? (
        <p className="mb-4 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] px-3 py-2 text-sm text-[var(--order-ink,#15231f)]">
          Their first month is set to “no salary until next payroll” — salary
          starts from the next cycle.
        </p>
      ) : null}

      {row.arrearPeriods?.length ? (
        <p className="mb-4 rounded-none border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_5%,white)] px-3 py-2 text-sm text-[#9a2e16]">
          Includes arrears from{" "}
          <span className="font-medium">
            {payrollArrearMonthsLabel(row.arrearPeriods)}
          </span>{" "}
          ({formatPayrollMoney(row.arrearsBaseTotal)} gross). Paying now creates
          payslips for each missed month plus {payrollMonthLabel(year, month)}.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <FormDrawerFields
          legend="Deductions"
          hint="Each advance follows its arrangement. Oldest balance is repaid first."
        >
          <button
            type="button"
            className={cn(
              "flex w-full items-start gap-3 rounded-none border px-3 py-2.5 text-left transition-colors",
              applyStatutory
                ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)]"
                : "border-border/60 bg-muted/20",
            )}
            onClick={() => setApplyStatutory((v) => !v)}
          >
            <Scale
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <span>
              <span className="block text-sm font-medium">Kenya statutory</span>
              <span className="block text-xs text-muted-foreground">
                PAYE, NSSF, SHIF, Housing Levy
              </span>
            </span>
          </button>

          {statutoryLines.length > 0 ? (
            <dl className="space-y-1 rounded-none bg-muted/30 px-3 py-2 text-xs">
              {statutoryLines.map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular-nums">
                    − {formatPayrollMoney(Number(amount))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {loadingAdvances ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading advance arrangements…
            </p>
          ) : advances.length > 0 && payPreview ? (
            <div className="space-y-2 rounded-none border border-border/50 bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Repayment plan this run
                {payPreview.poolLimited ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · pool {formatPayrollMoney(payPreview.payPool)}, oldest
                    first
                  </span>
                ) : null}
              </p>
              {payPreview.lines.map((line) => {
                const applied =
                  allocationPreview.find((item) => item.advance?.id === line.id)
                    ?.amount ?? line.allocatedThisRun;
                return (
                  <div
                    key={line.id}
                    className="rounded-none bg-background/60 px-2.5 py-2 text-xs"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">
                        {formatPayrollDateShort(line.advancedOn)}
                      </span>
                      <span className="tabular-nums font-semibold text-[#9a2e16]">
                        {applied > 0
                          ? `− ${formatPayrollMoney(applied)}`
                          : line.balanceOutstanding > 0
                            ? "Later"
                            : "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-muted-foreground">
                      {advanceBalanceLabel(
                        line.originalAmount,
                        line.amountRepaid,
                        line.balanceOutstanding,
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {advanceRepaymentModeSummary(
                        line.repaymentMode,
                        line.repaymentValue,
                        line.originalAmount,
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {[
              {
                key: "scheduled" as const,
                label: `Scheduled (${formatPayrollMoney(Math.min(scheduledThisRun, advancePool))})`,
              },
              { key: "full" as const, label: "All outstanding" },
              { key: "half" as const, label: "Half scheduled" },
              { key: "none" as const, label: "Skip" },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={cn(
                  "rounded-none border px-2 py-0.5 text-xs transition-colors",
                  deductionPreset === preset.key
                    ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                    : "border-border/60 hover:bg-muted/50",
                )}
                onClick={() => applyPreset(preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Total advance deduction this run (max{" "}
            {formatPayrollMoney(maxAdvanceDeduct)})
            <input
              type="number"
              min="0"
              max={maxAdvanceDeduct}
              step="0.01"
              className={dashboardInputClass()}
              value={advancesToDeduct}
              onChange={(e) => handleAdvanceInputChange(e.target.value)}
            />
          </label>
          <p className="text-[11px] text-muted-foreground">
            Outstanding: {formatPayrollMoney(row.advancesOutstanding)}
            {scheduledThisRun > 0
              ? ` · Arrangements schedule ${formatPayrollMoney(scheduledThisRun)}`
              : ""}
            {" · "}
            Pay pool: {formatPayrollMoney(advancePool)}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {DEDUCTION_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className="rounded-none border border-border/60 px-2 py-0.5 text-xs hover:bg-muted/50"
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
          {Number(row.monthlySalary ?? 0) > Number(row.baseSalary) &&
          row.joinPayMode !== "full" ? (
            <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-none border border-border/60 bg-muted/20 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--pos-primary,#0f766e)]"
                checked={skipProration}
                onChange={(e) => setSkipProration(e.target.checked)}
              />
              <span className="min-w-0 text-xs">
                <span className="block font-medium text-foreground">
                  Pay full month this time
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Skip proration for this payment only (
                  {formatPayrollMoney(row.monthlySalary)} instead of{" "}
                  {formatPayrollMoney(row.baseSalary)}). Does not change their
                  profile setting.
                </span>
              </span>
            </label>
          ) : null}
          <dl className="space-y-2 rounded-none border border-border/50 bg-muted/25 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">This period</dt>
              <dd className="tabular-nums font-medium">
                {formatPayrollMoney(periodBase)}
              </dd>
            </div>
            {(row.arrearPeriods?.length ?? 0) > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  Arrears · {payrollArrearMonthsLabel(row.arrearPeriods!)}
                </dt>
                <dd className="tabular-nums font-medium text-[#9a2e16]">
                  + {formatPayrollMoney(row.arrearsBaseTotal)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground">Combined gross</dt>
              <dd className="tabular-nums font-semibold">
                {formatPayrollMoney(periodBase + Number(row.arrearsBaseTotal ?? 0))}
              </dd>
            </div>
            {combinedStatutory > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Statutory</dt>
                <dd className="tabular-nums">
                  − {formatPayrollMoney(combinedStatutory)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Advances</dt>
              <dd className="tabular-nums text-[#9a2e16]">
                − {formatPayrollMoney(advancesApplied)}
              </dd>
            </div>
            {advancesApplied > 0 && allocationPreview.length > 0 ? (
              <div className="space-y-1 border-l-2 border-[#9a2e16]/35 pl-3 text-xs text-muted-foreground">
                {allocationPreview
                  .filter((line) => line.amount > 0)
                  .map((line) => (
                    <div
                      key={line.advance?.id}
                      className="flex justify-between gap-3"
                    >
                      <span>
                        {formatPayrollDateShort(line.advance?.advancedOn)}
                        {line.advance?.repaymentMode ===
                          "percent_of_original" &&
                        line.advance.repaymentValue ? (
                          <span className="ml-1 opacity-80">
                            ({line.advance.repaymentValue}%)
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular-nums font-medium text-foreground">
                        {formatPayrollMoney(line.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : null}
            {other > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Other</dt>
                <dd className="tabular-nums">− {formatPayrollMoney(other)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border/50 pt-2">
              <dt className="font-medium">Net to pay</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatPayrollMoney(cashOut)}
              </dd>
            </div>
            {(row.arrearPeriods?.length ?? 0) > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Creates {row.arrearPeriods!.length + 1} payslips — arrears
                months plus {payrollMonthLabel(year, month)}
              </p>
            ) : null}
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

function formatPayrollDateShort(value: string | null | undefined): string {
  if (!value) return "Advance";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

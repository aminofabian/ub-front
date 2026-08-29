"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronRight,
  IdCard,
  Loader2,
  MessageSquare,
  Pencil,
  Receipt,
  Scale,
  Wallet,
} from "lucide-react";

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
  advanceRepaymentModeSummary,
  buildStaffAdvancePayPreview,
  employmentStatusLabel,
  formatPayrollDate,
  formatPayrollMoney,
  payrollArrearSummary,
  payrollCombinedBase,
  payrollMonthLabel,
  payrollShortMonth,
} from "@/lib/payroll-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PayrollRunRow | null;
  year: number;
  month: number;
  applyStatutoryPreview: boolean;
  canReadStaffProfile: boolean;
  canManagePayroll: boolean;
  canRunPayroll: boolean;
  paying: boolean;
  onOpenProfile: () => void;
  onEditSalary: () => void;
  onLogAdvance: () => void;
  onOpenLedger: () => void;
  onOpenPay: () => void;
  onOpenPayslip: () => void;
  onSendSms?: () => void;
};

export function PayrollStaffDrawer({
  open,
  onOpenChange,
  row,
  year,
  month,
  applyStatutoryPreview,
  canReadStaffProfile,
  canManagePayroll,
  canRunPayroll,
  paying,
  onOpenProfile,
  onEditSalary,
  onLogAdvance,
  onOpenLedger,
  onOpenPay,
  onOpenPayslip,
  onSendSms,
}: Props) {
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);

  const loadAdvances = useCallback(async () => {
    if (!row?.userId) return;
    setLoadingAdvances(true);
    try {
      setAdvances(await fetchStaffAdvances(row.userId));
    } catch {
      setAdvances([]);
    } finally {
      setLoadingAdvances(false);
    }
  }, [row?.userId]);

  useEffect(() => {
    if (open && row) void loadAdvances();
    if (!open) setAdvances([]);
  }, [open, row, loadAdvances]);

  const outstandingAdvances = useMemo(
    () =>
      advances.filter(
        (a) =>
          (a.status === "outstanding" || Number(a.balanceOutstanding) > 0) &&
          Number(a.balanceOutstanding) > 0,
      ),
    [advances],
  );

  const advancePreview = useMemo(() => {
    if (!row) return null;
    const combinedBase = payrollCombinedBase(row);
    const statutoryAmount = applyStatutoryPreview
      ? Number(row.statutoryTotal) + Number(row.arrearsStatutoryTotal ?? 0)
      : 0;
    return buildStaffAdvancePayPreview(
      combinedBase,
      statutoryAmount,
      0,
      outstandingAdvances,
    );
  }, [row, applyStatutoryPreview, outstandingAdvances]);

  if (!row) return null;

  const statutory = applyStatutoryPreview
    ? Number(row.statutoryTotal) + Number(row.arrearsStatutoryTotal ?? 0)
    : 0;
  const advanceDeductionPreview = row.alreadyPaid
    ? 0
    : (advancePreview?.totalAllocatedThisRun ??
        Number(row.advancesScheduledThisRun)) || 0;
  const netPreview = row.alreadyPaid
    ? Number(row.suggestedNet)
    : applyStatutoryPreview
      ? Number(row.suggestedNet)
      : advancePreview?.netAfterAdvances ??
        Math.max(0, Number(row.baseSalary) - advanceDeductionPreview);

  const statusTone =
    row.alreadyPaid
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
      : row.employmentStatus === "on_leave"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100"
        : Number(row.baseSalary) <= 0
          ? "border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-100"
          : "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100";

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={row.displayName}
      description={[row.title, row.branchName].filter(Boolean).join(" · ") || undefined}
      contextLabel={`Payroll · ${payrollMonthLabel(year, month)}`}
      icon={<Banknote className="size-5 text-primary" aria-hidden />}
      width="wide"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {canReadStaffProfile ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenProfile}>
                <IdCard className="mr-1.5 size-3.5" aria-hidden />
                Full profile
              </Button>
            ) : null}
            {canManagePayroll && onSendSms ? (
              <Button type="button" variant="outline" size="sm" onClick={onSendSms}>
                <MessageSquare className="mr-1.5 size-3.5" aria-hidden />
                SMS
              </Button>
            ) : null}
            {row.alreadyPaid ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenPayslip}>
                <Receipt className="mr-1.5 size-3.5" aria-hidden />
                View payslip
              </Button>
            ) : null}
          </div>
          {!row.alreadyPaid && canRunPayroll ? (
            <Button
              type="button"
              size="sm"
              disabled={paying || row.employmentStatus === "on_leave"}
              onClick={onOpenPay}
            >
              {paying ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
              ) : null}
              Mark paid
            </Button>
          ) : null}
        </div>
      }
    >
      <div
        className={cn(
          "mb-5 overflow-hidden rounded-xl border",
          statusTone,
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <StaffAvatar name={row.displayName} paid={row.alreadyPaid} />
          <div className="min-w-0 flex-1 text-sm">
            {row.alreadyPaid
              ? `Paid ${formatPayrollDate(row.paidAt)}`
              : row.employmentStatus === "on_leave"
                ? "On leave — update status before paying"
                : Number(row.baseSalary) <= 0
                  ? "Salary not set — add monthly amount first"
                  : `${employmentStatusLabel(row.employmentStatus)} · ready for ${payrollMonthLabel(year, month)}`}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Banknote className="size-3.5" aria-hidden />
              Compensation
            </h3>
            {canManagePayroll ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onEditSalary}>
                <Pencil className="mr-1 size-3" aria-hidden />
                {Number(row.baseSalary) > 0 ? "Edit" : "Set salary"}
              </Button>
            ) : null}
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Monthly base</dt>
              <dd className="tabular-nums font-semibold">
                {Number(row.baseSalary) > 0
                  ? formatPayrollMoney(row.baseSalary)
                  : "Not set"}
              </dd>
            </div>
            {(row.arrearPeriods?.length ?? 0) > 0 ? (
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs">
                <div className="flex justify-between gap-3 font-medium text-violet-950 dark:text-violet-100">
                  <span>Arrears</span>
                  <span className="tabular-nums">+ {formatPayrollMoney(row.arrearsBaseTotal)}</span>
                </div>
                <ul className="mt-1.5 space-y-1 text-muted-foreground">
                  {row.arrearPeriods!.map((period) => (
                    <li key={`${period.year}-${period.month}`} className="flex justify-between gap-3">
                      <span>{payrollShortMonth(period.year, period.month)}</span>
                      <span className="tabular-nums">{formatPayrollMoney(period.baseSalary)}</span>
                    </li>
                  ))}
                </ul>
                {payrollArrearSummary(row) ? (
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Cleared when you pay {payrollMonthLabel(year, month)}
                  </p>
                ) : null}
              </div>
            ) : null}
            {applyStatutoryPreview && statutory > 0 ? (
              <>
                <div className="flex justify-between gap-3 text-xs">
                  <dt className="text-muted-foreground">PAYE</dt>
                  <dd className="tabular-nums">− {formatPayrollMoney(row.payeSuggested)}</dd>
                </div>
                <div className="flex justify-between gap-3 text-xs">
                  <dt className="text-muted-foreground">NSSF + SHIF + Levy</dt>
                  <dd className="tabular-nums">
                    −{" "}
                    {formatPayrollMoney(
                      Number(row.nssfSuggested) +
                        Number(row.shifSuggested) +
                        Number(row.housingLevySuggested),
                    )}
                  </dd>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Statutory off in preview — enable in pay run settings or when marking paid.
              </p>
            )}
            {!row.alreadyPaid && advanceDeductionPreview > 0 ? (
              <div className="flex justify-between gap-3 text-xs">
                <dt className="text-muted-foreground">Advances this pay</dt>
                <dd className="tabular-nums text-amber-800 dark:text-amber-200">
                  − {formatPayrollMoney(advanceDeductionPreview)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-border/50 pt-2">
              <dt className="font-medium">Est. net</dt>
              <dd className="tabular-nums text-base font-semibold">
                {formatPayrollMoney(netPreview)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Wallet className="size-3.5" aria-hidden />
              Advances
            </h3>
            {canManagePayroll ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onLogAdvance}>
                Log advance
              </Button>
            ) : null}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Balance owed</span>
            <button
              type="button"
              className="text-lg font-semibold tabular-nums text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
              onClick={onOpenLedger}
            >
              {formatPayrollMoney(advancePreview?.totalOutstanding ?? row.advancesOutstanding)}
            </button>
          </div>

          {!row.alreadyPaid && advancePreview && advancePreview.totalAllocatedThisRun > 0 ? (
            <p className="text-xs text-muted-foreground">
              Deducting{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatPayrollMoney(advancePreview.totalAllocatedThisRun)}
              </span>{" "}
              this pay
              {advancePreview.poolLimited ? (
                <>
                  {" "}
                  (salary pool {formatPayrollMoney(advancePreview.payPool)} — oldest first)
                </>
              ) : null}
            </p>
          ) : null}

          {loadingAdvances ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Loading ledger…
            </p>
          ) : outstandingAdvances.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open advances.</p>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
              {(advancePreview?.lines ?? []).map((line) => (
                  <li
                    key={line.id}
                    className="rounded-md border border-border/40 bg-background/60 px-2.5 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block font-medium">
                          {formatPayrollDate(line.advancedOn)}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                          {advanceBalanceLabel(
                            line.originalAmount,
                            line.amountRepaid,
                            line.balanceOutstanding,
                          )}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                          {advanceRepaymentModeSummary(
                            line.repaymentMode,
                            line.repaymentValue,
                            line.originalAmount,
                          )}
                        </span>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        {!row.alreadyPaid && line.allocatedThisRun > 0 ? (
                          <span className="block text-sm font-semibold text-amber-800 dark:text-amber-200">
                            −{formatPayrollMoney(line.allocatedThisRun)}
                          </span>
                        ) : !row.alreadyPaid && line.balanceOutstanding > 0 ? (
                          <span className="block text-[10px] text-muted-foreground">
                            {advancePreview?.poolLimited ? "Later pays" : "—"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
              ))}
            </ul>
          )}

          {outstandingAdvances.length > 0 ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              onClick={onOpenLedger}
            >
              Full ledger
              <ChevronRight className="size-3" aria-hidden />
            </button>
          ) : null}
        </section>
      </div>

      <FormDrawerFields
        legend="Pay run note"
        hint={
          row.alreadyPaid
            ? "This period is closed — open the payslip for amounts actually deducted."
            : "Amounts below reflect balance owed, prior repayments, and what fits in this month's salary."
        }
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <MiniStat label="Base" value={formatPayrollMoney(row.baseSalary)} />
          <MiniStat
            label="Statutory"
            value={
              applyStatutoryPreview && statutory > 0
                ? formatPayrollMoney(statutory)
                : "Off"
            }
            icon={<Scale className="size-3" aria-hidden />}
          />
          <MiniStat
            label={row.alreadyPaid ? "Advances deducted" : "Advances this pay"}
            value={
              row.alreadyPaid
                ? "See payslip"
                : formatPayrollMoney(advanceDeductionPreview)
            }
            icon={<Wallet className="size-3" aria-hidden />}
          />
        </div>
        {!row.alreadyPaid &&
        advancePreview &&
        advancePreview.totalOutstanding > advancePreview.totalAllocatedThisRun ? (
          <p className="text-xs text-muted-foreground">
            {formatPayrollMoney(advancePreview.totalOutstanding)} still owed overall ·{" "}
            {formatPayrollMoney(
              advancePreview.totalOutstanding - advancePreview.totalAllocatedThisRun,
            )}{" "}
            carries to future pays
          </p>
        ) : null}
      </FormDrawerFields>
    </FormDrawer>
  );
}

function StaffAvatar({ name, paid }: { name: string; paid: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
        paid
          ? "bg-emerald-500/15 text-emerald-800 ring-emerald-500/20 dark:text-emerald-200"
          : "bg-primary/10 text-primary ring-primary/15",
      )}
    >
      {initials || "?"}
    </span>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

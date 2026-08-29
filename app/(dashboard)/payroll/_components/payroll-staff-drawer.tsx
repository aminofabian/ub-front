"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronRight,
  IdCard,
  Loader2,
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
  advanceRepaymentModeSummary,
  employmentStatusLabel,
  formatPayrollDate,
  formatPayrollMoney,
  payrollMonthLabel,
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
        (a) => a.status === "outstanding" || Number(a.balanceOutstanding) > 0,
      ),
    [advances],
  );

  if (!row) return null;

  const scheduledThisRun = Number(row.advancesScheduledThisRun) || 0;
  const statutory = applyStatutoryPreview ? Number(row.statutoryTotal) || 0 : 0;
  const advanceDeductionPreview = scheduledThisRun > 0 ? scheduledThisRun : Number(row.advancesOutstanding);
  const netPreview = applyStatutoryPreview
    ? Number(row.suggestedNet)
    : Math.max(0, Number(row.baseSalary) - advanceDeductionPreview);

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
            <span className="text-sm text-muted-foreground">Outstanding</span>
            <button
              type="button"
              className="text-lg font-semibold tabular-nums text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
              onClick={onOpenLedger}
            >
              {formatPayrollMoney(row.advancesOutstanding)}
            </button>
          </div>

          {loadingAdvances ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Loading ledger…
            </p>
          ) : outstandingAdvances.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open advances.</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
              {outstandingAdvances.slice(0, 5).map((adv) => (
                <li
                  key={adv.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1.5"
                >
                  <span className="min-w-0 text-muted-foreground">
                    <span className="block">{formatPayrollDate(adv.advancedOn)}</span>
                    <span className="block truncate text-[10px] opacity-80">
                      {advanceRepaymentModeSummary(
                        adv.repaymentMode,
                        adv.repaymentValue,
                        Number(adv.amount),
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-medium">
                      {formatPayrollMoney(Number(adv.balanceOutstanding ?? adv.amount))}
                    </span>
                    {Number(adv.scheduledDeductionThisRun) > 0 ? (
                      <span className="block text-[10px] text-amber-800 dark:text-amber-200">
                        −{formatPayrollMoney(Number(adv.scheduledDeductionThisRun))} next
                      </span>
                    ) : null}
                  </span>
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
        hint="Statutory and advance deduction amounts are confirmed when you mark paid."
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
            label="Advances next pay"
            value={formatPayrollMoney(advanceDeductionPreview)}
            icon={<Wallet className="size-3" aria-hidden />}
          />
        </div>
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

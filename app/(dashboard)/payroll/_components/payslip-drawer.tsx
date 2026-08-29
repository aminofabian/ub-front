"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Printer, Receipt } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { fetchStaffPayslips, type PayslipRecord } from "@/lib/api";
import {
  formatPayrollDateTime,
  formatPayrollMoney,
  payrollMonthLabel,
} from "@/lib/payroll-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  staffName: string;
  year: number;
  month: number;
  payslipId?: string | null;
  initialPayslip?: PayslipRecord | null;
};

function payslipDocumentHtml(payslip: PayslipRecord, staffName: string): string {
  const period = payrollMonthLabel(payslip.periodYear, payslip.periodMonth);
  const lines = [
    ["Period", period],
    ["Paid on", formatPayrollDateTime(payslip.paidAt)],
    ["Base salary", formatPayrollMoney(Number(payslip.baseSalary))],
    [
      "Advances deducted",
      formatPayrollMoney(Number(payslip.advancesDeducted)),
    ],
    [
      "Other deductions",
      formatPayrollMoney(Number(payslip.otherDeductions)),
    ],
    ["Net paid", formatPayrollMoney(Number(payslip.netPaid))],
  ];
  const note = payslip.note
    ? `<p style="margin-top:16px;color:#555"><strong>Note:</strong> ${payslip.note}</p>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payslip — ${staffName}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; color: #111; max-width: 480px; margin: 0 auto; }
  h1 { font-size: 1.25rem; margin: 0 0 4px; }
  p.sub { color: #555; margin: 0 0 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 0; border-bottom: 1px solid #eee; }
  td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: 700; border-top: 2px solid #111; border-bottom: none; padding-top: 12px; }
</style></head><body>
  <h1>Payslip</h1>
  <p class="sub">${staffName} · ${period}</p>
  <table>
    ${lines
      .map(
        ([label, value], i) =>
          `<tr class="${i === lines.length - 1 ? "total" : ""}"><td>${label}</td><td>${value}</td></tr>`,
      )
      .join("")}
  </table>
  ${note}
</body></html>`;
}

export function PayslipDrawer({
  open,
  onOpenChange,
  userId,
  staffName,
  year,
  month,
  payslipId,
  initialPayslip,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payslip, setPayslip] = useState<PayslipRecord | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (initialPayslip) {
      setPayslip(initialPayslip);
      setError(null);
      return;
    }
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchStaffPayslips(userId);
      const match =
        rows.find((p) => p.id === payslipId) ??
        rows.find((p) => p.periodYear === year && p.periodMonth === month) ??
        null;
      setPayslip(match);
      if (!match) {
        setError("No payslip found for this period.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payslip");
      setPayslip(null);
    } finally {
      setLoading(false);
    }
  }, [userId, payslipId, year, month, initialPayslip]);

  useEffect(() => {
    if (open) void load();
    if (!open) {
      setPayslip(null);
      setError(null);
    }
  }, [open, load]);

  function onPrint() {
    if (!payslip) return;
    const html = payslipDocumentHtml(payslip, staffName || payslip.displayName);
    const win = window.open("", "_blank", "noopener,noreferrer,width=520,height=720");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const displayName = staffName || payslip?.displayName || "Staff";
  const periodYear = payslip?.periodYear ?? year;
  const periodMonth = payslip?.periodMonth ?? month;

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Payslip"
      description={`${displayName} · ${payrollMonthLabel(periodYear, periodMonth)}`}
      contextLabel="Payroll"
      icon={<Receipt className="size-5 text-primary" aria-hidden />}
      footer={
        <div className="flex justify-end gap-2">
          {payslip ? (
            <Button type="button" variant="outline" onClick={onPrint}>
              <Printer className="mr-1.5 size-4" aria-hidden />
              Print
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading payslip…
        </div>
      ) : error && !payslip ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : payslip ? (
        <FormDrawerFields legend="Payment record">
          <div ref={printRef}>
            <dl className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Period</dt>
                <dd className="font-medium">
                  {payrollMonthLabel(payslip.periodYear, payslip.periodMonth)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Paid on</dt>
                <dd>{formatPayrollDateTime(payslip.paidAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Base salary</dt>
                <dd className="tabular-nums">
                  {formatPayrollMoney(Number(payslip.baseSalary))}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Advances deducted</dt>
                <dd className="tabular-nums text-amber-800 dark:text-amber-200">
                  − {formatPayrollMoney(Number(payslip.advancesDeducted))}
                </dd>
              </div>
            {Number(payslip.otherDeductions) > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Other deductions</dt>
                <dd className="tabular-nums text-amber-800 dark:text-amber-200">
                  − {formatPayrollMoney(Number(payslip.otherDeductions))}
                </dd>
              </div>
            ) : null}
            {Number(payslip.payeDeducted) > 0 ||
            Number(payslip.nssfDeducted) > 0 ||
            Number(payslip.shifDeducted) > 0 ||
            Number(payslip.housingLevyDeducted) > 0 ? (
              <div className="space-y-1 border-t border-border/40 pt-2 text-xs">
                <p className="font-medium text-muted-foreground">Statutory</p>
                {Number(payslip.payeDeducted) > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt>PAYE</dt>
                    <dd className="tabular-nums">− {formatPayrollMoney(Number(payslip.payeDeducted))}</dd>
                  </div>
                ) : null}
                {Number(payslip.nssfDeducted) > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt>NSSF</dt>
                    <dd className="tabular-nums">− {formatPayrollMoney(Number(payslip.nssfDeducted))}</dd>
                  </div>
                ) : null}
                {Number(payslip.shifDeducted) > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt>SHIF</dt>
                    <dd className="tabular-nums">− {formatPayrollMoney(Number(payslip.shifDeducted))}</dd>
                  </div>
                ) : null}
                {Number(payslip.housingLevyDeducted) > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt>Housing Levy</dt>
                    <dd className="tabular-nums">
                      − {formatPayrollMoney(Number(payslip.housingLevyDeducted))}
                    </dd>
                  </div>
                ) : null}
              </div>
            ) : null}
              <div className="flex justify-between gap-4 border-t border-border/50 pt-2">
                <dt className="font-medium">Net paid</dt>
                <dd className="tabular-nums text-base font-semibold">
                  {formatPayrollMoney(Number(payslip.netPaid))}
                </dd>
              </div>
            {payslip.note ? (
              <div className="border-t border-border/50 pt-2">
                <dt className="text-xs text-muted-foreground">Note</dt>
                <dd className="mt-1">{payslip.note}</dd>
              </div>
            ) : null}
            {payslip.expenseId ? (
              <div className="border-t border-border/50 pt-2 text-xs text-muted-foreground">
                Posted to finance
                {payslip.paymentMethod ? ` · ${payslip.paymentMethod.replace("_", " ")}` : ""}
              </div>
            ) : null}
            </dl>
          </div>
        </FormDrawerFields>
      ) : null}
    </FormDrawer>
  );
}

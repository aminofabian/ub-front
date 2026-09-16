"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Printer, Receipt } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  fetchStaffPayslips,
  fetchStaffProfile,
  type PayslipRecord,
  type StaffProfileRecord,
} from "@/lib/api";
import {
  formatPayrollDateTime,
  formatPayrollMoney,
  payrollMonthLabel,
  payslipDocumentHtml,
  printPayslipDocument,
  type PayslipDocumentOptions,
} from "@/lib/payroll-utils";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  staffName: string;
  year: number;
  month: number;
  payslipId?: string | null;
  initialPayslip?: PayslipRecord | null;
  dockRoot?: HTMLElement | null;
  docked?: boolean;
};

function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case "mpesa_manual":
      return "M-Pesa";
    case "bank":
      return "Bank transfer";
    case "cash":
      return "Cash";
    default:
      return method ? method.replace(/_/g, " ") : "";
  }
}

/** Section header band matching the printed payslip. */
function SectionBand({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <p
      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-white"
      style={{ backgroundColor: accent }}
    >
      {children}
    </p>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 px-3 py-1.5 text-[13px] last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 px-3 py-1.5 text-[13px] last:border-b-0">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
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
  dockRoot = null,
  docked = false,
}: Props) {
  const { business } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payslip, setPayslip] = useState<PayslipRecord | null>(null);
  const [profile, setProfile] = useState<StaffProfileRecord | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const branding = business?.branding;
  const accent =
    /^#[0-9a-fA-F]{6}$/.test(branding?.primaryColor?.trim() ?? "")
      ? (branding!.primaryColor as string).trim()
      : "#0f766e";
  const shopName =
    branding?.displayName?.trim() || business?.name?.trim() || "";

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

  // Identity fields for the details grid — private fields (employee ID, bank)
  // are simply absent when the caller lacks staff.hr.read.
  useEffect(() => {
    if (!open || !userId) {
      setProfile(null);
      return;
    }
    let active = true;
    void fetchStaffProfile(userId)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [open, userId]);

  useEffect(() => {
    if (open) void load();
    if (!open) {
      setPayslip(null);
      setError(null);
    }
  }, [open, load]);

  const displayName = staffName || payslip?.displayName || "Staff";
  const periodYear = payslip?.periodYear ?? year;
  const periodMonth = payslip?.periodMonth ?? month;
  const paidVia = payslip ? paymentMethodLabel(payslip.paymentMethod) : "";
  const bank = profile?.privateFields?.bankDetails as
    | Record<string, unknown>
    | null
    | undefined;
  const bankName = bank ? String(bank.bankName ?? "") || null : null;
  const accountRaw = bank ? String(bank.account ?? "").trim() : "";
  const accountMasked = accountRaw ? `•••• ${accountRaw.slice(-4)}` : null;
  const bankLine = [bankName, accountMasked].filter(Boolean).join(" · ");

  const earnings = payslip ? Number(payslip.baseSalary) : 0;
  const deductions = payslip
    ? Number(payslip.payeDeducted) +
      Number(payslip.nssfDeducted) +
      Number(payslip.shifDeducted) +
      Number(payslip.housingLevyDeducted) +
      Number(payslip.advancesDeducted) +
      Number(payslip.otherDeductions)
    : 0;

  const documentOptions = (): PayslipDocumentOptions => ({
    shopName,
    logoUrl: branding?.logoUrl ?? null,
    accent,
    employee: {
      designation: profile?.publicFields.title,
      code: profile?.privateFields?.employeeCode,
      bankName,
      accountMasked,
    },
  });

  function onPrint() {
    if (!payslip) return;
    printPayslipDocument(
      payslipDocumentHtml(payslip, staffName || payslip.displayName, documentOptions()),
    );
  }

  async function onDownloadPdf() {
    if (!payslip) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await downloadPayslipPdf(
        payslip,
        staffName || payslip.displayName,
        documentOptions(),
      );
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "Couldn't generate the PDF",
      );
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Payslip"
      description={`${displayName} · ${payrollMonthLabel(periodYear, periodMonth)}`}
      contextLabel="Payroll"
      icon={<Receipt className="size-5 text-primary" aria-hidden />}
      headerDensity={docked ? "compact" : "default"}
      bodyLayout={docked ? "fill" : "scroll"}
      appearance={docked ? "sharp" : "default"}
      docked={docked}
      dockRoot={dockRoot}
      footer={
        <div className="flex justify-end gap-2">
          {payslip ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pdfBusy}
                onClick={() => void onDownloadPdf()}
              >
                {pdfBusy ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="mr-1.5 size-4" aria-hidden />
                )}
                PDF
              </Button>
              <Button type="button" variant="outline" onClick={onPrint}>
                <Printer className="mr-1.5 size-4" aria-hidden />
                Print
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      }
    >
      <div
        className={
          docked
            ? "h-full min-h-0 overflow-y-auto overscroll-contain"
            : undefined
        }
      >
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading payslip…
        </div>
      ) : error && !payslip ? (
        <p className="rounded-none border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : payslip ? (
        <FormDrawerFields>
          {/* Masthead */}
          <div className="flex items-center gap-3 border-b-2 pb-3" style={{ borderColor: accent }}>
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className="size-11 rounded-lg object-contain"
              />
            ) : null}
            <div className="min-w-0">
              {shopName ? (
                <p className="truncate text-sm font-bold">{shopName}</p>
              ) : null}
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Payroll
              </p>
            </div>
            <div className="ml-auto text-right">
              <p
                className="text-sm font-extrabold uppercase tracking-[0.06em]"
                style={{ color: accent }}
              >
                Monthly Payslip
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {payrollMonthLabel(payslip.periodYear, payslip.periodMonth)}
              </p>
              {payslip.payslipNumber ? (
                <p className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground">
                  No. {payslip.payslipNumber}
                </p>
              ) : null}
            </div>
          </div>

          {/* Employee & payroll details */}
          <div className="mt-4">
            <SectionBand accent={accent}>Employee &amp; Payroll Details</SectionBand>
            <div className="grid gap-x-6 border border-t-0 border-border/50 sm:grid-cols-2">
              <div>
                <DetailRow label="Employee name" value={displayName} />
                {profile?.privateFields?.employeeCode ? (
                  <DetailRow
                    label="Employee ID"
                    value={profile.privateFields.employeeCode}
                  />
                ) : null}
                {profile?.publicFields.title ? (
                  <DetailRow label="Designation" value={profile.publicFields.title} />
                ) : null}
              </div>
              <div>
                <DetailRow
                  label="Pay period"
                  value={payrollMonthLabel(payslip.periodYear, payslip.periodMonth)}
                />
                <DetailRow label="Pay date" value={formatPayrollDateTime(payslip.paidAt)} />
                {bankLine ? (
                  <DetailRow label="Bank" value={bankLine} />
                ) : paidVia ? (
                  <DetailRow label="Paid via" value={paidVia} />
                ) : null}
              </div>
            </div>
          </div>

          {/* Earnings & deductions */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <SectionBand accent={accent}>Earnings</SectionBand>
              <div className="border border-t-0 border-border/50">
                <MoneyRow label="Basic salary" value={formatPayrollMoney(earnings)} />
                <div
                  className="flex justify-between gap-3 border-t-2 px-3 py-1.5 text-[13px] font-bold"
                  style={{
                    borderColor: accent,
                    backgroundColor: `${accent}14`,
                  }}
                >
                  <span>Total earnings</span>
                  <span className="tabular-nums">{formatPayrollMoney(earnings)}</span>
                </div>
              </div>
            </div>
            <div>
              <SectionBand accent={accent}>Deductions</SectionBand>
              <div className="border border-t-0 border-border/50">
                {Number(payslip.payeDeducted) > 0 ? (
                  <MoneyRow label="PAYE (income tax)" value={formatPayrollMoney(Number(payslip.payeDeducted))} />
                ) : null}
                {Number(payslip.nssfDeducted) > 0 ? (
                  <MoneyRow label="NSSF pension" value={formatPayrollMoney(Number(payslip.nssfDeducted))} />
                ) : null}
                {Number(payslip.shifDeducted) > 0 ? (
                  <MoneyRow label="SHIF (health insurance)" value={formatPayrollMoney(Number(payslip.shifDeducted))} />
                ) : null}
                {Number(payslip.housingLevyDeducted) > 0 ? (
                  <MoneyRow label="Affordable Housing Levy" value={formatPayrollMoney(Number(payslip.housingLevyDeducted))} />
                ) : null}
                {Number(payslip.advancesDeducted) > 0 ? (
                  <MoneyRow label="Salary advance repayment" value={formatPayrollMoney(Number(payslip.advancesDeducted))} />
                ) : null}
                {Number(payslip.otherDeductions) > 0 ? (
                  <MoneyRow label="Other deductions" value={formatPayrollMoney(Number(payslip.otherDeductions))} />
                ) : null}
                <div
                  className="flex justify-between gap-3 border-t-2 px-3 py-1.5 text-[13px] font-bold"
                  style={{
                    borderColor: accent,
                    backgroundColor: `${accent}14`,
                  }}
                >
                  <span>Total deductions</span>
                  <span className="tabular-nums">{formatPayrollMoney(deductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net pay band */}
          <div
            className="mt-4 flex items-center justify-between gap-3 px-4 py-3 text-white"
            style={{ backgroundColor: accent }}
          >
            <span className="text-xs font-bold uppercase tracking-[0.09em]">
              Net salary payable
            </span>
            <span className="text-lg font-extrabold tabular-nums">
              {formatPayrollMoney(Number(payslip.netPaid))}
            </span>
          </div>

          {payslip.note ? (
            <div className="mt-3 border border-border/50 bg-muted/20 px-3 py-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Note
              </p>
              <p className="mt-0.5">{payslip.note}</p>
            </div>
          ) : null}

          {pdfError ? (
            <p className="mt-3 rounded-none border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {pdfError}
            </p>
          ) : null}

          <p className="mt-3 text-center text-[11px] italic text-muted-foreground">
            This is a computer-generated document and does not require a
            signature.
          </p>
        </FormDrawerFields>
      ) : null}
      </div>
    </FormDrawer>
  );
}

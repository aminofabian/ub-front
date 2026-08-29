"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Loader2,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { StaffProfileDrawer } from "@/components/staff/staff-profile-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createStaffSalary,
  fetchPayrollRun,
  payAllStaffPayroll,
  payStaffPayroll,
  type PayslipRecord,
  type PayrollRunRow,
} from "@/lib/api";
import {
  exportPayrollRunCsv,
  defaultPayrollPeriod,
  formatPayrollMoney,
  payrollArrearMonthsLabel,
  payrollCombinedBase,
  payrollMonthLabel,
} from "@/lib/payroll-utils";

import { AdvanceLedgerDrawer } from "./_components/advance-ledger-drawer";
import { AdvanceLedgerPanel } from "./_components/advance-ledger-panel";
import { LogAdvanceDrawer } from "./_components/log-advance-drawer";
import { PayConfirmDrawer, type PayConfirmPayload } from "./_components/pay-confirm-drawer";
import { PayrollCalendarPanel } from "./_components/payroll-calendar-panel";
import { PayrollMonthNav } from "./_components/payroll-month-nav";
import { PayrollRunHeader } from "./_components/payroll-run-header";
import { PayrollRunPanel } from "./_components/payroll-run-panel";
import { PayrollRunSidebar } from "./_components/payroll-run-sidebar";
import { PayrollStaffDrawer } from "./_components/payroll-staff-drawer";
import { PayrollTabs } from "./_components/payroll-tabs";
import { PayslipDrawer } from "./_components/payslip-drawer";
import { PayslipHistoryPanel } from "./_components/payslip-history-panel";
import { StaffSmsDrawer } from "./_components/staff-sms-drawer";

type Tab = "run" | "calendar" | "advances" | "history";

export default function PayrollPage() {
  const {
    loading: dashLoading,
    me,
    canViewPayroll,
    canManagePayroll,
    canRunPayroll,
    canReadStaffProfile,
    branches,
  } = useDashboard();

  const defaultPeriod = useMemo(() => defaultPayrollPeriod(), []);
  const [tab, setTab] = useState<Tab>("run");
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [rows, setRows] = useState<PayrollRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [branchFilter, setBranchFilter] = useState("");
  const [applyStatutory, setApplyStatutory] = useState(false);
  const [postExpenseDefault, setPostExpenseDefault] = useState(false);

  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileUserLabel, setProfileUserLabel] = useState("");

  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PayrollRunRow | null>(null);

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceUserId, setAdvanceUserId] = useState<string | null>(null);
  const [advanceName, setAdvanceName] = useState("");
  const [advanceOutstanding, setAdvanceOutstanding] = useState(0);
  const [advanceSaving, setAdvanceSaving] = useState(false);

  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryUserId, setSalaryUserId] = useState<string | null>(null);
  const [salaryName, setSalaryName] = useState("");
  const [salaryCurrent, setSalaryCurrent] = useState(0);
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryFrom, setSalaryFrom] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [salarySaving, setSalarySaving] = useState(false);

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerUserId, setLedgerUserId] = useState<string | null>(null);
  const [ledgerName, setLedgerName] = useState("");

  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [payRow, setPayRow] = useState<PayrollRunRow | null>(null);

  const [payslipOpen, setPayslipOpen] = useState(false);
  const [payslipUserId, setPayslipUserId] = useState<string | null>(null);
  const [payslipName, setPayslipName] = useState("");
  const [payslipId, setPayslipId] = useState<string | null>(null);
  const [payslipInitial, setPayslipInitial] = useState<PayslipRecord | null>(null);

  const [smsOpen, setSmsOpen] = useState(false);
  const [smsUserId, setSmsUserId] = useState<string | null>(null);
  const [smsUserName, setSmsUserName] = useState("");

  const summary = useMemo(() => {
    const pending = rows.filter(
      (r) =>
        !r.alreadyPaid &&
        Number(r.baseSalary) > 0 &&
        r.employmentStatus !== "on_leave",
    );
    const paid = rows.filter((r) => r.alreadyPaid);
    return {
      headcount: rows.length,
      pendingCount: pending.length,
      paidCount: paid.length,
      totalBase: rows.reduce(
        (s, r) => s + payrollCombinedBase(r),
        0,
      ),
      totalArrears: rows.reduce((s, r) => s + Number(r.arrearsBaseTotal ?? 0), 0),
      staffWithArrears: rows.filter((r) => (r.arrearPeriods?.length ?? 0) > 0).length,
      totalAdvances: rows.reduce(
        (s, r) => s + Number(r.advancesOutstanding),
        0,
      ),
      totalNetPending: pending.reduce((s, r) => s + Number(r.suggestedNet), 0),
      totalStatutory: rows.reduce(
        (s, r) => s + (applyStatutory ? Number(r.statutoryTotal) : 0),
        0,
      ),
      missingSalary: rows.filter((r) => Number(r.baseSalary) <= 0).length,
      onLeaveCount: rows.filter((r) => r.employmentStatus === "on_leave").length,
    };
  }, [rows, applyStatutory]);

  const load = useCallback(async () => {
    if (!canViewPayroll) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPayrollRun(year, month, {
        branchId: branchFilter || undefined,
        statutory: applyStatutory,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll run");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canViewPayroll, year, month, branchFilter, applyStatutory]);

  useEffect(() => {
    if (!dashLoading && canViewPayroll && tab === "run") {
      void load();
    }
  }, [dashLoading, canViewPayroll, load, tab]);

  function openSmsBulk() {
    setSmsUserId(null);
    setSmsUserName("");
    setSmsOpen(true);
  }

  function openSmsForRow(row: PayrollRunRow) {
    setSmsUserId(row.userId);
    setSmsUserName(row.displayName);
    setSmsOpen(true);
  }

  function openStaffDrawer(row: PayrollRunRow) {
    setSelectedRow(row);
    setStaffDrawerOpen(true);
  }

  function openProfile(row: PayrollRunRow) {
    setProfileUserId(row.userId);
    setProfileUserLabel(
      `${row.displayName}${row.title ? ` · ${row.title}` : ""}`,
    );
  }

  function openProfileById(userId: string, name: string) {
    setProfileUserId(userId);
    setProfileUserLabel(name);
  }

  function openAdvanceForRow(row: PayrollRunRow) {
    setAdvanceUserId(row.userId);
    setAdvanceName(row.displayName);
    setAdvanceOutstanding(Number(row.advancesOutstanding));
    setAdvanceOpen(true);
  }

  function openSalary(row: PayrollRunRow) {
    setSalaryUserId(row.userId);
    setSalaryName(row.displayName);
    setSalaryCurrent(Number(row.baseSalary) || 0);
    setSalaryAmount(row.baseSalary > 0 ? String(Number(row.baseSalary)) : "");
    setSalaryFrom(new Date().toISOString().slice(0, 10));
    setSalaryOpen(true);
  }

  function openLedger(row: PayrollRunRow) {
    setLedgerUserId(row.userId);
    setLedgerName(row.displayName);
    setLedgerOpen(true);
  }

  function openPayConfirm(row: PayrollRunRow) {
    if (row.employmentStatus === "on_leave") {
      setFeedback({
        kind: "error",
        text: `${row.displayName} is on leave. Update employment status before paying.`,
      });
      return;
    }
    if (row.baseSalary <= 0) {
      setFeedback({
        kind: "error",
        text: `${row.displayName} has no salary yet. Set a salary first.`,
      });
      if (canManagePayroll) openSalary(row);
      return;
    }
    setPayRow(row);
    setPayConfirmOpen(true);
  }

  function openPayslip(row: PayrollRunRow) {
    setPayslipUserId(row.userId);
    setPayslipName(row.displayName);
    setPayslipId(row.payslipId);
    setPayslipInitial(null);
    setPayslipOpen(true);
  }

  function openPayslipRecord(payslip: PayslipRecord) {
    setPayslipUserId(payslip.userId);
    setPayslipName(payslip.displayName);
    setPayslipId(payslip.id);
    setPayslipInitial(payslip);
    setYear(payslip.periodYear);
    setMonth(payslip.periodMonth);
    setPayslipOpen(true);
  }

  async function onConfirmPay(payload: PayConfirmPayload) {
    if (!payRow || !canRunPayroll) return;
    setPayingId(payRow.userId);
    setFeedback(null);
    try {
      await payStaffPayroll(payRow.userId, {
        year,
        month,
        otherDeductions: payload.otherDeductions || undefined,
        note: payload.note || undefined,
        applyStatutory: payload.applyStatutory,
        postExpense: payload.postExpense,
        paymentMethod: payload.postExpense ? payload.paymentMethod : undefined,
        branchId: branchFilter || undefined,
        advancesToDeduct: payload.advancesToDeduct,
        includeArrears: true,
      });
      setPayConfirmOpen(false);
      const arrearNote =
        payRow.arrearPeriods?.length
          ? ` (incl. ${payrollArrearMonthsLabel(payRow.arrearPeriods)} arrears)`
          : "";
      setPayRow(null);
      setStaffDrawerOpen(false);
      setFeedback({
        kind: "success",
        text: `Paid ${payRow.displayName} for ${payrollMonthLabel(year, month)}${arrearNote}.`,
      });
      await load();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Pay failed",
      });
    } finally {
      setPayingId(null);
    }
  }

  async function onPayAll() {
    if (!canRunPayroll) return;
    if (summary.pendingCount === 0) {
      setFeedback({ kind: "error", text: "No payable staff in this month." });
      return;
    }
    setPayingAll(true);
    setFeedback(null);
    try {
      const result = await payAllStaffPayroll({
        year,
        month,
        applyStatutory,
        postExpense: postExpenseDefault,
        paymentMethod: postExpenseDefault ? "mpesa_manual" : undefined,
        branchId: branchFilter || undefined,
      });
      await load();
      if (result.failures.length === 0) {
        setFeedback({
          kind: "success",
          text: `Marked ${result.paidCount} staff paid for ${payrollMonthLabel(year, month)}.`,
        });
      } else {
        setFeedback({
          kind: "error",
          text: `Paid ${result.paidCount}; ${result.failures.length} failed. ${result.failures[0]?.reason ?? ""}`,
        });
      }
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Pay all failed",
      });
    } finally {
      setPayingAll(false);
    }
  }

  async function onSaveSalary() {
    if (!salaryUserId || !canManagePayroll) return;
    const amount = Number(salaryAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !salaryFrom) {
      setFeedback({
        kind: "error",
        text: "Enter a valid monthly amount and effective date.",
      });
      return;
    }
    setSalarySaving(true);
    setFeedback(null);
    try {
      await createStaffSalary(salaryUserId, {
        amount,
        effectiveFrom: salaryFrom,
      });
      setSalaryOpen(false);
      setFeedback({ kind: "success", text: `Salary set for ${salaryName}.` });
      await load();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to set salary",
      });
    } finally {
      setSalarySaving(false);
    }
  }

  if (dashLoading) return null;
  if (!canViewPayroll) {
    return (
      <DashboardAccessDenied
        title="Payroll unavailable"
        description="You don't have permission to view payroll."
      />
    );
  }

  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className={cn("mx-auto space-y-6", DASHBOARD_MAX_WIDE)}>
      <DashboardPageHero
        icon={Banknote}
        eyebrow="Organization"
        title="Payroll"
        description="Run monthly salaries with clarity — review each person, apply statutory, recover advances, and close the period."
      />

      <PayrollTabs tab={tab} onTabChange={setTab} />

      {tab === "history" ? (
        <PayrollMonthNav
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      ) : null}

      {tab === "run" ? (
        <>
          {!loading && !error ? (
            <PayrollRunHeader
              year={year}
              month={month}
              summary={summary}
              applyStatutory={applyStatutory}
              totalStatutory={summary.totalStatutory}
              onMonthChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
              onRefresh={() => void load()}
            />
          ) : null}

          {feedback ? (
            <DashboardFeedback kind={feedback.kind} text={feedback.text} />
          ) : null}

          {loading ? (
            <DashboardLoading label="Loading payroll run…" />
          ) : error ? (
            <DashboardLoadError
              title="Couldn't load payroll"
              message={error}
              onRetry={() => void load()}
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(15rem,17rem)_1fr]">
              <PayrollRunSidebar
                branches={branchOptions}
                branchFilter={branchFilter}
                onBranchFilterChange={setBranchFilter}
                applyStatutory={applyStatutory}
                onApplyStatutoryChange={setApplyStatutory}
                postExpenseDefault={postExpenseDefault}
                onPostExpenseChange={setPostExpenseDefault}
                pendingCount={summary.pendingCount}
                canRunPayroll={canRunPayroll}
                canManagePayroll={canManagePayroll}
                payingAll={payingAll}
                payingId={payingId}
                onPayAll={() => void onPayAll()}
                onOpenSms={canManagePayroll ? openSmsBulk : undefined}
                onExport={() => exportPayrollRunCsv(rows, year, month)}
                hasRows={rows.length > 0}
              />

              <div className="min-w-0 space-y-4">
                {!loading && !error && summary.onLeaveCount > 0 ? (
                  <AlertBanner tone="sky">
                    {summary.onLeaveCount} on leave — excluded from pay all until status
                    updates.
                  </AlertBanner>
                ) : null}

                {!loading && !error && summary.missingSalary > 0 && canManagePayroll ? (
                  <AlertBanner tone="amber">
                    {summary.missingSalary} without salary — open their row to set pay
                    before marking paid.
                  </AlertBanner>
                ) : null}

                <PayrollRunPanel
                  rows={rows}
                  applyStatutoryPreview={applyStatutory}
                  onSelectRow={openStaffDrawer}
                />
              </div>
            </div>
          )}
        </>
      ) : tab === "calendar" ? (
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          <PayrollCalendarPanel
          year={year}
          branchFilter={branchFilter}
          branches={branchOptions}
          onYearChange={setYear}
          onBranchFilterChange={setBranchFilter}
          onSelectMonth={(y, m) => {
            setYear(y);
            setMonth(m);
            setTab("run");
          }}
          />
        </div>
      ) : tab === "advances" ? (
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          {feedback ? (
            <DashboardFeedback kind={feedback.kind} text={feedback.text} />
          ) : null}
          <AdvanceLedgerPanel
            canReadStaffProfile={canReadStaffProfile}
            onOpenStaff={openProfileById}
          />
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          {feedback ? (
            <DashboardFeedback kind={feedback.kind} text={feedback.text} />
          ) : null}
          <PayslipHistoryPanel
            year={year}
            month={month}
            onOpenPayslip={openPayslipRecord}
          />
        </div>
      )}

      <PayrollStaffDrawer
        open={staffDrawerOpen}
        onOpenChange={setStaffDrawerOpen}
        row={selectedRow}
        year={year}
        month={month}
        applyStatutoryPreview={applyStatutory}
        canReadStaffProfile={canReadStaffProfile}
        canManagePayroll={canManagePayroll}
        canRunPayroll={canRunPayroll}
        paying={payingId === selectedRow?.userId}
        onOpenProfile={() => selectedRow && openProfile(selectedRow)}
        onEditSalary={() => selectedRow && openSalary(selectedRow)}
        onLogAdvance={() => selectedRow && openAdvanceForRow(selectedRow)}
        onOpenLedger={() => selectedRow && openLedger(selectedRow)}
        onOpenPay={() => selectedRow && openPayConfirm(selectedRow)}
        onOpenPayslip={() => selectedRow && openPayslip(selectedRow)}
        onSendSms={
          canManagePayroll && selectedRow
            ? () => openSmsForRow(selectedRow)
            : undefined
        }
      />

      <StaffSmsDrawer
        open={smsOpen}
        onOpenChange={setSmsOpen}
        rows={rows}
        targetUserId={smsUserId}
        targetName={smsUserName}
        onSent={(text) => setFeedback({ kind: "success", text })}
      />

      <StaffProfileDrawer
        open={profileUserId != null}
        onOpenChange={(open) => {
          if (!open) {
            setProfileUserId(null);
            setProfileUserLabel("");
            if (tab === "run") void load();
          }
        }}
        userId={profileUserId}
        userLabel={profileUserLabel}
        permissions={me?.permissions}
      />

      <AdvanceLedgerDrawer
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
        userId={ledgerUserId}
        staffName={ledgerName}
        canManage={canManagePayroll}
        onUpdated={() => {
          if (tab === "run") void load();
        }}
        onLogAdvance={() => {
          if (!ledgerUserId) return;
          const row = rows.find((r) => r.userId === ledgerUserId);
          if (row) openAdvanceForRow(row);
          else {
            setAdvanceUserId(ledgerUserId);
            setAdvanceName(ledgerName);
            setAdvanceOutstanding(0);
            setAdvanceOpen(true);
          }
        }}
      />

      <LogAdvanceDrawer
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        userId={advanceUserId}
        staffName={advanceName}
        outstandingTotal={advanceOutstanding}
        saving={advanceSaving}
        onSavingChange={setAdvanceSaving}
        onSaved={() => {
          setFeedback({ kind: "success", text: `Logged advance for ${advanceName}.` });
          if (tab === "run") void load();
        }}
        onError={(text) => setFeedback({ kind: "error", text })}
      />

      <PayConfirmDrawer
        open={payConfirmOpen}
        onOpenChange={(open) => {
          setPayConfirmOpen(open);
          if (!open) setPayRow(null);
        }}
        row={payRow}
        year={year}
        month={month}
        applyStatutoryDefault={applyStatutory}
        postExpenseDefault={postExpenseDefault}
        saving={payingId != null}
        onConfirm={(payload) => void onConfirmPay(payload)}
      />

      <PayslipDrawer
        open={payslipOpen}
        onOpenChange={(open) => {
          setPayslipOpen(open);
          if (!open) setPayslipInitial(null);
        }}
        userId={payslipUserId}
        staffName={payslipName}
        year={year}
        month={month}
        payslipId={payslipId}
        initialPayslip={payslipInitial}
      />

      <FormDrawer
        open={salaryOpen}
        onOpenChange={setSalaryOpen}
        title={salaryCurrent > 0 ? "Update salary" : "Set monthly salary"}
        description={salaryName}
        contextLabel="Payroll"
        icon={<Banknote className="size-5 text-primary" aria-hidden />}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSalaryOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={salarySaving}
              onClick={() => void onSaveSalary()}
            >
              {salarySaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save salary"
              )}
            </Button>
          </div>
        }
      >
        <FormDrawerFields
          legend="Monthly amount"
          hint="Raises add a new record with an effective date — previous amounts stay in history."
        >
          <div className="grid gap-3">
            {salaryCurrent > 0 ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Current base: {formatPayrollMoney(salaryCurrent)}
              </p>
            ) : null}
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Amount (KES)
              <input
                type="number"
                min="0"
                step="0.01"
                className={dashboardInputClass()}
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Effective from
              <input
                type="date"
                className={dashboardInputClass()}
                value={salaryFrom}
                onChange={(e) => setSalaryFrom(e.target.value)}
              />
            </label>
          </div>
        </FormDrawerFields>
      </FormDrawer>
    </div>
  );
}

function AlertBanner({
  tone,
  children,
}: {
  tone: "sky" | "amber";
  children: React.ReactNode;
}) {
  const cls =
    tone === "sky"
      ? "border-sky-500/25 bg-sky-500/10 text-sky-950 dark:text-sky-100"
      : "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-100";
  return (
    <p className={cn("rounded-lg border px-3 py-2 text-sm", cls)}>{children}</p>
  );
}

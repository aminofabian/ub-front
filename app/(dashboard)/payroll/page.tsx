"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Download,
  IdCard,
  Loader2,
  Pencil,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { StaffProfileDrawer } from "@/components/staff/staff-profile-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createStaffAdvance,
  createStaffSalary,
  fetchPayrollRun,
  payAllStaffPayroll,
  payStaffPayroll,
  type PayslipRecord,
  type PayrollRunRow,
} from "@/lib/api";
import {
  employmentStatusLabel,
  exportPayrollRunCsv,
  formatPayrollDate,
  formatPayrollMoney,
  payrollMonthLabel,
} from "@/lib/payroll-utils";

import { AdvanceLedgerDrawer } from "./_components/advance-ledger-drawer";
import { AdvanceLedgerPanel } from "./_components/advance-ledger-panel";
import { PayConfirmDrawer, type PayConfirmPayload } from "./_components/pay-confirm-drawer";
import { PayrollCalendarPanel } from "./_components/payroll-calendar-panel";
import { PayrollMonthNav } from "./_components/payroll-month-nav";
import { PayslipDrawer } from "./_components/payslip-drawer";
import { PayslipHistoryPanel } from "./_components/payslip-history-panel";

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

  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<Tab>("run");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
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

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceUserId, setAdvanceUserId] = useState<string | null>(null);
  const [advanceName, setAdvanceName] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [advanceNote, setAdvanceNote] = useState("");
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
  const [payslipInitial, setPayslipInitial] = useState<PayslipRecord | null>(
    null,
  );

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
      totalBase: rows.reduce((s, r) => s + Number(r.baseSalary), 0),
      totalAdvances: rows.reduce(
        (s, r) => s + Number(r.advancesOutstanding),
        0,
      ),
      totalNetPending: pending.reduce((s, r) => s + Number(r.suggestedNet), 0),
      totalNetPaid: paid.reduce((s, r) => s + Number(r.suggestedNet), 0),
      missingSalary: rows.filter((r) => Number(r.baseSalary) <= 0).length,
      onLeaveCount: rows.filter((r) => r.employmentStatus === "on_leave").length,
    };
  }, [rows]);

  const load = useCallback(async () => {
    if (!canViewPayroll) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPayrollRun(year, month, {
        branchId: branchFilter || undefined,
        statutory: true,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll run");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canViewPayroll, year, month, branchFilter]);

  useEffect(() => {
    if (!dashLoading && canViewPayroll && tab === "run") {
      void load();
    }
  }, [dashLoading, canViewPayroll, load, tab]);

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

  function openAdvance(row: PayrollRunRow) {
    setAdvanceUserId(row.userId);
    setAdvanceName(row.displayName);
    setAdvanceAmount("");
    setAdvanceDate(new Date().toISOString().slice(0, 10));
    setAdvanceNote("");
    setAdvanceOpen(true);
  }

  function openSalary(row: PayrollRunRow) {
    setSalaryUserId(row.userId);
    setSalaryName(row.displayName);
    setSalaryCurrent(Number(row.baseSalary) || 0);
    setSalaryAmount(
      row.baseSalary > 0 ? String(Number(row.baseSalary)) : "",
    );
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
      });
      setPayConfirmOpen(false);
      setPayRow(null);
      setFeedback({
        kind: "success",
        text: `Paid ${payRow.displayName} for ${payrollMonthLabel(year, month)}.`,
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
    const pending = rows.filter(
      (r) => !r.alreadyPaid && Number(r.baseSalary) > 0,
    );
    if (pending.length === 0) {
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

  async function onSaveAdvance() {
    if (!advanceUserId || !canManagePayroll) return;
    const amount = Number(advanceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({ kind: "error", text: "Enter a valid advance amount." });
      return;
    }
    setAdvanceSaving(true);
    try {
      await createStaffAdvance(advanceUserId, {
        amount,
        advancedOn: advanceDate,
        note: advanceNote.trim() || undefined,
      });
      setAdvanceOpen(false);
      setFeedback({
        kind: "success",
        text: `Logged advance for ${advanceName}.`,
      });
      if (tab === "run") await load();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to log advance",
      });
    } finally {
      setAdvanceSaving(false);
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
      setFeedback({
        kind: "success",
        text: `Salary set for ${salaryName}.`,
      });
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

  if (dashLoading) {
    return null;
  }
  if (!canViewPayroll) {
    return (
      <DashboardAccessDenied
        title="Payroll unavailable"
        description="You don’t have permission to view payroll."
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <DashboardPageHero
        icon={Banknote}
        eyebrow="Organization"
        title="Payroll"
        description="Monthly salaries, advance ledger, and payslips — linked to each staff profile."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "run"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("run")}
        >
          Monthly run
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "calendar"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("calendar")}
        >
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            Calendar
          </span>
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "advances"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("advances")}
        >
          Advance ledger
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "history"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("history")}
        >
          Payslip history
        </button>
      </div>

      {tab === "run" || tab === "history" ? (
        <PayrollMonthNav
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
          onRefresh={tab === "run" ? () => void load() : undefined}
        />
      ) : null}

      {tab === "run" ? (
        <>
          {!loading && !error ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Staff this month"
                value={String(summary.headcount)}
                hint={`${summary.paidCount} paid · ${summary.pendingCount} pending`}
              />
              <SummaryCard
                label="Total base"
                value={formatPayrollMoney(summary.totalBase)}
                hint="Before deductions"
              />
              <SummaryCard
                label="Outstanding advances"
                value={formatPayrollMoney(summary.totalAdvances)}
                hint="Deducted on pay day"
              />
              <SummaryCard
                label="Net pending"
                value={formatPayrollMoney(summary.totalNetPending)}
                hint={
                  summary.missingSalary > 0
                    ? `${summary.missingSalary} missing salary`
                    : "Ready to pay"
                }
              />
            </div>
          ) : null}

          {feedback ? (
            <DashboardFeedback kind={feedback.kind} text={feedback.text} />
          ) : null}

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Branch
              <select
                className={dashboardSelectClass(false, "min-w-[10rem]")}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pb-2 text-xs">
              <input
                type="checkbox"
                checked={applyStatutory}
                onChange={(e) => setApplyStatutory(e.target.checked)}
              />
              Apply statutory on pay all
            </label>
            <label className="flex items-center gap-2 pb-2 text-xs">
              <input
                type="checkbox"
                checked={postExpenseDefault}
                onChange={(e) => setPostExpenseDefault(e.target.checked)}
              />
              Post pay all to finance
            </label>
          </div>

          {!loading && !error && summary.onLeaveCount > 0 ? (
            <p className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sm text-sky-950 dark:text-sky-100">
              {summary.onLeaveCount} staff on leave — excluded from pay all until status changes.
            </p>
          ) : null}

          {!loading && !error && summary.missingSalary > 0 && canManagePayroll ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
              {summary.missingSalary} staff{" "}
              {summary.missingSalary === 1 ? "has" : "have"} no monthly salary
              yet. Set salary before marking paid.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Pay run for{" "}
              <span className="font-medium text-foreground">
                {payrollMonthLabel(year, month)}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {!loading && !error && rows.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => exportPayrollRunCsv(rows, year, month)}
                >
                  <Download className="mr-1.5 size-3.5" aria-hidden />
                  Export CSV
                </Button>
              ) : null}
              {canRunPayroll && summary.pendingCount > 0 ? (
                <Button
                  type="button"
                  disabled={payingAll || payingId != null}
                  onClick={() => void onPayAll()}
                >
                  {payingAll ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Paying all…
                    </>
                  ) : (
                    <>Pay all pending ({summary.pendingCount})</>
                  )}
                </Button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <DashboardLoading label="Loading payroll run…" />
          ) : error ? (
            <DashboardLoadError
              title="Couldn’t load payroll"
              message={error}
              onRetry={() => void load()}
            />
          ) : (
            <PayrollRunTable
              rows={rows}
              canReadStaffProfile={canReadStaffProfile}
              canManagePayroll={canManagePayroll}
              canRunPayroll={canRunPayroll}
              payingId={payingId}
              onOpenProfile={openProfile}
              onOpenSalary={openSalary}
              onOpenAdvance={openAdvance}
              onOpenLedger={openLedger}
              onOpenPay={openPayConfirm}
              onOpenPayslip={openPayslip}
            />
          )}
        </>
      ) : tab === "calendar" ? (
        <PayrollCalendarPanel
          year={year}
          branchFilter={branchFilter}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          onYearChange={setYear}
          onBranchFilterChange={setBranchFilter}
          onSelectMonth={(y, m) => {
            setYear(y);
            setMonth(m);
            setTab("run");
          }}
        />
      ) : tab === "advances" ? (
        <>
          {feedback ? (
            <DashboardFeedback kind={feedback.kind} text={feedback.text} />
          ) : null}
          <AdvanceLedgerPanel
            canReadStaffProfile={canReadStaffProfile}
            onOpenStaff={openProfileById}
          />
        </>
      ) : (
        <>
          {feedback ? (
            <DashboardFeedback kind={feedback.kind} text={feedback.text} />
          ) : null}
          <PayslipHistoryPanel
            year={year}
            month={month}
            onOpenPayslip={openPayslipRecord}
          />
        </>
      )}

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
        onLogAdvance={() => {
          if (!ledgerUserId) return;
          const row = rows.find((r) => r.userId === ledgerUserId);
          if (row) openAdvance(row);
          else {
            setAdvanceUserId(ledgerUserId);
            setAdvanceName(ledgerName);
            setAdvanceOpen(true);
          }
        }}
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
              Amount
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

      <FormDrawer
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        title="Log salary advance"
        description={advanceName}
        contextLabel="Payroll"
        icon={<Wallet className="size-5 text-primary" aria-hidden />}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdvanceOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={advanceSaving}
              onClick={() => void onSaveAdvance()}
            >
              {advanceSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save advance"
              )}
            </Button>
          </div>
        }
      >
        <FormDrawerFields legend="Advance">
          <div className="grid gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Amount
              <input
                type="number"
                min="0"
                step="0.01"
                className={dashboardInputClass()}
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Date
              <input
                type="date"
                className={dashboardInputClass()}
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Note
              <input
                className={dashboardInputClass()}
                value={advanceNote}
                onChange={(e) => setAdvanceNote(e.target.value)}
                placeholder="e.g. Emergency medical"
              />
            </label>
          </div>
        </FormDrawerFields>
      </FormDrawer>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "space-y-1")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

type RowActionProps = {
  canReadStaffProfile: boolean;
  canManagePayroll: boolean;
  canRunPayroll: boolean;
  onOpenProfile: (row: PayrollRunRow) => void;
  onOpenSalary: (row: PayrollRunRow) => void;
  onOpenAdvance: (row: PayrollRunRow) => void;
  onOpenLedger: (row: PayrollRunRow) => void;
  onOpenPay: (row: PayrollRunRow) => void;
  onOpenPayslip: (row: PayrollRunRow) => void;
};

type TableProps = RowActionProps & {
  rows: PayrollRunRow[];
  payingId: string | null;
};

function PayrollRunTable({
  rows,
  canReadStaffProfile,
  canManagePayroll,
  canRunPayroll,
  payingId,
  onOpenProfile,
  onOpenSalary,
  onOpenAdvance,
  onOpenLedger,
  onOpenPay,
  onOpenPayslip,
}: TableProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-border/50 px-4 py-10 text-center text-sm text-muted-foreground">
            No staff in this payroll run.
          </p>
        ) : (
          rows.map((row) => (
            <PayrollRunCard
              key={row.userId}
              row={row}
              canReadStaffProfile={canReadStaffProfile}
              canManagePayroll={canManagePayroll}
              canRunPayroll={canRunPayroll}
              paying={payingId === row.userId}
              onOpenProfile={onOpenProfile}
              onOpenSalary={onOpenSalary}
              onOpenAdvance={onOpenAdvance}
              onOpenLedger={onOpenLedger}
              onOpenPay={onOpenPay}
              onOpenPayslip={onOpenPayslip}
            />
          ))
        )}
      </div>

      <section className={cn(DASHBOARD_TABLE_SURFACE, "hidden md:block")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Base</th>
                <th className="px-4 py-3 font-medium text-right">Advances</th>
                <th className="px-4 py-3 font-medium text-right">Statutory</th>
                <th className="px-4 py-3 font-medium text-right">Net</th>
                <th className="px-4 py-3 font-medium">Paid on</th>
                <th className="px-4 py-3 font-medium">Run status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No staff in this payroll run.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-3">
                      {canReadStaffProfile ? (
                        <button
                          type="button"
                          className="text-left font-medium underline-offset-2 hover:underline"
                          onClick={() => onOpenProfile(row)}
                        >
                          {row.displayName}
                        </button>
                      ) : (
                        <div className="font-medium">{row.displayName}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {row.title || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.branchName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {employmentStatusLabel(row.employmentStatus)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.baseSalary > 0 ? (
                        formatPayrollMoney(row.baseSalary)
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300">
                          Not set
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.advancesOutstanding > 0 ? (
                        <button
                          type="button"
                          className="font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
                          onClick={() => onOpenLedger(row)}
                        >
                          {formatPayrollMoney(row.advancesOutstanding)}
                        </button>
                      ) : (
                        formatPayrollMoney(0)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {row.statutoryTotal > 0
                        ? formatPayrollMoney(row.statutoryTotal)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatPayrollMoney(row.suggestedNet)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.alreadyPaid ? (
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={() => onOpenPayslip(row)}
                        >
                          {formatPayrollDate(row.paidAt)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.alreadyPaid ? (
                        <button
                          type="button"
                          className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-300"
                          onClick={() => onOpenPayslip(row)}
                        >
                          Paid
                        </button>
                      ) : row.employmentStatus === "on_leave" ? (
                        <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-900 dark:text-sky-200">
                          On leave
                        </span>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions
                        row={row}
                        compact
                        canReadStaffProfile={canReadStaffProfile}
                        canManagePayroll={canManagePayroll}
                        canRunPayroll={canRunPayroll}
                        paying={payingId === row.userId}
                        onOpenProfile={onOpenProfile}
                        onOpenSalary={onOpenSalary}
                        onOpenAdvance={onOpenAdvance}
                        onOpenLedger={onOpenLedger}
                        onOpenPay={onOpenPay}
                        onOpenPayslip={onOpenPayslip}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PayrollRunCard(
  props: RowActionProps & { row: PayrollRunRow; paying: boolean },
) {
  const {
    row,
    canReadStaffProfile,
    canManagePayroll,
    canRunPayroll,
    paying,
    onOpenProfile,
    onOpenSalary,
    onOpenAdvance,
    onOpenLedger,
    onOpenPay,
    onOpenPayslip,
  } = props;
  return (
    <article className={cn(DASHBOARD_TABLE_SURFACE, "space-y-3 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {canReadStaffProfile ? (
            <button
              type="button"
              className="text-left font-medium underline-offset-2 hover:underline"
              onClick={() => onOpenProfile(row)}
            >
              {row.displayName}
            </button>
          ) : (
            <div className="font-medium">{row.displayName}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {[row.title, row.branchName, employmentStatusLabel(row.employmentStatus)]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </div>
        {row.alreadyPaid ? (
          <button
            type="button"
            className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-300"
            onClick={() => onOpenPayslip(row)}
          >
            Paid
          </button>
        ) : (
          <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Pending
          </span>
        )}
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-muted/40 px-2 py-2">
          <dt className="text-muted-foreground">Base</dt>
          <dd className="mt-0.5 tabular-nums font-medium">
            {row.baseSalary > 0 ? (
              formatPayrollMoney(row.baseSalary)
            ) : (
              <span className="text-amber-700 dark:text-amber-300">Not set</span>
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-2">
          <dt className="text-muted-foreground">Advances</dt>
          <dd className="mt-0.5 tabular-nums font-medium">
            {row.advancesOutstanding > 0 ? (
              <button type="button" onClick={() => onOpenLedger(row)}>
                {formatPayrollMoney(row.advancesOutstanding)}
              </button>
            ) : (
              formatPayrollMoney(0)
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-2">
          <dt className="text-muted-foreground">Net</dt>
          <dd className="mt-0.5 tabular-nums font-medium">
            {formatPayrollMoney(row.suggestedNet)}
          </dd>
        </div>
      </dl>

      {row.alreadyPaid && row.paidAt ? (
        <p className="text-xs text-muted-foreground">
          Paid {formatPayrollDate(row.paidAt)}{" "}
          <button
            type="button"
            className="font-medium underline-offset-2 hover:underline"
            onClick={() => onOpenPayslip(row)}
          >
            View payslip
          </button>
        </p>
      ) : null}

      <RowActions
        row={row}
        canReadStaffProfile={canReadStaffProfile}
        canManagePayroll={canManagePayroll}
        canRunPayroll={canRunPayroll}
        paying={paying}
        onOpenProfile={onOpenProfile}
        onOpenSalary={onOpenSalary}
        onOpenAdvance={onOpenAdvance}
        onOpenLedger={onOpenLedger}
        onOpenPay={onOpenPay}
        onOpenPayslip={onOpenPayslip}
      />
    </article>
  );
}

function RowActions({
  row,
  compact,
  paying,
  canReadStaffProfile,
  canManagePayroll,
  canRunPayroll,
  onOpenProfile,
  onOpenSalary,
  onOpenAdvance,
  onOpenLedger,
  onOpenPay,
  onOpenPayslip,
}: RowActionProps & { row: PayrollRunRow; compact?: boolean; paying: boolean }) {
  const btnClass = compact
    ? "h-7 gap-1 px-2 text-xs"
    : "h-9 flex-1 gap-1.5 text-xs sm:flex-none";

  return (
    <div className={cn("flex flex-wrap gap-1.5", compact ? "justify-end" : "")}>
      {canReadStaffProfile ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={btnClass}
          onClick={() => onOpenProfile(row)}
        >
          <IdCard className={compact ? "size-3" : "size-3.5"} aria-hidden />
          Profile
        </Button>
      ) : null}
      {canManagePayroll ? (
        <>
          <Button
            type="button"
            size="sm"
            variant={row.baseSalary > 0 ? "outline" : "default"}
            className={btnClass}
            onClick={() => onOpenSalary(row)}
          >
            <Pencil className={compact ? "size-3" : "size-3.5"} aria-hidden />
            {row.baseSalary > 0 ? "Salary" : "Set salary"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={btnClass}
            onClick={() => onOpenAdvance(row)}
          >
            <Wallet className={compact ? "size-3" : "size-3.5"} aria-hidden />
            Advance
          </Button>
          {row.advancesOutstanding > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnClass}
              onClick={() => onOpenLedger(row)}
            >
              <Users className={compact ? "size-3" : "size-3.5"} aria-hidden />
              Ledger
            </Button>
          ) : null}
        </>
      ) : null}
      {row.alreadyPaid ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={btnClass}
          onClick={() => onOpenPayslip(row)}
        >
          <Receipt className={compact ? "size-3" : "size-3.5"} aria-hidden />
          Payslip
        </Button>
      ) : canRunPayroll ? (
        <Button
          type="button"
          size="sm"
          className={btnClass}
          disabled={paying}
          onClick={() => onOpenPay(row)}
        >
          {paying ? (
            <Loader2
              className={compact ? "size-3 animate-spin" : "size-3.5 animate-spin"}
              aria-hidden
            />
          ) : null}
          Mark paid
        </Button>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Scale, Search, Wallet } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import type { PayrollRunRow } from "@/lib/api";
import {
  defaultPayrollPeriod,
  formatPayrollMoney,
  isPayrollFocusPeriod,
  payrollMonthLabel,
  shiftPayrollMonth,
} from "@/lib/payroll-utils";
import { cn } from "@/lib/utils";

import { PayrollAutomationPanel } from "./payroll-automation-panel";
import { PayrollStaffDrawer } from "./payroll-staff-drawer";

type StatusFilter = "all" | "pending" | "paid" | "attention";

type Summary = {
  headcount: number;
  paidCount: number;
  pendingCount: number;
  totalNetPending: number;
  totalBase: number;
  totalArrears: number;
  staffWithArrears: number;
  totalAdvances: number;
  onLeaveCount: number;
  missingSalary: number;
  pendingUnlock: number;
  totalStatutory: number;
};

type BranchOption = { id: string; name: string };

export type PayrollRunTheatreProps = {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onRefresh: () => void;
  rows: PayrollRunRow[];
  summary: Summary;
  selectedRow: PayrollRunRow | null;
  /**
   * For a shop that pays by commission: each person on commission, by staff profile, with what
   * the month earned them and what they are still owed. Absent for every other shop.
   */
  commissionByProfile?: ReadonlyMap<string, { earned: number; owed: number }>;
  staffDrawerOpen: boolean;
  onSelectRow: (row: PayrollRunRow) => void;
  onRemoveFromPayroll: (row: PayrollRunRow) => void;
  onClearSelection: () => void;
  onStaffDrawerOpenChange: (open: boolean) => void;
  applyStatutory: boolean;
  onApplyStatutoryChange: (value: boolean) => void;
  postExpenseDefault: boolean;
  onPostExpenseChange: (value: boolean) => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  branches: BranchOption[];
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  canRunPayroll: boolean;
  canManagePayroll: boolean;
  canReadStaffProfile: boolean;
  payingAll: boolean;
  payingId: string | null;
  onPayAll: () => void;
  onAutomationSaved?: (message: string) => void;
  alerts?: ReactNode;
  // Staff drawer actions
  onOpenProfile: () => void;
  onEditSalary: () => void;
  onLogAdvance: () => void;
  onOpenLedger: () => void;
  onOpenPay: () => void;
  onOpenPayslip: () => void;
  onSendSms?: () => void;
  onProrationSettingChanged?: () => void;
};

function statusBadgeClass(row: PayrollRunRow): string {
  if (row.alreadyPaid) return "text-[var(--op-accent)]";
  if (
    monthlyAmount(row) <= 0 ||
    (row.arrearPeriods?.length ?? 0) > 0 ||
    Number(row.advancesOutstanding) > 0
  ) {
    return "text-[var(--op-highlight)]";
  }
  return "text-[var(--op-muted)]";
}

function monthlyAmount(row: PayrollRunRow): number {
  return Number(row.monthlySalary ?? row.baseSalary);
}

function rowNeedsAttention(row: PayrollRunRow): boolean {
  return (
    row.employmentStatus === "on_leave" ||
    (monthlyAmount(row) <= 0 && row.salaryReleased !== false) ||
    Number(row.advancesOutstanding) > 0 ||
    (row.arrearPeriods?.length ?? 0) > 0
  );
}

function rowIsPending(row: PayrollRunRow): boolean {
  return (
    !row.alreadyPaid &&
    row.employmentStatus !== "on_leave" &&
    monthlyAmount(row) > 0
  );
}

function statusLabel(row: PayrollRunRow, year: number, month: number, onCommission = false): string {
  if (row.alreadyPaid) return "Paid";
  if (row.employmentStatus === "on_leave") return "On leave";
  // No salary is how someone paid by commission is meant to look, not something to fix.
  if (monthlyAmount(row) <= 0) return onCommission ? "On commission" : "No salary";
  if ((row.arrearPeriods?.length ?? 0) > 0) return "Arrears";
  if (Number(row.advancesOutstanding) > 0) return "Advance";
  void year;
  void month;
  return "Pending";
}

export function PayrollRunTheatre(props: PayrollRunTheatreProps) {
  const {
    year,
    month,
    onMonthChange,
    onRefresh,
    rows,
    summary,
    selectedRow,
    commissionByProfile,
    staffDrawerOpen,
    onSelectRow,
    onRemoveFromPayroll,
    onClearSelection,
    onStaffDrawerOpenChange,
    applyStatutory,
    onApplyStatutoryChange,
    postExpenseDefault,
    onPostExpenseChange,
    paymentMethod,
    onPaymentMethodChange,
    branches,
    branchFilter,
    onBranchFilterChange,
    canRunPayroll,
    canManagePayroll,
    canReadStaffProfile,
    payingId,
    onAutomationSaved,
    alerts,
  } = props;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        row.displayName.toLowerCase().includes(q) ||
        (row.title?.toLowerCase().includes(q) ?? false) ||
        (row.branchName?.toLowerCase().includes(q) ?? false);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && row.alreadyPaid) ||
        (statusFilter === "pending" && rowIsPending(row)) ||
        (statusFilter === "attention" &&
          rowNeedsAttention(row) &&
          !row.alreadyPaid);

      return matchesQuery && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter(rowIsPending).length,
      paid: rows.filter((r) => r.alreadyPaid).length,
      attention: rows.filter((r) => rowNeedsAttention(r) && !r.alreadyPaid)
        .length,
    }),
    [rows],
  );

  const roleLine = (row: PayrollRunRow) =>
    [row.title, row.branchName].filter(Boolean).join(" · ") || "—";

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PayrollRunBanner
        year={year}
        month={month}
        onMonthChange={onMonthChange}
        onRefresh={onRefresh}
        summary={summary}
        applyStatutory={applyStatutory}
        onApplyStatutoryChange={onApplyStatutoryChange}
        postExpenseDefault={postExpenseDefault}
        onPostExpenseChange={onPostExpenseChange}
        branches={branches}
        branchFilter={branchFilter}
        onBranchFilterChange={onBranchFilterChange}
      />

      {alerts}

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)]">
          <div className="flex flex-col gap-2 border-b border-[var(--op-rule)] px-3 py-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:max-w-xs sm:flex-1">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--op-faint)]"
                aria-hidden
              />
              <input
                className={cn(dashboardInputClass(), "h-10 pl-7 text-[13px] sm:h-8")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, role, branch…"
                aria-label="Search payroll roster"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", "All", counts.all],
                  ["pending", "Pending", counts.pending],
                  ["attention", "Review", counts.attention],
                  ["paid", "Paid", counts.paid],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={statusFilter === id}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-[2px] px-2 text-[12px] font-medium",
                    statusFilter === id
                      ? "bg-[var(--op-ink)] text-white"
                      : "text-[var(--op-muted)] hover:text-[var(--op-ink)]",
                  )}
                  onClick={() => setStatusFilter(id)}
                >
                  {label}
                  <span className="tabular-nums">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="px-3 py-6">
              <p className="text-[13px] font-semibold text-[var(--op-ink)]">No staff in this run</p>
              <p className={cn(dashboardHintClass(), "mt-1 max-w-[36ch]")}>
                Add staff profiles and set monthly salaries to build the roster.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-6")}>
              {query.trim() ? `No staff match “${query.trim()}”.` : "No staff match this filter."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--op-rule)] bg-[var(--op-bg)] text-left text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">
                    <th scope="col" className="px-3 py-1.5 font-semibold">Who</th>
                    <th scope="col" className="px-2 py-1.5 text-right font-semibold">Salary</th>
                    <th scope="col" className="px-2 py-1.5 text-right font-semibold">Net</th>
                    {commissionByProfile ? (
                      <th scope="col" className="px-2 py-1.5 text-right font-semibold">Commission</th>
                    ) : null}
                    <th scope="col" className="px-3 py-1.5 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const active = selectedRow?.userId === row.userId;
                    const salary = monthlyAmount(row);
                    const earns = commissionByProfile?.get(row.staffProfileId) ?? null;
                    return (
                      <tr
                        key={row.userId}
                        tabIndex={0}
                        aria-label={`${row.displayName}, ${statusLabel(row, year, month, Boolean(earns))}`}
                        onClick={() => onSelectRow(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectRow(row);
                          }
                        }}
                        className={cn(
                          "cursor-pointer border-t border-[var(--op-rule)]",
                          active ? "bg-[var(--op-bg)]" : "hover:bg-[var(--op-bg)]",
                        )}
                      >
                        <th scope="row" className="px-3 py-1.5 text-left font-medium">
                          <span className="block max-w-[16rem] truncate text-[var(--op-ink)]">
                            {row.displayName}
                          </span>
                          <span className="mt-0.5 block max-w-[16rem] truncate text-[11px] font-normal text-[var(--op-muted)]">
                            {roleLine(row)}
                          </span>
                        </th>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                          {formatPayrollMoney(salary > 0 ? salary : 0)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                          {formatPayrollMoney(row.suggestedNet)}
                        </td>
                        {commissionByProfile ? (
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                            {earns ? (
                              <>
                                {formatPayrollMoney(earns.earned)}
                                {earns.owed > 0 ? (
                                  <span className="block font-sans text-[11px] text-[var(--op-highlight)]">
                                    {formatPayrollMoney(earns.owed)} owed
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-[var(--op-muted)]">—</span>
                            )}
                          </td>
                        ) : null}
                        <td
                          className={cn(
                            "px-3 py-1.5 text-right text-[12px] font-medium",
                            earns && salary <= 0 && !row.alreadyPaid ? "text-[var(--op-muted)]" : statusBadgeClass(row),
                          )}
                        >
                          {statusLabel(row, year, month, Boolean(earns))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] p-3">
          <h2 className="text-[13px] font-semibold tracking-[-0.02em] text-[var(--op-ink)]">This run</h2>
          <div className="mt-2">
            <RunSettingsBlock
              applyStatutory={applyStatutory}
              onApplyStatutoryChange={onApplyStatutoryChange}
              postExpenseDefault={postExpenseDefault}
              onPostExpenseChange={onPostExpenseChange}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={onPaymentMethodChange}
              branches={branches}
              branchFilter={branchFilter}
              onBranchFilterChange={onBranchFilterChange}
            />
          </div>
          <div className="mt-3 border-t border-[var(--op-rule)] pt-3">
            <PayrollAutomationPanel
              canManage={canManagePayroll}
              branches={branches}
              applyStatutory={applyStatutory}
              postExpenseDefault={postExpenseDefault}
              branchFilter={branchFilter}
              onSaved={() =>
                onAutomationSaved?.(
                  "Payroll automation updated — it will run on the schedule you set.",
                )
              }
            />
          </div>
        </aside>
      </div>

      <PayrollStaffDrawer
        open={staffDrawerOpen}
        onOpenChange={(open) => {
          onStaffDrawerOpenChange(open);
          if (!open) onClearSelection();
        }}
        row={selectedRow}
        year={year}
        month={month}
        applyStatutoryPreview={applyStatutory}
        canReadStaffProfile={canReadStaffProfile}
        canManagePayroll={canManagePayroll}
        canRunPayroll={canRunPayroll}
        paying={payingId === selectedRow?.userId}
        onOpenProfile={props.onOpenProfile}
        onEditSalary={props.onEditSalary}
        onLogAdvance={props.onLogAdvance}
        onOpenLedger={props.onOpenLedger}
        onOpenPay={props.onOpenPay}
        onOpenPayslip={props.onOpenPayslip}
        onSendSms={props.onSendSms}
        onProrationSettingChanged={props.onProrationSettingChanged}
        onRemoveFromPayroll={() => {
          if (selectedRow) onRemoveFromPayroll(selectedRow);
        }}
      />
    </div>
  );
}

function PayrollRunBanner({
  year,
  month,
  onMonthChange,
  onRefresh,
  summary,
  applyStatutory,
  onApplyStatutoryChange,
  postExpenseDefault,
  onPostExpenseChange,
  branches,
  branchFilter,
  onBranchFilterChange,
}: {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onRefresh: () => void;
  summary: Summary;
  applyStatutory: boolean;
  onApplyStatutoryChange: (value: boolean) => void;
  postExpenseDefault: boolean;
  onPostExpenseChange: (value: boolean) => void;
  branches: BranchOption[];
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
}) {
  const focus = defaultPayrollPeriod();
  const isFocusPeriod = isPayrollFocusPeriod(year, month);
  const progress =
    summary.headcount > 0
      ? Math.round((summary.paidCount / summary.headcount) * 100)
      : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-2.5 py-1.5 sm:px-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 rounded-[2px] sm:size-8"
            aria-label="Previous month"
            onClick={() => {
              const next = shiftPayrollMonth(year, month, -1);
              onMonthChange(next.year, next.month);
            }}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </Button>
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--op-ink)]">
            <span className="font-semibold">{payrollMonthLabel(year, month)}</span>
            <span className={dashboardHintClass()}>
              {summary.paidCount}/{summary.headcount} paid · {progress}%
            </span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 rounded-[2px] sm:size-8"
            aria-label="Next month"
            onClick={() => {
              const next = shiftPayrollMonth(year, month, 1);
              onMonthChange(next.year, next.month);
            }}
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        </div>
        {branches.length > 0 ? (
          <select
            className={cn(dashboardSelectClass(false), "h-10 w-auto max-w-[12rem] py-0 text-[13px] sm:h-8")}
            value={branchFilter}
            onChange={(e) => onBranchFilterChange(e.target.value)}
            aria-label="Filter by branch"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 gap-1 rounded-[2px] px-2 text-[13px] shadow-none sm:h-8"
          aria-pressed={applyStatutory}
          onClick={() => onApplyStatutoryChange(!applyStatutory)}
        >
          <Scale
            className={cn(
              "size-3.5",
              applyStatutory
                ? "text-[var(--op-accent)]"
                : "text-muted-foreground",
            )}
            aria-hidden
          />
          {applyStatutory ? "Statutory on" : "Statutory off"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 gap-1 rounded-[2px] px-2 text-[13px] shadow-none sm:h-8"
          aria-pressed={postExpenseDefault}
          onClick={() => onPostExpenseChange(!postExpenseDefault)}
        >
          <Wallet
            className={cn(
              "size-3.5",
              postExpenseDefault
                ? "text-[var(--op-accent)]"
                : "text-muted-foreground",
            )}
            aria-hidden
          />
          {postExpenseDefault ? "Post to finance" : "Finance off"}
        </Button>
        {!isFocusPeriod ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 rounded-[2px] px-2 text-[13px] shadow-none sm:h-8"
            onClick={() => onMonthChange(focus.year, focus.month)}
          >
            {focus.month !== new Date().getMonth() + 1 ||
            focus.year !== new Date().getFullYear()
              ? `Focus · ${payrollMonthLabel(focus.year, focus.month)}`
              : "This month"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 gap-1 rounded-[2px] px-2 text-[13px] shadow-none sm:h-8"
          onClick={onRefresh}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Refresh
        </Button>
      </div>
    </div>
  );
}

function RunSettingsBlock({
  applyStatutory,
  onApplyStatutoryChange,
  postExpenseDefault,
  onPostExpenseChange,
  paymentMethod,
  onPaymentMethodChange,
  branches,
  branchFilter,
  onBranchFilterChange,
}: {
  applyStatutory: boolean;
  onApplyStatutoryChange: (value: boolean) => void;
  postExpenseDefault: boolean;
  onPostExpenseChange: (value: boolean) => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  branches: BranchOption[];
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-[2px] border px-2.5 text-left text-[13px] sm:h-8",
          applyStatutory
            ? "border-[var(--op-accent)] text-[var(--op-accent)]"
            : "border-[var(--op-rule)] text-[var(--op-ink)]",
        )}
        onClick={() => onApplyStatutoryChange(!applyStatutory)}
      >
        <Scale className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 font-medium">Kenya statutory</span>
      </button>
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-[2px] border px-2.5 text-left text-[13px] sm:h-8",
          postExpenseDefault
            ? "border-[var(--op-accent)] text-[var(--op-accent)]"
            : "border-[var(--op-rule)] text-[var(--op-ink)]",
        )}
        onClick={() => onPostExpenseChange(!postExpenseDefault)}
      >
        <Wallet className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 font-medium">Post to finance</span>
      </button>
      {postExpenseDefault ? (
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
          Payment method
          <select
            className={dashboardSelectClass(false)}
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
          >
            <option value="mpesa_manual">M-Pesa</option>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
          </select>
        </label>
      ) : null}
      {branches.length > 0 ? (
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
          Branch
          <select
            className={dashboardSelectClass(false)}
            value={branchFilter}
            onChange={(e) => onBranchFilterChange(e.target.value)}
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}


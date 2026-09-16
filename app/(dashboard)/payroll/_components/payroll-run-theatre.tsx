"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
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
  staffDrawerOpen: boolean;
  onSelectRow: (row: PayrollRunRow) => void;
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

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rowNeedsAttention(row: PayrollRunRow): boolean {
  return (
    row.employmentStatus === "on_leave" ||
    Number(row.baseSalary) <= 0 ||
    Number(row.advancesOutstanding) > 0 ||
    (row.arrearPeriods?.length ?? 0) > 0
  );
}

function rowIsPending(row: PayrollRunRow): boolean {
  return (
    !row.alreadyPaid &&
    row.employmentStatus !== "on_leave" &&
    Number(row.baseSalary) > 0
  );
}

function statusLabel(row: PayrollRunRow, year: number, month: number): string {
  if (row.alreadyPaid) return "Paid";
  if (row.employmentStatus === "on_leave") return "On leave";
  if (row.salaryReleased === false) return "Unlocks 25th";
  if (Number(row.baseSalary) <= 0) return "No salary";
  if ((row.arrearPeriods?.length ?? 0) > 0) return "Arrears";
  if (Number(row.advancesOutstanding) > 0) return "Advance";
  void year;
  void month;
  return "Pending";
}

function statusBadgeClass(row: PayrollRunRow): string {
  if (row.alreadyPaid) {
    return "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white";
  }
  if (
    Number(row.baseSalary) <= 0 ||
    (row.arrearPeriods?.length ?? 0) > 0 ||
    Number(row.advancesOutstanding) > 0
  ) {
    return "border-[#9a2e16]/35 bg-transparent text-[#9a2e16]";
  }
  return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground";
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
    staffDrawerOpen,
    onSelectRow,
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
    payingAll,
    payingId,
    onPayAll,
    onAutomationSaved,
    alerts,
  } = props;

  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
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

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
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
                  "inline-flex h-7 items-center gap-1 rounded-none border px-1.5 text-[10px] font-semibold",
                  statusFilter === id
                    ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                )}
                onClick={() => setStatusFilter(id)}
              >
                {label}
                <span className="tabular-nums opacity-80">{count}</span>
              </button>
            ))}
          </div>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filtered.length}
            {query.trim() || statusFilter !== "all"
              ? ` of ${rows.length}`
              : ""}{" "}
            {filtered.length === 1 ? "person" : "people"}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {rows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-[14px] font-semibold text-foreground">
                No staff in this run
              </p>
              <p
                className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}
              >
                Add staff profiles and set monthly salaries to build the roster.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              {query.trim()
                ? `No staff match “${query.trim()}”.`
                : "No staff match this filter."}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((row) => {
                const active = selectedRow?.userId === row.userId;
                return (
                  <li key={row.userId}>
                    <button
                      type="button"
                      onClick={() => onSelectRow(row)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center border text-[10px] font-bold uppercase tracking-wide",
                          active || row.alreadyPaid
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {staffInitials(row.displayName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {row.displayName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {[row.title, row.branchName]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                          {" · "}
                          <span className="tabular-nums">
                            {formatPayrollMoney(row.suggestedNet)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-none border px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em]",
                          statusBadgeClass(row),
                        )}
                      >
                        {statusLabel(row, year, month)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = selectedRow ? (
    <PayrollFocus
      row={selectedRow}
      year={year}
      month={month}
      applyStatutory={applyStatutory}
      className="h-full min-h-0"
    />
  ) : (
    <PayrollPulse
      summary={summary}
      year={year}
      month={month}
      applyStatutory={applyStatutory}
      totalStatutory={summary.totalStatutory}
      rows={rows}
      onSelect={onSelectRow}
      canRunPayroll={canRunPayroll}
      pendingCount={summary.pendingCount}
      payingAll={payingAll}
      payingId={payingId}
      onPayAll={onPayAll}
      className="h-full min-h-0"
    />
  );

  const inspect = selectedRow ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a person
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The map in the middle is this pay run. The list on the left names who
          is in it.
        </p>
      </div>
      <div className="space-y-3">
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
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
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

      {/* Desktop theatre — roster | map | dossier */}
      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            The pay run
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selectedRow ? null : inspect}
        </div>
      </div>

      {/* Mobile: roster list; tap opens staff sheet */}
      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
        <div className="space-y-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3">
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
        docked={isLg}
        dockRoot={dockRoot}
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
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label="Previous month"
            onClick={() => {
              const next = shiftPayrollMonth(year, month, -1);
              onMonthChange(next.year, next.month);
            }}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </Button>
          <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-foreground">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <LiveDot />
              {payrollMonthLabel(year, month)}
            </span>
            <span className={dashboardHintClass()}>
              {summary.paidCount}/{summary.headcount} paid · {progress}%
            </span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
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
            className={cn(dashboardSelectClass(false), "h-7 w-auto max-w-[10rem] py-0 text-[11px]")}
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
          className="h-7 gap-1 px-1.5 text-[11px]"
          aria-pressed={applyStatutory}
          onClick={() => onApplyStatutoryChange(!applyStatutory)}
        >
          <Scale
            className={cn(
              "size-3.5",
              applyStatutory
                ? "text-[var(--pos-primary,#0f766e)]"
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
          className="h-7 gap-1 px-1.5 text-[11px]"
          aria-pressed={postExpenseDefault}
          onClick={() => onPostExpenseChange(!postExpenseDefault)}
        >
          <Wallet
            className={cn(
              "size-3.5",
              postExpenseDefault
                ? "text-[var(--pos-primary,#0f766e)]"
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
            className="h-7 px-1.5 text-[11px]"
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
          className="h-7 gap-1 px-1.5 text-[11px]"
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Run settings
      </p>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2.5 border px-2.5 py-2 text-left text-[12px]",
          applyStatutory
            ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        )}
        onClick={() => onApplyStatutoryChange(!applyStatutory)}
      >
        <Scale className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 font-medium">Kenya statutory</span>
      </button>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2.5 border px-2.5 py-2 text-left text-[12px]",
          postExpenseDefault
            ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
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

function PayrollPulse({
  summary,
  year,
  month,
  applyStatutory,
  totalStatutory,
  rows,
  onSelect,
  canRunPayroll,
  pendingCount,
  payingAll,
  payingId,
  onPayAll,
  className,
}: {
  summary: Summary;
  year: number;
  month: number;
  applyStatutory: boolean;
  totalStatutory: number;
  rows: PayrollRunRow[];
  onSelect: (row: PayrollRunRow) => void;
  canRunPayroll: boolean;
  pendingCount: number;
  payingAll: boolean;
  payingId: string | null;
  onPayAll: () => void;
  className?: string;
}) {
  const attention = useMemo(
    () =>
      rows
        .filter((r) => rowNeedsAttention(r) && !r.alreadyPaid)
        .slice(0, 4),
    [rows],
  );
  const progress =
    summary.headcount > 0
      ? Math.round((summary.paidCount / summary.headcount) * 100)
      : 0;
  const complete = progress === 100 && summary.headcount > 0;

  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M22 42 C 38 28, 58 22, 72 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M28 48 C 48 58, 62 52, 74 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 52 C 30 72, 48 78, 38 86"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {canRunPayroll && pendingCount > 0 ? (
        <div className="absolute right-3 top-3 z-[2]">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-none shadow-none"
            disabled={payingAll || payingId != null}
            onClick={onPayAll}
          >
            {payingAll ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-3.5" aria-hidden />
            )}
            Pay all ({pendingCount})
          </Button>
        </div>
      ) : null}

      <article className={cn(card, "left-[8%] top-[18%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Net to disburse
        </p>
        <p
          className="mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {formatPayrollMoney(summary.totalNetPending)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {summary.pendingCount} awaiting · {payrollMonthLabel(year, month)}
        </p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Run completion</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                complete
                  ? "text-[var(--pos-primary,#0f766e)]"
                  : "text-foreground",
              )}
            >
              {summary.paidCount}/{summary.headcount} · {progress}%
            </span>
          </div>
          <div className="h-1 overflow-hidden bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
            <div
              className="h-full bg-[var(--pos-primary,#0f766e)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </article>

      <article className={cn(card, "right-[6%] top-[42%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Snapshot
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <div>
            <dt className="text-[10px] text-muted-foreground">Staff</dt>
            <dd className="font-semibold tabular-nums">{summary.headcount}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Gross</dt>
            <dd className="font-semibold tabular-nums">
              {formatPayrollMoney(summary.totalBase)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">
              {summary.totalArrears > 0 ? "Arrears" : "Advances"}
            </dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                (summary.totalArrears > 0 || summary.totalAdvances > 0) &&
                  "text-[#9a2e16]",
              )}
            >
              {formatPayrollMoney(
                summary.totalArrears > 0
                  ? summary.totalArrears
                  : summary.totalAdvances,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Statutory</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                !applyStatutory && "text-muted-foreground",
              )}
            >
              {applyStatutory
                ? formatPayrollMoney(totalStatutory)
                : "Off"}
            </dd>
          </div>
        </dl>
      </article>

      {attention.length > 0 ? (
        <article className={cn(card, "bottom-[12%] left-[14%] right-auto w-[min(19rem,calc(100%-1.5rem))]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Needs review
          </p>
          <ul className="mt-2 space-y-1.5">
            {attention.map((row) => (
              <li key={row.userId}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left text-[12px] hover:text-[var(--pos-primary,#0f766e)]"
                  onClick={() => onSelect(row)}
                >
                  <span className="truncate font-medium">{row.displayName}</span>
                  <span className="shrink-0 text-[10px] text-[#9a2e16]">
                    {statusLabel(row, year, month)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function PayrollFocus({
  row,
  year,
  month,
  applyStatutory,
  className,
}: {
  row: PayrollRunRow;
  year: number;
  month: number;
  applyStatutory: boolean;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(18rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-4 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M30 30 C 48 22, 58 38, 70 34"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M26 55 C 42 48, 55 62, 72 58"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <article className={cn(card, "left-1/2 top-[28%] -translate-x-1/2")}>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center border text-[12px] font-bold uppercase",
              row.alreadyPaid
                ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
            )}
            aria-hidden
          >
            {staffInitials(row.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[1.15rem] font-semibold leading-none tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {row.displayName}
            </p>
            <p className={cn(dashboardHintClass(), "mt-1.5 truncate")}>
              {[row.title, row.branchName].filter(Boolean).join(" · ") ||
                statusLabel(row, year, month)}
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Net for {payrollMonthLabel(year, month)}
          </p>
          <p
            className="mt-1.5 text-[1.75rem] font-semibold leading-none tracking-[-0.04em] tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {formatPayrollMoney(row.suggestedNet)}
          </p>
          <p className={cn(dashboardHintClass(), "mt-2")}>
            Base {formatPayrollMoney(row.baseSalary)}
            {applyStatutory && Number(row.statutoryTotal) > 0
              ? ` · statutory −${formatPayrollMoney(row.statutoryTotal)}`
              : ""}
            {Number(row.advancesOutstanding) > 0
              ? ` · advances ${formatPayrollMoney(row.advancesOutstanding)}`
              : ""}
          </p>
        </div>
        <span
          className={cn(
            "mt-3 inline-flex rounded-none border px-1.5 py-0.5 text-[10px] font-semibold",
            statusBadgeClass(row),
          )}
        >
          {statusLabel(row, year, month)}
        </span>
      </article>
    </div>
  );
}

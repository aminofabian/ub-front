"use client";

import { useTeamAccountSync } from "@/hooks/use-team-account-sync";
import { IS_DESKTOP } from "@/lib/runtime";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  DASHBOARD_MAX,
  DashboardLoadError,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { formatMoney } from "@/lib/money";
import {
  fetchCommissionPlans,
  fetchCommissionStatement,
  nairobiToday,
  type CommissionPlanRecord,
  type CommissionStatement,
  type CommissionStatementRow,
} from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

import { periodStart } from "./commission-history";
import { summarizeCommissionRows } from "./commission-summary";
import { EarningsTable } from "./earnings-table";
import { GetStartedGuide } from "./get-started-guide";
import { AdjustDialog, PayoutDialog } from "./payout-dialogs";
import { PayModelPanel } from "./pay-model-panel";
import { PeriodTotals } from "./period-totals";
import { ServiceReportPanel } from "./service-report-panel";
import { TeamPanel } from "./team-panel";

const kes = (n: number) => formatMoney(n, "KES");

export function CommissionsWorkspace({
  canPay,
  canAdjust,
  canManagePlans,
  canAddStaff,
}: {
  canPay: boolean;
  canAdjust: boolean;
  canManagePlans: boolean;
  canAddStaff: boolean;
}) {
  const [from, setFrom] = useState(() => nairobiToday());
  const [to, setTo] = useState(() => nairobiToday());
  const [statement, setStatement] = useState<CommissionStatement | null>(null);
  const [plans, setPlans] = useState<CommissionPlanRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<CommissionStatementRow | null>(null);
  const [adjusting, setAdjusting] = useState<CommissionStatementRow | null>(null);

  const load = useCallback(async () => {
    if (!from || !to || to < from) {
      setError("Choose a period that ends on or after it starts.");
      return;
    }
    setError(null);
    try {
      const [st, pl] = await Promise.all([fetchCommissionStatement(from, to), fetchCommissionPlans()]);
      setStatement(st);
      setPlans(pl);
    } catch {
      setError("Could not load earnings. Check your connection and try again.");
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  // Team members added by name get their account here too, so Users and Payroll list the same people.
  useTeamAccountSync(!IS_DESKTOP && canAddStaff, () => void load());

  return (
    <div className={cn(DASHBOARD_MAX, "gap-3")}>
      <header className="dashboard-page-hero flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[var(--op-ink)]">Commissions</h1>
          <p className="mt-1 max-w-[65ch] text-[13px] leading-snug text-[var(--op-muted)]">
            What each person earned, what you have paid them and what you still owe.
          </p>
        </div>
        <PeriodFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </header>

      {error ? (
        <DashboardLoadError title="Commissions" message={error} onRetry={() => void load()} />
      ) : statement == null ? (
        <CommissionsSkeleton />
      ) : (
        <CommissionBody
          statement={statement}
          plans={plans}
          canPay={canPay}
          canAdjust={canAdjust}
          canManagePlans={canManagePlans}
          canAddStaff={canAddStaff}
          from={from}
          to={to}
          onReload={load}
          onPay={setPaying}
          onAdjust={setAdjusting}
        />
      )}

      {paying ? (
        <PayoutDialog
          row={paying}
          onClose={() => setPaying(null)}
          onDone={async () => {
            setPaying(null);
            await load();
          }}
        />
      ) : null}
      {adjusting ? (
        <AdjustDialog
          row={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={async () => {
            setAdjusting(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function PeriodFields({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  const today = nairobiToday();
  const presets = (["today", "week", "month"] as const).map((id) => ({
    id,
    label: id === "today" ? "Today" : id === "week" ? "7 days" : "This month",
    start: periodStart(id, today),
  }));
  return (
    <div className="flex w-full flex-wrap items-end gap-1.5 sm:w-auto">
      <div
        className="flex h-10 items-center rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] p-0.5 sm:h-8"
        role="group"
        aria-label="Show earnings for"
      >
        {presets.map((preset) => {
          const on = to === today && from === preset.start;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                onFrom(preset.start);
                onTo(today);
              }}
              className={cn(
                "h-full rounded-[1px] px-2.5 text-[13px] font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]",
                on ? "bg-[var(--op-ink)] text-white" : "text-[var(--op-muted)] hover:text-[var(--op-ink)]",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <label className="grid min-w-0 flex-1 gap-0.5 sm:flex-none">
        <span className={dashboardLabelClass()}>From</span>
        <input
          type="date"
          className={dashboardInputClass(false, "w-full sm:w-[9.25rem]")}
          value={from}
          max={to}
          onChange={(e) => onFrom(e.target.value)}
        />
      </label>
      <span className="mb-2 hidden text-[12px] text-[var(--op-faint)] sm:mb-1.5 sm:block" aria-hidden>
        -
      </span>
      <label className="grid min-w-0 flex-1 gap-0.5 sm:flex-none">
        <span className={dashboardLabelClass()}>To</span>
        <input
          type="date"
          className={dashboardInputClass(false, "w-full sm:w-[9.25rem]")}
          value={to}
          min={from}
          onChange={(e) => onTo(e.target.value)}
        />
      </label>
    </div>
  );
}

function CommissionBody({
  statement,
  plans,
  canPay,
  canAdjust,
  canManagePlans,
  canAddStaff,
  from,
  to,
  onReload,
  onPay,
  onAdjust,
}: {
  statement: CommissionStatement;
  plans: CommissionPlanRecord[];
  canPay: boolean;
  canAdjust: boolean;
  canManagePlans: boolean;
  canAddStaff: boolean;
  from: string;
  to: string;
  onReload: () => Promise<void>;
  onPay: (row: CommissionStatementRow) => void;
  onAdjust: (row: CommissionStatementRow) => void;
}) {
  return (
    <>
      {statement.reconciled ? null : <ReconcileNotice statement={statement} />}
      <GetStartedGuide plans={plans} canManage={canManagePlans} />
      <PeriodTotals totals={summarizeCommissionRows(statement.rows)} people={statement.rows.length} />
      <PayModelPanel canManage={canManagePlans} />
      {/* From 1440px the roster is a rail, so TeamPanel rows stack again there. */}
      <div className="grid items-start gap-3 min-[1440px]:grid-cols-[minmax(0,1fr)_22.5rem]">
        <EarningsTable
          rows={statement.rows}
          reconciled={statement.reconciled}
          from={from}
          to={to}
          canPay={canPay}
          canAdjust={canAdjust}
          onPay={onPay}
          onAdjust={onAdjust}
        />
        <TeamPanel
          plans={plans}
          canManagePlans={canManagePlans}
          canAddStaff={canAddStaff}
          onChanged={onReload}
        />
      </div>
      <ServiceReportPanel from={from} to={to} canText={canPay} />
    </>
  );
}

function ReconcileNotice({ statement }: { statement: CommissionStatement }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[2px] border border-[color-mix(in_srgb,var(--op-highlight)_32%,transparent)] bg-[color-mix(in_srgb,var(--op-highlight)_7%,var(--op-surface))] px-3 py-2 text-[13px] leading-snug text-[var(--op-ink)]"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--op-highlight)]" aria-hidden />
      <p>
        These figures do not match your books ({kes(statement.ledgerTotal)} here, {kes(statement.generalLedgerTotal)}{" "}
        in the ledger). Do not pay out until support has looked at it.
      </p>
    </div>
  );
}

function CommissionsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <p className="sr-only">Loading earnings</p>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2px] bg-[var(--op-rule)] ring-1 ring-[var(--op-rule)] lg:grid-cols-5">
        {["owed", "commission", "tips", "paid", "brought"].map((key) => (
          <div key={key} className="h-14 animate-pulse bg-[var(--op-surface)]" />
        ))}
      </div>
      <div className="grid items-start gap-3 min-[1440px]:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="h-52 animate-pulse rounded-[2px] bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]" />
        <div className="h-52 animate-pulse rounded-[2px] bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]" />
      </div>
      <div className="h-40 animate-pulse rounded-[2px] bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]" />
    </div>
  );
}

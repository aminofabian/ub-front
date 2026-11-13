"use client";

import { Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import {
  fetchCommissionPlans,
  fetchCommissionStatement,
  nairobiToday,
  type CommissionPlanRecord,
  type CommissionStatement,
  type CommissionStatementRow,
} from "@/lib/service-business-api";

import { AdjustDialog, PayoutDialog } from "./payout-dialogs";
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

  const totalOwed = statement?.rows.reduce((sum, row) => sum + Math.max(row.closing, 0), 0) ?? 0;

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={Wallet}
        title="Commissions"
        description="What each person earned, what you have paid them and what you still owe."
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-0.5">
            <span className={dashboardLabelClass()}>From</span>
            <input
              type="date"
              className={dashboardInputClass(false, "w-36")}
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="grid gap-0.5">
            <span className={dashboardLabelClass()}>To</span>
            <input
              type="date"
              className={dashboardInputClass(false, "w-36")}
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </DashboardPageHero>

      {error ? (
        <DashboardLoadError title="Commissions" message={error} onRetry={() => void load()} />
      ) : statement == null ? (
        <DashboardLoading label="Loading earnings…" />
      ) : (
        <>
          {!statement.reconciled ? (
            <div role="alert" className={`${DASHBOARD_SECTION_SURFACE} border-red-700/40 text-sm text-red-800`}>
              These figures do not match your books ({kes(statement.ledgerTotal)} here,{" "}
              {kes(statement.generalLedgerTotal)} in the ledger). Do not pay out until support has
              looked at it.
            </div>
          ) : null}

          <div className={DASHBOARD_SECTION_SURFACE}>
            <div className={dashboardLabelClass()}>You owe your team</div>
            <div className="font-mono text-2xl font-semibold tabular-nums">{kes(totalOwed)}</div>
          </div>

          {statement.rows.length === 0 ? (
            <div className={DASHBOARD_SECTION_SURFACE}>
              <p className="text-sm font-semibold">No one to pay yet</p>
              <p className={dashboardHintClass()}>
                Add the people who serve customers below. Each service rung against them shows up
                here.
              </p>
            </div>
          ) : (
            <div className={DASHBOARD_TABLE_SURFACE}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#121A16)_60%,transparent)]">
                      <th className="px-3 py-2">Staff</th>
                      <th className="px-3 py-2 text-right">Services</th>
                      <th className="px-3 py-2 text-right">Brought in</th>
                      <th className="px-3 py-2 text-right">Commission</th>
                      <th className="px-3 py-2 text-right">Tips</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Owed</th>
                      {canPay || canAdjust ? <th className="px-3 py-2 text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {statement.rows.map((row) => {
                      const extras = row.opening + row.reversals + row.adjustments;
                      return (
                        <tr key={row.staffProfileId} className="border-b last:border-b-0">
                          <td className="px-3 py-2">
                            <div className="font-medium">{row.displayName}</div>
                            {!row.current ? <div className={dashboardHintClass()}>Left</div> : null}
                            {extras !== 0 ? (
                              <div className={dashboardHintClass()}>
                                {row.opening !== 0 ? `Brought forward ${kes(row.opening)}. ` : ""}
                                {row.reversals !== 0 ? `Taken back ${kes(row.reversals)}. ` : ""}
                                {row.adjustments !== 0 ? `Adjusted ${kes(row.adjustments)}.` : ""}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.servicesDone}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{kes(row.serviceRevenue)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{kes(row.commission)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{kes(row.tips)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{kes(row.paid)}</td>
                          <td className="px-3 py-2 text-right font-mono text-base font-semibold tabular-nums">
                            {kes(row.closing)}
                          </td>
                          {canPay || canAdjust ? (
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-1.5">
                                {canPay ? (
                                  <Button size="sm" disabled={!statement.reconciled} onClick={() => setPaying(row)}>
                                    Pay out
                                  </Button>
                                ) : null}
                                {canAdjust ? (
                                  <Button variant="outline" size="sm" onClick={() => setAdjusting(row)}>
                                    Adjust
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <TeamPanel
            plans={plans}
            canManagePlans={canManagePlans}
            canAddStaff={canAddStaff}
            onChanged={load}
          />
        </>
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

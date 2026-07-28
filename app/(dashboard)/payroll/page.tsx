"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Wallet } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createStaffAdvance,
  fetchPayrollRun,
  payStaffPayroll,
  type PayrollRunRow,
} from "@/lib/api";

function money(n: number): string {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function PayrollPage() {
  const {
    loading: dashLoading,
    canViewPayroll,
    canManagePayroll,
    canRunPayroll,
  } = useDashboard();

  const now = useMemo(() => new Date(), []);
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

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceUserId, setAdvanceUserId] = useState<string | null>(null);
  const [advanceName, setAdvanceName] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [advanceNote, setAdvanceNote] = useState("");
  const [advanceSaving, setAdvanceSaving] = useState(false);

  const load = useCallback(async () => {
    if (!canViewPayroll) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPayrollRun(year, month);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll run");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canViewPayroll, year, month]);

  useEffect(() => {
    if (!dashLoading && canViewPayroll) {
      void load();
    }
  }, [dashLoading, canViewPayroll, load]);

  async function onPay(row: PayrollRunRow) {
    if (!canRunPayroll || row.alreadyPaid) return;
    if (row.baseSalary <= 0) {
      setFeedback({
        kind: "error",
        text: `${row.displayName} has no salary for this period.`,
      });
      return;
    }
    setPayingId(row.userId);
    setFeedback(null);
    try {
      await payStaffPayroll(row.userId, { year, month });
      setFeedback({
        kind: "success",
        text: `Paid ${row.displayName} for ${monthLabel(year, month)}.`,
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

  function openAdvance(row: PayrollRunRow) {
    setAdvanceUserId(row.userId);
    setAdvanceName(row.displayName);
    setAdvanceAmount("");
    setAdvanceDate(new Date().toISOString().slice(0, 10));
    setAdvanceNote("");
    setAdvanceOpen(true);
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
      await load();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to log advance",
      });
    } finally {
      setAdvanceSaving(false);
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
        description={`Monthly pay run for ${monthLabel(year, month)}. Net = salary − advances (oldest first) − other deductions.`}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Year
          <input
            type="number"
            className={dashboardInputClass(false, "w-28")}
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Month
          <input
            type="number"
            min={1}
            max={12}
            className={dashboardInputClass(false, "w-24")}
            value={month}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 12) setMonth(v);
            }}
          />
        </label>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {feedback ? (
        <div className="mb-4">
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        </div>
      ) : null}

      {loading ? (
        <DashboardLoading label="Loading payroll run…" />
      ) : error ? (
        <DashboardLoadError
          title="Couldn’t load payroll"
          message={error}
          onRetry={() => void load()}
        />
      ) : (
        <section className={cn(DASHBOARD_TABLE_SURFACE, "overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium text-right">Base</th>
                  <th className="px-4 py-3 font-medium text-right">Advances</th>
                  <th className="px-4 py-3 font-medium text-right">Net</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
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
                        <div className="font-medium">{row.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.title || row.employmentStatus}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.branchName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(row.baseSalary)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(row.advancesOutstanding)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {money(row.suggestedNet)}
                      </td>
                      <td className="px-4 py-3">
                        {row.alreadyPaid ? (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                            Paid
                          </span>
                        ) : (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {canManagePayroll ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => openAdvance(row)}
                            >
                              <Wallet className="size-3" aria-hidden />
                              Advance
                            </Button>
                          ) : null}
                          {canRunPayroll && !row.alreadyPaid ? (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              disabled={payingId === row.userId}
                              onClick={() => void onPay(row)}
                            >
                              {payingId === row.userId ? (
                                <Loader2
                                  className="size-3 animate-spin"
                                  aria-hidden
                                />
                              ) : null}
                              Mark paid
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <FormDrawer
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        title="Log salary advance"
        description={advanceName}
        contextLabel="Payroll"
        icon={<Wallet className="size-5 text-primary" aria-hidden />}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdvanceOpen(false)}
            >
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
              />
            </label>
          </div>
        </FormDrawerFields>
      </FormDrawer>
    </div>
  );
}

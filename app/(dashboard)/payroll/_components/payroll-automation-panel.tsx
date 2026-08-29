"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Settings2 } from "lucide-react";

import { dashboardSelectClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchPayrollAutomation,
  updatePayrollAutomation,
  type PayrollAutomationSettings,
} from "@/lib/api";

type BranchOption = { id: string; name: string };

const DEFAULT_TIMES = ["09:00"];

type Props = {
  canManage: boolean;
  branches: BranchOption[];
  applyStatutory: boolean;
  postExpenseDefault: boolean;
  branchFilter: string;
  onSaved?: (settings: PayrollAutomationSettings) => void;
};

export function PayrollAutomationPanel({
  canManage,
  branches,
  applyStatutory,
  postExpenseDefault,
  branchFilter,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PayrollAutomationSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"auto_pay" | "remind">("auto_pay");
  const [payDay, setPayDay] = useState("28");
  const [runTime, setRunTime] = useState("09:00");
  const [autoStatutory, setAutoStatutory] = useState(false);
  const [autoPostExpense, setAutoPostExpense] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("mpesa_manual");
  const [automationBranch, setAutomationBranch] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPayrollAutomation();
      setSettings(data);
      setEnabled(data.enabled);
      setMode(data.automationMode);
      setPayDay(String(data.payDayOfMonth));
      setRunTime(data.autoPayTimes[0] ?? DEFAULT_TIMES[0]);
      setAutoStatutory(data.applyStatutory);
      setAutoPostExpense(data.postExpense);
      setPaymentMethod(data.paymentMethod);
      setAutomationBranch(data.branchId ?? "");
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!open || settings?.enabled) return;
    setAutoStatutory(applyStatutory);
    setAutoPostExpense(postExpenseDefault);
    setAutomationBranch(branchFilter);
  }, [open, settings?.enabled, applyStatutory, postExpenseDefault, branchFilter]);

  async function save() {
    if (!canManage) return;
    setSaving(true);
    try {
      const updated = await updatePayrollAutomation({
        enabled,
        automationMode: mode,
        payDayOfMonth: Math.min(28, Math.max(1, Number(payDay) || 28)),
        autoPayTimes: [runTime.trim() || DEFAULT_TIMES[0]],
        applyStatutory: autoStatutory,
        postExpense: autoPostExpense,
        paymentMethod,
        branchId: automationBranch || null,
      });
      setSettings(updated);
      onSaved?.(updated);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const statusLabel = !settings?.enabled
    ? "Off"
    : settings.automationMode === "remind"
      ? `Remind · day ${settings.payDayOfMonth}`
      : `Auto pay · day ${settings.payDayOfMonth}`;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <CalendarClock className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Automation
            </p>
            <p className="mt-0.5 text-sm font-medium">{statusLabel}</p>
            {settings?.enabled ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {settings.autoPayTimes.join(", ")} EAT ·{" "}
                {settings.automationMode === "auto_pay"
                  ? "marks staff paid automatically"
                  : "notifies you to review payroll"}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Schedule monthly pay like supplier auto-pay — optional and overridable.
              </p>
            )}
          </div>
        </div>
        {canManage ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Settings2 className="mr-1 size-3.5" aria-hidden />
            Configure
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm",
              enabled
                ? "border-violet-500/35 bg-violet-500/10"
                : "border-border/60 bg-muted/20",
            )}
            onClick={() => setEnabled((v) => !v)}
          >
            <span>
              <span className="font-medium">Enable payroll automation</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Runs on the day and time you choose each month
              </span>
            </span>
            <span className={cn("text-xs font-medium", enabled ? "text-violet-700 dark:text-violet-300" : "text-muted-foreground")}>
              {enabled ? "On" : "Off"}
            </span>
          </button>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Pay day (1–28)
              <input
                type="number"
                min="1"
                max="28"
                className="rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm"
                value={payDay}
                onChange={(e) => setPayDay(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Run time (EAT)
              <input
                type="time"
                className="rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm"
                value={runTime}
                onChange={(e) => setRunTime(e.target.value)}
              />
            </label>
          </div>

          <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
            {(
              [
                ["auto_pay", "Auto pay", "Pay all eligible staff"],
                ["remind", "Remind me", "Notification only — you confirm"],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "flex flex-1 flex-col rounded-md px-2 py-1.5 text-left text-xs",
                  mode === value
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMode(value)}
              >
                <span className="font-medium">{label}</span>
                <span className="text-[10px] opacity-80">{hint}</span>
              </button>
            ))}
          </div>

          {mode === "auto_pay" ? (
            <div className="space-y-2 rounded-lg bg-muted/25 p-3 text-xs">
              <ToggleRow
                label="Apply Kenya statutory"
                active={autoStatutory}
                onClick={() => setAutoStatutory((v) => !v)}
              />
              <ToggleRow
                label="Post to finance"
                active={autoPostExpense}
                onClick={() => setAutoPostExpense((v) => !v)}
              />
              <label className="flex flex-col gap-1 font-medium text-muted-foreground">
                Payment method
                <select
                  className={dashboardSelectClass()}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="mpesa_manual">M-Pesa</option>
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                </select>
              </label>
            </div>
          ) : null}

          {branches.length > 0 ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Branch scope
              <select
                className={dashboardSelectClass()}
                value={automationBranch}
                onChange={(e) => setAutomationBranch(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={saving || loading} onClick={() => void save()}>
              {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="flex w-full items-center justify-between" onClick={onClick}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>
        {active ? "Yes" : "No"}
      </span>
    </button>
  );
}

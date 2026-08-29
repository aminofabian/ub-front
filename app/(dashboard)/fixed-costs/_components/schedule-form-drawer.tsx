"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import {
  createExpenseSchedule,
  type ExpenseScheduleRecord,
} from "@/lib/api";
import {
  EXPENSE_FREQUENCY_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  FIXED_COST_PRESETS,
  formatFixedCostDate,
  formatFixedCostMoney,
  nextDueDate,
  type ExpenseFrequency,
} from "@/lib/fixed-costs-utils";

type BranchOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: BranchOption[];
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onCreated: (schedule: ExpenseScheduleRecord) => void;
  onError: (message: string) => void;
};

export function ScheduleFormDrawer({
  open,
  onOpenChange,
  branches,
  saving,
  onSavingChange,
  onCreated,
  onError,
}: Props) {
  const [step, setStep] = useState(0);
  const [presetId, setPresetId] = useState<string>("shop_rent");
  const [name, setName] = useState("Shop rent");
  const [categoryType, setCategoryType] = useState<"fixed" | "variable">("fixed");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<ExpenseFrequency>("monthly");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mpesa_manual");
  const [includeInCashDrawer, setIncludeInCashDrawer] = useState(false);
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    if (!open) {
      setStep(0);
      setPresetId("shop_rent");
      setName("Shop rent");
      setCategoryType("fixed");
      setAmount("");
      setFrequency("monthly");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
      setPaymentMethod("mpesa_manual");
      setIncludeInCashDrawer(false);
      setBranchId("");
    }
  }, [open]);

  const previewDates = useMemo(() => {
    if (!startDate || Number(amount) <= 0) return [];
    const dates: string[] = [];
    let after: string | null = null;
    for (let i = 0; i < 3; i++) {
      const next = nextDueDate(frequency, startDate, after);
      if (!next) break;
      dates.push(next);
      after = next;
    }
    return dates;
  }, [amount, frequency, startDate]);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const preset = FIXED_COST_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (preset.name) setName(preset.name);
    setCategoryType(preset.categoryType);
  };

  const submit = async () => {
    const parsed = Number.parseFloat(amount);
    if (!name.trim()) {
      onError("Name is required.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onError("Enter a valid amount.");
      return;
    }
    onSavingChange(true);
    try {
      const schedule = await createExpenseSchedule({
        name: name.trim(),
        categoryType,
        amount: parsed,
        paymentMethod,
        frequency,
        startDate,
        endDate: endDate.trim() || null,
        includeInCashDrawer,
        branchId: branchId || null,
      });
      onCreated(schedule);
      onOpenChange(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      onSavingChange(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Add fixed cost"
      description="Rent, utilities, and other bills that repeat on a schedule. Due items post automatically overnight."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save schedule"
              )}
            </Button>
          )}
        </div>
      }
    >
      <FormDrawerFields>
        {step === 0 ? (
          <>
            <p className="text-sm text-muted-foreground">What kind of cost is this?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {FIXED_COST_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={
                    presetId === preset.id
                      ? "rounded-lg border-2 border-primary bg-primary/5 px-3 py-2 text-left text-sm font-medium"
                      : "rounded-lg border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/30"
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Name
              <input
                className={dashboardInputClass(false)}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Amount (KES)
              <input
                className={dashboardInputClass(false)}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Frequency
              <select
                className={dashboardSelectClass(false)}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ExpenseFrequency)}
              >
                {EXPENSE_FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              First due date
              <input
                type="date"
                className={dashboardInputClass(false)}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              End date (optional)
              <input
                type="date"
                className={dashboardInputClass(false)}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              How you pay
              <select
                className={dashboardSelectClass(false)}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {EXPENSE_PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {branches.length > 0 ? (
              <label className="flex flex-col gap-1 text-sm">
                Branch
                <select
                  className={dashboardSelectClass(false)}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">All / shop-wide</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeInCashDrawer}
                onChange={(e) => setIncludeInCashDrawer(e.target.checked)}
              />
              Paid from till cash (reduces expected closing float)
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="font-medium">Review</p>
            <p>
              <span className="text-muted-foreground">Name:</span> {name}
            </p>
            <p>
              <span className="text-muted-foreground">Amount:</span>{" "}
              {formatFixedCostMoney(Number(amount) || 0)} · {frequency}
            </p>
            <p>
              <span className="text-muted-foreground">Starts:</span>{" "}
              {formatFixedCostDate(startDate)}
            </p>
            {previewDates.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Next due dates:</span>{" "}
                {previewDates.map(formatFixedCostDate).join(" · ")}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Posted automatically after 02:00 each due day (shop timezone). Shows in
              finance reports and today&apos;s takings.
            </p>
          </div>
        ) : null}
      </FormDrawerFields>
    </FormDrawer>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import {
  patchExpenseSchedule,
  type ExpenseScheduleRecord,
} from "@/lib/api";
import {
  EXPENSE_FREQUENCY_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  type ExpenseFrequency,
} from "@/lib/fixed-costs-utils";

type BranchOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ExpenseScheduleRecord | null;
  branches: BranchOption[];
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onSaved: (schedule: ExpenseScheduleRecord) => void;
  onError: (message: string) => void;
};

export function ScheduleEditDrawer({
  open,
  onOpenChange,
  schedule,
  branches,
  saving,
  onSavingChange,
  onSaved,
  onError,
}: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<ExpenseFrequency>("monthly");
  const [paymentMethod, setPaymentMethod] = useState("mpesa_manual");
  const [endDate, setEndDate] = useState("");
  const [includeInCashDrawer, setIncludeInCashDrawer] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [automationMode, setAutomationMode] = useState<"auto_post" | "remind">(
    "auto_post",
  );
  const [vendorContactName, setVendorContactName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorMpesaNumber, setVendorMpesaNumber] = useState("");
  const [vendorLeaseNote, setVendorLeaseNote] = useState("");

  useEffect(() => {
    if (!open || !schedule) return;
    setName(schedule.name);
    setAmount(String(schedule.amount));
    setFrequency(schedule.frequency as ExpenseFrequency);
    setPaymentMethod(schedule.paymentMethod);
    setEndDate(schedule.endDate?.slice(0, 10) ?? "");
    setIncludeInCashDrawer(schedule.includeInCashDrawer);
    setBranchId(schedule.branchId ?? "");
    setAutomationMode(
      schedule.automationMode === "remind" ? "remind" : "auto_post",
    );
    setVendorContactName(schedule.vendorContactName ?? "");
    setVendorPhone(schedule.vendorPhone ?? "");
    setVendorMpesaNumber(schedule.vendorMpesaNumber ?? "");
    setVendorLeaseNote(schedule.vendorLeaseNote ?? "");
  }, [open, schedule]);

  const save = async () => {
    if (!schedule) return;
    if (!name.trim()) {
      onError("Name is required.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      onError("Enter a valid amount.");
      return;
    }
    onSavingChange(true);
    try {
      const updated = await patchExpenseSchedule(schedule.id, {
        name: name.trim(),
        amount: parsedAmount,
        frequency,
        paymentMethod,
        endDate: endDate.trim() || null,
        includeInCashDrawer,
        branchId: branchId.trim() || null,
        automationMode,
        vendorContactName: vendorContactName.trim() || null,
        vendorPhone: vendorPhone.trim() || null,
        vendorMpesaNumber: vendorMpesaNumber.trim() || null,
        vendorLeaseNote: vendorLeaseNote.trim() || null,
      });
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      onSavingChange(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Edit fixed cost"
      description="Update amount, rhythm, or payment details. Past posted expenses are not changed."
    >
      <FormDrawerFields>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            className={dashboardInputClass(false)}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Amount (KES)</span>
          <input
            className={dashboardInputClass(false)}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Rhythm</span>
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

        <label className="space-y-1 text-sm">
          <span className="font-medium">How you pay</span>
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

        <label className="space-y-1 text-sm">
          <span className="font-medium">When due</span>
          <select
            className={dashboardSelectClass(false)}
            value={automationMode}
            onChange={(e) =>
              setAutomationMode(e.target.value as "auto_post" | "remind")
            }
          >
            <option value="auto_post">Post automatically overnight</option>
            <option value="remind">Wait for me to confirm</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">End date (optional)</span>
          <input
            type="date"
            className={dashboardInputClass(false)}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        {branches.length > 0 ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium">Branch</span>
            <select
              className={dashboardSelectClass(false)}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInCashDrawer}
            onChange={(e) => setIncludeInCashDrawer(e.target.checked)}
          />
          Include in till cash balance
        </label>

        <div className="space-y-2 rounded-lg border border-border/50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Landlord / vendor (optional)
          </p>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Contact name</span>
            <input
              className={dashboardInputClass(false)}
              value={vendorContactName}
              onChange={(e) => setVendorContactName(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Phone</span>
            <input
              className={dashboardInputClass(false)}
              value={vendorPhone}
              onChange={(e) => setVendorPhone(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">M-Pesa number</span>
            <input
              className={dashboardInputClass(false)}
              value={vendorMpesaNumber}
              onChange={(e) => setVendorMpesaNumber(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Lease note</span>
            <textarea
              className={dashboardInputClass(false)}
              rows={2}
              value={vendorLeaseNote}
              onChange={(e) => setVendorLeaseNote(e.target.value)}
            />
          </label>
        </div>
      </FormDrawerFields>

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" disabled={saving || !schedule} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden /> : null}
          Save changes
        </Button>
      </div>
    </FormDrawer>
  );
}

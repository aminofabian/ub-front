"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { postFinanceExpense } from "@/lib/api";
import {
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  FIXED_COST_PRESETS,
} from "@/lib/fixed-costs-utils";

type BranchOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseDate: string;
  branches: BranchOption[];
  canManage: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
};

export function OneOffExpenseDrawer({
  open,
  onOpenChange,
  expenseDate,
  branches,
  canManage,
  onSaved,
  onError,
}: Props) {
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState<"fixed" | "variable">("variable");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [includeInCashDrawer, setIncludeInCashDrawer] = useState(true);
  const [branchId, setBranchId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setCategoryType("variable");
      setAmount("");
      setPaymentMethod("cash");
      setIncludeInCashDrawer(true);
      setBranchId("");
    }
  }, [open]);

  const save = async () => {
    if (!canManage) return;
    if (!name.trim()) {
      onError("Name is required.");
      return;
    }
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await postFinanceExpense({
        expenseDate: expenseDate.slice(0, 10),
        name: name.trim(),
        categoryType,
        amount: parsed,
        paymentMethod,
        includeInCashDrawer,
        branchId: branchId.trim() || null,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Record expense"
      description="Petty cash, supplies, or other one-off spend for this day — posts to finance immediately."
    >
      <FormDrawerFields>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Quick preset</span>
          <select
            className={dashboardSelectClass(false)}
            value=""
            onChange={(e) => {
              const preset = FIXED_COST_PRESETS.find((p) => p.id === e.target.value);
              if (!preset || preset.id === "other") return;
              setName(preset.name);
              setCategoryType(preset.categoryType);
            }}
          >
            <option value="">Choose…</option>
            {FIXED_COST_PRESETS.filter((p) => p.id !== "other").map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            className={dashboardInputClass(false)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Broom, lunch float, parking"
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
          <span className="font-medium">Category</span>
          <select
            className={dashboardSelectClass(false)}
            value={categoryType}
            onChange={(e) =>
              setCategoryType(e.target.value as "fixed" | "variable")
            }
          >
            <option value="variable">Variable</option>
            <option value="fixed">Fixed</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Payment</span>
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
          Reduce till expected cash
        </label>
      </FormDrawerFields>

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" disabled={saving || !canManage} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden /> : null}
          Record expense
        </Button>
      </div>
    </FormDrawer>
  );
}

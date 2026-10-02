"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { patchFinanceExpense, type FinanceExpenseResponse } from "@/lib/api";
import {
  EXPENSE_CATEGORY_CODE_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  type ExpenseCategoryCode,
  type ExpensePaymentMethod,
} from "@/lib/fixed-costs-utils";

type Props = {
  expense: FinanceExpenseResponse | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

function categoryTypeFor(
  code: string,
  current: string,
): "fixed" | "variable" {
  if (code === "rent" || code === "salaries") return "fixed";
  if (
    code === "utilities" ||
    code === "transport" ||
    code === "maintenance" ||
    code === "packaging"
  ) {
    return "variable";
  }
  return current === "fixed" ? "fixed" : "variable";
}

export function ExpenseEditDrawer({
  expense,
  onOpenChange,
  onSaved,
  onError,
}: Props) {
  const [name, setName] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryCode, setCategoryCode] = useState<ExpenseCategoryCode | "">("");
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>("cash");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!expense) return;
    setName(expense.name);
    setExpenseDate(expense.expenseDate.slice(0, 10));
    setAmount(String(expense.amount));
    const code = EXPENSE_CATEGORY_CODE_OPTIONS.find(
      (option) => option.value === expense.categoryCode,
    );
    setCategoryCode(code?.value ?? "other");
    const method = EXPENSE_PAYMENT_METHOD_OPTIONS.find(
      (option) => option.value === expense.paymentMethod,
    );
    setPaymentMethod(method?.value ?? "cash");
  }, [expense]);

  const save = async () => {
    if (!expense) return;
    const parsed = Number(amount);
    if (!name.trim() || !expenseDate || !Number.isFinite(parsed) || parsed <= 0) {
      onError("Enter a name, date, and amount greater than zero.");
      return;
    }
    const code = categoryCode || "other";
    setSaving(true);
    try {
      await patchFinanceExpense(expense.id, {
        name: name.trim(),
        expenseDate,
        amount: Math.round(parsed * 100) / 100,
        paymentMethod,
        categoryCode: code,
        categoryType: categoryTypeFor(code, expense.categoryType),
      });
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update this expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer
      open={expense != null}
      onOpenChange={onOpenChange}
      title="Edit expense"
      description="This updates the books. Net profit uses the new amount and date."
    >
      <FormDrawerFields legend="Expense">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            className={dashboardInputClass()}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Date</span>
          <input
            type="date"
            className={dashboardInputClass()}
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Amount</span>
          <input
            inputMode="decimal"
            className={dashboardInputClass()}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Category</span>
          <select
            className={dashboardSelectClass()}
            value={categoryCode}
            onChange={(e) =>
              setCategoryCode(e.target.value as ExpenseCategoryCode)
            }
          >
            {EXPENSE_CATEGORY_CODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Paid with</span>
          <select
            className={dashboardSelectClass()}
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as ExpensePaymentMethod)
            }
          >
            {EXPENSE_PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
      </FormDrawerFields>
    </FormDrawer>
  );
}

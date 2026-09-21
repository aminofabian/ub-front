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
  getCloudinarySignature,
  postFinanceExpense,
  uploadToCloudinary,
} from "@/lib/api";
import {
  EXPENSE_CATEGORY_CODE_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  FIXED_COST_PRESETS,
  type ExpenseCategoryCode,
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
  const [categoryCode, setCategoryCode] = useState<ExpenseCategoryCode | "">("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [vendorMpesaNumber, setVendorMpesaNumber] = useState("");
  const [includeInCashDrawer, setIncludeInCashDrawer] = useState(true);
  const [branchId, setBranchId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setCategoryType("variable");
      setCategoryCode("");
      setAmount("");
      setPaymentMethod("cash");
      setVendorMpesaNumber("");
      setIncludeInCashDrawer(true);
      setBranchId("");
      setReceiptFile(null);
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
      let receiptS3Key: string | null = null;
      if (receiptFile) {
        const sig = await getCloudinarySignature("expenses");
        const uploaded = await uploadToCloudinary(receiptFile, sig);
        receiptS3Key = uploaded.public_id || uploaded.secure_url;
      }
      await postFinanceExpense({
        expenseDate: expenseDate.slice(0, 10),
        name: name.trim(),
        categoryType,
        amount: parsed,
        paymentMethod,
        includeInCashDrawer,
        branchId: branchId.trim() || null,
        categoryCode: categoryCode || null,
        receiptS3Key,
        source: "manual",
        vendorMpesaNumber:
          paymentMethod === "mpesa_manual"
            ? vendorMpesaNumber.trim() || null
            : null,
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
              setCategoryCode(preset.categoryCode);
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
          <span className="font-medium">Category code</span>
          <select
            className={dashboardSelectClass(false)}
            value={categoryCode}
            onChange={(e) =>
              setCategoryCode(e.target.value as ExpenseCategoryCode | "")
            }
          >
            <option value="">Unspecified</option>
            {EXPENSE_CATEGORY_CODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Fixed / variable</span>
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

        {paymentMethod === "mpesa_manual" ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium">Vendor M-Pesa (optional)</span>
            <input
              className={dashboardInputClass(false)}
              value={vendorMpesaNumber}
              onChange={(e) => setVendorMpesaNumber(e.target.value)}
              placeholder="07… or 2547… for Send Money later"
            />
            <span className="block text-xs text-muted-foreground">
              Leave blank if already paid outside the app. With a number, the
              hub can Send Money after posting.
            </span>
          </label>
        ) : null}

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

        <label className="space-y-1 text-sm">
          <span className="font-medium">Receipt (optional)</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className={dashboardInputClass(false)}
            onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInCashDrawer}
            onChange={(e) => setIncludeInCashDrawer(e.target.checked)}
          />
          Reduce till expected cash
        </label>
      </FormDrawerFields>

      <div className="flex justify-end gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pt-4">
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Loader2, Wallet } from "lucide-react";

import {
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createStaffAdvance } from "@/lib/api";
import {
  type AdvanceRepaymentMode,
  formatPayrollMoney,
  parseRepaymentMoneyInput,
  parseRepaymentPercentInput,
} from "@/lib/payroll-utils";
import { AdvanceRepaymentArrangement } from "./advance-repayment-arrangement";

type Mode = "new" | "past";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  staffName: string;
  outstandingTotal?: number;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

export function LogAdvanceDrawer({
  open,
  onOpenChange,
  userId,
  staffName,
  outstandingTotal = 0,
  saving,
  onSavingChange,
  onSaved,
  onError,
}: Props) {
  const [mode, setMode] = useState<Mode>("new");
  const [amount, setAmount] = useState("");
  const [amountRepaid, setAmountRepaid] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [repaymentMode, setRepaymentMode] = useState<AdvanceRepaymentMode>("full_balance");
  const [repaymentValue, setRepaymentValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("new");
    setAmount("");
    setAmountRepaid("");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setRepaymentMode("full_balance");
    setRepaymentValue("");
  }, [open, userId]);

  const parsedAmount = Number(amount);
  const parsedRepaid = Number(amountRepaid) || 0;
  const balancePreview = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
    const repaid = mode === "past" ? Math.min(parsedRepaid, parsedAmount) : 0;
    return Math.max(0, parsedAmount - repaid);
  }, [mode, parsedAmount, parsedRepaid]);

  const save = async () => {
    if (!userId) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      onError("Enter a valid advance amount.");
      return;
    }
    if (mode === "past" && parsedRepaid < 0) {
      onError("Amount already repaid cannot be negative.");
      return;
    }
    if (mode === "past" && parsedRepaid > parsedAmount) {
      onError("Amount repaid cannot exceed the original advance.");
      return;
    }
    const parsedRepaymentValue =
      repaymentMode === "percent_of_original"
        ? Number(parseRepaymentPercentInput(repaymentValue)) || 0
        : repaymentMode === "fixed_per_pay"
          ? Number(parseRepaymentMoneyInput(repaymentValue)) || 0
          : 0;
    if (repaymentMode === "percent_of_original") {
      if (parsedRepaymentValue <= 0 || parsedRepaymentValue > 100) {
        onError("Enter a repayment percentage between 1 and 100.");
        return;
      }
    }
    if (repaymentMode === "fixed_per_pay" && parsedRepaymentValue <= 0) {
      onError("Enter a fixed repayment amount per pay.");
      return;
    }
    onSavingChange(true);
    try {
      await createStaffAdvance(userId, {
        amount: parsedAmount,
        advancedOn: date,
        note: note.trim() || undefined,
        amountRepaid: mode === "past" && parsedRepaid > 0 ? parsedRepaid : undefined,
        repaymentMode,
        repaymentValue:
          repaymentMode === "percent_of_original" || repaymentMode === "fixed_per_pay"
            ? parsedRepaymentValue
            : undefined,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to log advance");
    } finally {
      onSavingChange(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Salary advance"
      description={staffName}
      contextLabel="Payroll"
      icon={<Wallet className="size-5 text-primary" aria-hidden />}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || !userId} onClick={() => void save()}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save advance"
            )}
          </Button>
        </div>
      }
    >
      {outstandingTotal > 0 ? (
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          Outstanding balance:{" "}
          <span className="font-semibold tabular-nums">
            {formatPayrollMoney(outstandingTotal)}
          </span>
        </p>
      ) : null}

      <div className="mb-4 flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
        <ModeTab
          active={mode === "new"}
          icon={<Wallet className="size-3.5" aria-hidden />}
          label="New advance"
          hint="Given today or this month"
          onClick={() => setMode("new")}
        />
        <ModeTab
          active={mode === "past"}
          icon={<History className="size-3.5" aria-hidden />}
          label="Past advance"
          hint="Already given — record balance"
          onClick={() => setMode("past")}
        />
      </div>

      <FormDrawerFields
        legend={mode === "new" ? "New advance" : "Historical advance"}
        hint={
          mode === "past"
            ? "Use this when staff already had an advance before Palmart — enter how much was originally given and what has been repaid so far."
            : "Choose how repayments are deducted on each pay run."
        }
      >
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Original amount (KES)
          <input
            type="number"
            min="0"
            step="0.01"
            className={dashboardInputClass()}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </label>

        {mode === "past" ? (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Already repaid (KES)
            <input
              type="number"
              min="0"
              step="0.01"
              className={dashboardInputClass()}
              value={amountRepaid}
              onChange={(e) => setAmountRepaid(e.target.value)}
              placeholder="0 if nothing repaid yet"
            />
          </label>
        ) : null}

        {balancePreview != null ? (
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Balance after save: </span>
            <span className="font-semibold tabular-nums">
              {formatPayrollMoney(balancePreview)}
            </span>
          </div>
        ) : null}

        <AdvanceRepaymentArrangement
          mode={repaymentMode}
          value={repaymentValue}
          onModeChange={setRepaymentMode}
          onValueChange={setRepaymentValue}
          originalAmount={parsedAmount > 0 ? parsedAmount : null}
          balanceOutstanding={balancePreview}
        />

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Date given
          <input
            type="date"
            className={dashboardInputClass()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Note
          <input
            className={dashboardInputClass()}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              mode === "past"
                ? "e.g. Carried from paper ledger"
                : "e.g. Emergency medical"
            }
          />
        </label>
      </FormDrawerFields>
    </FormDrawer>
  );
}

function ModeTab({
  active,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex flex-1 flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
        {icon}
        {label}
      </span>
      <span className="text-[10px] leading-tight opacity-80">{hint}</span>
    </button>
  );
}

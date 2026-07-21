"use client";

import { useEffect, useState } from "react";
import { Banknote, Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import {
  recordTabPayment,
  type OutstandingTabRowRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function fmtKes(n: number): string {
  return n.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

type MarkPaidDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: OutstandingTabRowRecord | null;
  onPaid: (customerId: string, balanceOwed: number) => void;
};

export function MarkPaidDialog({
  open,
  onOpenChange,
  customer,
  onPaid,
}: MarkPaidDialogProps) {
  const owed = toNum(customer?.balanceOwed);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amountStr, setAmountStr] = useState("");
  const [channel, setChannel] = useState<"cash" | "mpesa">("cash");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !customer) return;
    setMode("full");
    setAmountStr(owed > 0 ? owed.toFixed(2) : "");
    setChannel("cash");
    setReference("");
    setError(null);
    setSubmitting(false);
  }, [open, customer, owed]);

  useEffect(() => {
    if (mode === "full" && owed > 0) {
      setAmountStr(owed.toFixed(2));
    }
  }, [mode, owed]);

  const submit = async () => {
    if (!customer) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (amount > owed + 0.001) {
      setError(`Amount cannot exceed ${fmtKes(owed)}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await recordTabPayment({
        customerId: customer.customerId,
        amount,
        channel,
        reference: reference.trim() || null,
      });
      onPaid(customer.customerId, toNum(result.balanceOwed));
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle className="text-base">
            Mark paid — {customer?.name?.trim() || "Customer"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Record cash or M-Pesa toward this tab. Clears the balance
            immediately (partial or full).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl bg-muted/40 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Owed now
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {fmtKes(owed)}
            </p>
            {customer?.primaryPhone?.trim() ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {customer.primaryPhone}
              </p>
            ) : null}
          </div>

          <div
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1"
            role="group"
            aria-label="Payment amount"
          >
            <button
              type="button"
              onClick={() => setMode("full")}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                mode === "full"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Pay in full
            </button>
            <button
              type="button"
              onClick={() => setMode("partial")}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                mode === "partial"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Partial
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">Amount</span>
            <input
              className={dashboardInputClass()}
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              disabled={mode === "full" || submitting}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              aria-label="Payment amount"
            />
          </label>

          <div
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1"
            role="group"
            aria-label="Payment channel"
          >
            <button
              type="button"
              onClick={() => setChannel("cash")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                channel === "cash"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Banknote className="size-3.5" aria-hidden />
              Cash
            </button>
            <button
              type="button"
              onClick={() => setChannel("mpesa")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                channel === "mpesa"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Smartphone className="size-3.5" aria-hidden />
              M-Pesa
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">
              Reference{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </span>
            <input
              className={dashboardInputClass()}
              placeholder={
                channel === "mpesa" ? "M-Pesa code" : "Receipt / note"
              }
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={submitting}
            />
          </label>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting || owed <= 0}
            onClick={() => void submit()}
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            {mode === "full" ? "Clear full balance" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

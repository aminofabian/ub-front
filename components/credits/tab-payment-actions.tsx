"use client";

import { useEffect, useState } from "react";
import { Banknote, Loader2, Pencil, RotateCcw, Smartphone } from "lucide-react";

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
import { amendTabPayment, reverseTabPayment } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

type TabPaymentActionsProps = {
  customerId: string;
  /** Credit amount of the most recent payment line (what will be reversed). */
  paymentAmount: number | string;
  /** Statement timestamp of the most recent payment line. */
  paymentAt: string;
  onChanged: () => void;
  onFeedback: (kind: "success" | "error", text: string) => void;
};

/**
 * Reverse / edit the most recent tab payment on a customer's account.
 * Renders action buttons that open a confirm dialog (reverse) or a corrected
 * payment form (edit) and refresh the statement on success.
 */
export function TabPaymentActions({
  customerId,
  paymentAmount,
  paymentAt,
  onChanged,
  onFeedback,
}: TabPaymentActionsProps) {
  const { formatMoneyCompact: fmtMoney } = useFormatMoney();
  const paid = toNum(paymentAmount);

  const [reverseOpen, setReverseOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [channel, setChannel] = useState<"cash" | "mpesa">("cash");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editOpen) return;
    setAmountStr(paid > 0 ? paid.toFixed(2) : "");
    setChannel("cash");
    setReference("");
    setError(null);
    setSubmitting(false);
  }, [editOpen, paid]);

  const runReverse = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await reverseTabPayment(customerId);
      setReverseOpen(false);
      onFeedback("success", "Payment reversed — the tab balance was restored.");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reverse the payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const runAmend = async () => {
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await amendTabPayment({
        customerId,
        amount,
        channel,
        reference: reference.trim() || null,
      });
      setEditOpen(false);
      onFeedback("success", "Payment corrected — the tab balance was updated.");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="text-muted-foreground"
          disabled={submitting}
          onClick={() => {
            setError(null);
            setReverseOpen(true);
          }}
        >
          <RotateCcw aria-hidden />
          Reverse
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="text-muted-foreground"
          disabled={submitting}
          onClick={() => {
            setError(null);
            setEditOpen(true);
          }}
        >
          <Pencil aria-hidden />
          Edit
        </Button>
      </div>

      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle className="text-base">Reverse this payment?</DialogTitle>
            <DialogDescription className="text-xs">
              Reverses the most recent payment of {fmtMoney(paid)} (
              {fmtWhen(paymentAt) || "recent"}). The tab balance is restored and a
              reversal line appears in the statement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
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
              onClick={() => setReverseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={submitting || paid <= 0}
              onClick={() => void runReverse()}
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Reverse payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle className="text-base">Edit tab payment</DialogTitle>
            <DialogDescription className="text-xs">
              Reverses the most recent payment of {fmtMoney(paid)} and records the
              corrected amount instead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">Amount</span>
              <input
                className={cn(dashboardInputClass(), "rounded-none")}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                disabled={submitting}
                aria-label="Corrected payment amount"
              />
            </label>

            <div
              className="grid grid-cols-2 gap-1 bg-muted/50 p-1"
              role="group"
              aria-label="Payment channel"
            >
              <button
                type="button"
                onClick={() => setChannel("cash")}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold transition-colors",
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
                  "inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold transition-colors",
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
                className={cn(dashboardInputClass(), "rounded-none")}
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
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => void runAmend()}
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Save corrected payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

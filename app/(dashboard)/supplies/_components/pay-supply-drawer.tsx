"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchSupplyPaymentHistory,
  postSupplierPayment,
  type PathBSupplyListRowRecord,
  type SupplyPaymentHistoryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function defaultLocalDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoInstant(localDateTime: string): string {
  const d = new Date(localDateTime);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid paid-at date/time");
  }
  return d.toISOString();
}

function n(v: number | string | null | undefined): number {
  if (v == null || v === "") {
    return 0;
  }
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function formatMoney(v: number): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type PaySupplyDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PathBSupplyListRowRecord | null;
  onPaid: () => void;
};

export function PaySupplyDrawer({ open, onOpenChange, row, onPaid }: PaySupplyDrawerProps) {
  const { me } = useDashboard();
  const canPay = hasPermission(me?.permissions, Permission.PurchasingPaymentWrite);
  const canHistory = hasPermission(me?.permissions, Permission.PurchasingPaymentRead);

  const [history, setHistory] = useState<SupplyPaymentHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [allocation, setAllocation] = useState("");
  const [paidAtLocal, setPaidAtLocal] = useState(defaultLocalDateTime);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [creditApplied, setCreditApplied] = useState("0");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balanceOpen = row ? n(row.balanceOpen) : 0;

  useEffect(() => {
     
    if (!open || !row || !canHistory) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    void fetchSupplyPaymentHistory(row.supplierInvoiceId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
     
  }, [open, row, canHistory]);

  useEffect(() => {
    if (!open || !row) {
      return;
    }
     
    const b = n(row.balanceOpen);
    const init = b > 0 ? b.toFixed(2) : "";
    setAllocation(init);
    setPaymentAmount(init);
    setCreditApplied("0");
    setReference("");
    setNotes("");
    setPaidAtLocal(defaultLocalDateTime());
    setError(null);
     
  }, [open, row]);

  const onSubmit = async () => {
    if (!row || !canPay) {
      return;
    }
    setError(null);
    const allocN = Number(allocation.trim());
    if (!Number.isFinite(allocN) || allocN <= 0) {
      setError("Enter a positive amount to apply to this supply.");
      return;
    }
    if (allocN > balanceOpen + 0.001) {
      setError(`Allocation cannot exceed open balance (${formatMoney(balanceOpen)}).`);
      return;
    }
    const cash = Number(paymentAmount);
    const credit = Number(creditApplied);
    if (!Number.isFinite(cash) || cash < 0 || !Number.isFinite(credit) || credit < 0) {
      setError("Payment and supplier credit must be valid non-negative numbers.");
      return;
    }
    let paidAt: string;
    try {
      paidAt = toIsoInstant(paidAtLocal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid date");
      return;
    }
    if (cash + credit < allocN - 0.001) {
      setError("Cash payment plus supplier credit must cover the allocation to this invoice.");
      return;
    }
    setBusy(true);
    try {
      await postSupplierPayment({
        supplierId: row.supplierId,
        paidAt,
        paymentMethod,
        paymentAmount: cash,
        creditApplied: credit,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: [{ supplierInvoiceId: row.supplierInvoiceId, amount: allocN }],
      });
      onPaid();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  const paidFull = row ? row.paymentStatus === "PAID" : false;

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Pay · ${row.invoiceNumber}` : "Pay supply"}
      description="Record cash or bank/M-Pesa against this receipt. Repeat for installments; balances update from allocations."
      width="wide"
      icon={<CreditCard className="size-5 text-primary" aria-hidden />}
      banner={error ? <FormDrawerMessageBanner text={error} /> : undefined}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={busy || !row || !canPay || paidFull || balanceOpen <= 0}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Record payment
          </Button>
        </div>
      }
    >
      {!row ? null : (
        <div className="space-y-5 px-1 pb-4">

          <div className="grid gap-3 rounded-xl border bg-muted/15 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Supplier</p>
              <p className="text-sm font-semibold">{row.supplierName}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Invoice total</p>
              <p className="font-mono text-sm tabular-nums">{formatMoney(n(row.grandTotal))}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Open balance</p>
              <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{formatMoney(balanceOpen)}</p>
            </div>
          </div>

          {paidFull ? (
            <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
              This supply is fully paid. Payment history is below.
            </p>
          ) : !canPay ? (
            <p className="text-sm text-muted-foreground">
              You need <code className="text-xs">{Permission.PurchasingPaymentWrite}</code> to post payments.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={dashboardLabelClass()}>Apply to this supply (allocation)</span>
                <input
                  className={dashboardInputClass(busy)}
                  value={allocation}
                  onChange={(e) => setAllocation(e.target.value)}
                  disabled={busy}
                  inputMode="decimal"
                />
                <span className={dashboardHintClass()}>
                  Use the full balance for one-shot payment, or less for a partial. You can pay the remainder later.
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>Paid at</span>
                <input
                  type="datetime-local"
                  className={dashboardInputClass(busy)}
                  value={paidAtLocal}
                  onChange={(e) => setPaidAtLocal(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>Method</span>
                <select
                  className={dashboardSelectClass(busy)}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={busy}
                >
                  <option value="cash">cash</option>
                  <option value="bank">bank</option>
                  <option value="mpesa">mpesa</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>Cash / transfer amount</span>
                <input
                  className={dashboardInputClass(busy)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={busy}
                  inputMode="decimal"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>Supplier credit applied</span>
                <input
                  className={dashboardInputClass(busy)}
                  value={creditApplied}
                  onChange={(e) => setCreditApplied(e.target.value)}
                  disabled={busy}
                  inputMode="decimal"
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={dashboardLabelClass()}>Reference # (optional)</span>
                <input className={dashboardInputClass(busy)} value={reference} onChange={(e) => setReference(e.target.value)} disabled={busy} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={dashboardLabelClass()}>Notes (optional)</span>
                <textarea className={dashboardTextareaClass(busy)} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} />
              </label>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-foreground">Payment history</h4>
            {!canHistory ? (
              <p className={cn(dashboardHintClass(), "mt-1")}>Requires {Permission.PurchasingPaymentRead}.</p>
            ) : historyLoading ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : history.length === 0 ? (
              <p className={cn(dashboardHintClass(), "mt-1")}>No payments recorded yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/80 text-[10px] font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">When</th>
                      <th className="px-2 py-1.5">Method</th>
                      <th className="px-2 py-1.5 text-right">Applied</th>
                      <th className="px-2 py-1.5">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.allocationId} className="border-t">
                        <td className="px-2 py-1.5 text-muted-foreground">{new Date(h.paidAt).toLocaleString()}</td>
                        <td className="px-2 py-1.5 font-mono">{h.paymentMethod}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatMoney(n(h.amountAppliedToInvoice))}</td>
                        <td className="max-w-[220px] truncate px-2 py-1.5">{h.reference ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </FormDrawer>
  );
}

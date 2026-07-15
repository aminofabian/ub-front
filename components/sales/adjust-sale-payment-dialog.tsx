"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dashboardInputClass, dashboardSelectClass } from "@/components/dashboard-page-ui";
import {
  adjustSalePayments,
  fetchSale,
  type SalePaymentMethod,
  type SaleRecord,
} from "@/lib/api";
import { formatPaymentMethodLabel } from "@/lib/sale-payment-filter";
import { cn } from "@/lib/utils";

const ADJUSTABLE_METHODS: {
  id: SalePaymentMethod;
  label: string;
}[] = [
  { id: "cash", label: "Cash" },
  { id: "mpesa_manual", label: "M-Pesa" },
  { id: "card", label: "Card" },
  { id: "customer_credit", label: "Customer credit" },
];

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function fmtKes(n: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function isRestricted(method: string): boolean {
  return method === "customer_wallet" || method === "loyalty_redeem";
}

type DraftPayment = {
  method: SalePaymentMethod;
  amount: string;
  reference: string;
};

type Props = {
  open: boolean;
  saleId: string | null;
  receiptLabel?: string;
  onOpenChange: (open: boolean) => void;
  onAdjusted: () => void;
};

export function AdjustSalePaymentDialog({
  open,
  saleId,
  receiptLabel,
  onOpenChange,
  onAdjusted,
}: Props) {
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [drafts, setDrafts] = useState<DraftPayment[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !saleId) {
      setSale(null);
      setDrafts([]);
      setReason("");
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchSale(saleId)
      .then((record) => {
        if (cancelled) return;
        setSale(record);
        setDrafts(
          record.payments.map((p) => ({
            method: (p.method === "mpesa" ? "mpesa_manual" : p.method) as SalePaymentMethod,
            amount: String(toNum(p.amount)),
            reference: p.reference ?? "",
          })),
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load sale.");
        setSale(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, saleId]);

  const grandTotal = toNum(sale?.grandTotal);
  const draftTotal = useMemo(
    () => drafts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    [drafts],
  );
  const hasRestricted = sale?.payments.some((p) => isRestricted(p.method)) ?? false;
  const canSave =
    !!sale &&
    !hasRestricted &&
    sale.status === "completed" &&
    toNum(sale.refundedTotal) === 0 &&
    drafts.length > 0 &&
    Math.abs(draftTotal - grandTotal) < 0.01 &&
    !saving;

  const onSave = async () => {
    if (!saleId || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payments =
        drafts.length === 1
          ? [
              {
                method: drafts[0]!.method,
                amount: grandTotal,
                reference:
                  drafts[0]!.method === "customer_credit"
                    ? null
                    : drafts[0]!.reference.trim() || null,
              },
            ]
          : drafts.map((d) => ({
              method: d.method,
              amount: Number(d.amount),
              reference:
                d.method === "customer_credit"
                  ? null
                  : d.reference.trim() || null,
            }));
      await adjustSalePayments(saleId, {
        payments,
        reason: reason.trim() || null,
      });
      onOpenChange(false);
      onAdjusted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to adjust payment.");
    } finally {
      setSaving(false);
    }
  };

  const titleId = receiptLabel ? `#${receiptLabel}` : saleId ? saleId.slice(-8).toUpperCase() : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1.5 border-b border-border/50 px-6 py-5">
          <DialogTitle className="text-lg tracking-tight">
            Adjust payment
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Correct tender for sale {titleId}. Ledger updates automatically;
            drawer cash updates if the shift is still open.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading sale…</p>
        ) : error && !sale ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : sale ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Sale total
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {fmtKes(grandTotal)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recorded as{" "}
                {sale.payments
                  .map(
                    (p) =>
                      `${formatPaymentMethodLabel(p.method)} ${fmtKes(toNum(p.amount))}`,
                  )
                  .join(" · ")}
              </p>
            </div>

            {hasRestricted ? (
              <p className="text-sm text-destructive">
                This sale uses wallet or loyalty tender. Void and re-sell instead
                of adjusting.
              </p>
            ) : null}

            <div className="space-y-3">
              {drafts.map((draft, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-xl border border-border/60 p-3.5"
                >
                  <label className="block text-xs font-medium text-muted-foreground">
                    Payment method
                    <select
                      className={cn(dashboardSelectClass(), "mt-1.5")}
                      value={draft.method}
                      disabled={hasRestricted}
                      onChange={(e) => {
                        const method = e.target.value as SalePaymentMethod;
                        setDrafts((rows) =>
                          rows.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  method,
                                  reference:
                                    method === "customer_credit"
                                      ? ""
                                      : row.reference,
                                }
                              : row,
                          ),
                        );
                      }}
                    >
                      {ADJUSTABLE_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {drafts.length > 1 ? (
                    <label className="block text-xs font-medium text-muted-foreground">
                      Amount (KES)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={cn(dashboardInputClass(), "mt-1.5")}
                        value={draft.amount}
                        disabled={hasRestricted}
                        onChange={(e) => {
                          const amount = e.target.value;
                          setDrafts((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, amount } : row,
                            ),
                          );
                        }}
                      />
                    </label>
                  ) : null}

                  {draft.method === "mpesa_manual" || draft.method === "card" ? (
                    <label className="block text-xs font-medium text-muted-foreground">
                      Reference (optional)
                      <input
                        type="text"
                        className={cn(dashboardInputClass(), "mt-1.5")}
                        value={draft.reference}
                        placeholder="M-Pesa code / slip no."
                        disabled={hasRestricted}
                        onChange={(e) => {
                          const reference = e.target.value;
                          setDrafts((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, reference } : row,
                            ),
                          );
                        }}
                      />
                    </label>
                  ) : null}
                </div>
              ))}
            </div>

            {wantsCreditWithoutCustomer(drafts, sale) ? (
              <p className="text-xs text-muted-foreground">
                Credit requires a customer already linked to this sale.
              </p>
            ) : null}

            {Math.abs(draftTotal - grandTotal) >= 0.01 ? (
              <p className="text-xs text-destructive">
                Payment total {fmtKes(draftTotal)} must equal sale total{" "}
                {fmtKes(grandTotal)}.
              </p>
            ) : null}

            <label className="block text-xs font-medium text-muted-foreground">
              Reason (optional)
              <input
                type="text"
                className={cn(dashboardInputClass(), "mt-1.5")}
                value={reason}
                placeholder="e.g. Cashier recorded M-Pesa as cash"
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border/50 px-6 py-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#B08D48] text-white hover:bg-[#9A7A3F]"
            onClick={() => void onSave()}
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function wantsCreditWithoutCustomer(
  drafts: DraftPayment[],
  sale: SaleRecord,
): boolean {
  return drafts.some((d) => d.method === "customer_credit") && !sale.customerId;
}

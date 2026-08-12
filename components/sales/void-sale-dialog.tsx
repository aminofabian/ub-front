"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { fetchSale, postVoidSale, type SaleRecord } from "@/lib/api";
import { formatPaymentMethodLabel } from "@/lib/sale-payment-filter";
import { cn } from "@/lib/utils";

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

type Props = {
  open: boolean;
  saleId: string | null;
  receiptLabel?: string;
  onOpenChange: (open: boolean) => void;
  onVoided: () => void;
};

export function VoidSaleDialog({
  open,
  saleId,
  receiptLabel,
  onOpenChange,
  onVoided,
}: Props) {
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !saleId) {
      setSale(null);
      setNotes("");
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

  const alreadyVoided =
    sale?.status === "voided" ||
    (sale?.voidedAt != null && String(sale.voidedAt).length > 0);
  const hasRefunds = toNum(sale?.refundedTotal) > 0;
  const canVoid =
    !!sale &&
    sale.status === "completed" &&
    !alreadyVoided &&
    !hasRefunds &&
    !saving;

  const onVoid = async () => {
    if (!saleId || !canVoid) return;
    setSaving(true);
    setError(null);
    try {
      await postVoidSale(saleId, { notes: notes.trim() || null });
      toast.success(
        receiptLabel ? `Sale #${receiptLabel} voided` : "Sale voided",
        {
          description: "Stock restored and payments reversed.",
        },
      );
      onOpenChange(false);
      onVoided();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to void sale.");
    } finally {
      setSaving(false);
    }
  };

  const titleId = receiptLabel
    ? `#${receiptLabel}`
    : saleId
      ? saleId.slice(-8).toUpperCase()
      : "";
  const paymentSummary =
    sale?.payments
      .map((p) => formatPaymentMethodLabel(p.method))
      .filter(Boolean)
      .join(" + ") ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1.5 border-b border-border/50 px-6 py-5">
          <DialogTitle className="text-lg tracking-tight">Void sale</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Reverse sale {titleId}. Restores stock and reverses payments,
            credit, wallet, and loyalty. Only while the sale&apos;s shift is
            still open.
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
                  {fmtKes(toNum(sale.grandTotal))}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[
                    sale.items.length === 1
                      ? "1 item"
                      : `${sale.items.length} items`,
                    paymentSummary || null,
                    sale.soldByName?.trim() || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {alreadyVoided ? (
                <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  This sale is already voided.
                </p>
              ) : hasRefunds ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Cannot void a sale that has refunds.
                </p>
              ) : sale.status !== "completed" ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Only completed sales can be voided.
                </p>
              ) : (
                <div className="space-y-2">
                  <label
                    htmlFor="void-sale-notes"
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Notes (optional)
                  </label>
                  <input
                    id="void-sale-notes"
                    className={cn(dashboardInputClass(), "h-9")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for void"
                    disabled={saving}
                    maxLength={500}
                  />
                </div>
              )}

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
            variant="destructive"
            disabled={!canVoid}
            onClick={() => void onVoid()}
          >
            {saving ? "Voiding…" : "Void sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

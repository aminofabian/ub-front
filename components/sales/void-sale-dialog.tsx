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
import {
  requestToolGuard,
  type ToolGuardClientResult,
} from "@/lib/jev-gate";
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
  const [checkingGuard, setCheckingGuard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jevGuard, setJevGuard] = useState<ToolGuardClientResult | null>(null);
  const [humanConfirmed, setHumanConfirmed] = useState(false);

  useEffect(() => {
    if (!open || !saleId) {
      setSale(null);
      setNotes("");
      setError(null);
      setJevGuard(null);
      setHumanConfirmed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setJevGuard(null);
    setHumanConfirmed(false);
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
  const jevBlocks = jevGuard?.gate === "block";
  const jevNeedsConfirm = jevGuard?.gate === "require_confirmation";

  const executeVoid = async () => {
    if (!saleId) return;
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

  const onVoid = async () => {
    if (!saleId || !sale) return;
    if (alreadyVoided || hasRefunds || sale.status !== "completed") return;

    // Second click after Jev asked for confirmation.
    if (jevNeedsConfirm && humanConfirmed) {
      await executeVoid();
      return;
    }

    setCheckingGuard(true);
    setError(null);
    try {
      const total = fmtKes(toNum(sale.grandTotal));
      const label = receiptLabel?.trim() || saleId.slice(-8).toUpperCase();
      const guard = await requestToolGuard({
        tool: "void_sale",
        action: `Void completed sale ${label} totaling ${total}`,
        arguments_summary: [
          `sale_id=${saleId}`,
          `grand_total=${total}`,
          `item_count=${sale.items.length}`,
          notes.trim() ? `notes=${notes.trim().slice(0, 120)}` : "notes=(none)",
        ],
        side_effects: [
          "Restores stock quantities",
          "Reverses payments, credit, wallet, and loyalty",
          "Changes sale status to voided",
        ],
        safeguards: [
          "Only completed sales can be voided",
          "Blocked if the sale already has refunds",
          "Requires an open shift for the sale",
        ],
        policy: [
          "Void is irreversible from the cashier UI once submitted",
          "Jev decisions are advisory signals; human confirmation is required when Jev returns confirm or review",
        ],
        reversibility: "partially_reversible",
      });
      setJevGuard(guard);

      if (guard.gate === "block") {
        setError(
          guard.guidance?.trim() ||
            "Jev recommended denying this void. It was not submitted.",
        );
        return;
      }

      if (guard.gate === "require_confirmation") {
        setHumanConfirmed(false);
        return;
      }

      // proceed or skipped (no key) — existing dialog is already a confirmation.
      await executeVoid();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check void guard.");
    } finally {
      setCheckingGuard(false);
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
        <DialogHeader className="space-y-1.5 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-6 py-5">
          <DialogTitle className="text-lg tracking-tight">
            Void sale
          </DialogTitle>
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
            <p className="rounded-none border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : sale ? (
            <div className="space-y-4">
              <div className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/30 px-4 py-3">
                <p className="text-[11px] font-medium tracking-[-0.02em] text-muted-foreground">
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
                <p className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  This sale is already voided.
                </p>
              ) : hasRefunds ? (
                <p className="rounded-none border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Cannot void a sale that has refunds.
                </p>
              ) : sale.status !== "completed" ? (
                <p className="rounded-none border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Only completed sales can be voided.
                </p>
              ) : (
                <div className="space-y-2">
                  <label
                    htmlFor="void-sale-notes"
                    className="text-[11px] font-medium tracking-[-0.02em] text-muted-foreground"
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

              {jevGuard && jevGuard.gate !== "skipped" ? (
                <div
                  className={cn(
                    "rounded-none border px-3 py-2 text-sm",
                    jevGuard.gate === "block"
                      ? "border-destructive/20 bg-destructive/5 text-destructive"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/20 text-foreground",
                  )}
                >
                  <p className="text-[11px] font-medium tracking-[-0.02em] text-muted-foreground">
                    Jev judgment
                    {jevGuard.decision ? ` · ${jevGuard.decision}` : ""}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {jevGuard.guidance?.trim() ||
                      (jevGuard.gate === "block"
                        ? "Denied — void was not submitted."
                        : "Confirm before voiding this sale.")}
                  </p>
                  {jevNeedsConfirm ? (
                    <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={humanConfirmed}
                        onChange={(e) => setHumanConfirmed(e.target.checked)}
                        disabled={saving || checkingGuard}
                      />
                      <span>
                        I reviewed this judgment and confirm voiding this sale.
                      </span>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <p className="rounded-none border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-6 py-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || checkingGuard}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={
              !sale ||
              sale.status !== "completed" ||
              alreadyVoided ||
              hasRefunds ||
              saving ||
              checkingGuard ||
              jevBlocks ||
              (jevNeedsConfirm && !humanConfirmed)
            }
            onClick={() => void onVoid()}
          >
            {checkingGuard
              ? "Checking…"
              : saving
                ? "Voiding…"
                : jevNeedsConfirm
                  ? "Confirm void"
                  : "Void sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

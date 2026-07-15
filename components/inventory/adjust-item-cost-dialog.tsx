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
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import {
  adjustItemCost,
  type CostIssueRowRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function toNum(n: number | string | null | undefined): number | null {
  if (n == null || n === "") return null;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

function fmtMoney(n: number | null, currency: string): string {
  if (n == null) return "—";
  try {
    return n.toLocaleString(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return n.toFixed(2);
  }
}

type Props = {
  open: boolean;
  row: CostIssueRowRecord | null;
  branchId?: string;
  branchLabel?: string;
  currency: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: CostIssueRowRecord) => void;
};

export function AdjustItemCostDialog({
  open,
  row,
  branchId,
  branchLabel,
  currency,
  onOpenChange,
  onSaved,
}: Props) {
  const [cost, setCost] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) {
      setCost("");
      setSellPrice("");
      setReason("");
      setError(null);
      setSaving(false);
      return;
    }
    const currentCost = toNum(row.effectiveCost);
    const currentSell = toNum(row.sellPrice);
    // Pre-fill cost only when it looks sane (leave blank for zero/missing so the user types it).
    setCost(currentCost && currentCost > 0 ? String(currentCost) : "");
    setSellPrice(currentSell && currentSell > 0 ? String(currentSell) : "");
    setReason("");
    setError(null);
  }, [open, row]);

  const parsedCost = toNum(cost);
  const parsedSell = toNum(sellPrice);

  const previewMargin = useMemo(() => {
    if (!parsedSell || parsedSell <= 0 || parsedCost == null) return null;
    return ((parsedSell - parsedCost) / parsedSell) * 100;
  }, [parsedCost, parsedSell]);

  const canSave =
    !!row && parsedCost != null && parsedCost > 0 && !saving;

  const onSave = async () => {
    if (!row || !canSave || parsedCost == null) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await adjustItemCost(row.itemId, {
        unitCost: parsedCost,
        sellPrice: parsedSell != null && parsedSell > 0 ? parsedSell : null,
        branchId: branchId?.trim() || null,
        reason: reason.trim() || null,
      });
      onOpenChange(false);
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to adjust cost.");
    } finally {
      setSaving(false);
    }
  };

  const currentCost = toNum(row?.effectiveCost);
  const currentSell = toNum(row?.sellPrice);
  const activeBatches = row?.activeBatchCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1.5 border-b border-border/50 px-6 py-5">
          <DialogTitle className="text-lg tracking-tight">
            Adjust cost
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {row ? row.name : ""}
            {branchLabel ? ` · ${branchLabel}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {row ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Current cost
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-foreground">
                    {fmtMoney(currentCost, currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Sell price
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-foreground">
                    {fmtMoney(currentSell, currency)}
                  </p>
                </div>
              </div>

              <label className="block text-xs font-medium text-muted-foreground">
                New unit cost ({currency})
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  autoFocus
                  className={cn(dashboardInputClass(), "mt-1.5")}
                  value={cost}
                  placeholder="e.g. 45.00"
                  onChange={(e) => setCost(e.target.value)}
                />
              </label>

              <label className="block text-xs font-medium text-muted-foreground">
                Sell price ({currency}){" "}
                <span className="font-normal text-muted-foreground/70">
                  · optional
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={cn(dashboardInputClass(), "mt-1.5")}
                  value={sellPrice}
                  placeholder="Leave blank to keep current"
                  onChange={(e) => setSellPrice(e.target.value)}
                />
              </label>

              {previewMargin != null ? (
                <p
                  className={cn(
                    "text-xs font-medium",
                    previewMargin < 0
                      ? "text-rose-600"
                      : previewMargin < 5
                        ? "text-amber-600"
                        : "text-emerald-600",
                  )}
                >
                  Resulting margin: {previewMargin.toFixed(1)}%
                </p>
              ) : null}

              <label className="block text-xs font-medium text-muted-foreground">
                Reason{" "}
                <span className="font-normal text-muted-foreground/70">
                  · optional
                </span>
                <input
                  type="text"
                  maxLength={500}
                  className={cn(dashboardInputClass(), "mt-1.5")}
                  value={reason}
                  placeholder="e.g. Pack price recorded as unit cost"
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>

              <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                Updates the reference cost and rewrites{" "}
                {activeBatches > 0 ? (
                  <>
                    <strong className="tabular-nums">{activeBatches}</strong>{" "}
                    active stock batch{activeBatches === 1 ? "" : "es"}
                    {branchLabel ? ` at ${branchLabel}` : ""}
                  </>
                ) : (
                  "the reference cost (no active stock batches)"
                )}
                . Past sales are not changed.
              </p>

              {error ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </>
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
            {saving ? "Saving…" : "Save cost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

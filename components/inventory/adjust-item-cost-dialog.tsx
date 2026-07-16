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
import {
  adjustItemCost,
  type CostIssueRowRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  supFieldLabel,
  supInput,
  supKvLabel,
  supKvTable,
  supKvValue,
} from "@/app/(dashboard)/suppliers/_components/supplier-ui-tokens";

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
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-none border border-border p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-border bg-[#e8eef5] px-4 py-3 dark:bg-muted/40">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Adjust cost
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {row ? row.name : ""}
            {branchLabel ? ` · ${branchLabel}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-4 py-4">
          {row ? (
            <>
              <table className={supKvTable}>
                <tbody>
                  <tr>
                    <th className={supKvLabel}>Current cost</th>
                    <td className={cn(supKvValue, "font-mono tabular-nums font-semibold")}>
                      {fmtMoney(currentCost, currency)}
                    </td>
                  </tr>
                  <tr>
                    <th className={supKvLabel}>Sell price</th>
                    <td className={cn(supKvValue, "font-mono tabular-nums font-semibold")}>
                      {fmtMoney(currentSell, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <label className="block">
                <span className={supFieldLabel}>New unit cost ({currency})</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  autoFocus
                  className={cn(supInput, "mt-1")}
                  value={cost}
                  placeholder="e.g. 45.00"
                  onChange={(e) => setCost(e.target.value)}
                />
              </label>

              <label className="block">
                <span className={supFieldLabel}>
                  Sell price ({currency}){" "}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                    optional
                  </span>
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={cn(supInput, "mt-1")}
                  value={sellPrice}
                  placeholder="Leave blank to keep current"
                  onChange={(e) => setSellPrice(e.target.value)}
                />
              </label>

              {previewMargin != null ? (
                <p
                  className={cn(
                    "border px-2 py-1.5 text-xs font-medium",
                    previewMargin < 0
                      ? "border-rose-600/30 bg-rose-500/10 text-rose-600"
                      : previewMargin < 5
                        ? "border-amber-600/30 bg-amber-500/10 text-amber-600"
                        : "border-emerald-600/30 bg-emerald-500/10 text-emerald-600",
                  )}
                >
                  Resulting margin: {previewMargin.toFixed(1)}%
                </p>
              ) : null}

              <label className="block">
                <span className={supFieldLabel}>
                  Reason{" "}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                    optional
                  </span>
                </span>
                <input
                  type="text"
                  maxLength={500}
                  className={cn(supInput, "mt-1")}
                  value={reason}
                  placeholder="e.g. Pack price recorded as unit cost"
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>

              <p className="border border-border bg-muted/15 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
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
                <p className="border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-[#eef2f7] px-4 py-3 sm:gap-2 dark:bg-muted/25">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-none bg-[#B08D48] text-white hover:bg-[#9A7A3F]"
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

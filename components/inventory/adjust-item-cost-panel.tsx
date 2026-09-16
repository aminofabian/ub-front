"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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

export type AdjustItemCostPanelProps = {
  row: CostIssueRowRecord | null;
  branchId?: string;
  branchLabel?: string;
  currency: string;
  canAdjust: boolean;
  onCancel?: () => void;
  onSaved: (updated: CostIssueRowRecord) => void;
  className?: string;
};

export function AdjustItemCostPanel({
  row,
  branchId,
  branchLabel,
  currency,
  canAdjust,
  onCancel,
  onSaved,
  className,
}: AdjustItemCostPanelProps) {
  const [cost, setCost] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) {
      setCost("");
      setSellPrice("");
      setReason("");
      setError(null);
      setSaving(false);
      return;
    }
    const currentCost = toNum(row.effectiveCost);
    const currentSell = toNum(row.sellPrice);
    setCost(currentCost && currentCost > 0 ? String(currentCost) : "");
    setSellPrice(currentSell && currentSell > 0 ? String(currentSell) : "");
    setReason("");
    setError(null);
  }, [row]);

  const parsedCost = toNum(cost);
  const parsedSell = toNum(sellPrice);

  const previewMargin = useMemo(() => {
    if (!parsedSell || parsedSell <= 0 || parsedCost == null) return null;
    return ((parsedSell - parsedCost) / parsedSell) * 100;
  }, [parsedCost, parsedSell]);

  const canSave =
    !!row && canAdjust && parsedCost != null && parsedCost > 0 && !saving;

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
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to adjust cost.");
    } finally {
      setSaving(false);
    }
  };

  if (!row) {
    return null;
  }

  const currentCost = toNum(row.effectiveCost);
  const currentSell = toNum(row.sellPrice);
  const activeBatches = row.activeBatchCount ?? 0;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
        <table className={supKvTable}>
          <tbody>
            <tr>
              <th className={supKvLabel}>Current cost</th>
              <td
                className={cn(
                  supKvValue,
                  "font-mono tabular-nums font-semibold",
                )}
              >
                {fmtMoney(currentCost, currency)}
              </td>
            </tr>
            <tr>
              <th className={supKvLabel}>Sell price</th>
              <td
                className={cn(
                  supKvValue,
                  "font-mono tabular-nums font-semibold",
                )}
              >
                {fmtMoney(currentSell, currency)}
              </td>
            </tr>
            <tr>
              <th className={supKvLabel}>Stock</th>
              <td className={cn(supKvValue, "font-mono tabular-nums")}>
                {toNum(row.activeQty)?.toLocaleString() ?? "—"}
              </td>
            </tr>
          </tbody>
        </table>

        {canAdjust ? (
          <>
            <label className="block">
              <span className={supFieldLabel}>New unit cost ({currency})</span>
              <input
                type="number"
                min={0}
                step="0.01"
                autoFocus={canAdjust}
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
        ) : (
          <p className="border border-border bg-muted/15 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
            You can review flagged costs here. Ask an administrator for{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
              pricing.cost_price.set
            </code>{" "}
            to adjust unit costs.
          </p>
        )}
      </div>

      {canAdjust ? (
        <div className="flex shrink-0 gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 py-3">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            className={cn(
              "rounded-none bg-[var(--pos-primary,#0f766e)] text-white hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_88%,#000)]",
              onCancel ? "flex-1" : "w-full",
            )}
            onClick={() => void onSave()}
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save cost"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

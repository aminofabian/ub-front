"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import {
  applyItemOnHandQty,
  itemStockQty,
} from "@/lib/apply-item-on-hand";
import type { ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type GroceryStockEditDialogProps = {
  open: boolean;
  item: ItemSummaryRecord | null;
  branchId: string;
  onClose: () => void;
  onSaved: (itemId: string, qty: number) => void;
};

export function GroceryStockEditDialog({
  open,
  item,
  branchId,
  onClose,
  onSaved,
}: GroceryStockEditDialogProps) {
  const current = item ? itemStockQty(item.stockQty) : 0;
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setQty(String(itemStockQty(item.stockQty)));
    setCost("");
    setError(null);
    setBusy(false);
  }, [open, item]);

  const target = Number(qty.trim());
  const increasing =
    Number.isFinite(target) && target > current + 0.0001;
  const blocked = item?.packageVariant === true;

  async function onSave() {
    if (!item || blocked) return;
    setError(null);
    const costRaw = cost.trim();
    const unitCost = costRaw === "" ? 0 : Number(costRaw);
    setBusy(true);
    try {
      const applied = await applyItemOnHandQty({
        branchId,
        itemId: item.id,
        current,
        target,
        unitCost: increasing ? unitCost : undefined,
      });
      onSaved(item.id, applied);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stock update failed.");
    } finally {
      setBusy(false);
    }
  }

  const title = item ? cashierItemPrimaryLabel(item) : "Edit stock";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        side="center"
        showCloseButton={!busy}
        className="max-w-[22rem] gap-3 rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] p-4"
      >
        <div>
          <DialogTitle className="text-[15px] font-semibold tracking-tight">
            Set on-hand
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-[12px] text-muted-foreground">
            {title}
          </DialogDescription>
        </div>

        {blocked ? (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Package variants hold stock on the parent product. Edit the base
            SKU instead.
          </p>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11px] tabular-nums text-muted-foreground">
              Now on hand:{" "}
              <span className="font-semibold text-foreground">{current}</span>
            </p>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                New quantity
              </span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={qty}
                disabled={busy}
                onChange={(e) => setQty(e.target.value)}
                className="mt-1 h-10 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-background px-2.5 text-[15px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/35"
              />
            </label>
            {increasing ? (
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Unit cost (optional)
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={cost}
                  disabled={busy}
                  placeholder="0"
                  onChange={(e) => setCost(e.target.value)}
                  className="mt-1 h-9 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-background px-2.5 text-[13px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/35"
                />
              </label>
            ) : null}
            {error ? (
              <p className="text-[12px] text-destructive">{error}</p>
            ) : null}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-10 flex-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-[12px] font-semibold"
          >
            Cancel
          </button>
          {!blocked ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSave()}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-1.5 bg-[var(--pos-primary,#0f766e)] text-[12px] font-semibold text-[var(--pos-primary-ink,#fff)]",
                "disabled:opacity-60",
              )}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Save
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

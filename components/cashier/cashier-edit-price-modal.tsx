"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Pencil } from "lucide-react";
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
import { postSellingPrice } from "@/lib/api";
import { cn } from "@/lib/utils";

function localYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type CashierEditPriceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  currency: string;
  label: string;
  currentPrice: string;
  itemId?: string | null;
  branchId?: string | null;
  online?: boolean;
  /** Admins (pricing.sell_price.set) may also write the shelf price. */
  canUpdateCatalog?: boolean;
  onSave: (unitPrice: string) => void;
  /** Called after a successful catalog shelf-price write. */
  onCatalogPriceSaved?: (itemId: string, price: number) => void;
};

export function CashierEditPriceModal({
  open,
  onOpenChange,
  brandTheme,
  currency,
  label,
  currentPrice,
  itemId,
  branchId,
  online = true,
  canUpdateCatalog = false,
  onSave,
  onCatalogPriceSaved,
}: CashierEditPriceModalProps) {
  const [unitPrice, setUnitPrice] = useState(currentPrice);
  const [persistCatalog, setPersistCatalog] = useState(true);
  const [busy, setBusy] = useState(false);

  const canPersist =
    canUpdateCatalog &&
    online &&
    Boolean(itemId?.trim()) &&
    Boolean(branchId?.trim());

  useEffect(() => {
    if (!open) return;
    setUnitPrice(currentPrice);
    setPersistCatalog(true);
    setBusy(false);
  }, [open, currentPrice]);

  const priceNum = Number(unitPrice);
  const canSave = Number.isFinite(priceNum) && priceNum > 0 && !busy;

  const fieldClass = cn(
    "h-11 w-full rounded-xl border border-border/55 bg-background px-3 text-right text-lg font-semibold tabular-nums shadow-sm",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)]",
  );

  const submit = async () => {
    if (!canSave) return;
    const next = Number(unitPrice).toFixed(2);
    const price = Number(next);
    const shouldPersist = canPersist && persistCatalog;

    if (shouldPersist) {
      setBusy(true);
      try {
        await postSellingPrice({
          itemId: itemId!.trim(),
          branchId: branchId!.trim(),
          price,
          effectiveFrom: localYmd(),
          notes: "Updated from cashier",
        });
        onSave(next);
        onCatalogPriceSaved?.(itemId!.trim(), price);
        toast.success("Cart and shelf price updated");
        onOpenChange(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not update shelf price";
        toast.error(msg);
      } finally {
        setBusy(false);
      }
      return;
    }

    onSave(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className="max-w-sm gap-0 overflow-hidden p-0"
        style={brandTheme}
      >
        <div className="border-b border-border/40 px-4 py-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="size-4 text-[var(--pos-primary)]" />
              Edit price
            </DialogTitle>
            <DialogDescription className="line-clamp-2 text-xs">
              {label}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-4 py-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Unit price{currency ? ` (${currency})` : ""}
            </span>
            <input
              className={fieldClass}
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              autoFocus
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          </label>

          {canUpdateCatalog ? (
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5",
                !canPersist && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--pos-primary)]"
                checked={persistCatalog && canPersist}
                disabled={!canPersist || busy}
                onChange={(e) => setPersistCatalog(e.target.checked)}
              />
              <span className="min-w-0 space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  Also update shelf price
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {canPersist
                    ? "Saves this amount as the catalog price for this branch."
                    : online
                      ? "Select a branch to update the catalog price."
                      : "Connect to the network to update the catalog price."}
                </span>
              </span>
            </label>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border/40 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            className="bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:opacity-90"
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : "Update price"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CashierEditPriceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  currency: string;
  label: string;
  currentPrice: string;
  onSave: (unitPrice: string) => void;
};

export function CashierEditPriceModal({
  open,
  onOpenChange,
  brandTheme,
  currency,
  label,
  currentPrice,
  onSave,
}: CashierEditPriceModalProps) {
  const [unitPrice, setUnitPrice] = useState(currentPrice);

  useEffect(() => {
    if (!open) return;
    setUnitPrice(currentPrice);
  }, [open, currentPrice]);

  const priceNum = Number(unitPrice);
  const canSave = Number.isFinite(priceNum) && priceNum > 0;

  const fieldClass = cn(
    "h-11 w-full rounded-xl border border-border/55 bg-background px-3 text-right text-lg font-semibold tabular-nums shadow-sm",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)]",
  );

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

        <div className="space-y-2 px-4 py-4">
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault();
                  onSave(Number(unitPrice).toFixed(2));
                  onOpenChange(false);
                }
              }}
            />
          </label>
        </div>

        <DialogFooter className="gap-2 border-t border-border/40 px-4 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            className="bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:opacity-90"
            onClick={() => {
              onSave(Number(unitPrice).toFixed(2));
              onOpenChange(false);
            }}
          >
            Update price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

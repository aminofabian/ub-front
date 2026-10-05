"use client";

import { useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unitPriceFromPackage } from "@/components/pricing/unit-price-from-package";

export type PackagePriceDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** e.g. "Buy in a package — Sugar 2kg" */
  title: string;
  description?: string;
  /** Receives the computed (rounded) unit price. May be async. */
  onApply: (unitPrice: number) => void | Promise<void>;
  /** Plural noun for the package contents, e.g. "units" / "messages". */
  unitNoun?: string;
  /** Label for the package total, e.g. "Buying price (KES)". */
  priceLabel?: string;
  currency?: string;
  /**
   * Decimals of the destination column — 2 for `items.buying_price` /
   * `unit_price_kes`, 4 for `inventory_batches.unit_cost`.
   */
  decimals?: number;
};

/**
 * "The shopkeeper knows a crate of 24 cost KES 480, not the unit cost."
 * Enter the package size and price, get the unit price back.
 */
export function PackagePriceDialog({
  open,
  onOpenChange,
  title,
  description,
  onApply,
  unitNoun = "units",
  priceLabel = "Package price",
  currency = "KES",
  decimals = 2,
}: PackagePriceDialogProps) {
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  // Always start clean so a previous package never leaks into the next row.
  useEffect(() => {
    if (open) {
      setUnits("");
      setPrice("");
      setBusy(false);
    }
  }, [open]);

  const unitsNum = Number(units);
  const priceNum = Number(price);
  const entered =
    units.trim() !== "" &&
    price.trim() !== "" &&
    Number.isFinite(unitsNum) &&
    unitsNum > 0 &&
    Number.isFinite(priceNum) &&
    priceNum > 0;
  const unitPrice = entered
    ? unitPriceFromPackage(unitsNum, priceNum, decimals)
    : 0;
  const valid = entered && unitPrice > 0;
  const tooCheap = entered && unitPrice <= 0;
  const minUnit = 1 / 10 ** decimals;
  const packageTotal = Math.round(unitsNum * unitPrice * 100) / 100;
  const drifts = valid && Math.abs(packageTotal - priceNum) >= 0.005;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onApply(unitPrice);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-4 shrink-0" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description ??
              `Enter how many ${unitNoun} the package holds and what it cost — the division is done for you.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="package-units" className="text-[12px]">
              Units in the package
            </Label>
            <Input
              id="package-units"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              autoFocus
              placeholder="e.g. 24"
              value={units}
              disabled={busy}
              onChange={(e) => setUnits(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="package-price" className="text-[12px]">
              {priceLabel}
            </Label>
            <Input
              id="package-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="e.g. 480"
              value={price}
              disabled={busy}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </div>

          {valid ? (
            <div className="flex items-baseline justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Unit price</span>
              <span className="font-heading text-base font-semibold tabular-nums">
                {currency} {unitPrice.toFixed(decimals)}
              </span>
            </div>
          ) : (
            <p className="text-xs leading-snug text-muted-foreground">
              {tooCheap
                ? `That package works out below ${currency} ${minUnit.toFixed(
                    decimals,
                  )} per unit — raise the price or lower the units.`
                : `Enter the package size and price to see the unit price.`}
            </p>
          )}

          {drifts ? (
            <p className="text-xs leading-snug text-muted-foreground">
              Rounded to {decimals} decimals per unit,{" "}
              {unitsNum.toLocaleString()} {unitNoun} bill as {currency}{" "}
              {packageTotal.toFixed(2)}.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!valid || busy}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {valid ? `Use ${currency} ${unitPrice.toFixed(decimals)}` : "Use unit price"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

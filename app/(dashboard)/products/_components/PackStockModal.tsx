"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Warehouse } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchItemById, type ItemDetailRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  effectiveOnHand,
  saleTakesLabel,
  shelfSellingUnits,
  stockCatalogItemId,
  stockFamilySources,
  unitAvailabilityLabel,
  type SellingUnitSource,
} from "../_utils";
import {
  productFormInputClass,
  productFormLabelClass,
  productFormSelectClass,
} from "./product-form-styles";

type BranchOption = { id: string; name: string };

type SaveOnHand = (input: {
  target: number;
  branchId: string;
  unitCost: number;
  current: number | null;
}) => Promise<{ ok: boolean; message: string }>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: ItemDetailRecord;
  variantRows: SellingUnitSource[];
  parentName: string | null;
  branches: BranchOption[];
  initialBranchId: string;
  defaultUnitCost: number | null;
  onSave: SaveOnHand;
};

export function PackStockModal({
  open,
  onOpenChange,
  detail,
  variantRows,
  parentName,
  branches,
  initialBranchId,
  defaultUnitCost,
  onSave,
}: Props) {
  const baseName = sharedShelfName(detail, parentName);
  const units = useMemo(
    () => shelfSellingUnits(stockFamilySources(detail, variantRows), baseName),
    [detail, variantRows, baseName],
  );
  const stockItemId = stockCatalogItemId(detail);
  const fallbackBranchId = branches[0]?.id ?? "";
  const [branchId, setBranchId] = useState(initialBranchId);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [baseline, setBaseline] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quantityEdited = useRef(false);

  useEffect(() => {
    if (!open) return;
    quantityEdited.current = false;
    setBranchId(initialBranchId || fallbackBranchId);
    setUnitCost(defaultUnitCost != null ? String(defaultUnitCost) : "");
    setError(null);
  }, [open, initialBranchId, fallbackBranchId, defaultUnitCost]);

  useEffect(() => {
    quantityEdited.current = false;
  }, [branchId]);

  useEffect(() => {
    if (!open || !stockItemId || !branchId.trim()) return;
    let cancelled = false;
    setLoading(true);
    void fetchItemById(stockItemId, { branchId: branchId.trim() })
      .then((row) => {
        if (cancelled) return;
        const onHand = effectiveOnHand(row);
        setBaseline(onHand);
        if (!quantityEdited.current) {
          setQuantity(onHand != null ? String(onHand) : "");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load stock for this branch.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, stockItemId, branchId]);

  const typed = Number(quantity);
  const previewQty =
    quantity.trim() !== "" && Number.isFinite(typed) ? typed : (baseline ?? 0);
  const needsCost =
    baseline != null && Number.isFinite(typed) && typed > baseline + 0.0001;

  const save = async () => {
    if (quantity.trim() === "" || !Number.isFinite(typed) || typed < 0) {
      setError("On-hand quantity must be zero or a positive number.");
      return;
    }
    const cost = unitCost.trim() === "" ? 0 : Number(unitCost);
    setSaving(true);
    setError(null);
    const result = await onSave({
      target: typed,
      branchId,
      unitCost: cost,
      current: baseline,
    });
    setSaving(false);
    if (result.ok) {
      onOpenChange(false);
      return;
    }
    setError(result.message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,40rem)] max-w-md gap-0 overflow-hidden p-0">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader className="border-b border-border/50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Warehouse className="size-5 text-primary" aria-hidden />
              Stock
            </DialogTitle>
            <DialogDescription>
              {baseName} is one shelf. Each sale below takes from that same
              count.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
            {branches.length > 1 ? (
              <label className="flex flex-col gap-1">
                <span className={productFormLabelClass}>Branch</span>
                <select
                  className={productFormSelectClass}
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className={productFormLabelClass}>
                On hand ({baseName})
              </span>
              <input
                autoFocus
                className={productFormInputClass}
                inputMode="decimal"
                value={quantity}
                onChange={(event) => {
                  quantityEdited.current = true;
                  setQuantity(event.target.value);
                }}
                aria-label={`On hand ${baseName}`}
                disabled={loading}
              />
              {loading ? (
                <span className="text-[11px] text-foreground/45">
                  Loading this branch…
                </span>
              ) : null}
            </label>

            {needsCost ? (
              <label className="flex flex-col gap-1">
                <span className={productFormLabelClass}>Unit cost</span>
                <input
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  aria-label="Unit cost"
                />
              </label>
            ) : null}

            <div>
              <p className={productFormLabelClass}>Can sell, per unit</p>
              <ul className="mt-1.5 border border-border/70">
                {units.map((unit) => (
                  <li
                    key={unit.id}
                    className="flex items-baseline justify-between gap-3 border-t border-border/70 px-2.5 py-1.5 first:border-t-0"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[13px] text-foreground">
                        {unit.label}
                      </span>
                      <span className="text-[11px] text-foreground/45">
                        {saleTakesLabel(unit.unitsPerSale, baseName)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">
                      {loading
                        ? "…"
                        : unitAvailabilityLabel(previewQty, unit)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {error ? (
              <p role="alert" className="text-[12px] text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border/50 px-5 py-3">
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
              type="submit"
              className={cn("rounded-none", saving && "gap-1.5")}
              disabled={saving || loading || !branchId.trim()}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Save stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function sharedShelfName(
  detail: ItemDetailRecord,
  parentName: string | null,
): string {
  if (detail.variantOfItemId?.trim()) {
    return parentName?.trim() || "the base product";
  }
  return detail.name?.trim() || "this product";
}

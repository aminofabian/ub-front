"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { PackagePlus } from "lucide-react";
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
import {
  createPosQuickItem,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type CashierCreateProductModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  currency: string;
  branchId: string;
  itemTypes: ItemTypeRecord[];
  preferredItemTypeId?: string | null;
  onCreated: (item: ItemSummaryRecord, unitPrice: string) => void;
};

export function CashierCreateProductModal({
  open,
  onOpenChange,
  brandTheme,
  currency,
  branchId,
  itemTypes,
  preferredItemTypeId,
  onCreated,
}: CashierCreateProductModalProps) {
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setBarcode("");
    setUnitPrice("");
    const preferred = preferredItemTypeId?.trim();
    const fallback =
      preferred && itemTypes.some((t) => t.id === preferred)
        ? preferred
        : itemTypes.find((t) => t.isDefault)?.id || itemTypes[0]?.id || "";
    setItemTypeId(fallback);
  }, [open, preferredItemTypeId, itemTypes]);

  const priceNum = Number(unitPrice);
  const canSubmit =
    name.trim().length > 0 &&
    itemTypeId.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum > 0;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const created = await createPosQuickItem({
        name: name.trim(),
        itemTypeId: itemTypeId.trim(),
        barcode: barcode.trim() || undefined,
        branchId: branchId.trim() || undefined,
        unitPrice: priceNum,
        unitType: "each",
      });
      const priceStr = priceNum.toFixed(2);
      onCreated(
        {
          id: created.id,
          name: created.name,
          sku: created.sku ?? "",
          barcode: barcode.trim() || undefined,
          stockQty: 0,
        },
        priceStr,
      );
      toast.success("Product created");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create product");
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = cn(
    "h-10 w-full rounded-xl border border-border/55 bg-background px-3 text-sm shadow-sm",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)]",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className="max-w-md gap-0 overflow-hidden p-0"
        style={brandTheme}
      >
        <div className="border-b border-border/40 px-4 py-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <PackagePlus className="size-4 text-[var(--pos-primary)]" />
              Add product
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a sellable item and add it to the current cart.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-4 py-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Name
            </span>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Barcode (optional)
            </span>
            <input
              className={fieldClass}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or type barcode"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Department
            </span>
            <select
              className={fieldClass}
              value={itemTypeId}
              onChange={(e) => setItemTypeId(e.target.value)}
              disabled={itemTypes.length === 0}
            >
              {itemTypes.length === 0 ? (
                <option value="">No departments</option>
              ) : (
                itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Sell price{currency ? ` (${currency})` : ""}
            </span>
            <input
              className={cn(fieldClass, "text-right font-semibold tabular-nums")}
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit && !busy) {
                  e.preventDefault();
                  void onSubmit();
                }
              }}
            />
          </label>
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
            disabled={!canSubmit || busy}
            className="bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:opacity-90"
            onClick={() => void onSubmit()}
          >
            {busy ? "Creating…" : "Create & add to cart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

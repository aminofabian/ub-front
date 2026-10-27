"use client";

import { useEffect, useState } from "react";
import { Boxes, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchItemById } from "@/lib/api";
import { PackageVariantsSection } from "./PackageVariantsSection";
import { packStockBlock, type PackStockBlock } from "../_utils";
import { emptyPackageDraft, type PackageDraft } from "../_types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentName: string;
  parentId: string | null;
  baseUnitHint?: string;
  currencyCode?: string;
  /** Branch used to read where the product's stock actually lives. */
  branchId?: string | null;
  /** Jump to the base product's stock editor when stock sits on a sibling SKU. */
  onOpenStock?: () => void;
  busy?: boolean;
  onCreatePackages: (
    parentId: string,
    rows: PackageDraft[],
  ) => Promise<boolean>;
};

export function AddPackageModal({
  open,
  onOpenChange,
  parentName,
  parentId,
  baseUnitHint = "base unit",
  currencyCode = "",
  branchId = null,
  onOpenStock,
  busy = false,
  onCreatePackages,
}: Props) {
  const [rows, setRows] = useState<PackageDraft[]>([emptyPackageDraft()]);
  /** Sibling SKUs holding the count while the base pool is empty. */
  const [stockBlock, setStockBlock] = useState<PackStockBlock | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows([emptyPackageDraft()]);
  }, [open, parentId]);

  useEffect(() => {
    if (!open || !parentId) {
      setStockBlock(null);
      setCheckingStock(false);
      return;
    }
    let cancelled = false;
    setCheckingStock(true);
    setStockBlock(null);
    void (async () => {
      try {
        const parent = await fetchItemById(parentId, { branchId });
        if (cancelled) return;
        setStockBlock(packStockBlock(parent, parentId));
      } catch {
        // Never block adding a pack because the lookup failed.
      } finally {
        if (!cancelled) setCheckingStock(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, parentId, branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId) return;
    const ok = await onCreatePackages(parentId, rows);
    if (ok) onOpenChange(false);
  };

  const validCount = rows.filter(
    (r) => r.name.trim() && r.unitsPerPackage.trim(),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,40rem)] max-w-lg gap-0 overflow-hidden p-0">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader className="border-b border-border/50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-5 text-primary" aria-hidden />
              Package sales
            </DialogTitle>
            <DialogDescription>
              Creates a{" "}
              <span className="font-medium text-foreground">
                new variant SKU
              </span>{" "}
              for{" "}
              <span className="font-medium text-foreground">{parentName}</span>{" "}
              (e.g. tray of 30). Stock stays on the base product — selling one
              package deducts that many base units. This does not change your
              existing single-unit variant.
            </DialogDescription>
          </DialogHeader>

          {stockBlock ? (
            <div
              role="alert"
              className="border-b border-amber-500/25 bg-amber-500/[0.07] px-5 py-3 text-xs leading-relaxed text-muted-foreground"
            >
              <p>
                <span className="font-medium text-foreground">
                  Stock isn’t on {parentName}.
                </span>{" "}
                {stockBlock.names.join(", ")}{" "}
                {stockBlock.names.length === 1 ? "holds" : "hold"} the count,
                and a pack only draws from {parentName}’s own shelf — it
                would show{" "}
                <span className="font-medium text-foreground">0 packs</span>.
                Move the quantity to {parentName} (and set{" "}
                {stockBlock.names.join(", ")} to 0) first.
              </p>
              {onOpenStock ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 gap-1.5 text-xs shadow-none"
                  onClick={onOpenStock}
                >
                  Open {parentName} stock
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <PackageVariantsSection
              showEnableToggle={false}
              enabled
              onEnabledChange={() => {}}
              rows={rows}
              onRowsChange={setRows}
              baseUnitHint={baseUnitHint}
              currencyCode={currencyCode}
            />
          </div>

          <DialogFooter className="border-t border-border/50 bg-muted/20 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                busy ||
                !parentId ||
                validCount === 0 ||
                checkingStock ||
                !!stockBlock
              }
              className="gap-2"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {validCount > 1
                ? `Add ${validCount} packages`
                : validCount === 1
                  ? "Add package"
                  : "Add package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

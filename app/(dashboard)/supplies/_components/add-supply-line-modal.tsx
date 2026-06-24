"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Loader2 } from "lucide-react";

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
  fetchItemSupplierLinks,
  type ItemSummaryRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

import { ProductPickCell } from "./product-pick-cell";
import { nsdFieldLabel, nsdInput } from "./new-supply-drawer-ui";
import { prefetchSupplyLineDefaults } from "./supply-line-prefetch";

export type LinkSupplierProductDraft = {
  item: ItemSummaryRecord;
  supplierId: string;
  defaultCostPrice?: number;
  supplierSku?: string;
};

type LinkSupplierProductModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string | null;
  supplierName?: string | null;
  branchId: string;
  busy: boolean;
  onLink: (draft: LinkSupplierProductDraft) => Promise<void>;
};

function parseOptionalCost(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return n;
}

export function LinkSupplierProductModal({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  branchId,
  busy,
  onLink,
}: LinkSupplierProductModalProps) {
  const prefetchGenRef = useRef(0);
  const [item, setItem] = useState<ItemSummaryRecord | null>(null);
  const [defaultCostStr, setDefaultCostStr] = useState("");
  const [supplierSku, setSupplierSku] = useState("");
  const [costHint, setCostHint] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [prefetchLoading, setPrefetchLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const dismissGuardRef = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    dismissGuardRef.current = true;
    const timer = window.setTimeout(() => {
      dismissGuardRef.current = false;
    }, 200);
    setItem(null);
    setDefaultCostStr("");
    setSupplierSku("");
    setCostHint(undefined);
    setError(null);
    setPrefetchLoading(false);
    setLinking(false);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleItemChange = (next: ItemSummaryRecord | null) => {
    setItem(next);
    setDefaultCostStr("");
    setSupplierSku("");
    setCostHint(undefined);
    setError(null);

    if (!next) {
      setPrefetchLoading(false);
      return;
    }

    const gen = ++prefetchGenRef.current;
    setPrefetchLoading(true);

    void prefetchSupplyLineDefaults({
      itemId: next.id,
      itemSku: next.sku,
      supplierId,
      branchId,
    })
      .then(async (prefill) => {
        if (prefetchGenRef.current !== gen) {
          return;
        }
        if (prefill.unitStr) {
          setDefaultCostStr(prefill.unitStr);
          setCostHint(prefill.hints.cost);
        }
        const links = await fetchItemSupplierLinks(next.id).catch(() => []);
        const forSupplier = supplierId
          ? links.find((l) => l.supplierId === supplierId && l.active)
          : undefined;
        if (forSupplier?.supplierSku?.trim()) {
          setSupplierSku(forSupplier.supplierSku.trim());
        }
      })
      .catch(() => {
        /* optional defaults */
      })
      .finally(() => {
        if (prefetchGenRef.current === gen) {
          setPrefetchLoading(false);
        }
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!item) {
      setError("Choose a product to link.");
      return;
    }
    if (!supplierId?.trim()) {
      setError("Select a supplier first.");
      return;
    }

    const defaultCostPrice = parseOptionalCost(defaultCostStr);
    if (defaultCostStr.trim() && defaultCostPrice === undefined) {
      setError("Default cost must be a valid number.");
      return;
    }

    setLinking(true);
    try {
      await onLink({
        item,
        supplierId: supplierId.trim(),
        defaultCostPrice,
        supplierSku: supplierSku.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link product.");
    } finally {
      setLinking(false);
    }
  };

  const disabled = busy || linking || prefetchLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[300] flex max-h-[min(92dvh,32rem)] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:w-full"
        overlayClassName="z-[295]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (dismissGuardRef.current) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (dismissGuardRef.current) {
            e.preventDefault();
          }
        }}
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b border-border/50 px-4 py-3 sm:px-5 sm:py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-5 text-primary" aria-hidden />
              Link product
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a catalog product to{" "}
              {supplierName ? (
                <span className="font-medium text-foreground">{supplierName}</span>
              ) : (
                "this supplier"
              )}
              . Stock is updated when you post the supply — not here.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
            {error ? (
              <p className="rounded-sm border border-destructive/35 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            {!supplierId?.trim() ? (
              <p className="rounded-sm border border-amber-500/35 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                Pick a supplier in the supply drawer first — search and choose a
                name from the list.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <span className={nsdFieldLabel}>Product</span>
              <ProductPickCell
                sharp
                resultsPlacement="inline"
                autoFocus={open}
                branchId={branchId}
                excludeLinkedSupplierId={supplierId ?? undefined}
                item={item}
                disabled={disabled}
                onItemChange={handleItemChange}
              />
              <p className="text-[10px] text-muted-foreground">
                Only products not already linked to this supplier are shown.
              </p>
            </div>

            {item ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  Selected:{" "}
                  <span className="font-medium text-foreground">
                    {itemCatalogDisplayTitle(item)}
                  </span>
                </span>
                {prefetchLoading ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" />
                    Loading defaults…
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Default cost</span>
                <input
                  className={cn(nsdInput, "text-right font-mono")}
                  value={defaultCostStr}
                  onChange={(e) => setDefaultCostStr(e.target.value)}
                  disabled={disabled || !item}
                  inputMode="decimal"
                  placeholder="Optional"
                />
                {costHint ? (
                  <span className="text-[10px] text-muted-foreground">{costHint}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Supplier SKU</span>
                <input
                  className={cn(nsdInput, "font-mono text-xs")}
                  value={supplierSku}
                  onChange={(e) => setSupplierSku(e.target.value)}
                  disabled={disabled || !item}
                  placeholder="Optional"
                />
              </label>
            </div>
          </div>

          <DialogFooter className="border-t border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
            <Button
              type="button"
              variant="outline"
              disabled={linking}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={disabled || !item || !supplierId?.trim()}
            >
              {linking ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Linking…
                </>
              ) : (
                "Link to supplier"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use LinkSupplierProductModal */
export const AddSupplyLineModal = LinkSupplierProductModal;
export type AddSupplyLineDraft = LinkSupplierProductDraft;

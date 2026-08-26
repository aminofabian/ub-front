"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Loader2, RefreshCw } from "lucide-react";

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
  fetchItemById,
  type ItemDetailRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import { formatShelfPriceLabel } from "@/lib/cashier-shelf-price";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

import { PosVariantTable } from "./pos-variant-table";

type PosVariantPickerProps = {
  /** Parent row tapped (chip, tile, or group header). Null while closed. */
  parent: ItemSummaryRecord | null;
  /**
   * Detail already fetched by the caller (chip parent-check). When present the
   * picker renders immediately instead of re-fetching the family.
   */
  preloaded?: ItemDetailRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  online: boolean;
  currency: string;
  branchId?: string | null;
  businessId?: string | null;
  onStaleItem?: (itemId: string) => void;
  cartQtyByItem: Map<string, number>;
  justAddedId: string | null;
  /** Pass a shelf line to quick-add directly; omit to open the product modal. */
  onPick: (item: ItemSummaryRecord, shelfLine?: string) => void;
  brandTheme?: CSSProperties;
};

const EMPTY_PRICES: Record<string, string> = {};

export function PosVariantPicker({
  parent,
  preloaded,
  open,
  onOpenChange,
  online,
  currency,
  branchId,
  businessId,
  onStaleItem,
  cartQtyByItem,
  justAddedId,
  onPick,
  brandTheme,
}: PosVariantPickerProps) {
  const [variants, setVariants] = useState<ItemSummaryRecord[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shelfPrices, setShelfPrices] = useState<Record<string, string>>(
    EMPTY_PRICES,
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || !parent?.id) {
      return;
    }
    let cancelled = false;
    const parentId = parent.id;
    const bid = branchId?.trim() || undefined;

    setLoading(true);
    setError(null);
    setVariants([]);
    setShelfPrices(EMPTY_PRICES);
    setTitle(parent.name?.trim() || cashierItemPrimaryLabel(parent) || "");

    const applyDetail = (detail: ItemDetailRecord) => {
      if (cancelled) return;
      // Children can technically be group headers too; never offer one as a row.
      const list = (detail.variants ?? []).filter(
        (v) => v.groupLabelOnly !== true,
      );
      setVariants(list);
      if (detail.name?.trim()) {
        setTitle(detail.name.trim());
      }
      setLoading(false);
      if (list.length === 0) {
        return;
      }
      void Promise.all(
        list.map(async (v) => {
          const rec = await fetchPosShelfPrice(v.id, bid, {
            businessId,
            onStaleItem,
          }).catch(() => null);
          if (!rec) {
            return [v.id, ""] as const;
          }
          return [v.id, formatShelfPriceLabel(rec.price, currency) ?? ""] as const;
        }),
      ).then((pairs) => {
        if (cancelled) return;
        setShelfPrices(Object.fromEntries(pairs));
      });
    };

    if (preloaded && preloaded.id === parentId) {
      applyDetail(preloaded);
    } else if (online) {
      void fetchItemById(parentId, { branchId: bid, toast: false })
        .then(applyDetail)
        .catch(() => {
          if (cancelled) return;
          setLoading(false);
          setError(
            "Couldn't load the sizes for this product. Check your connection and try again.",
          );
        });
    } else {
      setLoading(false);
      setError("You're offline — go online to pick a size.");
    }

    return () => {
      cancelled = true;
    };
  }, [
    open,
    parent,
    preloaded,
    attempt,
    online,
    branchId,
    businessId,
    currency,
    onStaleItem,
  ]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const headerCount =
    variants.length > 0
      ? `${variants.length} size${variants.length === 1 ? "" : "s"} · tap a row to add`
      : "Pick a size";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        // Opaque scrim — Win7 Chrome 109 washes out translucent overlays.
        overlayClassName="bg-[rgba(0,0,0,0.55)] supports-[backdrop-filter]:bg-[rgba(0,0,0,0.45)]"
        className={cn(
          "gap-0 overflow-hidden border border-border bg-background p-0 shadow-2xl",
          "w-[calc(100vw-1.25rem)] max-w-[min(26rem,calc(100vw-1.25rem))] sm:max-w-lg",
        )}
        style={brandTheme}
      >
        <DialogHeader className="border-b border-border bg-muted px-4 pb-3 pt-4 text-left">
          <DialogTitle className="truncate text-base font-semibold">
            {title || (parent ? cashierItemPrimaryLabel(parent) : "")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pick a size to add to cart
          </DialogDescription>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {headerCount}
          </p>
        </DialogHeader>
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading sizes…
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 h-8 gap-1.5 rounded-xl border-border bg-background"
                onClick={retry}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Try again
              </Button>
            </div>
          ) : variants.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No sizes found for this product.
            </p>
          ) : (
            <PosVariantTable
              variants={variants}
              shelfPrices={shelfPrices}
              cartQtyByItem={cartQtyByItem}
              justAddedId={justAddedId}
              onPick={(item) => onPick(item, shelfPrices[item.id] || undefined)}
            />
          )}
        </div>
        <DialogFooter className="border-t border-border px-4 py-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl border-border bg-background sm:flex-none"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

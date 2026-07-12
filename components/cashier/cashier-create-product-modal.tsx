"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { PackagePlus, X } from "lucide-react";
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
  fetchItems,
  createPosQuickItem,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
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

function relatedLinkHint(related: ItemSummaryRecord): string {
  if (related.variantOfItemId?.trim()) {
    return `Sibling of “${cashierItemPrimaryLabel(related)}” — same parent product.`;
  }
  return `Child of “${cashierItemPrimaryLabel(related)}”.`;
}

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
  const [buyingPrice, setBuyingPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [initialStockQty, setInitialStockQty] = useState("1");
  const [itemTypeId, setItemTypeId] = useState("");
  const [linkAsVariant, setLinkAsVariant] = useState(false);
  const [relatedQuery, setRelatedQuery] = useState("");
  const [relatedHits, setRelatedHits] = useState<ItemSummaryRecord[]>([]);
  const [relatedBusy, setRelatedBusy] = useState(false);
  const [relatedItem, setRelatedItem] = useState<ItemSummaryRecord | null>(
    null,
  );
  const [variantName, setVariantName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setBarcode("");
    setBuyingPrice("");
    setUnitPrice("");
    setInitialStockQty("1");
    setLinkAsVariant(false);
    setRelatedQuery("");
    setRelatedHits([]);
    setRelatedItem(null);
    setVariantName("");
    const preferred = preferredItemTypeId?.trim();
    const fallback =
      preferred && itemTypes.some((t) => t.id === preferred)
        ? preferred
        : itemTypes.find((t) => t.isDefault)?.id || itemTypes[0]?.id || "";
    setItemTypeId(fallback);
  }, [open, preferredItemTypeId, itemTypes]);

  useEffect(() => {
    if (!open || !linkAsVariant || relatedItem) {
      setRelatedHits([]);
      setRelatedBusy(false);
      return;
    }
    const q = relatedQuery.trim();
    if (q.length < 2) {
      setRelatedHits([]);
      setRelatedBusy(false);
      return;
    }
    let cancelled = false;
    setRelatedBusy(true);
    const t = window.setTimeout(() => {
      void fetchItems(q, { size: 8, catalogScope: "ALL" })
        .then((rows) => {
          if (!cancelled) setRelatedHits(rows);
        })
        .catch(() => {
          if (!cancelled) setRelatedHits([]);
        })
        .finally(() => {
          if (!cancelled) setRelatedBusy(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, linkAsVariant, relatedQuery, relatedItem]);

  const priceNum = Number(unitPrice);
  const buyingNum = buyingPrice.trim() === "" ? null : Number(buyingPrice);
  const stockNum = Number(initialStockQty);
  const buyingOk =
    buyingNum == null || (Number.isFinite(buyingNum) && buyingNum >= 0);
  const stockOk = Number.isFinite(stockNum) && stockNum > 0;
  const variantLinkOk = !linkAsVariant || relatedItem != null;
  const canSubmit =
    name.trim().length > 0 &&
    itemTypeId.trim().length > 0 &&
    branchId.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    buyingOk &&
    stockOk &&
    variantLinkOk;

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
        buyingPrice: buyingNum ?? undefined,
        initialStockQty: stockNum,
        unitType: "each",
        relatedItemId: linkAsVariant ? relatedItem?.id : undefined,
        variantName:
          linkAsVariant && variantName.trim()
            ? variantName.trim()
            : undefined,
      });
      const priceStr = priceNum.toFixed(2);
      onCreated(
        {
          id: created.id,
          name: created.name,
          sku: created.sku ?? "",
          barcode: barcode.trim() || undefined,
          stockQty: stockNum,
          variantName:
            linkAsVariant
              ? variantName.trim() || name.trim()
              : undefined,
          variantOfItemId: linkAsVariant
            ? relatedItem?.variantOfItemId?.trim() || relatedItem?.id
            : undefined,
        },
        priceStr,
      );
      toast.success(
        linkAsVariant ? "Variant created" : "Product created",
      );
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create product";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = cn(
    "h-10 w-full rounded-xl border border-border/55 bg-background px-3 text-sm shadow-sm",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)]",
  );
  const currencySuffix = currency ? ` (${currency})` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className="max-h-[min(92dvh,40rem)] max-w-md gap-0 overflow-hidden p-0"
        style={brandTheme}
      >
        <div className="border-b border-border/40 px-4 py-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <PackagePlus className="size-4 text-[var(--pos-primary)]" />
              Add product
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a sellable item and add it to the current cart. Optionally
              link it as a variant of an existing product.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(60dvh,28rem)] space-y-3 overflow-y-auto px-4 py-4">
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

          <label
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--pos-primary)]"
              checked={linkAsVariant}
              disabled={busy}
              onChange={(e) => {
                const on = e.target.checked;
                setLinkAsVariant(on);
                if (!on) {
                  setRelatedItem(null);
                  setRelatedQuery("");
                  setRelatedHits([]);
                  setVariantName("");
                }
              }}
            />
            <span className="min-w-0 space-y-0.5">
              <span className="block text-sm font-medium text-foreground">
                Add as a variant
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Choose a parent product or an existing variant (sibling).
              </span>
            </span>
          </label>

          {linkAsVariant ? (
            <div className="space-y-2 rounded-xl border border-border/50 bg-card/60 p-3">
              {relatedItem ? (
                <div className="flex items-start gap-2 rounded-lg border border-border/45 bg-background px-2.5 py-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {cashierItemPrimaryLabel(relatedItem)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {relatedLinkHint(relatedItem)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear related product"
                    onClick={() => {
                      setRelatedItem(null);
                      setRelatedQuery("");
                    }}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Find parent or sibling
                  </span>
                  <input
                    className={fieldClass}
                    value={relatedQuery}
                    onChange={(e) => setRelatedQuery(e.target.value)}
                    placeholder="Search name, SKU, or barcode"
                  />
                  {relatedBusy ? (
                    <p className="text-[11px] text-muted-foreground">
                      Searching…
                    </p>
                  ) : null}
                  {relatedHits.length > 0 ? (
                    <ul className="max-h-36 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/40">
                      {relatedHits.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-start gap-0.5 px-2.5 py-2 text-left hover:bg-muted/50"
                            onClick={() => {
                              setRelatedItem(hit);
                              setRelatedQuery("");
                              setRelatedHits([]);
                              if (!variantName.trim() && hit.size?.trim()) {
                                setVariantName(hit.size.trim());
                              }
                            }}
                          >
                            <span className="text-sm font-medium">
                              {cashierItemPrimaryLabel(hit)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {hit.variantOfItemId?.trim()
                                ? "Variant — add as sibling"
                                : hit.groupLabelOnly
                                  ? "Parent group"
                                  : "Parent / product"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : relatedQuery.trim().length >= 2 && !relatedBusy ? (
                    <p className="text-[11px] text-muted-foreground">
                      No matches.
                    </p>
                  ) : null}
                </label>
              )}

              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Variant label
                </span>
                <input
                  className={fieldClass}
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="e.g. 500ml, Tray, Large"
                />
                <span className="text-[11px] text-muted-foreground">
                  Shown next to the parent name. Defaults to the product name if
                  left blank.
                </span>
              </label>
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Department
            </span>
            <select
              className={fieldClass}
              value={itemTypeId}
              onChange={(e) => setItemTypeId(e.target.value)}
              disabled={itemTypes.length === 0 || (linkAsVariant && relatedItem != null)}
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
            {linkAsVariant && relatedItem != null ? (
              <span className="text-[11px] text-muted-foreground">
                Department is inherited from the parent product.
              </span>
            ) : null}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Buying price{currencySuffix}
              </span>
              <input
                className={cn(fieldClass, "text-right tabular-nums")}
                inputMode="decimal"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                placeholder="0.00"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sell price{currencySuffix}
              </span>
              <input
                className={cn(fieldClass, "text-right font-semibold tabular-nums")}
                inputMode="decimal"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Opening stock
            </span>
            <input
              className={cn(fieldClass, "text-right tabular-nums")}
              inputMode="decimal"
              value={initialStockQty}
              onChange={(e) => setInitialStockQty(e.target.value)}
              placeholder="1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit && !busy) {
                  e.preventDefault();
                  void onSubmit();
                }
              }}
            />
            <span className="text-[11px] text-muted-foreground">
              Received at this till branch so the item can be sold right away.
            </span>
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

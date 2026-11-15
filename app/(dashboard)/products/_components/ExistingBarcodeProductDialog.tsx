"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2 } from "lucide-react";

import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
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
  deleteItem,
  fetchItemById,
  itemListThumbnailUrl,
  patchItem,
  type ItemDetailRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";

import { formatAmount, formatMutationError, toNumber } from "../_utils";
import {
  productFormInputClass,
  productFormLabelClass,
} from "./product-form-styles";

type Props = {
  itemId: string | null;
  branchId: string;
  currency: string;
  onClose: () => void;
  onChanged: () => void;
};

type EditFields = {
  name: string;
  barcode: string;
  sellingPrice: string;
  buyingPrice: string;
};

function moneyInput(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return n == null ? "" : String(n);
}

function fieldsFromItem(item: ItemDetailRecord): EditFields {
  const variant = Boolean(item.variantOfItemId?.trim());
  return {
    name: variant ? (item.variantName ?? "") : item.name,
    barcode: item.barcode ?? "",
    sellingPrice: moneyInput(item.bundlePrice),
    buyingPrice: moneyInput(item.buyingPrice),
  };
}

function priceLine(label: string, value: number | string | null | undefined, currency: string) {
  const n = toNumber(value);
  return (
    <span>
      {label} {n == null ? "—" : `${formatAmount(n)} ${currency}`}
    </span>
  );
}

export function ExistingBarcodeProductDialog({
  itemId,
  branchId,
  currency,
  onClose,
  onChanged,
}: Props) {
  const [item, setItem] = useState<ItemDetailRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<EditFields | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    setItem(null);
    setLoadError("");
    setActionError("");
    setEditing(false);
    void fetchItemById(itemId, { branchId, toast: false })
      .then((row) => {
        if (cancelled) return;
        setItem(row);
        setFields(fieldsFromItem(row));
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(formatMutationError(error, "Could not open this product."));
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, branchId]);

  const changed = () => {
    onChanged();
    onClose();
  };

  const save = async () => {
    if (!item || !fields) return;
    const name = fields.name.trim();
    if (!name) {
      setActionError(item.variantOfItemId ? "Option name is required." : "Name is required.");
      return;
    }
    const selling = fields.sellingPrice.trim() ? Number(fields.sellingPrice) : undefined;
    const buying = fields.buyingPrice.trim() ? Number(fields.buyingPrice) : undefined;
    if (selling != null && (!Number.isFinite(selling) || selling < 0)) {
      setActionError("Selling price must be a number.");
      return;
    }
    if (buying != null && (!Number.isFinite(buying) || buying < 0)) {
      setActionError("Buying price must be a number.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      await patchItem(item.id, {
        barcode: fields.barcode.trim(),
        ...(item.variantOfItemId ? { variantName: name } : { name }),
        ...(selling != null ? { bundlePrice: selling } : {}),
        ...(buying != null ? { buyingPrice: buying } : {}),
      });
      changed();
    } catch (error) {
      setActionError(formatMutationError(error, "Could not save this product."));
    } finally {
      setBusy(false);
    }
  };

  const removeBarcode = () => {
    if (!item?.barcode?.trim()) return;
    showThemedConfirmToast({
      id: "products-clear-barcode",
      title: "Take this barcode off?",
      description: `It comes off ${itemCatalogDisplayTitle(item)}. You can then use it on the product you are adding.`,
      confirmLabel: "Remove barcode",
      onConfirm: async () => {
        setBusy(true);
        setActionError("");
        try {
          await patchItem(item.id, { barcode: "" });
          changed();
        } catch (error) {
          setActionError(formatMutationError(error, "Could not remove the barcode."));
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const removeProduct = () => {
    if (!item) return;
    showThemedConfirmToast({
      id: "products-delete-barcode-owner",
      title: "Delete this product?",
      description: "Cannot be undone. The product you are adding stays open.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setBusy(true);
        setActionError("");
        try {
          await deleteItem(item.id);
          changed();
        } catch (error) {
          setActionError(formatMutationError(error, "Could not delete this product."));
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const title = item ? itemCatalogDisplayTitle(item) : "Product";
  const thumb = item ? itemListThumbnailUrl(item) : null;
  const options = item?.variants?.filter((row) => row.id !== item.id) ?? [];

  return (
    <Dialog open={Boolean(itemId)} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        className="z-[70] max-w-md"
        overlayClassName="z-[70]"
        style={{ zIndex: 70 }}
      >
        <DialogHeader>
          <DialogTitle>Already in your catalog</DialogTitle>
          <DialogDescription>
            This barcode is on another product. Edit it, take the barcode off, or delete that product. What you are adding stays open.
          </DialogDescription>
        </DialogHeader>

        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        {!item && !loadError ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Opening product…
          </p>
        ) : null}

        {item && fields ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted/40">
                {thumb ? (
                  <Image src={thumb} alt="" width={48} height={48} unoptimized className="size-full object-cover" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">No photo</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{title}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {[item.sku, item.barcode].filter(Boolean).join(" · ") || "No barcode"}
                  {item.active === false ? " · inactive" : ""}
                </span>
              </span>
            </div>

            {editing ? (
              <EditForm fields={fields} variant={Boolean(item.variantOfItemId)} onChange={setFields} />
            ) : (
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                {priceLine("Sell", item.bundlePrice, currency)}
                {priceLine("Buy", item.buyingPrice, currency)}
                {item.stockQty != null ? <span>On hand {String(item.stockQty)}</span> : null}
              </p>
            )}

            {options.length > 0 ? (
              <p className="text-[12px] text-muted-foreground">
                Options: {options.slice(0, 6).map((row) => row.variantName || row.name).join(", ")}
                {options.length > 6 ? ` +${options.length - 6}` : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {actionError ? (
          <p className="text-sm text-destructive" role="alert">{actionError}</p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={!item || busy}
            onClick={removeProduct}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            {editing ? (
              <>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                  Back
                </Button>
                <Button type="button" disabled={busy || !fields} onClick={() => void save()}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={!item?.barcode || busy} onClick={removeBarcode}>
                  Remove barcode
                </Button>
                <Button type="button" disabled={!item || busy} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  fields,
  variant,
  onChange,
}: {
  fields: EditFields;
  variant: boolean;
  onChange: (next: EditFields) => void;
}) {
  const set = (patch: Partial<EditFields>) => onChange({ ...fields, ...patch });
  return (
    <div className="space-y-2">
      <label className="block space-y-1">
        <span className={productFormLabelClass}>{variant ? "Option" : "Name"}</span>
        <input
          className={productFormInputClass}
          value={fields.name}
          onChange={(event) => set({ name: event.target.value })}
        />
      </label>
      <label className="block space-y-1">
        <span className={productFormLabelClass}>Barcode</span>
        <input
          className={`${productFormInputClass} font-mono`}
          value={fields.barcode}
          autoFocus
          onChange={(event) => set({ barcode: event.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className={productFormLabelClass}>Selling price</span>
          <input
            className={productFormInputClass}
            inputMode="decimal"
            value={fields.sellingPrice}
            onChange={(event) => set({ sellingPrice: event.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className={productFormLabelClass}>Buying price</span>
          <input
            className={productFormInputClass}
            inputMode="decimal"
            value={fields.buyingPrice}
            onChange={(event) => set({ buyingPrice: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

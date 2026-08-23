"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Settings2 } from "lucide-react";
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
import { updateBusiness } from "@/lib/api";
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import { cn } from "@/lib/utils";

type CashierAdminCapabilitiesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  priceEditEnabled: boolean;
  createProductEnabled: boolean;
  weighedToggleEnabled: boolean;
  addPhotoEnabled: boolean;
  orderPadEnabled: boolean;
  orderConfirmEnabled: boolean;
  onSaved: () => Promise<void> | void;
};

export function CashierAdminCapabilitiesModal({
  open,
  onOpenChange,
  brandTheme,
  priceEditEnabled,
  createProductEnabled,
  weighedToggleEnabled,
  addPhotoEnabled,
  orderPadEnabled,
  orderConfirmEnabled,
  onSaved,
}: CashierAdminCapabilitiesModalProps) {
  const [priceEdit, setPriceEdit] = useState(priceEditEnabled);
  const [createProduct, setCreateProduct] = useState(createProductEnabled);
  const [weighedToggle, setWeighedToggle] = useState(weighedToggleEnabled);
  const [addPhoto, setAddPhoto] = useState(addPhotoEnabled);
  const [orderPad, setOrderPad] = useState(orderPadEnabled);
  const [orderConfirm, setOrderConfirm] = useState(orderConfirmEnabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPriceEdit(priceEditEnabled);
    setCreateProduct(createProductEnabled);
    setWeighedToggle(weighedToggleEnabled);
    setAddPhoto(addPhotoEnabled);
    setOrderPad(orderPadEnabled);
    setOrderConfirm(orderConfirmEnabled);
  }, [
    open,
    priceEditEnabled,
    createProductEnabled,
    weighedToggleEnabled,
    addPhotoEnabled,
    orderPadEnabled,
    orderConfirmEnabled,
  ]);

  const onSave = async () => {
    setSaving(true);
    try {
      await updateBusiness({
        featureFlags: {
          posCashierPriceEdit: priceEdit,
          posCashierCreateProduct: createProduct,
          posCashierWeighedToggle: weighedToggle,
          posCashierAddPhoto: addPhoto,
          posCashierOrderPad: orderPad,
          posCashierOrderConfirm: orderConfirm,
        },
      });
      await onSaved();
      toast.success("Till settings updated");
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save cashier permissions",
      );
    } finally {
      setSaving(false);
    }
  };

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
              <Settings2 className="size-4 text-[var(--pos-primary)]" />
              Till settings
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Allow cashiers on this business to edit prices, add products, or
              mark items as weighted from the POS. Photo upload is for owners
              and admins only. Managers with pricing/catalog permissions always
              can use the cashier tools that match their permissions. Order pad
              and Confirm still require the matching permissions.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(70dvh,28rem)] space-y-3 overflow-y-auto px-4 py-4">
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-3",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--pos-primary)]"
              checked={priceEdit}
              onChange={(e) => setPriceEdit(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Edit prices
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                Cashiers may change unit price on a line (overrides shelf price).
                Flag: {POS_CASHIER_CAPABILITY_FLAGS.priceEdit}
              </span>
            </span>
          </label>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-3",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--pos-primary)]"
              checked={createProduct}
              onChange={(e) => setCreateProduct(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Add products
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                Cashiers may create a simple sellable product and add it to the
                cart. Flag: {POS_CASHIER_CAPABILITY_FLAGS.createProduct}
              </span>
            </span>
          </label>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-3",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--pos-primary)]"
              checked={weighedToggle}
              onChange={(e) => setWeighedToggle(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Mark items as weighted
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                Cashiers may toggle sell-by-weight on a cart line (kg qty). Flag:{" "}
                {POS_CASHIER_CAPABILITY_FLAGS.weighedToggle}
              </span>
            </span>
          </label>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-3",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--pos-primary)]"
              checked={addPhoto}
              onChange={(e) => setAddPhoto(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Add product photos from the till
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                Owners and admins can upload photos on shelf tiles missing an
                image. Flag: {POS_CASHIER_CAPABILITY_FLAGS.addPhoto}
              </span>
            </span>
          </label>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-3",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--pos-primary)]"
              checked={orderPad}
              onChange={(e) => setOrderPad(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Order pad on till
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                Full-screen order pad drawer for staff who can write the order
                pad. Flag: {POS_CASHIER_CAPABILITY_FLAGS.orderPad}
              </span>
            </span>
          </label>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-3",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--pos-primary)]"
              checked={orderConfirm}
              onChange={(e) => setOrderConfirm(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Confirm orders on till
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                Full-screen drawer to receive Path A purchase orders. Flag:{" "}
                {POS_CASHIER_CAPABILITY_FLAGS.orderConfirm}
              </span>
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2 border-t border-border/40 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="bg-[var(--pos-primary)] text-[var(--pos-primary-foreground,#fff)] hover:bg-[var(--pos-primary)]/90"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  saveDisabled?: boolean;
  children: ReactNode;
};

/** Edit saved checkout delivery/contact fields above the checkout drawer stack. */
export function ShopCheckoutDeliveryEditModal({
  open,
  onOpenChange,
  onSave,
  saveDisabled = false,
  children,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        className="z-[80] gap-0 overflow-hidden p-0 sm:max-w-md"
        overlayClassName="z-[79]"
      >
        <DialogHeader className="border-b border-border/50 px-5 py-4">
          <DialogTitle>Edit delivery details</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5">
          {children}
        </div>
        <DialogFooter className="border-t border-border/50 px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saveDisabled} onClick={onSave}>
            Save details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

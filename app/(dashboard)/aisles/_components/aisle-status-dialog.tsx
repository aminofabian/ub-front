"use client";

import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AisleRecord } from "@/lib/api";

export function AisleStatusDialog({
  aisle,
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  aisle: AisleRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onConfirm: () => void;
}) {
  if (!aisle) return null;
  const activating = !aisle.active;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {activating ? "Activate shelf zone?" : "Deactivate shelf zone?"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {activating ? (
              <>
                <strong className="text-foreground">{aisle.name}</strong> will appear
                in pickers and header filters again.
              </>
            ) : (
              <>
                <strong className="text-foreground">{aisle.name}</strong> will hide
                from pickers. {aisle.productCount.toLocaleString()} assigned products
                keep their tag until you move them.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
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
            variant={activating ? "default" : "destructive"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {activating ? "Activate" : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

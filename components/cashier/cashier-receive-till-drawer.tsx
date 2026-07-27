"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Truck } from "lucide-react";

import { SupplierReceiveWorkspace } from "@/components/supplier-receive/supplier-receive-workspace";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CashierReceiveTillDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string | null;
  supplierName?: string | null;
  onPosted?: () => void;
};

/**
 * Slide-over receive till on top of Cashier — never navigates away from `/cashier`.
 * Header collapses so Shelf + Manifest get vertical space; drafts persist locally.
 */
export function CashierReceiveTillDrawer({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  onPosted,
}: CashierReceiveTillDrawerProps) {
  const [headerOpen, setHeaderOpen] = useState(true);
  const title = supplierName?.trim()
    ? `Receive · ${supplierName.trim()}`
    : "Receive till";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setHeaderOpen(true);
      }}
    >
      <DialogContent
        side="right"
        showCloseButton
        overlayClassName="bg-black/40 supports-[backdrop-filter]:backdrop-blur-[2px] dark:bg-black/50"
        className={cn(
          "gap-0 border-border/50 p-0 sm:rounded-l-none",
          "w-full max-w-none sm:max-w-[min(100vw,96rem)]",
          "flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background",
        )}
      >
        <div className="shrink-0 border-b border-border/60 bg-muted/20">
          <div className="flex items-start gap-2 px-3 py-2.5 pr-12">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center border border-border bg-background text-primary">
              <Truck className="size-4" aria-hidden />
            </span>
            <DialogHeader className="min-w-0 flex-1 space-y-0.5 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Open till · stays on cashier
              </p>
              <DialogTitle className="truncate text-base font-semibold leading-tight">
                {title}
              </DialogTitle>
              {headerOpen ? (
                <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                  Scan or tap products into the manifest. Drafts save on this
                  device — close anytime and resume from Suppliers.
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">
                  Supplier receive till drawer on cashier
                </DialogDescription>
              )}
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0"
              aria-expanded={headerOpen}
              aria-label={headerOpen ? "Collapse header" : "Expand header"}
              onClick={() => setHeaderOpen((v) => !v)}
            >
              {headerOpen ? (
                <ChevronUp className="size-4" aria-hidden />
              ) : (
                <ChevronDown className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {open && supplierId ? (
            <SupplierReceiveWorkspace
              key={supplierId}
              supplierId={supplierId}
              variant="drawer"
              onClose={() => onOpenChange(false)}
              onPosted={() => {
                onPosted?.();
                onOpenChange(false);
              }}
            />
          ) : open ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Pick a supplier to open the receive till.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

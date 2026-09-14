"use client";

import { Building2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  ExtraCostsBody,
  type ExtraRow,
} from "./extra-costs-section";
import {
  nsdFieldLabel,
  nsdInput,
  nsdSelect,
  nsdTextarea,
} from "./new-supply-drawer-ui";

type SupplyReceiptDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  supplier: SupplierRecord | null;
  onChangeSupplier: () => void;
  branchId: string;
  branches: { id: string; name: string }[];
  branchesLoading: boolean;
  branchLocked: boolean;
  selectedBranchName: string;
  onBranchChange: (branchId: string) => void;
  receivedAtLocal: string;
  onReceivedAtChange: (value: string) => void;
  docRef: string;
  onDocRefChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  extras: ExtraRow[];
  onExtrasChange: (extras: ExtraRow[]) => void;
  /** Scroll extras into view when opened from Summary. */
  focusExtras?: boolean;
};

/**
 * Nested right drawer for delivery meta once a supplier is selected.
 * Keeps the main New supply surface free for the receive grid.
 */
export function SupplyReceiptDrawer({
  open,
  onOpenChange,
  busy,
  supplier,
  onChangeSupplier,
  branchId,
  branches,
  branchesLoading,
  branchLocked,
  selectedBranchName,
  onBranchChange,
  receivedAtLocal,
  onReceivedAtChange,
  docRef,
  onDocRefChange,
  notes,
  onNotesChange,
  extras,
  onExtrasChange,
  focusExtras = false,
}: SupplyReceiptDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        className="z-[300] gap-0 rounded-none p-0 sm:rounded-none"
        overlayClassName="z-[295]"
        onOpenAutoFocus={(e) => {
          if (focusExtras) {
            e.preventDefault();
            window.setTimeout(() => {
              document
                .getElementById("supply-receipt-extras")
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 50);
          }
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-border bg-[#e8eef5] px-4 py-3 dark:bg-muted/40">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-base tracking-tight">
                Delivery details
              </DialogTitle>
              <DialogDescription className="text-[12px]">
                Branch, receive time, references, and extra costs.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {supplier ? (
              <div className="flex items-start gap-2 border border-primary/25 bg-primary/[0.04] px-2.5 py-2">
                <span className="flex size-7 shrink-0 items-center justify-center border border-primary/25 bg-background text-primary">
                  <Truck className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {supplier.name}
                  </p>
                  {supplier.code?.trim() ? (
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {supplier.code.trim()}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Supplier
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 rounded-none px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => {
                    onOpenChange(false);
                    onChangeSupplier();
                  }}
                >
                  Change
                </Button>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {branchLocked ? (
                selectedBranchName ? (
                  <div className="flex flex-col gap-1">
                    <span className={nsdFieldLabel}>Branch</span>
                    <div className="flex h-9 items-center gap-1.5 border border-border bg-background px-2.5 sm:h-8">
                      <Building2
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate text-sm font-medium text-foreground">
                        {selectedBranchName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="col-span-2 text-xs text-destructive">
                    No branch assigned — contact your administrator.
                  </p>
                )
              ) : (
                <label className="flex flex-col gap-1">
                  <span className={nsdFieldLabel}>Branch</span>
                  <select
                    className={cn(nsdSelect, "bg-background")}
                    value={branchId}
                    onChange={(e) => onBranchChange(e.target.value)}
                    disabled={busy || branchesLoading || branches.length === 0}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Received</span>
                <input
                  type="datetime-local"
                  className={cn(nsdInput, "bg-background")}
                  value={receivedAtLocal}
                  onChange={(e) => onReceivedAtChange(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>

            <div className="grid gap-3">
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Delivery note / DN ref</span>
                <input
                  className={cn(nsdInput, "bg-background font-mono text-xs")}
                  value={docRef}
                  onChange={(e) => onDocRefChange(e.target.value)}
                  disabled={busy}
                  placeholder="e.g. DN-1042"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Notes</span>
                <textarea
                  className={cn(nsdTextarea, "min-h-[3rem] bg-background text-xs")}
                  rows={2}
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  disabled={busy}
                  placeholder="Internal note…"
                />
              </label>
            </div>

            <div
              id="supply-receipt-extras"
              className="border border-border bg-card"
            >
              <div className="border-b border-border bg-[#e8eef5] px-2.5 py-2 dark:bg-muted/40">
                <p className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                  Extra costs
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Transport, handling — added to payable
                </p>
              </div>
              <div className="p-2.5">
                <ExtraCostsBody
                  extras={extras}
                  onChange={onExtrasChange}
                  busy={busy}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-background px-4 py-3">
            <Button
              type="button"
              className="h-10 w-full rounded-none text-sm font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

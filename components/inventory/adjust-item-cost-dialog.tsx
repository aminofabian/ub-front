"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CostIssueRowRecord } from "@/lib/api";

import { AdjustItemCostPanel } from "./adjust-item-cost-panel";

type Props = {
  open: boolean;
  row: CostIssueRowRecord | null;
  branchId?: string;
  branchLabel?: string;
  currency: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: CostIssueRowRecord) => void;
};

export function AdjustItemCostDialog({
  open,
  row,
  branchId,
  branchLabel,
  currency,
  onOpenChange,
  onSaved,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-none border border-border p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-border bg-[#e8eef5] px-4 py-3 dark:bg-muted/40">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Adjust cost
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {row ? row.name : ""}
            {branchLabel ? ` · ${branchLabel}` : ""}
          </DialogDescription>
        </DialogHeader>

        <AdjustItemCostPanel
          row={open ? row : null}
          branchId={branchId}
          branchLabel={branchLabel}
          currency={currency}
          canAdjust
          onCancel={() => onOpenChange(false)}
          onSaved={(updated) => {
            onOpenChange(false);
            onSaved(updated);
          }}
        />

        {!row ? (
          <DialogFooter className="gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 py-3 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Phone filter sheet (§4.5). Search stays visible on the page; every other
 * filter moves behind a `FilterSheetTrigger` that opens this bottom sheet with
 * labelled, touch-sized controls and a sticky "Show results" action.
 *
 * The same field markup is rendered inline on `sm+` and into this sheet below
 * `sm`, so the two stay in sync without duplicating logic.
 */
export function FilterSheet({
  open,
  onOpenChange,
  title = "Filters",
  description,
  activeCount = 0,
  onApply,
  onReset,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Drives the count on the apply button. */
  activeCount?: number;
  /** Applied just before the sheet closes. */
  onApply?: () => void;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="bottom" sheetDrag className="gap-0 p-0 sm:max-w-md">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--op-rule)] px-4 py-3 pr-12">
          <DialogTitle className="text-[1.35rem]">{title}</DialogTitle>
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Reset
            </button>
          ) : null}
        </div>
        {description ? (
          <DialogDescription className="px-4 pt-3 text-xs">
            {description}
          </DialogDescription>
        ) : null}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {children}
        </div>
        <div className="border-t border-[var(--op-rule)] bg-[var(--op-surface)] p-3">
          <Button
            type="button"
            className="h-11 w-full rounded-none"
            onClick={() => {
              onApply?.();
              onOpenChange(false);
            }}
          >
            {activeCount > 0 ? `Show results (${activeCount})` : "Show results"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Phone-only trigger for {@link FilterSheet}; pair with a `sm+` inline panel. */
export function FilterSheetTrigger({
  onClick,
  activeCount = 0,
  className,
}: {
  onClick: () => void;
  activeCount?: number;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-9 shrink-0 gap-1.5 rounded-none px-3 text-xs", className)}
      onClick={onClick}
    >
      <SlidersHorizontal className="size-3.5" aria-hidden />
      Filters
      {activeCount > 0 ? (
        <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--pos-primary,#0f766e)] px-1 text-[10px] font-semibold text-white">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
}

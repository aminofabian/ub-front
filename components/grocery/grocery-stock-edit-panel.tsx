"use client";

import { PencilLine } from "lucide-react";

type GroceryStockEditPanelProps = {
  lastLabel?: string | null;
  lastQty?: number | null;
};

/** Side rail copy for grocery Edit stock mode. */
export function GroceryStockEditPanel({
  lastLabel,
  lastQty,
}: GroceryStockEditPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 py-2 dark:border-border/40">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
          Edit stock
        </h2>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Tap a product on the shelf to set on-hand for this branch.
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <span className="flex size-10 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]">
          <PencilLine className="size-4" aria-hidden />
        </span>
        {lastLabel != null && lastQty != null ? (
          <p className="text-[12px] leading-snug text-foreground">
            <span className="font-semibold">{lastLabel}</span>
            {" "}
            set to{" "}
            <span className="font-semibold tabular-nums">{lastQty}</span>
          </p>
        ) : (
          <p className="max-w-[14rem] text-[12px] leading-relaxed text-muted-foreground">
            Search or browse, then tap a tile. Increases and decreases post
            immediately.
          </p>
        )}
      </div>
    </div>
  );
}

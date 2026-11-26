"use client";

import {
  CircleHelp,
  Package,
  PencilLine,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "1",
    title: "Tap the box on Qty",
    body: "That marks the line as bought in packs. A short sheet asks what one pack holds.",
  },
  {
    n: "2",
    title: "Describe one pack",
    body: "Eggs tray of 30 → call it a tray, type 30 (or tap a size chip), then the price of one tray.",
  },
  {
    n: "3",
    title: "Type packs on the line",
    body: "Qty becomes packs. Ten trays → type 10. The ×30 badge stays on the cell so stock can rise by pieces.",
  },
  {
    n: "4",
    title: "Cost and sell use the same unit",
    body: "Cost is the pack price. Sell is the shelf price for how this product sells — per tray when it is a tray SKU, per piece when you break cartons into sachets. Margin compares those two.",
  },
] as const;

/**
 * In-app guide for pack receiving on New supply.
 * Nested inside FormDrawer — uses a high z-index so it sits above the sheet.
 */
export function SupplyPackGuideDrawer({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        side="right"
        className="z-[300] gap-0 p-0"
        overlayClassName="z-[295]"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-border/70 bg-[color:var(--kiosk-elevated,#FCFAF5)] px-5 pb-4 pt-5 dark:bg-muted/25">
            <DialogHeader className="pr-10 text-left">
              <DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-cormorant)] text-[1.45rem] font-medium tracking-tight">
                <span className="grid size-8 place-items-center border border-primary/30 bg-primary/10 text-primary">
                  <Package className="size-4" aria-hidden />
                </span>
                Bought as a pack
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed">
                When the supplier sells trays or cartons, count packs on the
                line — we raise stock in pieces and keep cost, sell, and margin
                on the same unit.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-1.5 border border-border/80 bg-background p-3">
              <div className="flex items-stretch gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1 border border-primary/25 bg-primary/[0.06] px-1.5 py-1.5">
                  <span className="font-mono text-sm font-bold tabular-nums text-primary">
                    10
                  </span>
                  <span className="font-mono text-[10px] font-black text-foreground">
                    ×30
                  </span>
                  <Package
                    className="ml-auto size-3.5 text-primary"
                    aria-hidden
                  />
                </div>
                <div className="flex min-w-[4.5rem] flex-col items-end justify-center border border-border px-2">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    430
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    / tray
                  </span>
                </div>
                <div className="flex min-w-[4.5rem] flex-col items-end justify-center border border-border px-2">
                  <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                    450
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    sell / tray
                  </span>
                </div>
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Ten trays @ 430 → pay 4,300 · stock +300 · sell total 4,500 ·
                margin about +4.7%
              </p>
            </div>
          </div>

          <div className="space-y-2.5 px-5 py-4">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="flex items-start gap-3 border border-border/70 bg-card px-3 py-2.5"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 font-mono text-[11px] font-bold tabular-nums text-primary">
                  {step.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold tracking-tight text-foreground">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border/60 px-5 py-4">
            <p className="text-[12px] font-semibold text-muted-foreground">
              Also useful
            </p>
            <div className="grid gap-2">
              <TipRow
                icon={PencilLine}
                title="Change pack size"
                body="Tap the ×30 badge on Qty to reopen the sheet and edit pieces."
              />
              <TipRow
                icon={ShoppingBasket}
                title="Back to pieces"
                body="Tap the box again to turn pack mode off — qty and cost become unit entry again."
              />
              <TipRow
                icon={Sparkles}
                title="Why it matters"
                body="You pay for trays. Stock counts pieces. Shelf price follows how you sell. Pack mode keeps all three honest without mental maths."
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TipRow({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof PencilLine;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2.5 text-[12px] leading-snug">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-primary/80" aria-hidden />
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{title}. </span>
        {body}
      </p>
    </div>
  );
}

/** Compact header control that opens {@link SupplyPackGuideDrawer}. */
export function SupplyPackGuideHintButton({
  className,
  open,
  onOpenChange,
}: {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <SupplyPackGuideDrawer
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-none border border-primary/25 bg-primary/[0.06] px-2.5 text-xs font-semibold text-primary",
            "hover:bg-primary/10 touch-manipulation",
            "sm:h-8 sm:px-2 sm:text-[10px]",
            className,
          )}
          title="How pack receiving works"
        >
          <CircleHelp className="size-3.5" aria-hidden />
          Pack hint
        </button>
      }
    />
  );
}

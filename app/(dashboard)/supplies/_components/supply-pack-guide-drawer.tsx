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
    body: "That marks the line as sold as a pack. A short sheet asks how many pieces are in one carton.",
  },
  {
    n: "2",
    title: "Set pieces in the pack",
    body: "Royco of 40 → type 40 (or tap a chip). Optional: enter the pack price so we show each-cost instantly.",
  },
  {
    n: "3",
    title: "Type packs, not pieces",
    body: "Qty becomes packs. One carton → type 1. Two cartons → type 2. The ×40 badge stays on the cell.",
  },
  {
    n: "4",
    title: "Type the pack price in Cost",
    body: "What you paid for one carton. We divide by pieces for unit cost, raise stock by packs × pieces, and keep margin honest.",
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
          <div className="border-b border-amber-900/15 bg-[color-mix(in_srgb,oklch(0.86_0.08_85)_55%,var(--card))] px-5 pb-4 pt-5 dark:border-amber-200/15 dark:bg-amber-950/35">
            <DialogHeader className="pr-10 text-left">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-950/65 dark:text-amber-100/70">
                Receiving tip
              </p>
              <DialogTitle className="flex items-center gap-2 pt-1 text-lg">
                <span className="grid size-8 place-items-center border border-amber-900/35 bg-amber-100 text-amber-950 dark:border-amber-200/30 dark:bg-amber-950/70 dark:text-amber-100">
                  <Package className="size-4" aria-hidden />
                </span>
                Sold as a pack
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed">
                When the supplier sells a carton (Royco ×40, eggs ×30), count
                packs on the line — we convert to shelf pieces and unit cost.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex items-stretch gap-2 border border-amber-900/20 bg-background/80 p-2 dark:border-amber-200/20">
              <div className="flex min-w-0 flex-1 items-center gap-1 border border-amber-800/25 bg-amber-50/90 px-1.5 py-1.5 dark:bg-amber-950/40">
                <span className="font-mono text-sm font-bold tabular-nums text-primary">
                  1
                </span>
                <span className="font-mono text-[10px] font-black text-amber-950 dark:text-amber-100">
                  ×40
                </span>
                <Package className="ml-auto size-3.5 text-amber-950 dark:text-amber-100" aria-hidden />
              </div>
              <div className="flex min-w-[4.5rem] items-center justify-end border border-amber-800/25 bg-amber-50/90 px-2 font-mono text-sm font-semibold tabular-nums dark:bg-amber-950/40">
                400
                <span className="ml-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-950/60 dark:text-amber-100/60">
                  ea
                </span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-amber-950/70 dark:text-amber-100/65">
              One pack of 40 at 400 → stock +40, unit cost 10.00
            </p>
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
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Also useful
            </p>
            <div className="grid gap-2">
              <TipRow
                icon={PencilLine}
                title="Change pack size"
                body="Tap the ×40 badge on Qty to reopen the sheet and edit pieces."
              />
              <TipRow
                icon={ShoppingBasket}
                title="Back to pieces"
                body="Tap the box again to turn pack mode off — qty and cost become unit entry again."
              />
              <TipRow
                icon={Sparkles}
                title="Why it matters"
                body="You pay for cartons. Stock and shelf price live on pieces. Pack mode keeps both honest without mental maths."
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
      <Icon
        className="mt-0.5 size-3.5 shrink-0 text-primary/80"
        aria-hidden
      />
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
            "inline-flex h-9 items-center gap-1 rounded-none border border-amber-900/25 bg-amber-50 px-2.5 text-xs font-semibold text-amber-950",
            "hover:bg-amber-100 touch-manipulation",
            "dark:border-amber-200/25 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950/70",
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

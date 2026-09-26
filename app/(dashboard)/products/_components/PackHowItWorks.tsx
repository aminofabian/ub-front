"use client";

import { CircleHelp } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function SaleLine({ label, takes }: { label: string; takes: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border/70 py-1 first:border-t-0">
      <span className="text-[12px] text-foreground">{label}</span>
      <span className="shrink-0 text-right text-[12px] font-semibold tabular-nums text-foreground">
        {takes}
      </span>
    </div>
  );
}

function Example({
  product,
  stock,
  lines,
  note,
}: {
  product: string;
  stock: string;
  lines: { label: string; takes: string }[];
  note: string;
}) {
  return (
    <div className="border border-border bg-background px-3 py-2.5">
      <p className="text-sm font-semibold tracking-tight text-foreground">
        {product}
      </p>
      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
        {stock}
      </p>
      <div className="mt-2">
        {lines.map((line) => (
          <SaleLine key={line.label} label={line.label} takes={line.takes} />
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-snug text-foreground/80">{note}</p>
    </div>
  );
}

export function PackHowItWorksButton({
  className,
}: {
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 border border-border bg-background px-2 text-[10px] font-semibold text-foreground/70",
            "hover:border-foreground/30 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40",
            className,
          )}
        >
          <CircleHelp className="size-3" aria-hidden />
          How this works
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg gap-3 p-4">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base tracking-tight">
            Sell it whole, or take a piece
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-snug">
            You stock the whole thing. A smaller sale still comes out of that
            same stock. The price is for what the customer takes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          <Example
            product="Watermelon"
            stock="You keep whole melons. One melon cuts into 20 pieces."
            lines={[
              { label: "Sell one melon", takes: "1 melon leaves" },
              { label: "Sell one piece", takes: "1/20 of a melon leaves" },
            ]}
            note="Twenty piece sales empty one melon. Profit on a piece uses a twentieth of what that melon cost."
          />
          <Example
            product="Cooking oil"
            stock="You keep 20 litre tins. You can sell the tin, or weigh some out."
            lines={[
              { label: "Sell the 20 litres", takes: "20 litres leave" },
              { label: "Weigh 500ml", takes: "0.5 litres leave" },
              { label: "Weigh 250ml", takes: "0.25 litres leave" },
            ]}
            note="The tin is the stock. 250ml and 500ml are portions of it, not separate tins."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

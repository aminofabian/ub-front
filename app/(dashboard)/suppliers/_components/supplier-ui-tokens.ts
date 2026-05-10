import { cn } from "@/lib/utils";

/** Tiny caps label above fields — consistent hierarchy */
export const supFieldLabel =
  "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

const supControlBase =
  "w-full rounded-xl border border-input bg-background text-sm shadow-sm transition-[color,box-shadow] placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

/** Single-line inputs */
export const supInput = cn(supControlBase, "h-10 px-3");

/** Native selects */
export const supSelect = cn(supControlBase, "h-10 cursor-pointer px-3 py-0");

/** Multi-line */
export const supTextarea = cn(supControlBase, "min-h-20 px-3 py-2.5 resize-y");

/** Standard card surface */
export const supCard =
  "rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm";

/** Dense inset card (nested inside another card) */
export const supCardInset = "rounded-xl border border-border/50 bg-muted/20";

/** Column panel chrome — xl three-column workspace */
export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
);

export const supPanelHeader =
  "shrink-0 border-b border-border/50 bg-muted/30 px-4 py-3.5 backdrop-blur-sm";

export const supPanelBody =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:max-h-[calc(100dvh-11rem)]";

export const supPanelBodyFill =
  "flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain p-4 lg:max-h-[calc(100dvh-11rem)]";

/** Primary kicker — uses theme primary colour */
export const supPanelKicker =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-primary";

/** Violet kicker — for catalog column */
export const supPanelKickerViolet =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400";

/** Status badge helper */
export function statusBadgeClass(status: string): string {
  if (status === "active")
    return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300";
  if (status === "blocked")
    return "bg-destructive/10 text-destructive ring-1 ring-destructive/20";
  return "bg-muted text-muted-foreground ring-1 ring-border/60";
}

import { cn } from "@/lib/utils";

/** Label above fields / filters — consistent hierarchy */
export const supFieldLabel =
  "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

const supControlBase =
  "w-full rounded-lg border border-input bg-background text-sm shadow-sm transition-[color,box-shadow] placeholder:text-muted-foreground/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

/** Single-line inputs */
export const supInput = cn(supControlBase, "h-10 px-3");

/** Native selects */
export const supSelect = cn(supControlBase, "h-10 cursor-pointer px-3 py-0");

/** Multi-line */
export const supTextarea = cn(supControlBase, "min-h-[5rem] px-3 py-2.5");

/** Card / panel surface */
export const supCard =
  "rounded-xl border border-border/60 bg-card/90 text-card-foreground shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]";

/** Dense card (nested) */
export const supCardInset = "rounded-lg border border-border/50 bg-muted/20";

/** Column panel chrome (xl sidebars) */
export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/55 shadow-md",
  "bg-gradient-to-b from-card to-muted/15 ring-1 ring-border/30 dark:from-card/95 dark:to-muted/20",
);

export const supPanelHeader = "shrink-0 border-b border-border/50 bg-muted/40 px-4 py-3 backdrop-blur-sm";

export const supPanelBody = "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:max-h-[calc(100dvh-11rem)]";

export const supPanelKicker = "text-[10px] font-bold uppercase tracking-[0.12em] text-primary/90";

export const supPanelKickerViolet =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300";
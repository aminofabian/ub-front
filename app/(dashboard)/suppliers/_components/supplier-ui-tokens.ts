import { cn } from "@/lib/utils";

/* ── Typography ─────────────────────────────────────────────────────────── */

export const supKicker =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground";

export const supKickerPrimary =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-primary";

export const supKickerViolet =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400";

export const supFieldLabel =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export const supSectionTitle =
  "font-heading text-sm font-semibold tracking-tight text-foreground";

export const supSectionHint =
  "mt-1 text-xs leading-relaxed text-muted-foreground";

/* ── Controls ───────────────────────────────────────────────────────────── */

const supControlBase = cn(
  "w-full rounded-lg border border-input/80 bg-background text-sm shadow-sm",
  "transition-[border-color,box-shadow,background-color] duration-200",
  "placeholder:text-muted-foreground/45",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring/60",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const supInput = cn(supControlBase, "h-10 px-3");

export const supSelect = cn(supControlBase, "h-10 cursor-pointer px-3 py-0");

export const supTextarea = cn(supControlBase, "min-h-[5.5rem] resize-y px-3 py-2.5");

/* ── Surfaces ───────────────────────────────────────────────────────────── */

export const supPageRoot = cn(
  "relative flex h-full min-h-0 w-full max-w-none flex-col",
);

export const supHeroSection = cn(
  "relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm",
  "ring-1 ring-black/[0.03] dark:ring-white/[0.05] sm:p-6",
);

export const supHeroGlowPrimary =
  "pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-primary/[0.08] blur-3xl";

export const supHeroGlowAccent =
  "pointer-events-none absolute -bottom-14 left-1/4 size-36 rounded-full bg-violet-500/[0.06] blur-3xl";

export const supWorkspaceShell = cn(
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60",
  "bg-gradient-to-b from-card via-card to-muted/15 shadow-md",
  "ring-1 ring-black/[0.03] dark:from-card dark:to-muted/10 dark:ring-white/[0.05]",
);

export const supWorkspaceInner = "flex min-h-0 flex-1 flex-col gap-4 p-3 sm:gap-5 sm:p-4 lg:p-5";

export const supCard = cn(
  "rounded-xl border border-border/55 bg-card/90 text-card-foreground shadow-sm",
  "ring-1 ring-black/[0.02] dark:bg-card/95 dark:ring-white/[0.04]",
);

export const supCardInset = cn(
  "rounded-lg border border-border/45 bg-muted/20 ring-1 ring-inset ring-black/[0.02] dark:ring-white/[0.03]",
);

export const supSectionCard = cn(supCard, "overflow-hidden");

export const supSectionHeader = cn(
  "flex flex-wrap items-start justify-between gap-3 border-b border-border/45",
  "bg-gradient-to-r from-muted/35 via-muted/15 to-transparent px-4 py-3.5 sm:px-5",
);

export const supSectionBody = "p-4 sm:p-5";

export const supStatTile = cn(
  "rounded-lg border border-border/50 bg-background/90 px-3 py-2.5 shadow-sm",
  "ring-1 ring-black/[0.02] transition-colors duration-200 hover:border-border/70 dark:ring-white/[0.04]",
);

export const supFilterRail = cn(
  "flex shrink-0 flex-wrap items-end gap-3 rounded-lg border border-border/50",
  "bg-muted/25 px-3 py-3 shadow-sm ring-1 ring-inset ring-black/[0.02] dark:bg-muted/15 dark:ring-white/[0.04] sm:px-4 sm:py-3.5",
);

export const supDirectoryShell = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/55",
  "bg-card/95 shadow-sm ring-1 ring-black/[0.02] dark:bg-card dark:ring-white/[0.04]",
);

export const supDirectoryToolbar = cn(
  "flex shrink-0 items-center justify-between gap-3 border-b border-border/45",
  "bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-4 py-3 backdrop-blur-sm",
);

export const supTableHead = cn(
  "border-b border-border/45 bg-muted/35 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground",
);

export const supTableRow = cn(
  "border-b border-border/30 transition-colors duration-150 last:border-0",
  "hover:bg-muted/30",
);

export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/55",
  "bg-card/95 shadow-sm ring-1 ring-black/[0.02] dark:bg-card dark:ring-white/[0.04]",
);

export const supPanelHeader = cn(
  "relative shrink-0 overflow-hidden border-b border-border/45 px-4 py-3.5 sm:px-5",
  "bg-gradient-to-br from-muted/35 via-background to-background",
);

export const supPanelHeaderIcon = (accent: "primary" | "violet" = "primary") =>
  cn(
    "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 sm:size-10",
    accent === "violet"
      ? "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400"
      : "bg-primary/10 text-primary ring-primary/20",
  );

export const supPanelBody =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:max-h-[calc(100dvh-11rem)]";

export const supPanelBodyFill =
  "flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain p-4 sm:p-5 lg:max-h-[calc(100dvh-11rem)]";

/** @deprecated use supKickerPrimary */
export const supPanelKicker = supKickerPrimary;

/** @deprecated use supKickerViolet */
export const supPanelKickerViolet = supKickerViolet;

export const supEmptyState = cn(
  "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/55",
  "bg-gradient-to-b from-muted/15 to-transparent px-6 py-10 text-center sm:py-12",
);

export const supEmptyIconWrap = cn(
  "flex size-14 items-center justify-center rounded-xl border border-dashed",
  "border-primary/20 bg-primary/[0.04] text-primary/45 shadow-sm",
);

export const supChip = cn(
  "inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-[11px] font-medium",
  "ring-1 ring-inset transition-colors duration-150",
);

export const supChipActive = cn(
  supChip,
  "bg-primary text-primary-foreground shadow-sm ring-primary/30",
);

export const supChipIdle = cn(
  supChip,
  "bg-background text-muted-foreground ring-border/55 hover:bg-muted/50 hover:text-foreground",
);

export const supDrawerFooter = cn(
  "flex flex-wrap items-center justify-end gap-2 sm:gap-2.5",
);

export const supBtnPrimary = cn(
  "h-10 gap-2 px-5 font-semibold shadow-sm transition-all duration-200",
  "hover:shadow-md active:scale-[0.98]",
);

export const supBtnOutline = cn(
  "h-10 px-4 font-medium shadow-sm transition-colors duration-200",
);

export const supRowActive = cn(
  "bg-primary/[0.07] ring-1 ring-inset ring-primary/15",
  "dark:bg-primary/[0.1]",
);

export const supRowHover = "hover:bg-muted/35";

export const supMotionIn =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300";

/* ── Status ─────────────────────────────────────────────────────────────── */

export function statusBadgeClass(status: string): string {
  if (status === "active")
    return "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-300";
  if (status === "blocked")
    return "bg-destructive/10 text-destructive ring-1 ring-destructive/25";
  return "bg-muted/80 text-muted-foreground ring-1 ring-border/55";
}

export function paymentStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100";
  if (s === "PARTIAL")
    return "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100";
  return "border-border/55 bg-muted/50 text-muted-foreground";
}

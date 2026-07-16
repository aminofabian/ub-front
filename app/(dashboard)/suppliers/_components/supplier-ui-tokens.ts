import { cn } from "@/lib/utils";

/* ── Typography ─────────────────────────────────────────────────────────── */

export const supKicker =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

export const supKickerPrimary =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-primary";

/** @deprecated use {@link supKickerPrimary} — kept for imports; uses theme primary */
export const supKickerViolet = supKickerPrimary;

export const supFieldLabel =
  "text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export const supSectionTitle =
  "font-heading text-sm font-semibold tracking-tight text-foreground";

export const supSectionHint =
  "mt-1 text-xs leading-relaxed text-muted-foreground";

/* ── Controls ───────────────────────────────────────────────────────────── */

const supControlBase = cn(
  "w-full rounded-lg border border-input/80 bg-background text-sm",
  "transition-[border-color,box-shadow,background-color] duration-150",
  "placeholder:text-muted-foreground/50",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40",
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
  "relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5",
);

export const supHeroGlowPrimary = "hidden";

export const supHeroGlowAccent = "hidden";

export const supWorkspaceShell = cn(
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm",
);

export const supWorkspaceInner =
  "flex min-h-0 flex-1 flex-col gap-0 p-0 sm:p-0";

export const supCard = cn(
  "rounded-xl border border-border/55 bg-card text-card-foreground shadow-sm",
);

export const supCardInset = cn(
  "rounded-lg border border-border/40 bg-muted/20",
);

export const supSectionCard = cn(supCard, "overflow-hidden");

export const supSectionHeader = cn(
  "flex flex-wrap items-start justify-between gap-3 border-b border-border/50",
  "bg-muted/25 px-4 py-3 sm:px-5",
);

export const supSectionBody = "p-4 sm:p-5";

export const supStatTile = cn(
  "rounded-lg border border-border/50 bg-background px-3 py-2.5",
  "transition-colors duration-150 hover:border-border hover:bg-muted/20",
);

export const supFilterRail = cn(
  "flex shrink-0 flex-wrap items-end gap-2 border-b border-border/50",
  "bg-muted/15 px-2.5 py-2",
);

export const supDirectoryShell = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card",
);

export const supDirectoryToolbar = cn(
  "flex shrink-0 items-center justify-between gap-3 border-b border-border/50",
  "bg-muted/20 px-3 py-2 sm:px-3.5",
);

export const supTableHead = cn(
  "border-b border-border/40 bg-muted/25 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
);

export const supTableRow = cn(
  "border-b border-border/25 transition-colors duration-100 last:border-0",
  "hover:bg-muted/20",
);

export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden border-border/50 bg-card",
);

export const supPanelHeader = cn(
  "relative shrink-0 border-b border-border/50 px-3 py-2.5 sm:px-3.5",
  "bg-muted/20",
);

export const supPanelHeaderIcon = (_accent: "primary" | "violet" = "primary") =>
  cn(
    "flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:size-8",
  );

export const supPanelBody =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain";

export const supPanelBodyFill =
  "flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain";

/** @deprecated use supKickerPrimary */
export const supPanelKicker = supKickerPrimary;

/** @deprecated use supKickerViolet */
export const supPanelKickerViolet = supKickerViolet;

export const supEmptyState = cn(
  "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/55",
  "bg-muted/10 px-6 py-10 text-center sm:py-12",
);

export const supEmptyIconWrap = cn(
  "flex size-12 items-center justify-center rounded-xl border border-dashed",
  "border-border/60 bg-muted/30 text-muted-foreground",
);

export const supChip = cn(
  "inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-medium",
  "ring-1 ring-inset transition-colors duration-100",
);

export const supChipActive = cn(
  supChip,
  "bg-primary text-primary-foreground shadow-sm ring-primary/25",
);

export const supChipIdle = cn(
  supChip,
  "bg-background text-muted-foreground ring-border/50 hover:bg-muted/40 hover:text-foreground hover:ring-border/70",
);

export const supDrawerFooter = cn(
  "flex flex-wrap items-center justify-end gap-2 sm:gap-2.5",
);

export const supBtnPrimary = cn(
  "h-9 gap-1.5 rounded-lg px-4 font-semibold shadow-sm transition-all duration-150",
  "hover:shadow active:scale-[0.98]",
);

export const supBtnOutline = cn(
  "h-9 rounded-lg px-3.5 font-medium transition-colors duration-150",
);

export const supRowActive = cn(
  "border-l-[3px] border-l-primary bg-primary/[0.07] pl-[calc(0.75rem-3px)]",
  "dark:bg-primary/[0.12]",
);

export const supRowActiveCompact = cn(
  "border-l-2 border-l-primary bg-primary/[0.07] pl-[calc(0.5rem-2px)]",
  "dark:bg-primary/[0.12]",
);

export const supRowHover = cn(
  "border-l-[3px] border-l-transparent hover:border-l-primary/30 hover:bg-muted/25",
);

export const supRowHoverCompact = cn(
  "border-l-2 border-l-transparent hover:border-l-primary/25 hover:bg-muted/20",
);

export const supMotionIn =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200";

/* ── Status ─────────────────────────────────────────────────────────────── */

export function statusBadgeClass(status: string): string {
  if (status === "active")
    return "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-300";
  if (status === "blocked")
    return "bg-destructive/10 text-destructive ring-1 ring-destructive/25";
  return "bg-muted/80 text-muted-foreground ring-1 ring-border/55";
}

export function statusDotClass(status: string): string {
  if (status === "active") return "bg-emerald-500";
  if (status === "blocked") return "bg-destructive";
  return "bg-muted-foreground/50";
}

export function paymentStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID")
    return "border-primary/30 bg-primary/10 text-primary dark:text-primary";
  if (s === "PARTIAL")
    return "border-primary/20 bg-primary/5 text-primary/90 dark:text-primary";
  return "border-border/55 bg-muted/50 text-muted-foreground";
}

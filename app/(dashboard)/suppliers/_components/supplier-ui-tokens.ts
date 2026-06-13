import { cn } from "@/lib/utils";

/* ── Typography ─────────────────────────────────────────────────────────── */

export const supKicker =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground";

export const supKickerPrimary =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-primary";

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
  "w-full rounded-xl border border-input/70 bg-background text-sm shadow-sm",
  "transition-[border-color,box-shadow,background-color] duration-200",
  "placeholder:text-muted-foreground/45",
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
  "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
  "ring-1 ring-black/[0.03] dark:ring-white/[0.05] sm:p-6",
);

export const supHeroGlowPrimary =
  "pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-primary/[0.08] blur-3xl";

export const supHeroGlowAccent =
  "pointer-events-none absolute -bottom-14 left-1/4 size-36 rounded-full bg-primary/[0.06] blur-3xl";

export const supWorkspaceShell = cn(
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/55",
  "bg-gradient-to-b from-card via-card to-muted/20 shadow-md",
  "ring-1 ring-black/[0.04] dark:from-card dark:to-muted/15 dark:ring-white/[0.06]",
);

export const supWorkspaceInner = "flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-3 lg:p-3";

export const supCard = cn(
  "rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm",
  "ring-1 ring-black/[0.03] dark:bg-card dark:ring-white/[0.05]",
);

export const supCardInset = cn(
  "rounded-xl border border-border/40 bg-gradient-to-br from-muted/25 to-muted/10",
  "ring-1 ring-inset ring-black/[0.02] dark:ring-white/[0.04]",
);

export const supSectionCard = cn(supCard, "overflow-hidden");

export const supSectionHeader = cn(
  "flex flex-wrap items-start justify-between gap-3 border-b border-border/40",
  "bg-gradient-to-r from-muted/40 via-muted/15 to-transparent px-4 py-3.5 sm:px-5",
);

export const supSectionBody = "p-4 sm:p-5";

export const supStatTile = cn(
  "rounded-xl border border-border/45 bg-background/95 px-3 py-2.5 shadow-sm",
  "ring-1 ring-black/[0.02] transition-all duration-200 hover:border-border/70 hover:shadow-md dark:ring-white/[0.04]",
);

export const supFilterRail = cn(
  "flex shrink-0 flex-wrap items-end gap-2 rounded-xl border border-border/45",
  "bg-gradient-to-br from-muted/30 via-muted/15 to-background/80 px-2.5 py-2 shadow-sm",
  "ring-1 ring-inset ring-black/[0.02] dark:from-muted/20 dark:to-muted/5 dark:ring-white/[0.04]",
);

export const supDirectoryShell = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/50",
  "bg-card shadow-sm ring-1 ring-black/[0.03] dark:bg-card dark:ring-white/[0.05]",
);

export const supDirectoryToolbar = cn(
  "flex shrink-0 items-center justify-between gap-3 border-b border-border/40",
  "bg-gradient-to-r from-primary/[0.04] via-muted/25 to-transparent px-4 py-2.5 backdrop-blur-sm",
);

export const supTableHead = cn(
  "border-b border-border/40 bg-muted/30 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground",
);

export const supTableRow = cn(
  "border-b border-border/25 transition-colors duration-150 last:border-0",
  "hover:bg-muted/25",
);

export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/50",
  "bg-card shadow-sm ring-1 ring-black/[0.03] dark:bg-card dark:ring-white/[0.05]",
);

export const supPanelHeader = cn(
  "relative shrink-0 overflow-hidden border-b border-border/40 px-3 py-2 sm:px-3.5",
  "bg-gradient-to-br from-primary/[0.05] via-muted/20 to-background",
);

export const supPanelHeaderIcon = (_accent: "primary" | "violet" = "primary") =>
  cn(
    "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20 shadow-sm sm:size-9",
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
  "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/50",
  "bg-gradient-to-b from-muted/20 via-muted/5 to-transparent px-6 py-12 text-center sm:py-14",
);

export const supEmptyIconWrap = cn(
  "flex size-16 items-center justify-center rounded-2xl border border-dashed",
  "border-primary/25 bg-primary/[0.06] text-primary/60 shadow-sm",
);

export const supChip = cn(
  "inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-xs font-medium",
  "ring-1 ring-inset transition-all duration-150",
);

export const supChipActive = cn(
  supChip,
  "bg-primary text-primary-foreground shadow-sm ring-primary/30",
);

export const supChipIdle = cn(
  supChip,
  "bg-background text-muted-foreground ring-border/50 hover:bg-muted/40 hover:text-foreground hover:ring-border/70",
);

export const supDrawerFooter = cn(
  "flex flex-wrap items-center justify-end gap-2 sm:gap-2.5",
);

export const supBtnPrimary = cn(
  "h-10 gap-2 rounded-xl px-5 font-semibold shadow-sm transition-all duration-200",
  "hover:shadow-md active:scale-[0.98]",
);

export const supBtnOutline = cn(
  "h-10 rounded-xl px-4 font-medium shadow-sm transition-colors duration-200",
);

export const supRowActive = cn(
  "border-l-[3px] border-l-primary bg-primary/[0.08] pl-[calc(0.75rem-3px)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
  "dark:bg-primary/[0.12]",
);

export const supRowActiveCompact = cn(
  "border-l-2 border-l-primary bg-primary/[0.08] pl-[calc(0.375rem-2px)]",
  "dark:bg-primary/[0.12]",
);

export const supRowHover = cn(
  "border-l-[3px] border-l-transparent hover:border-l-primary/35 hover:bg-muted/30",
  "dark:hover:bg-muted/20",
);

export const supRowHoverCompact = cn(
  "border-l-2 border-l-transparent hover:border-l-primary/30 hover:bg-muted/25",
);

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

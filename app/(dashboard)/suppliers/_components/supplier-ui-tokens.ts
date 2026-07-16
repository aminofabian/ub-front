import { cn } from "@/lib/utils";

/* ── Typography ─────────────────────────────────────────────────────────── */

export const supKicker =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export const supKickerPrimary =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-primary";

/** @deprecated use {@link supKickerPrimary} */
export const supKickerViolet = supKickerPrimary;

export const supFieldLabel =
  "text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

export const supSectionTitle =
  "text-xs font-semibold tracking-tight text-foreground";

export const supSectionHint =
  "mt-0.5 text-[11px] leading-snug text-muted-foreground";

/* ── Controls ───────────────────────────────────────────────────────────── */

const supControlBase = cn(
  "w-full rounded-none border border-border bg-background text-sm",
  "transition-[border-color,box-shadow] duration-100",
  "placeholder:text-muted-foreground/50",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/35 focus-visible:border-primary/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const supInput = cn(supControlBase, "h-9 px-2.5");

export const supSelect = cn(supControlBase, "h-9 cursor-pointer px-2.5 py-0");

export const supTextarea = cn(supControlBase, "min-h-[5rem] resize-y px-2.5 py-2");

/* ── Surfaces (Excel-like: square, hairline grid) ───────────────────────── */

export const supPageRoot = cn(
  "relative flex h-full min-h-0 w-full max-w-none flex-col",
);

export const supHeroSection = cn(
  "relative overflow-hidden rounded-none border border-border bg-card p-3",
);

export const supHeroGlowPrimary = "hidden";
export const supHeroGlowAccent = "hidden";

export const supWorkspaceShell = cn(
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-border bg-card",
);

export const supWorkspaceInner = "flex min-h-0 flex-1 flex-col gap-0 p-0";

export const supCard = cn(
  "rounded-none border border-border bg-card text-card-foreground",
);

export const supCardInset = cn(
  "rounded-none border border-border bg-muted/15",
);

export const supSectionCard = cn(supCard, "overflow-hidden");

export const supSectionHeader = cn(
  "flex flex-wrap items-center justify-between gap-2 border-b border-border",
  "bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40",
);

export const supSectionBody = "p-0";

export const supStatTile = cn(
  "rounded-none border border-border bg-background px-2 py-1.5",
);

export const supFilterRail = cn(
  "flex shrink-0 flex-wrap items-end gap-2 border-b border-border",
  "bg-[#eef2f7] px-2 py-1.5 dark:bg-muted/25",
);

export const supDirectoryShell = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card",
);

export const supDirectoryToolbar = cn(
  "flex shrink-0 items-center justify-between gap-2 border-b border-border",
  "bg-[#e8eef5] px-2.5 py-1 dark:bg-muted/40",
);

/** Spreadsheet column header */
export const supTableHead = cn(
  "border-b border-border bg-[#dce6f0] text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground/80",
  "dark:bg-muted/50 dark:text-muted-foreground",
);

export const supTableRow = cn(
  "border-b border-border/70 transition-colors duration-75",
  "hover:bg-[#e8f0fe] dark:hover:bg-muted/30",
  "odd:bg-[#fafbfd] dark:odd:bg-muted/[0.08]",
);

/** Excel selection fill */
export const supTableRowActive = cn(
  "!bg-[#cfe2f3] hover:!bg-[#cfe2f3] dark:!bg-primary/20 dark:hover:!bg-primary/20",
);

export const supTableCell = cn(
  "border-r border-border/60 px-2 py-1 last:border-r-0",
);

export const supKvTable = cn(
  "w-full border-collapse border border-border text-left text-xs",
);

export const supKvLabel = cn(
  "w-[38%] border border-border bg-[#eef2f7] px-2 py-1 font-medium text-muted-foreground dark:bg-muted/35",
);

export const supKvValue = cn(
  "border border-border bg-background px-2 py-1 text-foreground",
);

export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card",
);

export const supPanelHeader = cn(
  "relative shrink-0 border-b border-border px-2.5 py-1.5",
  "bg-[#e8eef5] dark:bg-muted/40",
);

export const supPanelHeaderIcon = (_accent: "primary" | "violet" = "primary") =>
  cn(
    "flex size-6 shrink-0 items-center justify-center rounded-none border border-border bg-background text-muted-foreground",
  );

export const supPanelBody =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain";

export const supPanelBodyFill =
  "flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain";

/** @deprecated */
export const supPanelKicker = supKickerPrimary;
/** @deprecated */
export const supPanelKickerViolet = supKickerViolet;

export const supEmptyState = cn(
  "flex flex-col items-center justify-center gap-2 border border-dashed border-border",
  "bg-muted/10 px-4 py-8 text-center",
);

export const supEmptyIconWrap = cn(
  "flex size-10 items-center justify-center rounded-none border border-dashed",
  "border-border bg-muted/20 text-muted-foreground",
);

export const supChip = cn(
  "inline-flex shrink-0 items-center rounded-none px-1.5 py-0.5 text-[10px] font-medium",
  "border border-border transition-colors duration-75",
);

export const supChipActive = cn(
  supChip,
  "border-primary/40 bg-primary text-primary-foreground",
);

export const supChipIdle = cn(
  supChip,
  "bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
);

export const supDrawerFooter = cn(
  "flex flex-wrap items-center justify-end gap-2",
);

export const supBtnPrimary = cn(
  "h-8 gap-1.5 rounded-none px-3 font-semibold",
);

export const supBtnOutline = cn(
  "h-8 rounded-none px-3 font-medium",
);

export const supRowActive = cn(
  "bg-[#cfe2f3] dark:bg-primary/20",
);

export const supRowActiveCompact = cn(
  "bg-[#cfe2f3] dark:bg-primary/20",
);

export const supRowHover = cn(
  "hover:bg-[#e8f0fe] dark:hover:bg-muted/30",
);

export const supRowHoverCompact = cn(
  "hover:bg-[#e8f0fe] dark:hover:bg-muted/30",
);

export const supMotionIn = "";

/* ── Status ─────────────────────────────────────────────────────────────── */

export function statusBadgeClass(status: string): string {
  if (status === "active")
    return "border border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (status === "blocked")
    return "border border-destructive/30 bg-destructive/10 text-destructive";
  return "border border-border bg-muted/60 text-muted-foreground";
}

export function statusDotClass(status: string): string {
  if (status === "active") return "bg-emerald-500";
  if (status === "blocked") return "bg-destructive";
  return "bg-muted-foreground/50";
}

export function paymentStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID")
    return "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (s === "PARTIAL")
    return "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return "border-border bg-muted/50 text-muted-foreground";
}

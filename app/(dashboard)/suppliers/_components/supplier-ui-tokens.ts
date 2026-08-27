import { cn } from "@/lib/utils";

/* ── Typography ─────────────────────────────────────────────────────────── */

export const supKicker =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]";

export const supKickerPrimary =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--pos-primary,#0f766e)]";

/** @deprecated use {@link supKickerPrimary} */
export const supKickerViolet = supKickerPrimary;

export const supFieldLabel =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]";

export const supSectionTitle =
  "text-xs font-semibold tracking-tight text-[var(--order-ink,#15231f)]";

export const supSectionHint =
  "mt-0.5 text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";

/* ── Controls ───────────────────────────────────────────────────────────── */

const supControlBase = cn(
  "w-full rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-sm",
  "transition-[border-color,box-shadow] duration-150",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_20%,transparent)] focus-visible:border-[var(--pos-primary,#0f766e)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const supInput = cn(supControlBase, "h-9 px-2.5");

export const supSelect = cn(supControlBase, "h-9 cursor-pointer px-2.5 py-0");

export const supTextarea = cn(supControlBase, "min-h-[5rem] resize-y px-2.5 py-2");

/** Borderless controls for label|value form tables */
export const supFormCellInput = cn(
  "h-8 w-full rounded-none border-0 bg-transparent px-2 py-1 text-sm",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const supFormCellSelect = cn(
  supFormCellInput,
  "cursor-pointer appearance-none",
);

export const supFormCellTextarea = cn(
  "min-h-[4.5rem] w-full resize-y rounded-none border-0 bg-transparent px-2 py-1.5 text-sm",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)]",
);

/* ── Surfaces ───────────────────────────────────────────────────────────── */

export const supPageRoot = cn(
  "relative flex h-full min-h-0 w-full max-w-none flex-col",
);

export const supHeroSection = cn(
  "relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white p-3 shadow-sm",
);

export const supHeroGlowPrimary = "hidden";
export const supHeroGlowAccent = "hidden";

export const supWorkspaceShell = cn(
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_88%,transparent)] shadow-[0_1px_0_color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent),0_16px_48px_-28px_color-mix(in_srgb,var(--order-ink,#15231f)_20%,transparent)]",
);

export const supWorkspaceInner = "flex min-h-0 flex-1 flex-col gap-0 p-0";

export const supCard = cn(
  "rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white text-[var(--order-ink,#15231f)]",
);

export const supCardInset = cn(
  "rounded-lg border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_50%,transparent)]",
);

export const supSectionCard = cn(supCard, "overflow-hidden");

export const supSectionHeader = cn(
  "flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]",
  "bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_65%,transparent)] px-3 py-2",
);

export const supSectionBody = "p-0";

export const supStatTile = cn(
  "rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white px-2.5 py-2",
);

export const supFilterRail = cn(
  "flex shrink-0 flex-wrap items-end gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]",
  "bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_55%,transparent)] px-3 py-2",
);

export const supDirectoryShell = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent",
);

export const supDirectoryToolbar = cn(
  "flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]",
  "bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_50%,transparent)] px-3 py-2",
);

/** Directory column header */
export const supTableHead = cn(
  "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)] text-[9px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
);

export const supTableRow = cn(
  "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] transition-colors duration-100",
  "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)]",
);

export const supTableRowActive = cn(
  "!bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] hover:!bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]",
);

export const supTableCell = cn(
  "border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] px-2.5 py-1.5 last:border-r-0",
);

export const supKvTable = cn(
  "w-full border-collapse rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] text-left text-xs overflow-hidden",
);

export const supKvLabel = cn(
  "w-[38%] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_55%,transparent)] px-2 py-1.5 font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]",
);

export const supKvValue = cn(
  "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white px-2 py-1.5 text-[var(--order-ink,#15231f)]",
);

export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white/80",
);

export const supPanelHeader = cn(
  "relative shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-2.5",
  "bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_55%,transparent)]",
);

export const supPanelHeaderIcon = (_accent: "primary" | "violet" = "primary") =>
  cn(
    "flex size-7 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]",
  );

export const supPanelBody =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]";

export const supPanelBodyFill =
  "flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain [scrollbar-width:thin]";

/** @deprecated */
export const supPanelKicker = supKickerPrimary;
/** @deprecated */
export const supPanelKickerViolet = supKickerViolet;

export const supEmptyState = cn(
  "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
  "bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_40%,transparent)] px-4 py-10 text-center",
);

export const supEmptyIconWrap = cn(
  "flex size-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
  "bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]",
);

export const supChip = cn(
  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
  "border transition-colors duration-100",
);

export const supChipActive = cn(
  supChip,
  "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_30%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white",
);

export const supChipIdle = cn(
  supChip,
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] hover:text-[var(--order-ink,#15231f)]",
);

export const supDrawerFooter = cn(
  "flex flex-wrap items-center justify-end gap-2",
);

export const supBtnPrimary = cn(
  "h-9 gap-1.5 rounded-md px-4 font-semibold",
);

export const supBtnOutline = cn(
  "h-9 rounded-md px-3 font-medium",
);

export const supRowActive = cn(
  "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]",
);

export const supRowActiveCompact = supRowActive;

export const supRowHover = cn(
  "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)]",
);

export const supRowHoverCompact = supRowHover;

export const supMotionIn = "";

/* ── Status ─────────────────────────────────────────────────────────────── */

export function statusBadgeClass(status: string): string {
  if (status === "active")
    return "border border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (status === "blocked")
    return "border border-destructive/25 bg-destructive/10 text-destructive";
  return "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
}

export function statusDotClass(status: string): string {
  if (status === "active") return "bg-emerald-500";
  if (status === "blocked") return "bg-destructive";
  return "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]";
}

export function paymentStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID")
    return "border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (s === "PARTIAL")
    return "border-amber-600/25 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
}

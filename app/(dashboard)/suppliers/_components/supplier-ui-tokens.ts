import { cn } from "@/lib/utils";

/* Same visual language as /order: white, hairline, rounded-none, teal selection. */

export const supKicker =
  "text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";

export const supKickerPrimary =
  "text-[11px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]";

/** @deprecated use {@link supKickerPrimary} */
export const supKickerViolet = supKickerPrimary;

export const supFieldLabel =
  "text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";

export const supSectionTitle =
  "text-[12px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]";

export const supSectionHint =
  "mt-0.5 text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";

/* ── Controls ───────────────────────────────────────────────────────────── */

const supControlBase = cn(
  "w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-sm",
  "transition-[border-color] duration-150",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
  "focus-visible:outline-none focus-visible:border-[var(--pos-primary,#0f766e)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const supInput = cn(supControlBase, "h-8 px-2.5");

export const supSelect = cn(supControlBase, "h-8 cursor-pointer px-2.5 py-0");

export const supTextarea = cn(supControlBase, "min-h-[5rem] resize-y px-2.5 py-2");

/** Borderless controls for label|value form tables */
export const supFormCellInput = cn(
  "h-8 w-full rounded-none border-0 bg-transparent px-2 py-1 text-sm",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const supFormCellSelect = cn(
  supFormCellInput,
  "cursor-pointer appearance-none",
);

export const supFormCellTextarea = cn(
  "min-h-[4.5rem] w-full resize-y rounded-none border-0 bg-transparent px-2 py-1.5 text-sm",
  "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
);

/* ── Surfaces ───────────────────────────────────────────────────────────── */

export const supPageRoot = cn(
  "relative flex h-full min-h-0 w-full max-w-none flex-col bg-white",
);

export const supHeroSection = cn(
  "relative overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3",
);

export const supHeroGlowPrimary = "hidden";
export const supHeroGlowAccent = "hidden";

export const supWorkspaceShell = cn(
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
);

export const supWorkspaceInner = "flex min-h-0 flex-1 flex-col gap-0 p-0";

export const supCard = cn(
  "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[var(--order-ink,#15231f)]",
);

export const supCardInset = cn(
  "rounded-none border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
);

export const supSectionCard = cn(supCard, "overflow-hidden");

export const supSectionHeader = cn(
  "flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
  "bg-white px-3 py-1.5",
);

export const supSectionBody = "p-0";

export const supStatTile = cn(
  "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-2",
);

export const supFilterRail = cn(
  "flex shrink-0 flex-wrap items-end gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
  "bg-white px-3 py-1.5",
);

export const supDirectoryShell = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white",
);

export const supDirectoryToolbar = cn(
  "flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
  "bg-white px-3 py-1.5",
);

/** Directory column header */
export const supTableHead = cn(
  "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
);

export const supTableRow = cn(
  "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] transition-colors duration-100",
  "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]",
);

export const supTableRowActive = cn(
  "bg-white text-[var(--pos-primary,#0f766e)]",
);

export const supTableCell = cn(
  "border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-2.5 py-1.5 last:border-r-0",
);

export const supKvTable = cn(
  "w-full border-collapse rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-left text-xs overflow-hidden",
);

export const supKvLabel = cn(
  "w-[38%] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-1.5 font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
);

export const supKvValue = cn(
  "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-1.5 text-[var(--order-ink,#15231f)]",
);

export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
);

export const supPanelHeader = cn(
  "relative shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-1.5",
  "bg-white",
);

export const supPanelHeaderIcon = (_accent: "primary" | "violet" = "primary") =>
  cn(
    "flex size-7 shrink-0 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[var(--pos-primary,#0f766e)]",
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
  "flex flex-col items-center justify-center gap-3 rounded-none border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
  "bg-white px-4 py-10 text-center",
);

export const supEmptyIconWrap = cn(
  "flex size-11 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
  "bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]",
);

export const supChip = cn(
  "inline-flex h-8 shrink-0 items-center rounded-none px-2.5 text-[12px] font-semibold tracking-[-0.02em]",
  "border bg-white transition-colors duration-100",
);

export const supChipActive = cn(
  supChip,
  "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
);

export const supChipIdle = cn(
  supChip,
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]",
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
  "bg-white text-[var(--pos-primary,#0f766e)]",
);

export const supRowActiveCompact = supRowActive;

export const supRowHover = cn(
  "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]",
);

export const supRowHoverCompact = supRowHover;

export const supMotionIn = "";

/* ── Status ─────────────────────────────────────────────────────────────── */

export function statusBadgeClass(status: string): string {
  if (status === "active")
    return "rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]";
  if (status === "blocked")
    return "rounded-none border border-destructive/40 bg-white text-destructive";
  return "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";
}

export function statusDotClass(status: string): string {
  if (status === "active") return "bg-[var(--pos-primary,#0f766e)]";
  if (status === "blocked") return "bg-destructive";
  return "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]";
}

export function paymentStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID")
    return "rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]";
  if (s === "PARTIAL")
    return "rounded-none border border-amber-700/40 bg-white text-amber-800 dark:text-amber-400";
  return "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";
}

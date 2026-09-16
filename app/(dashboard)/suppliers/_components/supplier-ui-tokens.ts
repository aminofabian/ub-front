import { cn } from "@/lib/utils";

/* Store-room theatre: paper, roster wash, teal selection, sharp hairlines. */

export const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
export const PAPER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]";
export const ROSTER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]";

export const supKicker =
  "text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground";

export const supKickerPrimary =
  "text-[11px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]";

/** @deprecated use {@link supKickerPrimary} */
export const supKickerViolet = supKickerPrimary;

export const supFieldLabel =
  "text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground";

export const supSectionTitle =
  "text-[12px] font-semibold tracking-[-0.02em] text-foreground";

export const supSectionHint =
  "mt-0.5 text-[11px] leading-snug text-muted-foreground";

/* ── Controls ───────────────────────────────────────────────────────────── */

const supControlBase = cn(
  "w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-sm",
  "transition-[border-color] duration-150",
  "placeholder:text-muted-foreground/60",
  "focus-visible:outline-none focus-visible:border-[var(--pos-primary,#0f766e)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const supInput = cn(supControlBase, "h-8 px-2.5");

export const supSelect = cn(supControlBase, "h-8 cursor-pointer px-2.5 py-0");

export const supTextarea = cn(
  supControlBase,
  "min-h-[5rem] resize-y px-2.5 py-2",
);

/** Borderless controls for label|value form tables */
export const supFormCellInput = cn(
  "h-12 w-full rounded-2xl border-0 bg-transparent px-2 py-1 text-base sm:h-8 sm:rounded-none sm:text-sm",
  "placeholder:text-muted-foreground/60",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const supFormCellSelect = cn(
  supFormCellInput,
  "cursor-pointer appearance-none",
);

export const supFormCellTextarea = cn(
  "min-h-[4.5rem] w-full resize-y rounded-none border-0 bg-transparent px-2 py-1.5 text-sm",
  "placeholder:text-muted-foreground/60",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
);

/* ── Surfaces ───────────────────────────────────────────────────────────── */

export const supPageRoot = cn(
  "relative flex h-full min-h-0 w-full max-w-none flex-col bg-white",
);

export const supHeroSection = cn(
  "relative overflow-hidden rounded-none border bg-white p-3",
  HAIRLINE,
);

export const supHeroGlowPrimary = "hidden";
export const supHeroGlowAccent = "hidden";

export const supWorkspaceShell = cn(
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border",
  HAIRLINE,
  PAPER,
  "lg:h-[min(80dvh,52rem)]",
);

export const supWorkspaceInner = "flex min-h-0 flex-1 flex-col gap-0 p-0";

export const supCard = cn(
  "rounded-none border bg-white text-foreground",
  HAIRLINE,
);

export const supCardInset = cn(
  "rounded-none border border-dashed bg-white",
  HAIRLINE,
);

export const supSectionCard = cn(supCard, "overflow-hidden");

export const supSectionHeader = cn(
  "flex flex-wrap items-center justify-between gap-2 border-b",
  HAIRLINE,
  "bg-white px-3 py-1.5",
);

export const supSectionBody = "p-0";

export const supStatTile = cn(
  "rounded-none border bg-white px-2.5 py-2",
  HAIRLINE,
);

export const supFilterRail = cn(
  "flex shrink-0 flex-wrap items-end gap-2 border-b",
  HAIRLINE,
  "bg-white px-3 py-1.5",
);

export const supDirectoryShell = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
  ROSTER,
);

export const supDirectoryToolbar = cn(
  "flex shrink-0 items-center justify-between gap-2 border-b",
  HAIRLINE,
  "bg-transparent px-3 py-1.5",
);

/** Directory column header */
export const supTableHead = cn(
  "border-b bg-transparent text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground",
  HAIRLINE,
);

export const supTableRow = cn(
  "border-b transition-colors duration-100",
  HAIRLINE,
  "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
);

export const supTableRowActive = cn(
  "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] text-[var(--pos-primary,#0f766e)]",
);

export const supTableCell = cn(
  "border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-1.5 last:border-r-0",
);

export const supKvTable = cn(
  "w-full border-collapse rounded-none border text-left text-xs overflow-hidden",
  HAIRLINE,
);

export const supKvLabel = cn(
  "w-[38%] border bg-white px-2 py-1.5 font-medium text-muted-foreground",
  HAIRLINE,
);

export const supKvValue = cn(
  "border bg-white px-2 py-1.5 text-foreground",
  HAIRLINE,
);

export const supPanelShell = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden border-transparent bg-white",
);

export const supPanelHeader = cn(
  "relative shrink-0 border-b px-3 py-1.5",
  HAIRLINE,
  "bg-white",
);

export const supPanelHeaderIcon = (_accent: "primary" | "violet" = "primary") =>
  cn(
    "flex size-7 shrink-0 items-center justify-center rounded-none border bg-white text-[var(--pos-primary,#0f766e)]",
    HAIRLINE,
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
  "flex flex-col items-center justify-center gap-3 rounded-none border border-dashed",
  HAIRLINE,
  "bg-white px-4 py-10 text-center",
);

export const supEmptyIconWrap = cn(
  "flex size-11 items-center justify-center rounded-none border",
  HAIRLINE,
  "bg-white text-muted-foreground/50",
);

export const supChip = cn(
  "inline-flex h-8 shrink-0 items-center rounded-none px-2.5 text-[12px] font-semibold tracking-[-0.02em]",
  "transition-colors duration-150",
);

export const supChipActive = cn(
  supChip,
  "bg-[var(--pos-primary,#0f766e)] text-white",
);

export const supChipIdle = cn(
  supChip,
  "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
);

export const supDrawerFooter = cn(
  "flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
);

export const supBtnPrimary = cn(
  "h-8 gap-1.5 rounded-none px-3 font-semibold shadow-none",
);

export const supBtnOutline = cn(
  "h-8 rounded-none px-3 font-medium shadow-none",
);

export const supRowActive = cn(
  "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] text-[var(--pos-primary,#0f766e)]",
);

export const supRowActiveCompact = supRowActive;

export const supRowHover = cn(
  "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
);

export const supRowHoverCompact = supRowHover;

export const supMotionIn = "";

/* ── Status ─────────────────────────────────────────────────────────────── */

export function statusBadgeClass(status: string): string {
  if (status === "active")
    return "rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent text-[var(--pos-primary,#0f766e)]";
  if (status === "blocked")
    return "rounded-none border border-[#9a2e16]/35 bg-transparent text-[#9a2e16]";
  return "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground";
}

export function statusDotClass(status: string): string {
  if (status === "active") return "bg-[var(--pos-primary,#0f766e)]";
  if (status === "blocked") return "bg-[#9a2e16]";
  return "bg-muted-foreground";
}

export function paymentStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID")
    return "rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent text-[var(--pos-primary,#0f766e)]";
  if (s === "PARTIAL")
    return "rounded-none border border-[#9a2e16]/35 bg-transparent text-[#9a2e16]";
  return "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground";
}

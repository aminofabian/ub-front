import type { ItemDetailRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

export type DetailPanelKind = "variant" | "parent" | "standalone" | "group";

export function detailPanelKind(
  detail: ItemDetailRecord,
  variantCount: number,
): DetailPanelKind {
  if (detail.variantOfItemId) return "variant";
  if (detail.groupLabelOnly === true) return "group";
  if (variantCount > 0) return "parent";
  return "standalone";
}

export type DetailPanelTone = {
  heroGradient: string;
  heroRing: string;
  badge: string;
  accent: string;
  accentLight: string;
  statHighlight: string;
  notice: string;
  variantRowHover: string;
  variantRowActive: string;
};

/** Quiet sheet tones — kind is signaled by badge ink, not candy gradients. */
export function detailPanelTone(kind: DetailPanelKind): DetailPanelTone {
  const base = {
    heroGradient: "bg-muted/20",
    heroRing: "",
    accent: "bg-foreground",
    accentLight:
      "border-border bg-muted/40 text-foreground/55",
    statHighlight: "",
    notice: "border-border bg-muted/20 text-foreground/70",
    variantRowHover: "hover:bg-muted/30",
    variantRowActive: "bg-muted/40 ring-1 ring-inset ring-border",
  } as const;

  if (kind === "variant") {
    return {
      ...base,
      badge: "border-border bg-muted/40 text-foreground/70",
    };
  }
  if (kind === "group" || kind === "parent") {
    return {
      ...base,
      badge: "border-border bg-muted/50 text-foreground/65",
    };
  }
  return {
    ...base,
    badge: "border-border bg-muted/40 text-foreground/70",
  };
}

export const detailShellClass =
  "relative flex flex-col gap-0 divide-y divide-border bg-background shadow-none";

export const detailHeroClass = cn(
  "relative overflow-hidden rounded-none border-0 bg-muted/15 p-3 shadow-none",
);

export const detailSectionClass = cn(
  "overflow-hidden rounded-none border-0 bg-background shadow-none",
);

export const detailSectionHeadClass = cn(
  "flex items-center gap-1.5 border-b border-border px-3 py-1.5",
  "bg-muted/20",
);

export const detailMetricGridClass =
  "grid grid-cols-2 gap-px bg-border sm:grid-cols-4";

export const detailMetricCellWrapClass = "bg-background";

export const detailCollapsibleTriggerClass = cn(
  "flex w-full items-center gap-2 rounded-none px-3 py-2.5 text-left transition-colors",
  "hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40",
);

export const detailPackageCardClass = cn(
  "relative overflow-hidden rounded-none border-0 border-b border-border bg-muted/15 p-2.5 shadow-none",
);

/** Thin row under Commerce for packages / weight — not a promo card. */
export const detailSellingStripClass = cn(
  "flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-none border-0 bg-background px-2.5 py-2 shadow-none",
);

export const detailStickyBarClass = cn(
  "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-2 shadow-none",
  "lg:hidden",
);

export const detailQuickActionGridClass = "grid grid-cols-2 gap-1.5 sm:grid-cols-3";

/** Section kickers — quiet uppercase, even ink */
export const detailSectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/40";

/** Metric / field labels */
export const detailFieldLabelClass =
  "text-[10px] font-medium uppercase tracking-[0.1em] text-foreground/40";

export const detailFieldValueClass =
  "text-[12px] font-medium tracking-tight text-foreground truncate";

export const detailFieldRowClass = cn(
  "group flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left",
  "transition-colors duration-150",
  "hover:bg-muted/30",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:ring-inset",
);

export { productFormInlineEditClass as detailInlineEditClass } from "./product-form-styles";

export const detailActionBtnClass = cn(
  "inline-flex items-center justify-center rounded-md border border-border bg-background shadow-none",
  "text-foreground/55 transition-colors",
  "hover:bg-muted/50 hover:text-foreground",
);

export const detailActionBtnPrimaryClass = cn(
  detailActionBtnClass,
  "h-7 gap-1 px-2 text-[11px] font-medium tracking-tight",
);

export const detailStatValueClass =
  "mt-0.5 text-[13px] font-semibold tabular-nums tracking-tight text-foreground";

export const detailMetaClass =
  "text-[11px] font-medium tracking-tight text-foreground/45";

export const detailBadgeClass = cn(
  "inline-flex items-center gap-1 rounded-none border border-border bg-muted/40",
  "px-1.5 py-0.5 text-[10px] font-medium tracking-tight text-foreground/65",
);

export function detailStatCellClass(
  highlight?: "success" | "danger" | "default",
): string {
  return cn(
    "px-3 py-2.5 transition-colors sm:px-2.5 sm:py-2",
    highlight === "success" && "bg-emerald-500/[0.04]",
    highlight === "danger" && "bg-red-500/[0.04]",
  );
}

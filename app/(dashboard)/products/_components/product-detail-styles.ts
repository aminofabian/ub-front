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

export function detailPanelTone(kind: DetailPanelKind): DetailPanelTone {
  if (kind === "variant") {
    return {
      heroGradient:
        "bg-gradient-to-br from-violet-500/14 via-violet-500/8 to-violet-500/5 dark:from-violet-500/18 dark:via-violet-500/10 dark:to-violet-500/6",
      heroRing: "ring-violet-500/20",
      badge:
        "border-violet-500/30 bg-violet-500/12 text-violet-900 dark:text-violet-100",
      accent: "bg-violet-500",
      accentLight:
        "border-violet-500/30 bg-violet-500/12 text-violet-800 dark:text-violet-200",
      statHighlight: "ring-violet-500/15",
      notice:
        "border-violet-500/25 bg-violet-500/8 text-violet-900 dark:text-violet-100",
      variantRowHover: "hover:bg-violet-500/8",
      variantRowActive:
        "bg-violet-500/12 ring-1 ring-inset ring-violet-500/35 shadow-sm",
    };
  }
  if (kind === "group" || kind === "parent") {
    return {
      heroGradient:
        "bg-gradient-to-br from-amber-500/14 via-amber-500/8 to-amber-500/5 dark:from-amber-500/18 dark:via-amber-500/10 dark:to-amber-500/6",
      heroRing: "ring-amber-500/20",
      badge:
        "border-amber-500/30 bg-amber-500/12 text-amber-950 dark:text-amber-100",
      accent: "bg-amber-500",
      accentLight:
        "border-amber-500/30 bg-amber-500/12 text-amber-900 dark:text-amber-100",
      statHighlight: "ring-amber-500/15",
      notice:
        "border-amber-500/25 bg-amber-500/8 text-amber-950 dark:text-amber-100",
      variantRowHover: "hover:bg-violet-500/8",
      variantRowActive:
        "bg-violet-500/12 ring-1 ring-inset ring-violet-500/35 shadow-sm",
    };
  }
  return {
    heroGradient:
      "bg-gradient-to-br from-emerald-500/14 via-emerald-500/8 to-emerald-500/5 dark:from-emerald-500/18 dark:via-emerald-500/10 dark:to-emerald-500/6",
    heroRing: "ring-emerald-500/20",
    badge:
      "border-emerald-500/30 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100",
    accent: "bg-emerald-500",
    accentLight:
      "border-emerald-500/30 bg-emerald-500/12 text-emerald-900 dark:text-emerald-100",
    statHighlight: "ring-emerald-500/15",
    notice:
      "border-emerald-500/25 bg-emerald-500/8 text-emerald-950 dark:text-emerald-100",
    variantRowHover: "hover:bg-violet-500/8",
    variantRowActive:
      "bg-violet-500/12 ring-1 ring-inset ring-violet-500/35 shadow-sm",
  };
}

export const detailShellClass = "relative flex flex-col gap-2.5 pb-[4.75rem] lg:pb-0";

export const detailHeroClass = cn(
  "relative overflow-hidden border border-border/55 p-2.5 shadow-sm ring-1 ring-inset sm:p-3",
);

export const detailSectionClass =
  "overflow-hidden border border-border/55 bg-card/80 shadow-sm ring-1 ring-black/[0.02] dark:bg-card/50 dark:ring-white/[0.04]";

export const detailSectionHeadClass = cn(
  "flex items-center gap-1.5 border-b border-border/45 px-3 py-1.5",
  "bg-[linear-gradient(180deg,oklch(0.97_0.003_90),oklch(0.99_0.001_90))] dark:bg-muted/35",
);

export const detailMetricGridClass =
  "grid grid-cols-2 gap-px bg-border/45 sm:grid-cols-4";

export const detailMetricCellWrapClass = "bg-background/60";

export const detailCollapsibleTriggerClass = cn(
  "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
  "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset",
);

export const detailPackageCardClass = cn(
  "relative overflow-hidden border border-primary/25 p-2.5 shadow-sm",
  "bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-transparent",
  "ring-1 ring-inset ring-primary/15",
);

/** Thin row under Commerce for packages / weight — not a promo card. */
export const detailSellingStripClass = cn(
  "flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-border/55 bg-card px-2.5 py-1.5",
  "shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
);

export const detailStickyBarClass = cn(
  "fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 p-2 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md",
  "dark:shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.45)] lg:hidden",
);

export const detailQuickActionGridClass = "grid grid-cols-2 gap-2 sm:grid-cols-3";

export const detailSectionLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/90";

export const detailFieldLabelClass =
  "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

export const detailFieldValueClass =
  "text-xs font-medium text-foreground truncate";

export const detailFieldRowClass = cn(
  "group flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left",
  "transition-[background-color,box-shadow] duration-150",
  "hover:bg-muted/40 hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]",
  "dark:hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset",
);

export { productFormInlineEditClass as detailInlineEditClass } from "./product-form-styles";

export const detailActionBtnClass = cn(
  "inline-flex items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm",
  "text-muted-foreground transition-[background-color,color,box-shadow,ring-color]",
  "hover:bg-muted/50 hover:text-foreground hover:ring-1 hover:ring-border/70",
);

export const detailActionBtnPrimaryClass = cn(
  detailActionBtnClass,
  "h-6 gap-1 px-2 text-[10px] font-medium text-foreground",
);

export const detailStatValueClass = "mt-px text-xs tabular-nums text-foreground";

export function detailStatCellClass(
  highlight?: "success" | "danger" | "default",
): string {
  return cn(
    "px-2.5 py-2.5 transition-colors sm:px-3",
    highlight === "success" && "bg-emerald-500/[0.06]",
    highlight === "danger" && "bg-red-500/[0.06]",
  );
}

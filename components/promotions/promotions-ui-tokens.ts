import type { LucideIcon } from "lucide-react";
import {
  Archive,
  CircleDot,
  Clock,
  FileEdit,
  LayoutGrid,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { PromoStatusTab } from "@/lib/promotions-campaign-utils";

export {
  supBtnOutline,
  supBtnPrimary,
  supFieldLabel,
  supHeroGlowAccent,
  supHeroGlowPrimary,
  supHeroSection,
  supInput,
  supKicker,
  supMotionIn,
  supPageRoot,
  supSelect,
  supStatTile,
  supTextarea,
  supWorkspaceInner,
  supWorkspaceShell,
} from "@/app/(dashboard)/suppliers/_components/supplier-ui-tokens";

/* ── Promotions layout ─────────────────────────────────────────────────── */

export const promoSectionTitle =
  "font-heading text-lg font-semibold tracking-tight text-foreground";

export const promoSectionHint = "mt-1 text-sm leading-relaxed text-muted-foreground";

export const promoWorkspaceHeader = cn(
  "flex flex-col gap-4 border-b border-border/45 pb-4 sm:pb-5",
);

export const promoFilterRail = cn(
  "flex flex-col gap-3 rounded-lg border border-border/50 bg-background/80 p-3 shadow-sm",
  "ring-1 ring-inset ring-black/[0.02] dark:bg-card/60 dark:ring-white/[0.03] sm:flex-row sm:flex-wrap sm:items-center sm:p-4",
);

export const promoTabRail = cn(
  "flex gap-1 overflow-x-auto rounded-lg border border-border/50 bg-muted/20 p-1",
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
);

export const promoTabBtn = (active: boolean) =>
  cn(
    "relative flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
    active
      ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
  );

export const promoTabCount = (active: boolean) =>
  cn(
    "inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
    active
      ? "bg-primary/10 text-primary ring-1 ring-primary/15"
      : "bg-muted/60 text-muted-foreground",
  );

export const STATUS_TAB_ICONS: Record<PromoStatusTab, LucideIcon> = {
  all: LayoutGrid,
  active: CircleDot,
  scheduled: Clock,
  drafts: FileEdit,
  past: Archive,
};

export const promoCardShell = cn(
  "group relative flex flex-col overflow-hidden rounded-xl border border-border/55 bg-card shadow-sm",
  "ring-1 ring-black/[0.02] transition-[transform,box-shadow,border-color] duration-200",
  "hover:-translate-y-px hover:border-border/75 hover:shadow-md",
  "dark:ring-white/[0.04] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300",
);

export const promoCardFooter = cn(
  "flex items-center justify-between gap-2 border-t border-border/40 bg-muted/10 px-4 py-3 pl-5 sm:px-5 sm:pl-6",
  "transition-colors duration-200 group-hover:bg-muted/20",
);

export const promoEmptyShell = cn(
  "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/55",
  "bg-gradient-to-b from-muted/20 via-transparent to-transparent px-6 py-12 text-center sm:py-14",
);

export const promoEmptyIcon = cn(
  "flex size-14 items-center justify-center rounded-xl border border-border/50 bg-card shadow-sm",
  "text-primary/70 ring-1 ring-black/[0.03] dark:ring-white/[0.05]",
);

export const promoMobileFab = cn(
  "fixed bottom-4 right-4 z-40 flex h-12 items-center gap-2 rounded-full px-5 font-semibold shadow-lg",
  "transition-transform duration-200 active:scale-[0.97] sm:hidden",
);

export const promoStatAccent = {
  default: "border-l-primary/70",
  reach: "border-l-violet-500/70",
  scheduled: "border-l-sky-500/70",
  completed: "border-l-emerald-500/70",
} as const;

export const promoStatsSkeleton = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

export function promoTypeAccent(type: string): {
  stripe: string;
  iconWrap: string;
  glow: string;
  badge: string;
} {
  if (type === "WEEKLY_DEALS") {
    return {
      stripe: "bg-gradient-to-b from-sky-400 via-indigo-500 to-violet-500/85",
      iconWrap:
        "bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400",
      glow: "from-indigo-500/[0.07] to-transparent",
      badge: "bg-indigo-500/10 text-indigo-800 ring-indigo-500/20 dark:text-indigo-200",
    };
  }
  return {
    stripe: "bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600/80",
    iconWrap: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400",
    glow: "from-amber-500/[0.08] to-transparent",
    badge: "bg-amber-500/10 text-amber-900 ring-amber-500/25 dark:text-amber-200",
  };
}

export function promoStatusChipClass(status: string): string {
  switch (status) {
    case "RUNNING":
      return "bg-amber-500/12 text-amber-900 ring-amber-500/25 dark:text-amber-200";
    case "SCHEDULED":
      return "bg-sky-500/10 text-sky-900 ring-sky-500/25 dark:text-sky-200";
    case "DRAFT":
      return "bg-muted/80 text-muted-foreground ring-border/55";
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-900 ring-emerald-500/25 dark:text-emerald-200";
    case "CANCELLED":
      return "bg-destructive/10 text-destructive ring-destructive/25";
    default:
      return "bg-muted/80 text-muted-foreground ring-border/55";
  }
}

export function promoStatusDotClass(status: string): string {
  switch (status) {
    case "RUNNING":
      return "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]";
    case "SCHEDULED":
      return "bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.2)]";
    case "DRAFT":
      return "bg-muted-foreground/50";
    case "COMPLETED":
      return "bg-emerald-500";
    case "CANCELLED":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/40";
  }
}

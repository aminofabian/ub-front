"use client";

import type { LucideIcon } from "lucide-react";
import { Check, ChevronRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  supFieldLabel,
  supKicker,
  supSectionHint,
  supSectionTitle,
} from "../../suppliers/_components/supplier-ui-tokens";

export const nsdBorder = "border border-border";

const nsdControlBase = cn(
  "w-full rounded-none bg-background text-sm shadow-none",
  nsdBorder,
  "transition-[border-color,box-shadow,background-color] duration-150",
  "placeholder:text-muted-foreground/50",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-foreground/30",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const nsdInput = cn(nsdControlBase, "h-10 px-3");

export const nsdSelect = cn(nsdControlBase, "h-10 cursor-pointer px-3 py-0");

export const nsdTextarea = cn(nsdControlBase, "min-h-[5rem] resize-y px-3 py-2.5");

export const nsdSectionShell = cn(
  "overflow-hidden rounded-sm bg-card shadow-sm",
  nsdBorder,
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
);

export const nsdSectionHeader = cn(
  "flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3.5 sm:px-5",
);

export const nsdCardInset = cn("rounded-sm bg-muted/25", nsdBorder);

export const nsdTableHead = cn(
  "sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur-sm",
  "text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground",
);

export const nsdTableRow = cn(
  "border-b border-border transition-colors duration-150 last:border-b-0",
  "hover:bg-muted/35",
);

export const nsdTableRowReady = "bg-primary/[0.04] hover:bg-primary/[0.06]";

export const nsdStatTile = cn(
  "rounded-sm bg-background px-3 py-3 transition-colors duration-150 hover:bg-muted/20",
  nsdBorder,
);

export const nsdAlert = cn(
  "rounded-sm border border-amber-600/40 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-500/45 dark:text-amber-100",
);

export const nsdDropdown = cn(
  "absolute left-0 right-0 top-full z-50 mt-0 max-h-52 overflow-auto border border-border bg-popover py-1 shadow-lg",
);

export const nsdTotalsPanel = cn(
  "rounded-sm bg-gradient-to-br from-card via-card to-muted/20 p-4 shadow-sm sm:p-5",
  nsdBorder,
);

export const nsdVendorChip = cn(
  "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-primary/25 bg-primary/[0.05] px-3.5 py-3",
);

export function SupplyDrawerSection({
  title,
  hint,
  step,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  hint?: string;
  step?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(nsdSectionShell, className)}>
      <div className={nsdSectionHeader}>
        <div className="flex min-w-0 items-start gap-3">
          {step != null ? (
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-xs font-bold tabular-nums text-foreground shadow-sm"
              aria-hidden
            >
              {step}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className={supSectionTitle}>{title}</h3>
            {hint ? <p className={supSectionHint}>{hint}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SupplyWorkflowRail({
  steps,
}: {
  steps: { id: string; label: string; done: boolean }[];
}) {
  const activeIdx = steps.findIndex((s) => !s.done);
  const current = activeIdx === -1 ? steps.length - 1 : activeIdx;

  return (
    <nav
      className={cn(
        "flex flex-col gap-3 rounded-sm border border-border bg-muted/30 p-3 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:p-4",
      )}
      aria-label="Supply posting steps"
    >
      <span className={supKicker}>Workflow</span>
      <ol className="flex flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
        {steps.map((step, i) => {
          const isCurrent = i === current && !step.done;
          const isPast = step.done;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                  isPast
                    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                    : isCurrent
                      ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold",
                    isPast
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isPast ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                {step.label}
              </span>
              {i < steps.length - 1 ? (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground/40 max-sm:hidden"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SupplyEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 border border-dashed border-border bg-muted/15 px-6 py-12 text-center sm:py-14",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground shadow-sm">
        <Icon className="size-6 opacity-60" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function SupplyTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border-t border-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0"
        >
          <div className="h-4 flex-1 animate-pulse bg-muted/50" />
          <div className="h-4 w-16 animate-pulse bg-muted/40" />
          <div className="h-4 w-20 animate-pulse bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

export function SupplyLoadingInline({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary/70" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export { supFieldLabel as nsdFieldLabel, supKicker as nsdKicker };

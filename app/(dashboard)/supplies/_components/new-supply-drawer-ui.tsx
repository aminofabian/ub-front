"use client";

import type { LucideIcon } from "lucide-react";
import { Check, ChevronRight, Loader2, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  supFieldLabel,
  supKicker,
  supSectionHint,
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

export const nsdInput = cn(nsdControlBase, "h-8 px-2.5 text-sm");

export const nsdSelect = cn(nsdControlBase, "h-8 cursor-pointer px-2.5 py-0 text-sm");

export const nsdTextarea = cn(
  nsdControlBase,
  "min-h-[2.75rem] resize-y px-2.5 py-1.5 text-sm",
);

export const nsdSectionShell = cn(
  "overflow-hidden rounded-sm bg-card shadow-sm",
  nsdBorder,
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
);

export const nsdSectionHeader = cn(
  "flex flex-wrap items-center justify-between gap-1 border-b border-border bg-muted/40 px-2 py-1",
);

export const nsdCardInset = cn("rounded-sm bg-muted/25", nsdBorder);

export const nsdTableHead = cn(
  "sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur-sm",
  "text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground",
);

export const nsdTableTh = "px-2 py-1.5 whitespace-nowrap font-semibold";

export const nsdTableCell = "px-2 py-1 align-middle text-sm";

export const nsdTableInput = cn(nsdInput, "h-7 px-1.5 text-sm tabular-nums");

export const nsdTableRow = cn(
  "border-b border-border transition-colors duration-150 last:border-b-0",
  "hover:bg-muted/35",
);

export const nsdTableRowReady = "bg-primary/[0.04] hover:bg-primary/[0.06]";

export const nsdStatTile = cn(
  "rounded-sm bg-background px-2 py-2 transition-colors duration-150 hover:bg-muted/20",
  nsdBorder,
);

export const nsdAlert = cn(
  "rounded-sm border border-amber-600/40 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-500/45 dark:text-amber-100",
);

export const nsdDropdown = cn(
  "absolute left-0 right-0 top-full z-50 mt-0 max-h-52 overflow-auto border border-border bg-popover py-1 shadow-lg",
);

/** Position-neutral panel styles for portaled / inline result lists. */
export const nsdDropdownPanel = cn(
  "max-h-52 overflow-auto border border-border bg-popover py-1 shadow-lg",
);

export const nsdTotalsPanel = cn(
  "rounded-sm bg-gradient-to-br from-card via-card to-muted/20 p-2.5 shadow-sm",
  nsdBorder,
);

export const nsdVendorChip = cn(
  "mt-1.5 flex items-center justify-between gap-2 rounded-sm border border-primary/25 bg-primary/[0.05] px-2 py-1",
);

export const nsdTableGroupDivider = "border-l border-border/70";

export const nsdContextStrip = cn(
  "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-border/80 bg-muted/30 px-2.5 py-1.5 text-[11px]",
);

export const nsdLineCardShell = cn(
  "overflow-hidden rounded-sm border border-border bg-card shadow-sm",
);

export const nsdLineCardReady = "border-l-[3px] border-l-primary";

export function SupplyDrawerSection({
  title,
  hint,
  step,
  done,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  hint?: string;
  step?: number;
  done?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(nsdSectionShell, className)}>
      <div className={nsdSectionHeader}>
        <div className="flex min-w-0 items-center gap-1.5">
          {step != null ? (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-sm border text-[9px] font-bold tabular-nums shadow-sm",
                done
                  ? "border-primary/40 bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground",
              )}
              aria-hidden
            >
              {done ? <Check className="size-2.5" strokeWidth={3} /> : step}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-xs font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {hint ? (
              <p className="hidden text-[10px] leading-snug text-muted-foreground sm:block">
                {hint}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("p-1.5", bodyClassName)}>{children}</div>
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
  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <nav className="space-y-1.5" aria-label="Supply posting steps">
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${doneCount} of ${steps.length} steps complete`}
        />
      </div>
      <ol className="flex flex-wrap items-center gap-1">
        {steps.map((step, i) => {
          const isCurrent = i === current && !step.done;
          const isPast = step.done;
          return (
            <li key={step.id} className="flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
                  isPast
                    ? "border-primary/35 bg-primary/10 text-primary"
                    : isCurrent
                      ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold",
                    isPast
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isPast ? <Check className="size-2.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sr-only sm:hidden">{step.label}</span>
              </span>
              {i < steps.length - 1 ? (
                <ChevronRight
                  className="size-3 shrink-0 text-muted-foreground/40"
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

export function SupplyContextStrip({
  supplierName,
  branchName,
  lineStats,
  payable,
  canPost,
}: {
  supplierName: string | null;
  branchName: string;
  lineStats: { totalRows: number; valid: number };
  payable: number;
  canPost: boolean;
}) {
  return (
    <div className={nsdContextStrip}>
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span className="font-semibold text-foreground">
          {supplierName ?? "No supplier"}
        </span>
        {branchName ? (
          <>
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <span className="truncate text-muted-foreground">{branchName}</span>
          </>
        ) : null}
      </span>
      <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
      <span className="text-muted-foreground">
        <span className="font-mono tabular-nums text-foreground">
          {lineStats.valid}
        </span>
        /{lineStats.totalRows} lines ready
      </span>
      <span className="ml-auto inline-flex items-baseline gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Payable
        </span>
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">
          {payable.toFixed(2)}
        </span>
        {canPost ? (
          <span className="rounded-sm bg-primary/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
            Ready
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function SupplyLinesToolbar({
  searchQuery,
  onSearchChange,
  visibleCount,
  totalCount,
  readyCount,
  disabled,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
  readyCount: number;
  disabled?: boolean;
}) {
  const filtering = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-gradient-to-r from-muted/40 via-muted/25 to-transparent px-2 py-2">
      <div className="relative min-w-[10rem] flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          className={cn(nsdInput, "h-8 bg-background pl-8")}
          placeholder="Filter lines…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
          aria-label="Search receiving lines"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {filtering ? (
          <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {visibleCount}/{totalCount} shown
          </span>
        ) : null}
        <span
          className={cn(
            "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
            readyCount > 0
              ? "border-primary/35 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground",
          )}
        >
          {readyCount} ready
        </span>
        <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {totalCount} total
        </span>
      </div>
    </div>
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
        "flex flex-col items-center justify-center gap-1.5 border border-dashed border-border bg-muted/15 px-3 py-5 text-center",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground shadow-sm">
        <Icon className="size-5 opacity-60" aria-hidden />
      </span>
      <div className="max-w-sm space-y-0.5">
        <p className="text-xs font-semibold tracking-tight text-foreground">{title}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="mt-0.5">{action}</div> : null}
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
    <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary/70" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export { supFieldLabel as nsdFieldLabel, supKicker as nsdKicker };

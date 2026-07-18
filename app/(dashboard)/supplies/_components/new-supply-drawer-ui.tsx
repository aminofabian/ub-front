"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Loader2, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  supFieldLabel,
  supFormCellInput,
  supKicker,
  supSectionHint,
  supSectionTitle,
  supTableCell,
  supTableHead,
  supTableRow,
  supTableRowActive,
} from "../../suppliers/_components/supplier-ui-tokens";

export const nsdBorder = "border border-border";

const nsdControlBase = cn(
  "w-full rounded-none bg-background text-sm shadow-none",
  nsdBorder,
  "transition-[border-color,box-shadow,background-color] duration-100",
  "placeholder:text-muted-foreground/50",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/40",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const nsdInput = cn(
  nsdControlBase,
  "h-8 px-2.5 text-sm max-sm:h-11 max-sm:px-3 max-sm:text-base",
);

export const nsdSelect = cn(
  nsdControlBase,
  "h-8 cursor-pointer px-2.5 py-0 text-sm max-sm:h-11 max-sm:px-3 max-sm:text-base",
);

export const nsdTextarea = cn(
  nsdControlBase,
  "min-h-[2.75rem] resize-y px-2.5 py-1.5 text-sm max-sm:min-h-[3.25rem] max-sm:px-3 max-sm:py-2.5 max-sm:text-base",
);

export const nsdSectionShell = cn(
  "overflow-hidden rounded-none bg-card",
  nsdBorder,
);

export const nsdSectionHeader = cn(
  "flex flex-wrap items-center justify-between gap-1 border-b border-border",
  "bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40",
);

export const nsdCardInset = cn("rounded-none bg-muted/15", nsdBorder);

export const nsdTableHead = supTableHead;

export const nsdTableTh = cn(supTableCell, "whitespace-nowrap font-semibold");

export const nsdTableCell = supTableCell;

export const nsdTableInput = cn(
  supFormCellInput,
  "h-7 text-sm tabular-nums",
);

export const nsdTableRow = supTableRow;

export const nsdTableRowReady = supTableRowActive;

export const nsdStatTile = cn(
  "rounded-none border border-border bg-background px-2 py-1.5",
);

export const nsdAlert = cn(
  "border border-amber-600/40 bg-amber-500/[0.07] px-2.5 py-2 text-xs text-amber-950 dark:border-amber-500/45 dark:text-amber-100",
);

export const nsdDropdown = cn(
  "absolute left-0 right-0 top-full z-50 mt-0 max-h-52 overflow-auto border border-border bg-popover py-1 shadow-md",
);

export const nsdDropdownPanel = cn(
  "max-h-52 overflow-auto border border-border bg-popover py-1 shadow-md",
);

export const nsdTotalsPanel = cn(
  "rounded-none bg-card p-2.5",
  nsdBorder,
);

export const nsdVendorChip = cn(
  "mt-1.5 flex items-center justify-between gap-2 border border-primary/25 bg-primary/[0.05] px-2 py-1",
);

export const nsdTableGroupDivider = "border-l border-border";

export const nsdContextStrip = cn(
  "flex flex-wrap items-center gap-x-3 gap-y-1 border border-border bg-[#eef2f7] px-2.5 py-1.5 text-[11px] dark:bg-muted/25",
);

export const nsdLineCardShell = cn(
  "overflow-hidden border border-border bg-card",
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
                "flex size-5 shrink-0 items-center justify-center border text-[9px] font-bold tabular-nums",
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
            <h3 className={supSectionTitle}>{title}</h3>
            {hint ? (
              <p className={cn(supSectionHint, "hidden sm:block")}>{hint}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("p-0", bodyClassName)}>{children}</div>
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
  const currentStep = steps[current];

  return (
    <nav
      className="flex items-center gap-2 border border-border bg-[#eef2f7] px-2.5 py-1.5 dark:bg-muted/25"
      aria-label="Supply posting steps"
    >
      <div className="h-1 min-w-0 flex-1 overflow-hidden bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${doneCount} of ${steps.length} steps complete`}
        />
      </div>
      <ol className="flex shrink-0 items-center gap-0.5">
        {steps.map((step, i) => {
          const isCurrent = i === current && !step.done;
          const isPast = step.done;
          return (
            <li key={step.id}>
              <span
                className={cn(
                  "flex size-5 items-center justify-center border text-[9px] font-bold",
                  isPast
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground",
                )}
                title={step.label}
              >
                {isPast ? <Check className="size-2.5" strokeWidth={3} /> : i + 1}
              </span>
            </li>
          );
        })}
      </ol>
      <span className="hidden shrink-0 text-[10px] font-medium text-muted-foreground sm:inline">
        {currentStep?.done ? "Ready to post" : currentStep?.label}
      </span>
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
        <span className={supKicker}>Payable</span>
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">
          {payable.toFixed(2)}
        </span>
        {canPost ? (
          <span className="border border-primary/35 bg-primary/10 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
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
  needsCount,
  lineFocus,
  onLineFocusChange,
  showSellExpiry = false,
  onShowSellExpiryChange,
  disabled,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
  readyCount: number;
  needsCount: number;
  lineFocus: "all" | "fill" | "ready";
  onLineFocusChange: (focus: "all" | "fill" | "ready") => void;
  showSellExpiry?: boolean;
  onShowSellExpiryChange?: (show: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-[#eef2f7] px-2 py-1.5 dark:bg-muted/25">
      <div className="relative min-w-[10rem] flex-1">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          className={cn(nsdInput, "h-7 bg-background pl-7 text-xs max-sm:h-9 max-sm:text-sm")}
          placeholder="Find a product…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
          aria-label="Search receiving lines"
        />
      </div>
      <div
        className="inline-flex border border-border bg-background p-0.5"
        role="group"
        aria-label="Which lines to show"
      >
        {(
          [
            { id: "all" as const, label: "All", count: totalCount },
            { id: "fill" as const, label: "Need qty", count: needsCount },
            { id: "ready" as const, label: "Ready", count: readyCount },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            aria-pressed={lineFocus === opt.id}
            onClick={() => onLineFocusChange(opt.id)}
            className={cn(
              "inline-flex h-6 items-center gap-1 px-2 text-[10px] font-semibold transition-colors",
              lineFocus === opt.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
            <span className="font-mono tabular-nums opacity-80">{opt.count}</span>
          </button>
        ))}
      </div>
      {onShowSellExpiryChange ? (
        <button
          type="button"
          disabled={disabled}
          aria-pressed={showSellExpiry}
          onClick={() => onShowSellExpiryChange(!showSellExpiry)}
          className={cn(
            "inline-flex h-6 items-center px-2 text-[10px] font-semibold transition-colors",
            "border border-border bg-background",
            showSellExpiry
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          title="Show sell price and expiry columns"
        >
          {showSellExpiry ? "Hide sell / expiry" : "Sell / expiry"}
        </button>
      ) : null}
      {visibleCount !== totalCount && lineFocus === "all" && searchQuery.trim() ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {visibleCount} match
        </span>
      ) : null}
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
        "flex flex-col items-center justify-center gap-1.5 border border-dashed border-border bg-muted/10 px-3 py-5 text-center",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center border border-dashed border-border bg-card text-muted-foreground">
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
          className="flex gap-3 border-b border-border px-2 py-2 last:border-b-0"
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
    <div className="flex items-center justify-center gap-2 border-b border-border py-3 text-xs text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary/70" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export { supFieldLabel as nsdFieldLabel, supKicker as nsdKicker };

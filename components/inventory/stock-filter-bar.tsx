"use client";

import {
  STOCK_STATUS_GROUPS,
  type StockCountKey,
  type StockStatusFilter,
  type StockStatusOption,
  type StockStatusTone,
} from "./stock-status-filters";
import { cn } from "@/lib/utils";

const TONE_TEXT: Record<StockStatusTone, string> = {
  default: "text-[var(--op-ink)]",
  success: "text-[var(--op-accent)]",
  warning: "text-[var(--op-muted)]",
  danger: "text-[var(--op-muted)]",
  loss: "text-[var(--op-muted)]",
};

const TONE_FILL: Record<StockStatusTone, string> = {
  default: "bg-[var(--op-accent)]",
  success: "bg-[var(--op-accent)]",
  warning: "bg-[var(--op-highlight,#a55237)]",
  danger: "bg-[var(--op-highlight,#a55237)]",
  loss: "bg-[var(--op-highlight,#a55237)]",
};

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const MUTE =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]";

export type StockFilterBarProps = {
  value: StockStatusFilter;
  counts: Record<StockCountKey, number>;
  onChange: (next: StockStatusFilter) => void;
  /** `bar` = one dense horizontal strip; `panels` = labelled stacked groups. */
  variant: "bar" | "panels";
  /** `touch` gives the bar thumb-sized segments for phones. */
  size?: "compact" | "touch";
  className?: string;
};

/**
 * One control, two layouts. Every breakpoint renders the same options in the
 * same order, so the phone and the desktop spreadsheet can't drift apart.
 */
export function StockFilterBar({
  value,
  counts,
  onChange,
  variant,
  size = "compact",
  className,
}: StockFilterBarProps) {
  const touch = size === "touch";
  if (variant === "panels") {
    return (
      <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
        {STOCK_STATUS_GROUPS.map((group) => (
          <section
            key={group.id}
            className="rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] p-2.5"
          >
            <h3 className="text-[11px] font-semibold tracking-[-0.02em]">
              {group.label}
            </h3>
            <p className={cn("mt-0.5 text-[10px] leading-snug", MUTE)}>
              {group.hint}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {group.options.map((option) => (
                <FilterChip
                  key={option.key}
                  option={option}
                  count={counts[option.countKey]}
                  active={option.key === value}
                  onSelect={() => onChange(option.key)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Own row on desktop: the taxonomy deserves a line to itself rather
        // than competing with search and four filters for space.
        "flex max-w-full items-center gap-1.5 overflow-x-auto md:basis-full",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="group"
      aria-label="Filter stock"
    >
      {STOCK_STATUS_GROUPS.map((group) => (
        <div key={group.id} className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              "px-1.5 font-semibold uppercase tracking-[0.08em]",
              touch ? "text-[11px]" : "text-[10px]",
              MUTE,
            )}
            title={group.hint}
          >
            {group.label}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {group.options.map((option) => (
              <FilterSegment
                key={option.key}
                option={option}
                count={counts[option.countKey]}
                active={option.key === value}
                touch={touch}
                onSelect={() => onChange(option.key)}
              />
            ))}
          </div>
          {group.id === "level" ? (
            <span aria-hidden className={cn("mx-1.5 h-3.5 w-px", HAIRLINE)} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FilterSegment({
  option,
  count,
  active,
  touch,
  onSelect,
}: {
  option: StockStatusOption;
  count: number;
  active: boolean;
  touch: boolean;
  onSelect: () => void;
}) {
  const quiet = !active && count === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={option.hint}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[2px] transition-colors duration-150",
        touch ? "h-9 gap-1.5 px-3.5 text-[13px]" : "h-7 px-2.5 text-[11px]",
        "tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
        active
          ? cn("font-semibold text-white", TONE_FILL[option.tone])
          : cn(
              "bg-[var(--op-surface)] font-medium ring-1 ring-[var(--op-rule)] hover:bg-[color-mix(in_srgb,var(--op-ink)_5%,transparent)]",
              quiet ? cn("opacity-45", MUTE) : cn(TONE_TEXT[option.tone]),
            ),
      )}
    >
      <span className="whitespace-nowrap">{option.label}</span>
      <span
        className={cn("tabular-nums", active ? "text-white/90" : "font-semibold")}
      >
        {count.toLocaleString("en-KE")}
      </span>
    </button>
  );
}

function FilterChip({
  option,
  count,
  active,
  onSelect,
}: {
  option: StockStatusOption;
  count: number;
  active: boolean;
  onSelect: () => void;
}) {
  const quiet = !active && count === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-[2px] border px-3 text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
        active
          ? cn("border-transparent font-semibold text-white", TONE_FILL[option.tone])
          : cn(
              "bg-[var(--op-surface)]",
              HAIRLINE,
              quiet
                ? cn("opacity-50", MUTE)
                : cn("font-medium", TONE_TEXT[option.tone]),
            ),
      )}
    >
      <span className="whitespace-nowrap">{option.label}</span>
      <span
        className={cn("tabular-nums", active ? "text-white/90" : "font-semibold")}
      >
        {count.toLocaleString("en-KE")}
      </span>
    </button>
  );
}

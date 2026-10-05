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
  default: "text-[var(--order-ink,#15231f)]",
  success: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-rose-700 dark:text-rose-400",
  loss: "text-orange-700 dark:text-orange-300",
};

const TONE_FILL: Record<StockStatusTone, string> = {
  default: "bg-[var(--pos-primary,#0f766e)]",
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-rose-600",
  loss: "bg-orange-600",
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
  className,
}: StockFilterBarProps) {
  if (variant === "panels") {
    return (
      <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
        {STOCK_STATUS_GROUPS.map((group) => (
          <section
            key={group.id}
            className={cn("rounded-none border bg-white p-2.5", HAIRLINE)}
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
        "flex max-w-full items-center overflow-x-auto md:basis-full",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="group"
      aria-label="Filter stock"
    >
      {STOCK_STATUS_GROUPS.map((group) => (
        <div key={group.id} className="flex shrink-0 items-center">
          <span
            className={cn(
              "px-2 text-[10px] font-semibold uppercase tracking-[0.08em]",
              MUTE,
            )}
            title={group.hint}
          >
            {group.label}
          </span>
          <div className="flex shrink-0 items-center">
            {group.options.map((option) => (
              <FilterSegment
                key={option.key}
                option={option}
                count={counts[option.countKey]}
                active={option.key === value}
                onSelect={() => onChange(option.key)}
                withDivider={option !== group.options[group.options.length - 1]}
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
  onSelect,
  withDivider,
}: {
  option: StockStatusOption;
  count: number;
  active: boolean;
  onSelect: () => void;
  withDivider: boolean;
}) {
  const quiet = !active && count === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={option.hint}
      className={cn(
        "inline-flex h-7 items-center gap-1 px-2 text-[11px] transition-colors duration-150",
        "tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
        withDivider && "border-r",
        HAIRLINE,
        active
          ? cn("font-semibold text-white", TONE_FILL[option.tone])
          : cn(
              "font-medium hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,transparent)]",
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
        "inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3 text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
        active
          ? cn("border-transparent font-semibold text-white", TONE_FILL[option.tone])
          : cn(
              "bg-white",
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

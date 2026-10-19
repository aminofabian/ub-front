"use client";

import { ChevronLeft, Search } from "lucide-react";

import type { BatchLineFilter } from "@/lib/count-cycle/filter-batch-lines";
import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";
import { FilterChips } from "./filter-chips";

type Props = {
  batchNumber: number;
  counted: number;
  total: number;
  filter: BatchLineFilter;
  onFilterChange: (filter: BatchLineFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onBack: () => void;
};

/** Sticky top of the counting floor: which batch, how far, find & narrow. */
export function BatchCountHeader(props: Props) {
  const share = props.total > 0 ? props.counted / props.total : 0;
  const pct = Math.round(share * 100);

  return (
    <header
      className={cn(
        "flex flex-col gap-2.5 border-b px-3 pb-3 pt-2",
        COUNT_TONE.surface,
        COUNT_TONE.hair,
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={props.onBack}
          className={cn(
            "-ml-1 inline-flex h-11 shrink-0 items-center gap-0.5 rounded-[2px] pl-1 pr-2 text-[14px] font-medium",
            COUNT_TONE.teal,
          )}
        >
          <ChevronLeft className="size-5" aria-hidden />
          Batches
        </button>
        <h2
          className={cn(
            "min-w-0 flex-1 truncate text-center text-[1.55rem] font-normal leading-none tracking-[-0.02em]",
            COUNT_TONE.ink,
            COUNT_TONE.display,
          )}
        >
          Batch {props.batchNumber}
        </h2>
        <p
          className={cn(
            "min-w-[4.5rem] text-right text-[17px] font-semibold tabular-nums tracking-tight",
            COUNT_TONE.ink,
          )}
          aria-label={`${props.counted} of ${props.total} counted`}
        >
          {props.counted}
          <span className={COUNT_TONE.faint}>/{props.total}</span>
        </p>
      </div>

      <div
        className={cn("h-1 overflow-hidden rounded-[1px]", COUNT_TONE.track)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={props.total}
        aria-valuenow={props.counted}
        aria-label="Batch progress"
      >
        <div
          className={cn(
            "h-full rounded-[1px] transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            COUNT_TONE.tealFill,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <label className="relative block">
        <span className="sr-only">Find a product in this batch</span>
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2",
            COUNT_TONE.faint,
          )}
          aria-hidden
        />
        <input
          type="search"
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
          placeholder="Name, SKU or barcode"
          enterKeyHint="search"
          className={cn(
            "h-11 w-full rounded-[2px] border bg-[var(--op-surface,#fcfaf5)] pl-9 pr-3 text-[16px]",
            "placeholder:text-[color-mix(in_srgb,var(--op-ink,#121a16)_32%,transparent)]",
            "focus:border-[var(--op-accent,#1d4b3b)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_18%,transparent)]",
            COUNT_TONE.hair,
            COUNT_TONE.ink,
          )}
        />
      </label>

      <FilterChips
        value={props.filter}
        onChange={props.onFilterChange}
        counts={{
          todo: props.total - props.counted,
          counted: props.counted,
          all: props.total,
        }}
      />
    </header>
  );
}

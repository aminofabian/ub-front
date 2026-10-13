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

/** Sits at the top of the list while scrolling: which batch, how far, and how to narrow it. */
export function BatchCountHeader(props: Props) {
  const share = props.total > 0 ? props.counted / props.total : 0;
  return (
    <header className={cn("sticky top-0 z-10 -mx-1 flex flex-col gap-2.5 border-b bg-white/95 px-1 pb-2.5 pt-1 backdrop-blur-sm supports-[backdrop-filter]:bg-white/85", COUNT_TONE.hair)}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={props.onBack} className={cn("-ml-1 inline-flex h-11 items-center gap-0.5 rounded-lg pl-1 pr-2 text-[15px] font-medium", COUNT_TONE.teal)}>
          <ChevronLeft className="size-5" aria-hidden />
          Batches
        </button>
        <h2 className={cn("flex-1 text-center font-heading text-[20px] font-semibold", COUNT_TONE.ink)}>
          Batch {props.batchNumber}
        </h2>
        <p className={cn("min-w-[72px] text-right font-heading text-[18px] font-semibold tabular-nums", COUNT_TONE.ink)}>
          {props.counted}
          <span className={COUNT_TONE.faint}>/{props.total}</span>
        </p>
      </div>
      <div className={cn("h-1 overflow-hidden rounded-full", COUNT_TONE.track)} aria-hidden>
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none", COUNT_TONE.tealFill)}
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </div>
      <label className="relative block">
        <span className="sr-only">Find a product in this batch</span>
        <Search className={cn("pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2", COUNT_TONE.faint)} aria-hidden />
        <input
          type="search"
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
          placeholder="Name, SKU or barcode"
          className={cn("h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-[16px] focus:border-[var(--pos-primary,#0f766e)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_20%,transparent)]", COUNT_TONE.hair, COUNT_TONE.ink)}
        />
      </label>
      <FilterChips
        value={props.filter}
        onChange={props.onFilterChange}
        counts={{ todo: props.total - props.counted, counted: props.counted, all: props.total }}
      />
    </header>
  );
}

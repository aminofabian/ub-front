"use client";

import { cn } from "@/lib/utils";

import {
  SUPPLY_BILL_FILTERS,
  type SupplyBillFilterId,
} from "./supplies-bill-filters";

type SuppliesBillFilterBarProps = {
  value: SupplyBillFilterId;
  onChange: (filter: SupplyBillFilterId) => void;
  counts: Partial<Record<SupplyBillFilterId, number>>;
  disabled?: boolean;
};

export function SuppliesBillFilterBar({
  value,
  onChange,
  counts,
  disabled,
}: SuppliesBillFilterBarProps) {
  const periodFilters = SUPPLY_BILL_FILTERS.filter((f) => f.group === "period");
  const statusFilters = SUPPLY_BILL_FILTERS.filter((f) => f.group === "status");

  return (
    <div
      className="flex flex-col gap-1.5 border-b border-border bg-[#eef2f7] px-3 py-1.5 dark:bg-muted/25 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1 sm:px-4"
      role="toolbar"
      aria-label="Filter supply receipts"
    >
      <FilterGroup
        label="Status"
        filters={statusFilters}
        value={value}
        counts={counts}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
      <FilterGroup
        label="Period"
        filters={periodFilters}
        value={value}
        counts={counts}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

function FilterGroup({
  label,
  filters,
  value,
  counts,
  disabled,
  onChange,
}: {
  label: string;
  filters: { id: SupplyBillFilterId; label: string }[];
  value: SupplyBillFilterId;
  counts: Partial<Record<SupplyBillFilterId, number>>;
  disabled?: boolean;
  onChange: (filter: SupplyBillFilterId) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <div className="-mx-0.5 flex min-w-0 gap-0.5 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((f) => {
          const active = value === f.id;
          const count = counts[f.id];
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(f.id)}
              className={cn(
                "inline-flex h-6 shrink-0 items-center gap-1 border px-1.5 text-[11px] font-medium tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
                active
                  ? "border-primary/45 bg-primary/12 text-primary"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {f.label}
              {count != null ? (
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    active ? "text-primary" : "text-muted-foreground/80",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

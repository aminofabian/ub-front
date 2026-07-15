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
      className="flex flex-col gap-2.5 border-b border-border/45 bg-muted/15 px-3 py-3 sm:px-4"
      role="toolbar"
      aria-label="Filter supply receipts"
    >
      {/* Status first on mobile — most used */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </span>
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
          {statusFilters.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              count={counts[f.id]}
              active={value === f.id}
              disabled={disabled}
              onClick={() => onChange(f.id)}
              emphasize
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Period
        </span>
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
          {periodFilters.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              count={counts[f.id]}
              active={value === f.id}
              disabled={disabled}
              onClick={() => onChange(f.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  disabled,
  onClick,
  emphasize,
}: {
  label: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  emphasize?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 font-medium transition-colors touch-manipulation",
        emphasize ? "h-10 text-[13px]" : "h-9 text-[12px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "active:scale-[0.97]",
        active
          ? "border-primary/40 bg-primary/12 text-primary shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:bg-muted/40 hover:text-foreground",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {label}
      {count != null ? (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
            active ? "bg-primary/15" : "bg-muted/60 text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

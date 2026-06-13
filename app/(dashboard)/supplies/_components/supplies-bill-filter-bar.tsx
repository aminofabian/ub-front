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
      className="flex flex-col gap-2 border-b border-border/45 bg-muted/15 px-3 py-2.5 sm:px-4"
      role="toolbar"
      aria-label="Filter supply receipts"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Period
        </span>
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
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </span>
        {statusFilters.map((f) => (
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
  );
}

function FilterChip({
  label,
  count,
  active,
  disabled,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
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
            "rounded-sm px-1 py-px font-mono text-[10px] tabular-nums",
            active ? "bg-primary/15" : "bg-muted/60 text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

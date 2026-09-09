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
      className="flex flex-col gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_40%,transparent)] px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:px-3.5"
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
        emphasizeId="unpaid"
      />
      <FilterGroup
        label="When"
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
  emphasizeId,
}: {
  label: string;
  filters: { id: SupplyBillFilterId; label: string }[];
  value: SupplyBillFilterId;
  counts: Partial<Record<SupplyBillFilterId, number>>;
  disabled?: boolean;
  onChange: (filter: SupplyBillFilterId) => void;
  emphasizeId?: SupplyBillFilterId;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
        {label}
      </span>
      <div className="-mx-0.5 flex min-w-0 gap-1 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((f) => {
          const active = value === f.id;
          const count = counts[f.id];
          const emphasize = f.id === emphasizeId && (count ?? 0) > 0 && !active;
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(f.id)}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-medium tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_30%,transparent)]",
                active
                  ? f.id === "unpaid"
                    ? "bg-amber-800 text-white shadow-sm"
                    : "bg-[var(--order-ink,#15231f)] text-white shadow-sm"
                  : emphasize
                    ? "bg-[color-mix(in_srgb,#b45309_12%,transparent)] text-amber-900 ring-1 ring-[color-mix(in_srgb,#b45309_28%,transparent)]"
                    : "bg-white/80 text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] hover:text-[var(--order-ink,#15231f)]",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {f.label}
              {count != null ? (
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    active
                      ? "text-white/70"
                      : emphasize
                        ? "text-amber-800/80"
                        : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]",
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

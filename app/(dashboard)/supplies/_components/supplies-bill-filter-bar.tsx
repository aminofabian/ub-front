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
      className="flex flex-col gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_55%,transparent)] px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:px-4"
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
      <span className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] sm:block" aria-hidden />
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
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
        {label}
      </span>
      <div className="-mx-0.5 flex min-w-0 gap-1 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-medium tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_30%,transparent)]",
                active
                  ? "bg-[var(--order-ink,#15231f)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_12%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:bg-white hover:text-[var(--order-ink,#15231f)]",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {f.label}
              {count != null ? (
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    active
                      ? "text-[color-mix(in_srgb,#fff_70%,transparent)]"
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

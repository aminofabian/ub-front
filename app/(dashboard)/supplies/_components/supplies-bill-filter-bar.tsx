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
      className="flex flex-col gap-1.5 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:px-3.5"
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
      <span className="shrink-0 text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
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
                "inline-flex h-8 shrink-0 items-center gap-1 rounded-none border px-2.5 text-[12px] font-semibold tracking-[-0.02em] tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
                active
                  ? "border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]"
                  : emphasize
                    ? "border-amber-700/40 bg-white text-amber-800"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {f.label}
              {count != null ? (
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    active
                      ? "text-[var(--pos-primary,#0f766e)]"
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

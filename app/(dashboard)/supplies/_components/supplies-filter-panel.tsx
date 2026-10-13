"use client";

import { cn } from "@/lib/utils";

import {
  SUPPLY_BILL_FILTERS,
  type SupplyBillFilterId,
} from "./supplies-bill-filters";

type SuppliesFilterPanelProps = {
  value: SupplyBillFilterId;
  onChange: (filter: SupplyBillFilterId) => void;
  counts: Partial<Record<SupplyBillFilterId, number>>;
  disabled?: boolean;
  /** Vertical rail for column layouts; stack for modals; row for toolbars. */
  layout?: "rail" | "stack" | "row";
  className?: string;
};

export function SuppliesFilterPanel({
  value,
  onChange,
  counts,
  disabled,
  layout = "row",
  className,
}: SuppliesFilterPanelProps) {
  const periodFilters = SUPPLY_BILL_FILTERS.filter((f) => f.group === "period");
  const statusFilters = SUPPLY_BILL_FILTERS.filter((f) => f.group === "status");
  const isRail = layout === "rail";
  const isStack = layout === "stack" || isRail;

  return (
    <div
      className={cn(
        isStack
          ? "flex flex-col gap-3"
          : "flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4",
        className,
      )}
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
        vertical={isStack}
      />
      <FilterGroup
        label="When"
        filters={periodFilters}
        value={value}
        counts={counts}
        disabled={disabled}
        onChange={onChange}
        vertical={isStack}
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
  vertical,
}: {
  label: string;
  filters: { id: SupplyBillFilterId; label: string }[];
  value: SupplyBillFilterId;
  counts: Partial<Record<SupplyBillFilterId, number>>;
  disabled?: boolean;
  onChange: (filter: SupplyBillFilterId) => void;
  emphasizeId?: SupplyBillFilterId;
  vertical?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0",
        vertical ? "flex-col gap-1.5" : "items-center gap-2",
      )}
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "flex min-w-0 gap-1.5",
          vertical
            ? "flex-col"
            : "-mx-0.5 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
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
                "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold tracking-[-0.02em] tabular-nums transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40",
                vertical && "w-full justify-between",
                active
                  ? "bg-[#0f766e] text-white"
                  : emphasize
                    ? "bg-white text-[#9a2e16] ring-1 ring-[#9a2e16]/35"
                    : "bg-white text-[#475467] ring-1 ring-black/[0.05] hover:bg-[#f2f7f5] hover:text-[#101828]",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {f.label}
              {count != null ? (
                <span
                  className={cn(
                    "tabular-nums text-[10px]",
                    active
                      ? "text-white/85"
                      : emphasize
                        ? "text-[#9a2e16]/80"
                        : "text-muted-foreground/80",
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

"use client";

import { SuppliesFilterPanel } from "./supplies-filter-panel";
import type { SupplyBillFilterId } from "./supplies-bill-filters";

type SuppliesBillFilterBarProps = {
  value: SupplyBillFilterId;
  onChange: (filter: SupplyBillFilterId) => void;
  counts: Partial<Record<SupplyBillFilterId, number>>;
  disabled?: boolean;
};

/** @deprecated Prefer SuppliesFilterPanel — kept for call sites that expect a bar. */
export function SuppliesBillFilterBar(props: SuppliesBillFilterBarProps) {
  return (
    <div className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] px-3 py-2 sm:px-3.5">
      <SuppliesFilterPanel layout="row" {...props} />
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { CATALOG_CHIP, CATALOG_EDGE } from "./catalog-chrome";

export type AttentionFilterId =
  | "missingBarcode"
  | "noPrice"
  | "zeroStock"
  | "lowStock"
  | "inactive";

type AttentionStat = {
  id: AttentionFilterId;
  count: number;
  label: string;
  active: boolean;
};

type Props = {
  attentionStats?: AttentionStat[];
  onAttentionToggle?: (id: AttentionFilterId) => void;
  className?: string;
};

export function ProductAttentionBar({
  attentionStats = [],
  onAttentionToggle,
  className,
}: Props) {
  const visibleAttention = attentionStats.filter((s) => s.count > 0);
  if (visibleAttention.length === 0) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5 rounded-none border bg-white px-2 py-1.5",
        CATALOG_EDGE,
        className,
      )}
      role="group"
      aria-label="Needs a look"
    >
      <span className="inline-flex items-center pr-1 text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)]">
        Needs a look
      </span>
      {visibleAttention.map((stat) => (
        <button
          key={stat.id}
          type="button"
          onClick={() => onAttentionToggle?.(stat.id)}
          aria-pressed={stat.active}
          title={
            stat.active
              ? `Clear “${stat.label}” filter`
              : `Show products with ${stat.label}`
          }
          className={cn(
            CATALOG_CHIP,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_30%,transparent)]",
            stat.active
              ? "border-[var(--catalog-ink,#15231f)] bg-[var(--catalog-ink,#15231f)] text-white"
              : "border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_62%,transparent)] hover:border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_20%,transparent)] hover:text-[var(--catalog-ink,#15231f)]",
          )}
        >
          <span className="font-semibold tabular-nums">
            {stat.count.toLocaleString()}
          </span>
          <span>{stat.label}</span>
        </button>
      ))}
    </div>
  );
}

/** @deprecated Use ProductAttentionBar + ProductHeaderActions */
export function ProductHeroHeader({
  attentionStats = [],
  onAttentionToggle,
}: Pick<Props, "attentionStats" | "onAttentionToggle"> & {
  itemTypeCount?: number;
  onCreateNew?: () => void;
  onAddVariant?: () => void;
  canAddVariant?: boolean;
  onAddFromCatalog?: () => void;
  canAddFromCatalog?: boolean;
}) {
  return (
    <ProductAttentionBar
      attentionStats={attentionStats}
      onAttentionToggle={onAttentionToggle}
    />
  );
}

export type { AttentionStat };

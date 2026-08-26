"use client";

import type { ItemSummaryRecord } from "@/lib/api";
import { groupPosCatalogHits, type PosCatalogHitBlock } from "@/lib/pos-catalog-groups";

import {
  PosVariantRow,
  PosVariantTable,
} from "./pos-variant-table";

type PosSearchHitListProps = {
  hits: ItemSummaryRecord[];
  shelfPrices: Record<string, string>;
  cartQtyByItem: Map<string, number>;
  justAddedId: string | null;
  currency: string;
  sharedCategoryLabel: string | null;
  onPick: (item: ItemSummaryRecord) => void;
};

function VariantGroupBlock({
  block,
  shelfPrices,
  cartQtyByItem,
  justAddedId,
  onPick,
}: {
  block: Extract<PosCatalogHitBlock, { kind: "variantGroup" }>;
  shelfPrices: Record<string, string>;
  cartQtyByItem: Map<string, number>;
  justAddedId: string | null;
  onPick: (item: ItemSummaryRecord) => void;
}) {
  return (
    <div className="overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-card dark:border-border/40">
      <div className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_65%,transparent)] px-2.5 py-1.5 dark:border-border/40 dark:bg-muted/30">
        <p className="truncate text-sm font-semibold text-foreground">
          {block.title}
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {block.variants.length} sizes · tap a row to add
        </p>
      </div>
      <PosVariantTable
        variants={block.variants}
        shelfPrices={shelfPrices}
        cartQtyByItem={cartQtyByItem}
        justAddedId={justAddedId}
        onPick={onPick}
      />
    </div>
  );
}

export function PosSearchHitList({
  hits,
  shelfPrices,
  cartQtyByItem,
  justAddedId,
  currency: _currency,
  sharedCategoryLabel,
  onPick,
}: PosSearchHitListProps) {
  const blocks = groupPosCatalogHits(hits);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {sharedCategoryLabel ? (
        <p className="px-0.5 text-[11px] text-muted-foreground">
          Showing {sharedCategoryLabel}
        </p>
      ) : null}
      {blocks.map((block) => {
        if (block.kind === "variantGroup") {
          return (
            <VariantGroupBlock
              key={`g-${block.parentId}`}
              block={block}
              shelfPrices={shelfPrices}
              cartQtyByItem={cartQtyByItem}
              justAddedId={justAddedId}
              onPick={onPick}
            />
          );
        }
        const item = block.item;
        return (
          <div
            key={item.id}
            className="overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-card dark:border-border/40"
          >
            <PosVariantRow
              item={item}
              shelfLine={shelfPrices[item.id] ?? ""}
              cartQty={cartQtyByItem.get(item.id) ?? 0}
              justAdded={justAddedId === item.id}
              onPick={() => onPick(item)}
            />
          </div>
        );
      })}
    </div>
  );
}

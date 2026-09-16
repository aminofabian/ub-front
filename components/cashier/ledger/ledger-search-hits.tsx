"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Plus } from "lucide-react";

import type { ItemSummaryRecord } from "@/lib/api";
import { cashierItemPrimaryLabel, isPosSellableSku } from "@/lib/cashier-item-display";
import {
  formatPosStockQty,
  groupPosCatalogHits,
  posVariantOptionLabel,
} from "@/lib/pos-catalog-groups";
import { cn } from "@/lib/utils";

import { stockTone } from "../pos-variant-table";

type LedgerSearchHitsProps = {
  hits: ItemSummaryRecord[];
  shelfPrices: Record<string, string>;
  cartQtyByItem: Map<string, number>;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onPick: (item: ItemSummaryRecord) => void;
};

function flattenHits(hits: ItemSummaryRecord[]): ItemSummaryRecord[] {
  return groupPosCatalogHits(hits).flatMap((block) =>
    block.kind === "variantGroup" ? block.variants : [block.item],
  );
}

export function flattenLedgerSearchHits(
  hits: ItemSummaryRecord[],
): ItemSummaryRecord[] {
  return flattenHits(hits);
}

function HitRow({
  item,
  shelfLine,
  cartQty,
  active,
  optionLabel,
  onPick,
}: {
  item: ItemSummaryRecord;
  shelfLine: string;
  cartQty: number;
  active: boolean;
  optionLabel?: string | null;
  onPick: () => void;
}) {
  const sku = item.sku?.trim() || "";
  const label = optionLabel ?? cashierItemPrimaryLabel(item);
  const stock = formatPosStockQty(item.stockQty);
  const tone = stockTone(item);
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onPick}
      disabled={!isPosSellableSku(item)}
      className={cn(
        "flex w-full items-center gap-3 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-2 text-left",
        "hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
        "focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--pos-primary)_10%,var(--card))]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-[color-mix(in_srgb,var(--pos-primary)_10%,var(--card))]",
        cartQty > 0 &&
          !active &&
          "bg-[color-mix(in_srgb,var(--pos-primary)_6%,var(--card))]",
      )}
      aria-label={
        cartQty > 0
          ? `${cashierItemPrimaryLabel(item)}, ${cartQty} in cart. Add another.`
          : `Add ${cashierItemPrimaryLabel(item)}`
      }
    >
      <span className="min-w-0 flex-1">
        <span className="block whitespace-normal break-words text-[13px] font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
          {label}
        </span>
        <span className="mt-0.5 flex min-w-0 items-baseline gap-2 text-[11px] leading-snug">
          {stock != null ? (
            <span
              className={cn(
                "shrink-0 tabular-nums",
                tone === "out"
                  ? "font-medium text-red-700"
                  : tone === "low"
                    ? "font-medium text-amber-800"
                    : "text-muted-foreground",
              )}
            >
              Stock {stock}
            </span>
          ) : null}
          {sku ? (
            <span className="min-w-0 truncate font-mono text-muted-foreground/70" title={sku}>
              {sku}
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
        {shelfLine}
      </span>
      <span className="flex w-9 shrink-0 justify-end">
        {cartQty > 0 ? (
          <span className="tabular-nums text-[11px] font-semibold text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_80%,transparent)]">
            ×{cartQty}
          </span>
        ) : (
          <Plus
            className="size-4 text-[var(--pos-primary,#14532d)]"
            aria-hidden
          />
        )}
      </span>
    </button>
  );
}

export function LedgerSearchHits({
  hits,
  shelfPrices,
  cartQtyByItem,
  searchInputRef,
  onPick,
}: LedgerSearchHitsProps) {
  const blocks = useMemo(() => groupPosCatalogHits(hits), [hits]);
  const flat = useMemo(() => flattenHits(hits), [hits]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [hits]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (searchInputRef?.current && document.activeElement !== searchInputRef.current) {
        return;
      }
      if (flat.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, flat.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        const item = flat[active];
        if (!item || !isPosSellableSku(item)) return;
        e.preventDefault();
        onPick(item);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, active, onPick, searchInputRef]);

  if (blocks.length === 0) return null;

  /**
   * Row offset of each block within `flat` — groups expand in place, so the
   * running index is derived, never accumulated during render.
   */
  const rowStarts = blocks.reduce<number[]>((starts, _block, i) => {
    if (i === 0) return [0];
    const prev = blocks[i - 1];
    const span = prev.kind === "variantGroup" ? prev.variants.length : 1;
    return [...starts, starts[i - 1] + span];
  }, []);

  return (
    <div>
      <div className="sticky top-0 z-20 flex h-8 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-card px-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {flat.length} {flat.length === 1 ? "match" : "matches"}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Up/down to choose
        </p>
      </div>
      {blocks.map((block, blockIndex) => {
        if (block.kind === "variantGroup") {
          return (
            <section key={`g-${block.parentId}`}>
              <div className="sticky top-8 z-10 flex items-baseline justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)] px-3 py-1.5">
                <h3 className="min-w-0 whitespace-normal break-words text-[13px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
                  {block.title}
                </h3>
                <span className="shrink-0 font-mono tabular-nums text-[11px] text-muted-foreground">
                  {block.variants.length}
                </span>
              </div>
              {block.variants.map((item, variantIndex) => {
                const index = rowStarts[blockIndex] + variantIndex;
                return (
                  <HitRow
                    key={item.id}
                    item={item}
                    shelfLine={shelfPrices[item.id] ?? ""}
                    cartQty={cartQtyByItem.get(item.id) ?? 0}
                    active={index === active}
                    optionLabel={posVariantOptionLabel(item)}
                    onPick={() => onPick(item)}
                  />
                );
              })}
            </section>
          );
        }
        const index = rowStarts[blockIndex];
        const item = block.item;
        return (
          <HitRow
            key={item.id}
            item={item}
            shelfLine={shelfPrices[item.id] ?? ""}
            cartQty={cartQtyByItem.get(item.id) ?? 0}
            active={index === active}
            onPick={() => onPick(item)}
          />
        );
      })}
    </div>
  );
}

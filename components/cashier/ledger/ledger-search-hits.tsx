"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Plus } from "lucide-react";

import type { ItemSummaryRecord } from "@/lib/api";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
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
      disabled={Boolean(item.groupLabelOnly)}
      className={cn(
        "flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2 text-left",
        "hover:bg-zinc-50",
        "focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--pos-primary)_10%,white)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-[color-mix(in_srgb,var(--pos-primary)_10%,white)]",
        cartQty > 0 &&
          !active &&
          "bg-[color-mix(in_srgb,var(--pos-primary)_6%,white)]",
      )}
      aria-label={
        cartQty > 0
          ? `${cashierItemPrimaryLabel(item)}, ${cartQty} in cart. Add another.`
          : `Add ${cashierItemPrimaryLabel(item)}`
      }
    >
      <span className="min-w-0 flex-1">
        <span className="block whitespace-normal break-words text-[13px] font-medium leading-snug text-zinc-900">
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
                    : "text-zinc-500",
              )}
            >
              Stock {stock}
            </span>
          ) : null}
          {sku ? (
            <span className="min-w-0 truncate font-mono text-zinc-400" title={sku}>
              {sku}
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-zinc-900">
        {shelfLine}
      </span>
      <span className="flex w-9 shrink-0 justify-end">
        {cartQty > 0 ? (
          <span className="tabular-nums text-[11px] font-semibold text-zinc-700">
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
        if (!item || item.groupLabelOnly) return;
        e.preventDefault();
        onPick(item);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, active, onPick, searchInputRef]);

  if (blocks.length === 0) return null;

  let rowIndex = -1;

  return (
    <div>
      <div className="sticky top-0 z-20 flex h-8 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3">
        <p className="text-[11px] font-medium text-zinc-500">
          {flat.length} {flat.length === 1 ? "match" : "matches"}
        </p>
        <p className="text-[11px] text-zinc-400">Up/down to choose</p>
      </div>
      {blocks.map((block) => {
        if (block.kind === "variantGroup") {
          return (
            <section key={`g-${block.parentId}`}>
              <div className="sticky top-8 z-10 flex items-baseline justify-between gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-1.5">
                <h3 className="min-w-0 whitespace-normal break-words text-[13px] font-semibold leading-snug text-zinc-900">
                  {block.title}
                </h3>
                <span className="shrink-0 tabular-nums text-[11px] text-zinc-500">
                  {block.variants.length}
                </span>
              </div>
              {block.variants.map((item) => {
                rowIndex += 1;
                const index = rowIndex;
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
        rowIndex += 1;
        const index = rowIndex;
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

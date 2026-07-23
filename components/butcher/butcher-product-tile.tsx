"use client";

import Image from "next/image";
import { Beef } from "lucide-react";

import type { ItemSummaryRecord } from "@/lib/api";
import { itemListThumbnailUrl } from "@/lib/api";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import {
  formatButcherTilePrice,
  resolveButcherSellBy,
} from "@/lib/butcher-pos";
import { cn } from "@/lib/utils";

type ButcherProductTileProps = {
  item: ItemSummaryRecord;
  currency: string;
  unitPrice: number | null | undefined;
  cartQty?: number;
  onPick: () => void;
};

export function ButcherProductTile({
  item,
  currency,
  unitPrice,
  cartQty = 0,
  onPick,
}: ButcherProductTileProps) {
  const thumb = itemListThumbnailUrl(item);
  const title = cashierItemPrimaryLabel(item);
  const sellBy = resolveButcherSellBy(item);
  const inCart = cartQty > 0;
  const priceLabel =
    unitPrice != null && Number.isFinite(unitPrice)
      ? formatButcherTilePrice(unitPrice, currency, sellBy)
      : "…";

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={inCart ? `${title} — ${cartQty} in order` : `Add ${title}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-none border bg-[rgb(var(--bp-surface))] text-left transition touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--bp-ring-offset))]",
        inCart
          ? "border-[var(--pos-primary)]"
          : "border-[rgb(var(--bp-border))] hover:border-[color-mix(in_srgb,var(--pos-primary)_40%,rgb(var(--bp-border)))]",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[rgb(var(--bp-image)/0.55)]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            width={280}
            height={280}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[rgb(var(--bp-panel))]">
            <Beef
              className="size-8 text-[color-mix(in_srgb,var(--pos-primary)_45%,#a3a3a3)]"
              strokeWidth={1.25}
              aria-hidden
            />
          </div>
        )}
        {inCart ? (
          <span className="absolute left-0 top-0 z-[1] inline-flex h-6 min-w-6 items-center justify-center rounded-none bg-[var(--pos-primary)] px-1.5 text-[11px] font-bold tabular-nums text-[var(--pos-primary-ink)]">
            {cartQty}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 border-t border-[rgb(var(--bp-border))] px-2 py-1.5">
        <p className="line-clamp-2 text-[12px] font-medium leading-snug text-[rgb(var(--bp-fg))]">
          {title}
        </p>
        <p
          className={cn(
            "text-[12px] font-semibold tabular-nums",
            unitPrice != null
              ? "text-[var(--pos-primary)]"
              : "text-[rgb(var(--bp-fg-muted))]",
          )}
        >
          {priceLabel}
        </p>
      </div>
    </button>
  );
}

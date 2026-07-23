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
        "group relative flex flex-col overflow-hidden rounded-none border text-left transition active:scale-[0.99] touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_25%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bp-ring-offset))]",
        inCart
          ? "border-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_8%,rgb(var(--bp-panel-strong)))]"
          : "border-[rgb(var(--bp-border)/0.9)] bg-[rgb(var(--bp-surface)/0.7)] hover:border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] hover:bg-[rgb(var(--bp-surface))]",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[rgb(var(--bp-image)/0.8)]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            width={280}
            height={224}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgb(var(--bp-gradient-from))] to-[rgb(var(--bp-gradient-to))]">
            <Beef
              className="size-9 text-[color-mix(in_srgb,var(--pos-primary)_55%,#737373)]"
              strokeWidth={1.25}
              aria-hidden
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgb(var(--bp-overlay)/0.55)] via-transparent to-transparent" />
        {inCart ? (
          <span className="absolute right-2 top-2 z-[1] inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--pos-primary)] px-1.5 text-[10px] font-bold tabular-nums text-[var(--pos-primary-ink)] shadow-sm">
            {cartQty}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2.5 pb-2.5 pt-2">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[rgb(var(--bp-fg))]">
          {title}
        </p>
        <p
          className={cn(
            "text-xs font-medium tabular-nums",
            unitPrice != null ? "text-[rgb(var(--bp-fg-faint))]" : "text-[rgb(var(--bp-fg-muted))]",
          )}
        >
          {priceLabel}
        </p>
      </div>
    </button>
  );
}

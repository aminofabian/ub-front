"use client";

import Image from "next/image";
import { Minus, Package, Plus } from "lucide-react";

import type { SupplierItemLinkRecord } from "@/lib/api";
import type { OrderCartPackMeta, OrderCartQty } from "@/lib/order-cart-storage";
import { orderLinkTitleParts } from "@/app/(dashboard)/order/_lib/order-link-display";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn, formatMoney } from "@/lib/utils";
import { OrderQtyField } from "./order-qty-field";

const ORDER_CURRENCY = "KES";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function packUnitPrice(
  link: SupplierItemLinkRecord,
  pack: { size: number; price?: number | null } | null,
): number {
  if (pack && pack.price != null && pack.price > 0) return pack.price;
  return (
    toNum(link.lastCostPrice) ||
    toNum(link.defaultCostPrice) ||
    toNum(link.catalogBuyingPrice)
  );
}

function OrderShelfTile({
  link,
  qty,
  pack,
  pickMode,
  picking,
  onAdd,
  onSetQty,
}: {
  link: SupplierItemLinkRecord;
  qty: number;
  pack: { size: number; price?: number | null } | null;
  pickMode: boolean;
  picking: boolean;
  onAdd: () => void;
  onSetQty: (qty: number) => void;
}) {
  const stock = toNum(link.currentStock);
  const reorder = toNum(link.reorderLevel);
  const low = reorder > 0 && stock <= reorder;
  const packed = pack != null && pack.size > 1;
  const cost = packUnitPrice(link, pack);
  const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
  const { primary, option } = orderLinkTitleParts(link);
  const inCart = qty > 0;
  const hasPrice = cost > 0;

  return (
    <article
      className={cn(
        "group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        inCart ? "ring-2 ring-[#0f766e]" : "ring-1 ring-black/[0.05]",
      )}
    >
      <button
        type="button"
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden bg-[#e9f5f1]",
          "touch-manipulation disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e]",
        )}
        onClick={onAdd}
        disabled={pickMode && picking}
        aria-label={pickMode ? `Add ${link.itemName}` : `Add ${link.itemName}`}
      >
        {thumb ? (
          <span className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2">
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width: 640px) 48vw, (min-width: 1024px) 18vw, 180px"
              className="object-contain object-center"
              unoptimized
            />
          </span>
        ) : (
          <span className="absolute left-1/2 top-1/2 flex h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <Package
              className="size-10 opacity-20"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
        )}
        {inCart ? (
          <span
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#0f766e] text-[12px] font-semibold tabular-nums text-white"
            aria-hidden
          >
            {qty}
          </span>
        ) : null}
      </button>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <div className="min-w-0">
          <p
            className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[#101828]"
            title={primary}
          >
            {primary}
          </p>
          {option ? (
            <p className="mt-0.5 truncate text-[13px] leading-snug text-[#667085]">
              {option}
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-[13px] font-semibold tabular-nums",
              hasPrice ? "text-[#101828]" : "text-[#98a2b3]",
            )}
          >
            {hasPrice ? formatMoney(cost, ORDER_CURRENCY) : "No price"}
            {packed && hasPrice ? (
              <span className="ml-1 text-[11px] font-medium text-[#98a2b3]">
                / pack
              </span>
            ) : null}
          </p>
          <p
            className={cn(
              "shrink-0 text-[12px] font-medium tabular-nums",
              low ? "text-[#b45309]" : "text-[#667085]",
            )}
          >
            {stock} in stock
          </p>
        </div>

        {pickMode ? (
          <button
            type="button"
            className="mt-auto flex h-11 w-full items-center justify-center rounded-xl bg-[#e6f4f0] text-[14px] font-semibold text-[#0f766e] transition-colors duration-150 hover:bg-[#d9ede7] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
            onClick={onAdd}
            disabled={picking}
          >
            {picking ? "Adding…" : "Add to order"}
          </button>
        ) : inCart ? (
          <div
            className="mt-auto flex h-11 min-w-0 items-center gap-1 rounded-xl bg-[#e6f4f0] px-1"
            role="group"
            aria-label={`Quantity for ${primary}`}
          >
            <button
              type="button"
              disabled={qty <= 0}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#0f766e] transition-colors duration-150 hover:bg-[#d9ede7] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
              onClick={() => onSetQty(qty - 1)}
              aria-label="Decrease"
            >
              <Minus className="size-4" strokeWidth={2.25} aria-hidden />
            </button>
            <OrderQtyField
              qty={qty}
              onSetQty={onSetQty}
              ariaLabel={`Quantity for ${primary}`}
              className="h-9 min-w-0 flex-1 px-1 text-[#0f766e]"
            />
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0f766e] text-white transition-colors duration-150 hover:bg-[#0b5f59] active:bg-[#0b5f59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
              onClick={() => onSetQty(qty + 1)}
              aria-label="Increase"
            >
              <Plus className="size-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-auto flex h-11 w-full items-center justify-center rounded-xl bg-[#e6f4f0] text-[14px] font-semibold text-[#0f766e] transition-colors duration-150 hover:bg-[#d9ede7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
            onClick={onAdd}
          >
            Add
          </button>
        )}
      </div>
    </article>
  );
}

export type OrderProductShelfProps = {
  links: SupplierItemLinkRecord[];
  cart: OrderCartQty;
  packByItemId: OrderCartPackMeta;
  onSetQty: (itemId: string, qty: number) => void;
  /** Pick mode: tap to add once (no qty stepper). */
  onPickItem?: (link: SupplierItemLinkRecord) => void;
  pickingItemId?: string | null;
};

export function OrderProductShelf({
  links,
  cart,
  packByItemId,
  onSetQty,
  onPickItem,
  pickingItemId = null,
}: OrderProductShelfProps) {
  const pickMode = onPickItem != null;

  return (
    <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))] 2xl:grid-cols-[repeat(4,minmax(0,1fr))]">
      {links.map((link) => {
        const qty = cart[link.itemId] ?? 0;
        const pack = packByItemId[link.itemId] ?? null;
        return (
          <OrderShelfTile
            key={link.id}
            link={link}
            qty={qty}
            pack={pack}
            pickMode={pickMode}
            picking={pickingItemId === link.itemId}
            onAdd={() =>
              pickMode ? onPickItem(link) : onSetQty(link.itemId, qty + 1)
            }
            onSetQty={(next) => onSetQty(link.itemId, next)}
          />
        );
      })}
    </div>
  );
}

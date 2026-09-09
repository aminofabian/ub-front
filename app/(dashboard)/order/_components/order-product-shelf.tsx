"use client";

import Image from "next/image";
import { Package } from "lucide-react";

import type { ItemLinkPackOfferRecord, SupplierItemLinkRecord } from "@/lib/api";
import type { OrderCartPackMeta, OrderCartQty } from "@/lib/order-cart-storage";
import { orderLinkTitleParts } from "@/app/(dashboard)/order/_lib/order-link-display";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn, formatMoney } from "@/lib/utils";

const ORDER_CURRENCY = "KES";

function formatPackSize(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function linkPacks(link: SupplierItemLinkRecord): ItemLinkPackOfferRecord[] {
  return link.packs?.filter((p) => p.unitsPerPack > 0) ?? [];
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

function OrderTileTitle({
  primary,
  option,
}: {
  primary: string;
  option: string | null;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="line-clamp-2 break-words text-[12px] font-semibold leading-snug text-[var(--order-ink,#15231f)]">
        {primary}
      </p>
      {option ? (
        <p className="truncate text-[11px] font-medium tabular-nums leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
          {option}
        </p>
      ) : null}
    </div>
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-2.5">
      {links.map((link) => {
        const qty = cart[link.itemId] ?? 0;
        const stock = toNum(link.currentStock);
        const reorder = toNum(link.reorderLevel);
        const low = reorder > 0 && stock <= reorder;
        const pack = packByItemId[link.itemId] ?? null;
        const packed = pack != null && pack.size > 1;
        const cost = packUnitPrice(link, pack);
        const lineTotal = cost > 0 && qty > 0 ? cost * qty : 0;
        const packs = linkPacks(link);
        const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
        const { primary, option } = orderLinkTitleParts(link);
        const inCart = qty > 0;

        return (
          <div
            key={link.id}
            className={cn(
              "group flex min-w-0 flex-col overflow-hidden rounded-none bg-white",
              "border transition-[border-color,background-color] duration-150",
              inCart
                ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,#fff)]"
                : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_28%,transparent)]",
            )}
          >
            <button
              type="button"
              className={cn(
                "relative aspect-square w-full touch-manipulation rounded-none",
                "bg-[linear-gradient(180deg,#fbfcfa_0%,#f3f6f4_100%)]",
                "transition-colors duration-150 active:bg-[#eef1ef] disabled:opacity-60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
              )}
              onClick={() =>
                pickMode
                  ? onPickItem(link)
                  : onSetQty(link.itemId, qty + 1)
              }
              disabled={pickMode && pickingItemId === link.itemId}
              aria-label={
                pickMode ? `Add ${link.itemName}` : `Add ${link.itemName}`
              }
            >
              {thumb ? (
                <span className="absolute inset-[12.5%]">
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 48vw, (min-width: 1024px) 18vw, 160px"
                    className="object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                    unoptimized
                  />
                </span>
              ) : (
                <span className="absolute inset-[12.5%] flex items-center justify-center">
                  <Package
                    className="size-8 opacity-15"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
              )}
            </button>

            {/* Price lives under the image as a till ticket, never over the logo. */}
            <div
              className={cn(
                "flex items-end justify-between gap-2 px-2 py-1.5",
                inCart
                  ? "bg-[var(--pos-primary,#0f766e)] text-white"
                  : cost > 0
                    ? "bg-[var(--order-ink,#15231f)] text-white"
                    : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,#fff)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]",
              )}
            >
              <span className="min-w-0">
                <span className="block text-[8px] font-bold uppercase tracking-[0.14em] opacity-70">
                  {inCart ? `Qty ×${qty}` : packed ? "Per pack" : "Buy"}
                </span>
                <span className="block truncate font-heading text-[13px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
                  {cost > 0 ? formatMoney(cost, ORDER_CURRENCY) : "No price"}
                </span>
              </span>
              {lineTotal > 0 ? (
                <span className="shrink-0 text-right">
                  <span className="block text-[8px] font-bold uppercase tracking-[0.1em] opacity-70">
                    Line
                  </span>
                  <span className="block font-mono text-[10px] font-bold tabular-nums leading-none">
                    {formatMoney(lineTotal, ORDER_CURRENCY)}
                  </span>
                </span>
              ) : packed && !inCart ? (
                <span className="shrink-0 font-mono text-[10px] font-bold tabular-nums leading-none opacity-80">
                  ×{formatPackSize(pack.size)}
                </span>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-2 pb-2 pt-1.5">
              <OrderTileTitle primary={primary} option={option} />
              {low ? (
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                  Stock {stock}
                </p>
              ) : null}
              {packs.length > 0 ? (
                <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
                  {packs
                    .map((p) => `×${formatPackSize(p.unitsPerPack)}`)
                    .join(" · ")}
                </p>
              ) : null}

              {pickMode ? (
                <button
                  type="button"
                  className="mt-auto flex h-8 w-full items-center justify-center rounded-none bg-[var(--pos-primary,#0f766e)] text-[11px] font-bold text-white transition hover:bg-[#0d6b63] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]"
                  onClick={() => onPickItem(link)}
                  disabled={pickingItemId === link.itemId}
                >
                  {pickingItemId === link.itemId ? "Adding…" : "Add to order"}
                </button>
              ) : (
                <div className="mt-auto grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
                  <button
                    type="button"
                    disabled={qty <= 0}
                    className="flex h-8 items-center justify-center touch-manipulation border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[16px] leading-none text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,#fff)] disabled:opacity-25"
                    onClick={() => onSetQty(link.itemId, qty - 1)}
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="flex h-8 items-center justify-center bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_70%,#fff)] font-mono text-[12px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="flex h-8 items-center justify-center touch-manipulation border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[16px] leading-none text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,#fff)]"
                    onClick={() => onSetQty(link.itemId, qty + 1)}
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
        <p className="truncate text-[10px] font-medium leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-3">
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

        return (
          <div
            key={link.id}
            className={cn(
              "group flex min-w-0 flex-col overflow-hidden rounded-xl bg-white transition-[box-shadow,transform,ring-color] duration-150",
              qty > 0
                ? "shadow-[0_10px_24px_-16px_color-mix(in_srgb,var(--pos-primary,#0f766e)_55%,transparent)] ring-2 ring-[var(--pos-primary,#0f766e)]"
                : "shadow-sm ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] hover:-translate-y-px hover:shadow-md hover:ring-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
            )}
          >
            <button
              type="button"
              className="relative aspect-[5/4] w-full touch-manipulation rounded-t-[10px] bg-[linear-gradient(180deg,#fbfcfa_0%,#f3f6f4_100%)] transition-transform active:scale-[0.985] disabled:opacity-60"
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
                <Image
                  src={thumb}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 48vw, (min-width: 1024px) 18vw, 160px"
                  className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <Package
                    className="size-5 opacity-15"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
              )}

              {qty > 0 ? (
                <span className="absolute left-1.5 top-1.5 z-[1] inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--pos-primary,#0f766e)] px-1.5 font-mono text-[10px] font-bold text-white shadow-sm">
                  {qty}
                </span>
              ) : null}
              {packed ? (
                <span className="absolute right-1.5 top-1.5 z-[1] rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums text-amber-950">
                  ×{formatPackSize(pack.size)}
                </span>
              ) : null}
              {low ? (
                <span className="absolute bottom-9 left-1.5 z-[1] rounded bg-amber-700/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums text-white">
                  stock {stock}
                </span>
              ) : null}

              {/* Price ticket pinned to the image */}
              <span
                className={cn(
                  "absolute inset-x-1.5 bottom-1.5 z-[1] flex items-end justify-between gap-1 rounded-md px-2 py-1 shadow-sm backdrop-blur-[2px]",
                  cost > 0
                    ? "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_88%,transparent)] text-white"
                    : "bg-white/90 text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-[8px] font-bold uppercase tracking-[0.12em] opacity-70">
                    {packed ? "Per pack" : "Buy"}
                  </span>
                  <span className="block truncate font-heading text-[13px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
                    {cost > 0 ? formatMoney(cost, ORDER_CURRENCY) : "No price"}
                  </span>
                </span>
                {lineTotal > 0 ? (
                  <span className="shrink-0 text-right">
                    <span className="block text-[8px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,#fff_70%,transparent)]">
                      Line
                    </span>
                    <span className="block font-mono text-[10px] font-bold tabular-nums text-[color-mix(in_srgb,var(--pos-primary,#5eead4)_85%,#fff)]">
                      {formatMoney(lineTotal, ORDER_CURRENCY)}
                    </span>
                  </span>
                ) : null}
              </span>
            </button>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-2 pb-2 pt-1.5">
              <OrderTileTitle primary={primary} option={option} />
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
                  className="mt-auto flex h-8 w-full items-center justify-center rounded-md bg-[var(--pos-primary,#0f766e)] text-[11px] font-bold text-white transition hover:bg-[#0d6b63] disabled:opacity-60"
                  onClick={() => onPickItem(link)}
                  disabled={pickingItemId === link.itemId}
                >
                  {pickingItemId === link.itemId ? "Adding…" : "Add to order"}
                </button>
              ) : (
                <div className="mt-auto inline-flex w-full items-center overflow-hidden rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_55%,transparent)]">
                  <button
                    type="button"
                    disabled={qty <= 0}
                    className="flex h-8 w-9 shrink-0 items-center justify-center touch-manipulation text-[15px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-white disabled:opacity-25"
                    onClick={() => onSetQty(link.itemId, qty - 1)}
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="min-w-0 flex-1 text-center font-mono text-[12px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="flex h-8 w-9 shrink-0 items-center justify-center touch-manipulation text-[15px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-white"
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

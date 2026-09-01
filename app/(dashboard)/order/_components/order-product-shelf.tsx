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
  pack: { size: number } | null,
): number {
  const base =
    toNum(link.lastCostPrice) ||
    toNum(link.defaultCostPrice) ||
    toNum(link.catalogBuyingPrice);
  if (!pack || pack.size <= 1) return base;
  return base;
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
      <p className="line-clamp-2 break-words text-[12px] font-medium leading-snug text-[var(--order-ink,#15231f)]">
        {primary}
      </p>
      {option ? (
        <p className="line-clamp-1 break-words text-[10px] font-semibold leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_72%,transparent)]">
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 min-[1500px]:grid-cols-8 min-[1500px]:gap-3">
      {links.map((link) => {
        const qty = cart[link.itemId] ?? 0;
        const stock = toNum(link.currentStock);
        const reorder = toNum(link.reorderLevel);
        const low = reorder > 0 && stock <= reorder;
        const pack = packByItemId[link.itemId] ?? null;
        const packed = pack != null && pack.size > 1;
        const cost = packUnitPrice(link, pack);
        const packs = linkPacks(link);
        const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
        const { primary, option } = orderLinkTitleParts(link);

        return (
          <div
            key={link.id}
            className={cn(
              "group flex min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-[box-shadow,ring-color] duration-150",
              qty > 0
                ? "ring-2 ring-[var(--pos-primary,#0f766e)]"
                : "ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] hover:shadow-md hover:ring-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
            )}
          >
            <button
              type="button"
              className="relative aspect-[5/4] w-full touch-manipulation rounded-t-[10px] bg-[#fafbfa] transition-transform active:scale-[0.985] disabled:opacity-60"
              onClick={() =>
                pickMode
                  ? onPickItem(link)
                  : onSetQty(link.itemId, qty + 1)
              }
              disabled={pickMode && pickingItemId === link.itemId}
              aria-label={pickMode ? `Add ${link.itemName}` : `Add ${link.itemName}`}
            >
              {thumb ? (
                <Image
                  src={thumb}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 48vw, (min-width: 1536px) 10vw, 140px"
                  className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.02]"
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
                <span className="absolute bottom-1.5 right-1.5 z-[1] bg-amber-700/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums text-white">
                  {stock}
                </span>
              ) : null}
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
              <div className="mt-auto flex min-w-0 items-center justify-between gap-1">
                <p className="min-w-0 truncate font-mono text-[11px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                  {cost > 0 ? formatMoney(cost, ORDER_CURRENCY) : "—"}
                  {packed ? (
                    <span className="font-sans text-[8px] font-semibold uppercase tracking-wide text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
                      {" "}
                      /pk
                    </span>
                  ) : null}
                </p>
                {pickMode ? (
                  <span className="shrink-0 rounded-md bg-[var(--pos-primary,#0f766e)] px-2 py-1 text-[10px] font-bold text-white">
                    {pickingItemId === link.itemId ? "…" : "Add"}
                  </span>
                ) : (
                  <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_50%,transparent)]">
                    <button
                      type="button"
                      disabled={qty <= 0}
                      className="flex size-7 items-center justify-center touch-manipulation text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-white disabled:opacity-25"
                      onClick={() => onSetQty(link.itemId, qty - 1)}
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span className="min-w-5 text-center font-mono text-[11px] font-semibold tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center touch-manipulation text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-white"
                      onClick={() => onSetQty(link.itemId, qty + 1)}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

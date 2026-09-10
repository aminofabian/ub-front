"use client";

import Image from "next/image";
import { Minus, Package, Plus } from "lucide-react";

import type {
  ItemLinkPackOfferRecord,
  SupplierItemLinkRecord,
} from "@/lib/api";
import type { OrderCartPackMeta, OrderCartQty } from "@/lib/order-cart-storage";
import { orderLinkTitleParts } from "@/app/(dashboard)/order/_lib/order-link-display";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn, formatMoney } from "@/lib/utils";
import { OrderQtyField } from "./order-qty-field";

const ORDER_CURRENCY = "KES";

const INK = "var(--order-ink,#15231f)";
const TEAL = "var(--pos-primary,#0f766e)";
const RULE = `color-mix(in srgb, ${INK} 12%, transparent)`;
const MUTED = `color-mix(in srgb, ${INK} 62%, transparent)`;

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

const STEP =
  "flex h-8 w-7 shrink-0 items-center justify-center touch-manipulation text-[color-mix(in_srgb,var(--order-ink,#15231f)_70%,transparent)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,#fff)] hover:text-[var(--order-ink,#15231f)] active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,#fff)] disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]";

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
  const lineTotal = cost > 0 && qty > 0 ? cost * qty : 0;
  const packs = linkPacks(link);
  const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
  const { primary, option } = orderLinkTitleParts(link);
  const inCart = qty > 0;
  const hasPrice = cost > 0;

  return (
    <article
      className={cn(
        "group flex h-full min-w-0 flex-col rounded-none bg-white",
        "border transition-[border-color] duration-150",
        inCart
          ? "border-[var(--pos-primary,#0f766e)]"
          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_26%,transparent)]",
      )}
    >
      <button
        type="button"
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-none bg-white",
          "touch-manipulation disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
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
      </button>

      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col border-t px-2.5 pb-2.5 pt-2"
        style={{ borderColor: RULE }}
      >
        <div className="min-w-0">
          <p
            className="line-clamp-2 break-words text-[12px] font-medium leading-snug tracking-[-0.02em]"
            style={{ color: INK }}
            title={primary}
          >
            {primary}
          </p>
          {option ? (
            <p
              className="mt-0.5 truncate font-heading text-[15px] font-semibold tabular-nums leading-none tracking-[-0.03em]"
              style={{ color: INK }}
            >
              {option}
            </p>
          ) : null}
        </div>

        <div className="mt-2 min-w-0">
          <p
            className={cn(
              "break-words font-heading text-[13px] font-semibold tabular-nums leading-snug tracking-[-0.02em]",
              !hasPrice && "font-sans text-[12px] font-medium tracking-normal",
            )}
            style={{ color: hasPrice ? INK : MUTED }}
          >
            {hasPrice ? formatMoney(cost, ORDER_CURRENCY) : "No price"}
            {packed && hasPrice ? (
              <span
                className="ml-1 align-baseline font-sans text-[10px] font-medium tracking-normal"
                style={{ color: MUTED }}
              >
                / pack
              </span>
            ) : null}
          </p>
          <p
            key={lineTotal}
            className={cn(
              "mt-0.5 min-h-[1.05em] break-words font-heading text-[13px] font-semibold tabular-nums leading-snug tracking-[-0.02em]",
              lineTotal > 0 && "pos-tile-line-total",
            )}
            style={{ color: TEAL }}
          >
            {lineTotal > 0 ? formatMoney(lineTotal, ORDER_CURRENCY) : "\u00a0"}
          </p>
        </div>

        {low ? (
          <p
            className="mt-1 text-[11px] font-medium tabular-nums"
            style={{ color: "#9a3412" }}
          >
            {stock} on hand
          </p>
        ) : null}
        {packs.length > 0 ? (
          <p
            className="mt-1 truncate font-mono text-[10px] font-medium tabular-nums"
            style={{ color: MUTED }}
          >
            {packs.map((p) => `×${formatPackSize(p.unitsPerPack)}`).join(" ")}
          </p>
        ) : null}

        {pickMode ? (
          <button
            type="button"
            className="mt-auto flex h-9 w-full items-center justify-center rounded-none border bg-white text-[12px] font-semibold tracking-[-0.02em] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,#fff)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]"
            style={{ borderColor: TEAL, color: TEAL }}
            onClick={onAdd}
            disabled={picking}
          >
            {picking ? "Adding…" : "Add to order"}
          </button>
        ) : (
          <div className="mt-auto w-full pt-2">
            <div
              className="grid h-8 w-full min-w-0 grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] rounded-none border bg-white"
              style={{
                borderColor: inCart ? TEAL : RULE,
                color: inCart ? TEAL : INK,
              }}
              role="group"
              aria-label={`Quantity for ${primary}`}
            >
              <button
                type="button"
                disabled={qty <= 0}
                className={cn(STEP, "border-r")}
                style={{ borderColor: inCart ? TEAL : RULE }}
                onClick={() => onSetQty(qty - 1)}
                aria-label="Decrease"
              >
                <Minus className="size-3.5" strokeWidth={2.25} aria-hidden />
              </button>
              <OrderQtyField
                qty={qty}
                onSetQty={onSetQty}
                ariaLabel={`Quantity for ${primary}`}
                className="h-8 px-1"
              />
              <button
                type="button"
                className={cn(STEP, "border-l")}
                style={{ borderColor: inCart ? TEAL : RULE }}
                onClick={() => onSetQty(qty + 1)}
                aria-label="Increase"
              >
                <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3 xl:grid-cols-5">
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

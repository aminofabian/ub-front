"use client";

import Image from "next/image";
import { Minus, Package, Plus, ShoppingBag } from "lucide-react";

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

function stockStatus(stock: number, reorder: number): {
  label: string;
  tone: "out" | "low" | "ok";
} {
  const count = Number.isInteger(stock)
    ? stock.toLocaleString()
    : (Math.round(stock * 10) / 10).toLocaleString();
  if (stock <= 0) return { label: "Out of stock", tone: "out" };
  if ((reorder > 0 && stock <= reorder) || stock <= 8) {
    return { label: `${count} left`, tone: "low" };
  }
  return { label: `${count} in stock`, tone: "ok" };
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
  const packed = pack != null && pack.size > 1;
  const cost = packUnitPrice(link, pack);
  const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
  const { primary, option } = orderLinkTitleParts(link);
  const inCart = qty > 0;
  const hasPrice = cost > 0;
  const stockLine = stockStatus(stock, reorder);

  return (
    <article
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        "md:h-full md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0",
        inCart
          ? "ring-1 ring-black/[0.06] md:ring-2 md:ring-[#0f766e]"
          : "ring-1 ring-black/[0.06]",
      )}
    >
      <button
        type="button"
        className={cn(
          "relative size-14 shrink-0 overflow-hidden rounded-2xl bg-[#e7f3ee]",
          "md:aspect-[4/3] md:h-auto md:w-full md:rounded-none",
          "touch-manipulation disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e]",
        )}
        onClick={onAdd}
        disabled={pickMode && picking}
        aria-label={`Add ${link.itemName}`}
      >
        {thumb ? (
          <span className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2">
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width: 639px) 72px, (min-width: 1024px) 18vw, 180px"
              className="object-contain object-center"
              unoptimized
            />
          </span>
        ) : (
          <>
            <span className="absolute inset-0 flex items-center justify-center md:hidden">
              <ShoppingBag
                className="size-6 text-[#0f766e]"
                strokeWidth={1.75}
                aria-hidden
              />
            </span>
            <span className="absolute left-1/2 top-1/2 hidden h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 items-center justify-center md:flex">
              <Package
                className="size-10 opacity-20"
                strokeWidth={1.5}
                aria-hidden
              />
            </span>
          </>
        )}
        {inCart ? (
          <span
            className="absolute right-2 top-2 hidden size-7 items-center justify-center rounded-full bg-[#0f766e] text-[12px] font-semibold tabular-nums text-white md:flex"
            aria-hidden
          >
            {qty}
          </span>
        ) : null}
      </button>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:px-3.5 md:pb-3.5 md:pt-3">
        <div className="min-w-0">
          <p
            className="line-clamp-2 break-words text-base font-semibold leading-snug text-[#101828] sm:text-[15px]"
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

        <div className="mt-1.5 md:mt-2 md:flex md:items-baseline md:justify-between md:gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-[15px] font-semibold tabular-nums md:text-[13px]",
              hasPrice ? "text-[#101828]" : "text-[#98a2b3]",
            )}
          >
            {hasPrice ? formatMoney(cost, ORDER_CURRENCY) : "No price"}
            {packed && hasPrice ? (
              <span className="ml-1 text-[12px] font-medium text-[#98a2b3]">
                / pack
              </span>
            ) : null}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[13px] font-medium md:mt-0 md:shrink-0 md:text-[12px]",
              stockLine.tone === "out" && "text-[#c2414a]",
              stockLine.tone === "low" && "text-[#c2410c]",
              stockLine.tone === "ok" && "text-[#667085]",
            )}
          >
            {stockLine.label}
          </p>
        </div>

        {pickMode ? (
          <button
            type="button"
            className="mt-auto hidden h-11 w-full items-center justify-center rounded-xl bg-[#e6f4f0] text-[14px] font-semibold text-[#0f766e] transition-colors duration-150 hover:bg-[#d9ede7] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] md:flex"
            onClick={onAdd}
            disabled={picking}
          >
            {picking ? "Adding…" : "Add to order"}
          </button>
        ) : inCart ? (
          <div
            className="mt-auto hidden h-11 min-w-0 items-center gap-1 rounded-xl bg-[#e6f4f0] px-1 md:flex"
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
            className="mt-auto hidden h-11 w-full items-center justify-center rounded-xl bg-[#e6f4f0] text-[14px] font-semibold text-[#0f766e] transition-colors duration-150 hover:bg-[#d9ede7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] md:flex"
            onClick={onAdd}
          >
            Add
          </button>
        )}
      </div>

      <PhoneShelfControl
        primary={primary}
        qty={qty}
        inCart={inCart}
        pickMode={pickMode}
        picking={picking}
        hasPrice={hasPrice}
        lineTotal={cost * qty}
        onAdd={onAdd}
        onSetQty={onSetQty}
      />
    </article>
  );
}

function PhoneShelfControl({
  primary,
  qty,
  inCart,
  pickMode,
  picking,
  hasPrice,
  lineTotal,
  onAdd,
  onSetQty,
}: {
  primary: string;
  qty: number;
  inCart: boolean;
  pickMode: boolean;
  picking: boolean;
  hasPrice: boolean;
  lineTotal: number;
  onAdd: () => void;
  onSetQty: (qty: number) => void;
}) {
  if (pickMode || !inCart) {
    return (
      <button
        type="button"
        className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-[#0f766e] bg-white px-3.5 text-[14px] font-semibold text-[#0f766e] transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 disabled:opacity-60 md:hidden"
        onClick={onAdd}
        disabled={pickMode && picking}
        aria-label={picking ? `Adding ${primary}` : `Add ${primary}`}
      >
        <Plus className="size-4" strokeWidth={2.25} aria-hidden />
        {picking ? "Adding" : "Add"}
      </button>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1 md:hidden">
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={`Quantity for ${primary}`}
      >
        <button
          type="button"
          disabled={qty <= 0}
          className="flex size-11 items-center justify-center rounded-full border border-[#0f766e]/35 bg-white text-[#0f766e] transition-transform duration-150 active:scale-[0.96] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
          onClick={() => onSetQty(qty - 1)}
          aria-label="Decrease"
        >
          <Minus className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
        <span className="min-w-6 text-center text-[18px] font-semibold tabular-nums text-[#15231f]">
          {qty}
        </span>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full bg-[#0f766e] text-white transition-transform duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2"
          onClick={() => onSetQty(qty + 1)}
          aria-label="Increase"
        >
          <Plus className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      {hasPrice ? (
        <p className="text-[13px] font-semibold tabular-nums text-[#344054]">
          {formatMoney(lineTotal, ORDER_CURRENCY)}
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
    <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(2,minmax(0,1fr))] md:gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))] 2xl:grid-cols-[repeat(4,minmax(0,1fr))]">
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

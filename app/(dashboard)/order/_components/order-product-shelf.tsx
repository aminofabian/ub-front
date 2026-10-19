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
        "group flex min-w-0 items-center gap-3 rounded-[2px] border bg-[var(--order-shelf,#FCFAF5)] p-2.5",
        "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]",
        "md:h-full md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0",
        "transition-[border-color,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
        inCart
          ? "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_6%,var(--order-shelf,#FCFAF5))]"
          : "hover:border-[color-mix(in_srgb,var(--order-ink,#121A16)_22%,transparent)]",
      )}
    >
      <button
        type="button"
        className={cn(
          "relative size-14 shrink-0 overflow-hidden rounded-[2px]",
          "bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,var(--order-shelf,#FCFAF5))]",
          "md:aspect-[4/3] md:h-auto md:w-full md:rounded-none",
          "touch-manipulation disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
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
          <span className="absolute inset-0 flex items-center justify-center">
            <Package
              className="size-6 text-[color-mix(in_srgb,var(--order-ink,#121A16)_28%,transparent)] md:size-9"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
        )}
        {inCart ? (
          <span
            className="absolute right-1.5 top-1.5 hidden min-w-6 items-center justify-center rounded-[2px] bg-[var(--pos-primary,#1D4B3B)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--op-surface,#FCFAF5)] md:inline-flex"
            aria-hidden
          >
            {qty}
          </span>
        ) : null}
      </button>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:px-3 md:pb-3 md:pt-2.5">
        <div className="min-w-0">
          <p
            className="line-clamp-2 break-words text-[15px] font-semibold leading-snug tracking-[-0.02em] text-[var(--order-ink,#121A16)]"
            title={primary}
          >
            {primary}
          </p>
          {option ? (
            <p className="mt-0.5 truncate text-[12px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#121A16)_55%,transparent)]">
              {option}
            </p>
          ) : null}
        </div>

        <div className="mt-1.5 md:mt-2 md:flex md:items-baseline md:justify-between md:gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-[14px] font-semibold tabular-nums md:text-[13px]",
              hasPrice
                ? "text-[var(--order-ink,#121A16)]"
                : "text-[color-mix(in_srgb,var(--order-ink,#121A16)_42%,transparent)]",
            )}
          >
            {hasPrice ? formatMoney(cost, ORDER_CURRENCY) : "No price"}
            {packed && hasPrice ? (
              <span className="ml-1 text-[11px] font-medium text-[color-mix(in_srgb,var(--order-ink,#121A16)_48%,transparent)]">
                / pack
              </span>
            ) : null}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[12px] font-medium md:mt-0 md:shrink-0",
              stockLine.tone === "out" && "text-[var(--op-highlight,#A55237)]",
              stockLine.tone === "low" && "text-[var(--op-highlight,#A55237)]",
              stockLine.tone === "ok" &&
                "text-[color-mix(in_srgb,var(--order-ink,#121A16)_55%,transparent)]",
            )}
          >
            {stockLine.label}
          </p>
        </div>

        {pickMode ? (
          <button
            type="button"
            className="mt-auto hidden h-10 w-full items-center justify-center rounded-[2px] border border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,var(--order-shelf,#FCFAF5))] text-[13px] font-semibold text-[var(--pos-primary,#1D4B3B)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_14%,var(--order-shelf,#FCFAF5))] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] md:flex"
            onClick={onAdd}
            disabled={picking}
          >
            {picking ? "Adding…" : "Add to order"}
          </button>
        ) : inCart ? (
          <div
            className="mt-auto hidden h-10 min-w-0 items-center gap-1 rounded-[2px] border border-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_28%,transparent)] bg-[var(--order-shelf,#FCFAF5)] px-1 md:flex"
            role="group"
            aria-label={`Quantity for ${primary}`}
          >
            <button
              type="button"
              disabled={qty <= 0}
              className="flex size-8 shrink-0 items-center justify-center rounded-[2px] text-[var(--pos-primary,#1D4B3B)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_10%,transparent)] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
              onClick={() => onSetQty(qty - 1)}
              aria-label="Decrease"
            >
              <Minus className="size-4" strokeWidth={2.25} aria-hidden />
            </button>
            <OrderQtyField
              qty={qty}
              onSetQty={onSetQty}
              ariaLabel={`Quantity for ${primary}`}
              className="h-8 min-w-0 flex-1 px-1 text-[var(--pos-primary,#1D4B3B)]"
            />
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-[2px] bg-[var(--pos-primary,#1D4B3B)] text-[var(--op-surface,#FCFAF5)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_88%,black)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
              onClick={() => onSetQty(qty + 1)}
              aria-label="Increase"
            >
              <Plus className="size-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-auto hidden h-10 w-full items-center justify-center rounded-[2px] border border-[color-mix(in_srgb,var(--order-ink,#121A16)_14%,transparent)] bg-[var(--order-shelf,#FCFAF5)] text-[13px] font-semibold text-[var(--order-ink,#121A16)] transition-colors hover:border-[var(--pos-primary,#1D4B3B)] hover:text-[var(--pos-primary,#1D4B3B)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] md:flex"
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
        className="inline-flex h-11 shrink-0 items-center gap-1 rounded-[2px] border border-[var(--pos-primary,#1D4B3B)] bg-[var(--order-shelf,#FCFAF5)] px-3.5 text-[14px] font-semibold text-[var(--pos-primary,#1D4B3B)] transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] focus-visible:ring-offset-2 disabled:opacity-60 md:hidden"
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
          className="flex size-11 items-center justify-center rounded-[2px] border border-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_35%,transparent)] bg-[var(--order-shelf,#FCFAF5)] text-[var(--pos-primary,#1D4B3B)] transition-transform duration-150 active:scale-[0.96] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
          onClick={() => onSetQty(qty - 1)}
          aria-label="Decrease"
        >
          <Minus className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
        <span className="min-w-6 text-center text-[18px] font-semibold tabular-nums text-[var(--order-ink,#121A16)]">
          {qty}
        </span>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-[2px] bg-[var(--pos-primary,#1D4B3B)] text-[var(--op-surface,#FCFAF5)] transition-transform duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] focus-visible:ring-offset-2"
          onClick={() => onSetQty(qty + 1)}
          aria-label="Increase"
        >
          <Plus className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      {hasPrice ? (
        <p className="text-[13px] font-semibold tabular-nums text-[var(--order-ink,#121A16)]">
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
    <div className="flex flex-col gap-2 md:grid md:grid-cols-[repeat(2,minmax(0,1fr))] md:gap-2.5 lg:grid-cols-[repeat(3,minmax(0,1fr))] 2xl:grid-cols-[repeat(4,minmax(0,1fr))]">
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

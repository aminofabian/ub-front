"use client";

import { Minus, Plus } from "lucide-react";

import type { SupplierItemLinkRecord } from "@/lib/api";
import type { OrderCartPackMeta, OrderCartQty } from "@/lib/order-cart-storage";
import { orderLinkTitleParts } from "@/app/(dashboard)/order/_lib/order-link-display";
import { cn, formatMoney } from "@/lib/utils";

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
  pack: { size: number } | null,
): number {
  const base =
    toNum(link.lastCostPrice) ||
    toNum(link.defaultCostPrice) ||
    toNum(link.catalogBuyingPrice);
  if (!pack || pack.size <= 1) return base;
  return base;
}

function ColHead({
  label,
  width,
  align = "left",
}: {
  label: string;
  width: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex h-8 shrink-0 items-center border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2 text-[10px] font-bold uppercase tracking-[0.08em] last:border-r-0",
        width,
        align === "right" && "justify-end",
        "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]",
      )}
    >
      {label}
    </div>
  );
}

export type OrderProductLedgerProps = {
  links: SupplierItemLinkRecord[];
  cart: OrderCartQty;
  packByItemId: OrderCartPackMeta;
  onSetQty: (itemId: string, qty: number) => void;
  /** Pick mode: tap to add once (no qty stepper). */
  onPickItem?: (link: SupplierItemLinkRecord) => void;
  pickingItemId?: string | null;
};

export function OrderProductLedger({
  links,
  cart,
  packByItemId,
  onSetQty,
  onPickItem,
  pickingItemId = null,
}: OrderProductLedgerProps) {
  const pickMode = onPickItem != null;
  const cartUnits = links.reduce(
    (sum, link) => sum + (cart[link.itemId] ?? 0),
    0,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white shadow-sm">
      <div className="flex border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_60%,transparent)]">
        <ColHead label="#" width="w-9" />
        <ColHead label="Item" width="min-w-0 flex-1" />
        <ColHead label="SKU" width="w-[5.5rem] hidden md:flex" />
        <ColHead label="Stock" width="w-[4rem]" align="right" />
        <ColHead label="Price" width="w-[5.5rem]" align="right" />
        <ColHead label="Qty" width="w-[7.5rem]" align="right" />
      </div>

      <div className="max-h-[calc(100vh-18rem)] overflow-y-auto [scrollbar-width:thin]">
        {links.map((link, index) => {
          const qty = cart[link.itemId] ?? 0;
          const stock = toNum(link.currentStock);
          const reorder = toNum(link.reorderLevel);
          const low = reorder > 0 && stock <= reorder;
          const pack = packByItemId[link.itemId] ?? null;
          const cost = packUnitPrice(link, pack);
          const { primary, option } = orderLinkTitleParts(link);
          const inCart = qty > 0;

          return (
            <div
              key={link.id}
              className={cn(
                "flex min-h-10 items-stretch border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] text-[12px] last:border-b-0",
                inCart
                  ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]"
                  : "hover:bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_40%,transparent)]",
              )}
            >
              <div className="flex w-9 shrink-0 items-center justify-center border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] font-mono text-[10px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
                {index + 1}
              </div>
              <button
                type="button"
                onClick={() =>
                  pickMode
                    ? onPickItem(link)
                    : onSetQty(link.itemId, qty + 1)
                }
                disabled={pickMode && pickingItemId === link.itemId}
                className="flex min-w-0 flex-1 items-center border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] px-2 py-1.5 text-left disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--order-ink,#15231f)]">
                    {primary}
                  </p>
                  {option ? (
                    <p className="truncate text-[10px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                      {option}
                    </p>
                  ) : null}
                </div>
              </button>
              <div className="hidden w-[5.5rem] shrink-0 items-center border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] px-2 md:flex">
                <span className="truncate font-mono text-[10px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                  {link.sku || link.supplierSku || "—"}
                </span>
              </div>
              <div
                className={cn(
                  "flex w-[4rem] shrink-0 items-center justify-end border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] px-2 font-mono text-[11px] tabular-nums",
                  low
                    ? "font-semibold text-amber-800"
                    : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
                )}
              >
                {stock}
              </div>
              <div className="flex w-[5.5rem] shrink-0 items-center justify-end border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] px-2 font-mono text-[11px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                {cost > 0 ? formatMoney(cost, ORDER_CURRENCY) : "—"}
              </div>
              <div className="flex w-[7.5rem] shrink-0 items-center justify-end gap-1 px-1.5">
                {pickMode ? (
                  <button
                    type="button"
                    disabled={pickingItemId === link.itemId}
                    onClick={() => onPickItem(link)}
                    className="inline-flex h-7 items-center justify-center rounded-md bg-[var(--pos-primary,#0f766e)] px-2.5 text-[10px] font-bold text-white disabled:opacity-60"
                  >
                    {pickingItemId === link.itemId ? "…" : "Add"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => onSetQty(link.itemId, qty - 1)}
                      className="flex size-7 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-white disabled:opacity-25"
                      aria-label="Decrease"
                    >
                      <Minus className="size-3.5" aria-hidden />
                    </button>
                    <span
                      className={cn(
                        "min-w-6 text-center font-mono text-[12px] font-bold tabular-nums",
                        inCart
                          ? "text-[var(--pos-primary,#0f766e)]"
                          : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]",
                      )}
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSetQty(link.itemId, qty + 1)}
                      className="flex size-7 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-white"
                      aria-label="Increase"
                    >
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {links.length > 0 ? (
        <div className="flex border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_50%,transparent)] px-3 py-2 text-[11px]">
          <span className="text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            {links.length} item{links.length === 1 ? "" : "s"}
          </span>
          {cartUnits > 0 ? (
            <span className="ml-auto font-mono font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
              {cartUnits} in order
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

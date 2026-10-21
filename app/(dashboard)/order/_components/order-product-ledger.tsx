"use client";

import { Minus, Plus } from "lucide-react";

import type { SupplierItemLinkRecord } from "@/lib/api";
import type { OrderCartPackMeta, OrderCartPriceMeta, OrderCartQty } from "@/lib/order-cart-storage";
import { orderLinkTitleParts } from "@/app/(dashboard)/order/_lib/order-link-display";
import {
  orderLineAmount,
  orderMoneyPrefix,
  orderUnitPrice,
  type OrderLinePack,
} from "@/app/(dashboard)/order/_lib/order-line-money";
import { cn, formatMoney } from "@/lib/utils";
import { OrderMoneyField } from "./order-money-field";
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

const RULE =
  "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";
const HAIR =
  "border-[color-mix(in_srgb,var(--order-ink,#121A16)_8%,transparent)]";

function ColHead({
  label,
  width,
  align = "left",
  shaded = false,
}: {
  label: string;
  width: string;
  align?: "left" | "right";
  shaded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-end border-r px-2 pb-1.5 text-[11px] font-semibold tracking-[-0.02em] last:border-r-0",
        HAIR,
        width,
        align === "right" && "justify-end",
        shaded
          ? "bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,var(--op-panel,#EFEBE2))] text-[var(--pos-primary,#1D4B3B)]"
          : "text-[var(--op-muted,#556159)]",
      )}
    >
      {label}
    </div>
  );
}

function MoneyCell({
  amount,
  prefix,
  currency,
  ariaLabel,
  editable,
  onCommit,
  emphasize = false,
  written = false,
}: {
  amount: number;
  prefix: string;
  currency: string;
  ariaLabel: string;
  editable: boolean;
  onCommit?: (amount: number) => void;
  emphasize?: boolean;
  written?: boolean;
}) {
  if (!editable || !onCommit) {
    return (
      <span
        className={cn(
          "truncate font-mono text-[11px] tabular-nums",
          emphasize
            ? "font-semibold text-[var(--pos-primary,#1D4B3B)]"
            : "font-semibold text-[var(--order-ink,#121A16)]",
        )}
      >
        {amount > 0 ? formatMoney(amount, currency) : "—"}
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
      <span
        className={cn(
          "shrink-0 text-[10px] font-semibold",
          written || emphasize
            ? "text-[var(--pos-primary,#1D4B3B)]"
            : "text-[var(--op-muted,#556159)]",
        )}
      >
        {prefix}
      </span>
      <OrderMoneyField
        amount={amount}
        onCommit={onCommit}
        ariaLabel={ariaLabel}
        placeholder="0"
        className={cn(
          "h-7 w-full text-[12px]",
          "hover:border-[color-mix(in_srgb,var(--order-ink,#121A16)_16%,transparent)] hover:bg-[var(--order-shelf,#FCFAF5)]",
          written || emphasize
            ? "text-[var(--pos-primary,#1D4B3B)]"
            : "text-[var(--order-ink,#121A16)]",
        )}
      />
    </div>
  );
}

export type OrderProductLedgerProps = {
  links: SupplierItemLinkRecord[];
  cart: OrderCartQty;
  packByItemId: OrderCartPackMeta;
  /** Handwritten unit/pack prices for this order. */
  priceByItemId?: OrderCartPriceMeta;
  /** Snapped line totals. Wins over unit × qty. */
  totalByItemId?: Record<string, number>;
  onSetQty: (itemId: string, qty: number) => void;
  /** Rewrite the unit or pack price. Omit in pick-only lists. */
  onSetPrice?: (itemId: string, price: number) => void;
  /** Rewrite the line extension. Unit price follows. */
  onSetTotal?: (itemId: string, total: number, qty: number) => void;
  currency?: string;
  /** Pick mode: tap to add once (no qty stepper). */
  onPickItem?: (link: SupplierItemLinkRecord) => void;
  pickingItemId?: string | null;
};

export function OrderProductLedger({
  links,
  cart,
  packByItemId,
  priceByItemId = {},
  totalByItemId = {},
  onSetQty,
  onSetPrice,
  onSetTotal,
  currency = ORDER_CURRENCY,
  onPickItem,
  pickingItemId = null,
}: OrderProductLedgerProps) {
  const pickMode = onPickItem != null;
  const prefix = orderMoneyPrefix(currency);
  const canEditMoney = !pickMode && onSetPrice != null;

  let cartUnits = 0;
  let orderMoney = 0;
  let orderLines = 0;
  for (const link of links) {
    const qty = cart[link.itemId] ?? 0;
    if (qty <= 0) continue;
    cartUnits += qty;
    orderLines += 1;
    const pack = (packByItemId[link.itemId] ?? null) as OrderLinePack;
    const unit = orderUnitPrice(link, pack, priceByItemId[link.itemId] ?? null);
    orderMoney += orderLineAmount(
      unit,
      qty,
      totalByItemId[link.itemId] ?? null,
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto [scrollbar-width:thin]">
      <div
        className={cn(
          "flex min-h-0 min-w-[36rem] flex-1 flex-col overflow-hidden border bg-[var(--op-bg,#F4F1EA)]",
          RULE,
        )}
      >
        <div
          className={cn(
            "flex shrink-0 border-b-[3px] border-double bg-[var(--op-panel,#EFEBE2)]",
            "border-[color-mix(in_srgb,var(--order-ink,#121A16)_28%,transparent)]",
          )}
        >
          <ColHead label="#" width="w-8 shrink-0" />
          <ColHead label="Item" width="min-w-0 flex-1" />
          <ColHead label="Stock" width="w-14 hidden lg:flex" align="right" />
          <ColHead label="Price" width="w-[7.25rem] shrink-0" align="right" />
          <ColHead label="Qty" width="w-[7.25rem] shrink-0" align="right" />
          <ColHead
            label="Total"
            width="w-[7.25rem] shrink-0"
            align="right"
            shaded
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {links.map((link, index) => {
            const qty = cart[link.itemId] ?? 0;
            const stock = toNum(link.currentStock);
            const reorder = toNum(link.reorderLevel);
            const low = reorder > 0 && stock <= reorder;
            const pack = (packByItemId[link.itemId] ?? null) as OrderLinePack;
            const packed = pack != null && pack.size > 1;
            const override = priceByItemId[link.itemId] ?? null;
            const totalOverride = totalByItemId[link.itemId] ?? null;
            const unit = orderUnitPrice(link, pack, override);
            const extension = orderLineAmount(unit, qty, totalOverride);
            const written = override != null && override > 0;
            const totalSet = totalOverride != null && totalOverride > 0;
            const { primary, option } = orderLinkTitleParts(link);
            const inCart = qty > 0;
            const ruled =
              index % 2 === 1
                ? "bg-[color-mix(in_srgb,var(--op-panel,#EFEBE2)_55%,var(--order-shelf,#FCFAF5))]"
                : "bg-[var(--order-shelf,#FCFAF5)]";

            return (
              <div
                key={link.id}
                className={cn(
                  "flex min-w-[36rem] items-stretch border-b text-[12px] last:border-b-0",
                  HAIR,
                  inCart
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_7%,var(--order-shelf,#FCFAF5))]"
                    : ruled,
                )}
              >
                <div
                  className={cn(
                    "flex w-8 shrink-0 items-center justify-center border-r font-mono text-[10px] tabular-nums text-[var(--op-muted,#556159)]",
                    HAIR,
                  )}
                >
                  {index + 1}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    pickMode ? onPickItem(link) : onSetQty(link.itemId, qty + 1)
                  }
                  disabled={pickMode && pickingItemId === link.itemId}
                  className={cn(
                    "flex min-w-0 flex-1 items-center border-r px-2 py-1.5 text-left disabled:opacity-60",
                    HAIR,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium leading-snug text-[var(--order-ink,#121A16)]">
                      {primary}
                    </p>
                    {option ? (
                      <p className="break-words text-[10px] font-semibold leading-snug text-[var(--op-muted,#556159)]">
                        {option}
                      </p>
                    ) : null}
                  </div>
                </button>
                <div
                  className={cn(
                    "hidden w-14 shrink-0 items-center justify-end border-r px-2 font-mono text-[11px] tabular-nums lg:flex",
                    HAIR,
                    low
                      ? "font-semibold text-[var(--op-highlight,#A55237)]"
                      : "text-[var(--op-muted,#556159)]",
                  )}
                >
                  {stock}
                </div>
                <div
                  className={cn(
                    "flex w-[7.25rem] shrink-0 items-center justify-end gap-1 border-r px-1",
                    HAIR,
                  )}
                >
                  <MoneyCell
                    amount={unit}
                    prefix={prefix}
                    currency={currency}
                    ariaLabel={
                      packed
                        ? `Pack price for ${primary}`
                        : `Unit price for ${primary}`
                    }
                    editable={canEditMoney}
                    onCommit={
                      onSetPrice
                        ? (next) => onSetPrice(link.itemId, next)
                        : undefined
                    }
                    written={written}
                  />
                </div>
                <div
                  className={cn(
                    "flex w-[7.25rem] min-w-0 shrink-0 items-center justify-end gap-0.5 border-r px-1",
                    HAIR,
                  )}
                >
                  {pickMode ? (
                    <button
                      type="button"
                      disabled={pickingItemId === link.itemId}
                      onClick={() => onPickItem(link)}
                      className="inline-flex h-7 items-center justify-center rounded-[2px] bg-[var(--pos-primary,#1D4B3B)] px-2.5 text-[10px] font-bold text-[var(--op-surface,#FCFAF5)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
                    >
                      {pickingItemId === link.itemId ? "…" : "Add"}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => onSetQty(link.itemId, qty - 1)}
                        className="flex size-7 items-center justify-center rounded-[2px] border border-[color-mix(in_srgb,var(--order-ink,#121A16)_14%,transparent)] text-[var(--op-muted,#556159)] transition-colors hover:bg-[var(--order-shelf,#FCFAF5)] disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
                        aria-label="Decrease"
                      >
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <OrderQtyField
                        qty={qty}
                        onSetQty={(next) => onSetQty(link.itemId, next)}
                        ariaLabel={`Quantity for ${primary}`}
                        className={cn(
                          "h-7 min-w-0 w-full text-[12px]",
                          inCart
                            ? "text-[var(--pos-primary,#1D4B3B)]"
                            : "text-[var(--op-muted,#556159)]",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => onSetQty(link.itemId, qty + 1)}
                        className="flex size-7 items-center justify-center rounded-[2px] border border-[color-mix(in_srgb,var(--order-ink,#121A16)_14%,transparent)] text-[var(--op-muted,#556159)] transition-colors hover:bg-[var(--order-shelf,#FCFAF5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
                        aria-label="Increase"
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </>
                  )}
                </div>
                <div
                  className={cn(
                    "flex w-[7.25rem] shrink-0 items-center justify-end px-1",
                    inCart
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,var(--order-shelf,#FCFAF5))]"
                      : "bg-[color-mix(in_srgb,var(--op-panel,#EFEBE2)_45%,transparent)]",
                  )}
                  title={
                    inCart && unit > 0
                      ? `${qty} × ${formatMoney(unit, currency)}`
                      : undefined
                  }
                >
                  {inCart ? (
                    <MoneyCell
                      amount={extension}
                      prefix={prefix}
                      currency={currency}
                      ariaLabel={`Line total for ${primary}`}
                      editable={canEditMoney && onSetTotal != null}
                      onCommit={
                        onSetTotal
                          ? (next) => onSetTotal(link.itemId, next, qty)
                          : undefined
                      }
                      emphasize
                      written={totalSet}
                    />
                  ) : (
                    <span className="pr-1 font-mono text-[11px] text-[var(--op-muted,#556159)]">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {links.length > 0 ? (
          <div
            className={cn(
              "flex shrink-0 items-baseline gap-3 border-t-[3px] border-double bg-[var(--op-panel,#EFEBE2)] px-3 py-2 text-[11px]",
              "border-[color-mix(in_srgb,var(--order-ink,#121A16)_28%,transparent)]",
            )}
          >
            <span className="font-medium text-[var(--op-muted,#556159)]">
              {links.length} item{links.length === 1 ? "" : "s"}
            </span>
            {orderLines > 0 ? (
              <span className="ml-auto flex items-baseline gap-3">
                <span className="font-mono tabular-nums text-[var(--op-muted,#556159)]">
                  {cartUnits} in order
                </span>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-[var(--pos-primary,#1D4B3B)]">
                  {formatMoney(orderMoney, currency)}
                </span>
              </span>
            ) : (
              <span className="ml-auto font-mono text-[11px] text-[var(--op-muted,#556159)]">
                Totals appear once a quantity is set
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

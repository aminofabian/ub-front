"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchCurrentSellingPrice, itemListThumbnailUrl, type ItemSummaryRecord } from "@/lib/api";
import { cashierItemPrimaryLabel, posSearchItemDetailLine } from "@/lib/cashier-item-display";
import type { CashierPosUiCopy } from "@/lib/cashier-pos-copy";
import {
  formatShelfPriceLabel,
  shelfPriceToInputString,
} from "@/lib/cashier-shelf-price";
import { cn } from "@/lib/utils";

const QUICK_QTYS = [1, 2, 5, 10] as const;

export type CashierProductModalSubmit = {
  item: ItemSummaryRecord;
  quantity: number;
  unitPrice: string;
};

type CashierProductModalProps = {
  item: ItemSummaryRecord | null;
  open: boolean;
  currency: string;
  uiCopy: CashierPosUiCopy;
  /** When set (and online), shelf price is prefilled for this branch. */
  branchId?: string | null;
  online?: boolean;
  /** Business brand CSS variables (dialogs are portaled). */
  brandTheme: CSSProperties;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CashierProductModalSubmit) => void;
};

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toString();
}

export function CashierProductModal({
  item,
  open,
  currency,
  uiCopy,
  branchId,
  online = true,
  brandTheme,
  onOpenChange,
  onSubmit,
}: CashierProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  /** Caption under product image: loading (…), offline hint, or formatted shelf price. */
  const [shelfCaption, setShelfCaption] = useState("");

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear header when sheet closes so next open does not flash stale shelf text.
      setShelfCaption("");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset modal inputs each time it reopens.
    setQuantity(1);
    setUnitPrice("");
    setShelfCaption("");
    if (!item?.id) {
      return;
    }
    if (!online) {
      setShelfCaption(uiCopy.modalOfflineShelfHint);
      return;
    }
    setShelfCaption(uiCopy.modalShelfLoading);
    const itemId = item.id;
    const bid = branchId?.trim() || undefined;
    let cancelled = false;
    void fetchCurrentSellingPrice(itemId, bid)
      .then((rec) => {
        if (cancelled) return;
        const label = formatShelfPriceLabel(rec.price, currency);
        setShelfCaption(label ?? uiCopy.modalShelfNone);
        const next = shelfPriceToInputString(rec.price);
        if (next) setUnitPrice(next);
      })
      .catch(() => {
        if (cancelled) return;
        setShelfCaption(uiCopy.modalShelfUnavailable);
      });
    return () => {
      cancelled = true;
    };
  }, [open, item?.id, branchId, online, currency, uiCopy]);

  const thumb = useMemo(() => (item ? itemListThumbnailUrl(item) : null), [item]);
  const headerTitle = useMemo(() => (item ? cashierItemPrimaryLabel(item) : ""), [item]);
  const headerDetail = useMemo(() => (item ? posSearchItemDetailLine(item) : ""), [item]);
  const accent = "var(--pos-primary)";
  const subtotalNum = useMemo(() => {
    const u = Number(unitPrice);
    if (!Number.isFinite(u) || u < 0) return null;
    const total = quantity * u;
    return Math.round(total * 100) / 100;
  }, [quantity, unitPrice]);

  const canSubmit = item != null && quantity > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="center" className="overflow-hidden p-0" style={brandTheme}>
        <div
          className="px-5 pb-3 pt-5"
          style={{
            backgroundImage:
              "linear-gradient(135deg, color-mix(in srgb, var(--pos-glow) 40%, var(--card)), color-mix(in srgb, var(--pos-secondary) 14%, var(--card)))",
          }}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1">
                {thumb ? (
                  <span className="relative h-16 w-16 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--pos-primary)_14%,var(--border))] bg-white shadow-sm dark:bg-white/10">
                    <Image
                      src={thumb}
                      alt=""
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </span>
                ) : (
                  <span
                    className="inline-flex h-16 w-16 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--pos-primary)_14%,var(--border))] bg-[color-mix(in_srgb,var(--pos-glow)_22%,var(--card))] text-2xl font-bold shadow-sm"
                    style={{ color: accent }}
                    aria-hidden
                  >
                    {headerTitle.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
                <div className="w-full text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-foreground/55">
                    {uiCopy.shelfHeading}
                  </p>
                  <p className="text-[11px] font-bold tabular-nums leading-tight" style={{ color: accent }}>
                    {shelfCaption || uiCopy.modalShelfUnavailable}
                  </p>
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <DialogTitle
                  className="line-clamp-2 text-base font-semibold leading-tight"
                  style={{ color: accent }}
                >
                  {item ? headerTitle : "Item"}
                </DialogTitle>
                <DialogDescription className="break-all text-xs uppercase tracking-wide text-foreground/70">
                  {item ? headerDetail : "—"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quantity
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Quantity"
                className="h-12 w-24 rounded-xl border border-[color-mix(in_srgb,var(--pos-primary)_12%,var(--border))] bg-background text-center text-2xl font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)]"
                value={quantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 0) {
                    setQuantity(v);
                  } else if (e.target.value === "") {
                    setQuantity(0);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {QUICK_QTYS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    quantity === q
                      ? "border-transparent text-[var(--pos-primary-ink)]"
                      : "border-border bg-muted/30 hover:bg-muted",
                  )}
                  style={
                    quantity === q
                      ? { backgroundColor: "var(--pos-primary)", borderColor: "transparent" }
                      : undefined
                  }
                  onClick={() => setQuantity(q)}
                >
                  ×{formatNum(q)}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Unit price{currency ? ` (${currency})` : ""}
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              placeholder={uiCopy.unitPricePlaceholder}
              className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--pos-primary)_12%,var(--border))] bg-background px-3 text-right text-lg font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)]"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  if (item) {
                    onSubmit({ item, quantity, unitPrice });
                  }
                }
              }}
            />
          </label>

          {subtotalNum != null && subtotalNum > 0 ? (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-center text-sm font-medium tabular-nums text-[var(--pos-primary)]">
              Subtotal: {subtotalNum.toFixed(2)}
              {currency ? ` ${currency}` : ""}
            </p>
          ) : null}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!canSubmit}
              onClick={() => {
                if (item) {
                  onSubmit({ item, quantity, unitPrice });
                }
              }}
              className="gap-2 sm:flex-1 bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] shadow-md hover:bg-[var(--pos-primary)] hover:opacity-90"
            >
              <ShoppingCart className="size-4" />
              Add to cart
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

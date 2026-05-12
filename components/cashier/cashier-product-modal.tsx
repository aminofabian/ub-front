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

import { CashierCurrencySuffix } from "./cashier-currency-inline";

const QUICK_QTYS = [1, 2, 5, 10] as const;

const MODAL_SECTION_LABEL = cn(
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
);

const modalFieldClass = (extra?: string) =>
  cn(
    "rounded-xl border border-border/55 bg-background shadow-sm transition-[border-color,box-shadow]",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_38%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)]",
    extra,
  );

/** Shelf / hint text overlaid on product thumb (matches kiosk tile chips). */
function ModalShelfBadge({ children }: { children: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-1 right-1 z-[1] max-w-[calc(100%-0.5rem)] truncate rounded-md border border-border/45 px-1.5 py-0.5",
        "bg-background/93 text-[9px] font-bold tabular-nums leading-none text-foreground shadow-sm backdrop-blur-[2px] sm:text-[10px]",
      )}
    >
      {children}
    </div>
  );
}

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
       
      setShelfCaption("");
      return;
    }
     
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
  const subtotalNum = useMemo(() => {
    const u = Number(unitPrice);
    if (!Number.isFinite(u) || u < 0) return null;
    const total = quantity * u;
    return Math.round(total * 100) / 100;
  }, [quantity, unitPrice]);

  const canSubmit = item != null && quantity > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className={cn(
          "gap-0 overflow-hidden border-border/35 p-0 shadow-2xl ring-1 ring-black/[0.04] dark:ring-white/[0.05]",
          "w-[calc(100vw-1.25rem)] max-w-[min(22rem,calc(100vw-1.25rem))] sm:max-w-md",
          "bg-gradient-to-b from-background via-background to-muted/12 dark:to-muted/8",
        )}
        style={brandTheme}
      >
        <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-[color-mix(in_srgb,var(--pos-primary)_08%,transparent)] via-muted/10 to-transparent px-4 pb-4 pt-5 dark:from-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] dark:via-muted/10">
          {/* Soft halo behind the product — keeps focus on the photo */}
          <div
            className="pointer-events-none absolute left-1/2 top-8 h-40 w-[min(20rem,90vw)] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_18%,transparent)] opacity-70 blur-3xl dark:opacity-50"
            aria-hidden
          />
          <DialogHeader className="relative flex flex-col items-center space-y-0 text-center">
            <div className="relative mx-auto aspect-square w-[min(11.5rem,calc(100vw-3.5rem))] max-w-full shrink-0">
              <div
                className={cn(
                  "pointer-events-none absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br opacity-90 shadow-[0_12px_40px_-12px_color-mix(in_srgb,var(--pos-primary)_45%,transparent)]",
                  "from-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] via-transparent to-[color-mix(in_srgb,var(--pos-primary)_15%,transparent)]",
                )}
                aria-hidden
              />
              {thumb ? (
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-white to-neutral-100 shadow-lg ring-2 ring-white/80 dark:from-white/15 dark:to-muted/40 dark:ring-white/[0.08]">
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 70vw, 12rem"
                    className="object-contain p-3"
                    unoptimized
                  />
                  <ModalShelfBadge>{shelfCaption || uiCopy.modalShelfUnavailable}</ModalShelfBadge>
                </span>
              ) : (
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted to-muted/70 shadow-lg ring-2 ring-black/[0.04] dark:ring-white/[0.08]">
                  <span className="text-5xl font-bold text-[var(--pos-primary)]" aria-hidden>
                    {headerTitle.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <ModalShelfBadge>{shelfCaption || uiCopy.modalShelfUnavailable}</ModalShelfBadge>
                </span>
              )}
            </div>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {uiCopy.shelfHeading}
            </p>
            <DialogTitle className="mt-1 max-w-[20rem] px-1 text-balance line-clamp-3 text-[16px] font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
              {item ? headerTitle : "Item"}
            </DialogTitle>
            <DialogDescription className="mt-1 max-w-[20rem] px-1 text-balance break-words text-[11px] font-medium leading-snug text-muted-foreground">
              {item ? headerDetail : "—"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3.5 px-4 pb-4 pt-3.5">
          <div className="space-y-2">
            <p className={MODAL_SECTION_LABEL}>Quantity</p>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl border-border/55"
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
                className={modalFieldClass(
                  "h-11 w-[5.5rem] py-0 text-center text-xl font-bold tabular-nums text-foreground sm:text-2xl",
                )}
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
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl border-border/55"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
              {QUICK_QTYS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-tight transition-[transform,box-shadow,border-color]",
                    "active:scale-[0.97]",
                    quantity === q
                      ? "border-transparent text-[var(--pos-primary-ink)] shadow-md ring-2 ring-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] ring-offset-2 ring-offset-background"
                      : "border-border/55 bg-background/90 hover:border-[color-mix(in_srgb,var(--pos-primary)_22%,var(--border))] hover:bg-muted/35",
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
            <span className={MODAL_SECTION_LABEL}>
              Unit price{currency ? ` (${currency})` : ""}
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              placeholder={uiCopy.unitPricePlaceholder}
              className={modalFieldClass(
                "h-11 w-full px-3 text-right text-lg font-semibold tabular-nums text-foreground",
              )}
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
            <div
              className={cn(
                "rounded-xl border border-[color-mix(in_srgb,var(--pos-primary)_22%,var(--border))] bg-gradient-to-br px-3 py-2.5 text-center shadow-sm ring-1 ring-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)]",
                "from-[color-mix(in_srgb,var(--pos-primary)_07%,transparent)] to-muted/25 dark:to-muted/15",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Line subtotal</p>
              <p className="mt-0.5 inline-flex items-baseline justify-center gap-0.5 text-lg font-bold tabular-nums text-[var(--pos-primary)] sm:text-xl">
                <span>{subtotalNum.toFixed(2)}</span>
                <CashierCurrencySuffix code={currency} />
              </p>
            </div>
          ) : null}

          <DialogFooter className="gap-2 border-t border-border/35 pt-3.5 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl sm:flex-none"
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
              className="h-11 gap-2 rounded-xl text-[15px] font-semibold shadow-md transition-[transform,opacity,box-shadow] active:scale-[0.99] sm:flex-1 bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:bg-[var(--pos-primary)] hover:opacity-[0.92] hover:shadow-lg"
            >
              <ShoppingCart className="size-4 shrink-0" />
              Add to cart
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

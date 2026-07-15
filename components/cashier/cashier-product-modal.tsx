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
import {
  fetchItemById,
  itemListThumbnailUrl,
  type ItemSummaryRecord,
} from "@/lib/api";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import {
  cashierItemPrimaryLabel,
  isPosPackageSellRow,
  mergePosItemStockFromDetail,
  posAvailablePackages,
  posPackageMaxQuantityHint,
  posPackageQuantityHint,
  posSearchItemDetailLine,
} from "@/lib/cashier-item-display";
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
    // Solid fill + border — avoid translucent / color-mix focus rings (Win7 Chrome 109).
    "rounded-xl border border-border bg-background shadow-sm transition-[border-color,box-shadow]",
    "focus:outline-none focus-visible:border-[var(--pos-primary)] focus-visible:ring-2 focus-visible:ring-[var(--pos-primary)]",
    extra,
  );

/** Shelf / hint text overlaid on product thumb (matches kiosk tile chips). */
function ModalShelfBadge({ children }: { children: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-1 right-1 z-[1] max-w-[calc(100%-0.5rem)] truncate rounded-md border border-border px-1.5 py-0.5",
        "bg-background text-[9px] font-bold tabular-nums leading-none text-foreground shadow-sm sm:text-[10px]",
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
  businessId?: string | null;
  onStaleItem?: (itemId: string) => void;
  online?: boolean;
  /** Business brand CSS variables (dialogs are portaled). */
  brandTheme: CSSProperties;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CashierProductModalSubmit) => void;
  /** When true, quantity is not capped by on-hand stock. */
  allowNegativeStock?: boolean;
  /** When true, unit price can be changed from shelf. */
  allowPriceEdit?: boolean;
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
  businessId,
  onStaleItem,
  online = true,
  brandTheme,
  onOpenChange,
  onSubmit,
  allowNegativeStock = false,
  allowPriceEdit = false,
}: CashierProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  /** Caption under product image: loading (…), offline hint, or formatted shelf price. */
  const [shelfCaption, setShelfCaption] = useState("");
  /** List row enriched with branch detail so package stock (trays vs eggs) is correct. */
  const [stockItem, setStockItem] = useState<ItemSummaryRecord | null>(null);

  useEffect(() => {
    if (!open) {
      setShelfCaption("");
      setStockItem(null);
      return;
    }
    setQuantity(1);
    setUnitPrice("");
    setShelfCaption("");
    setStockItem(item);
    if (!item?.id) {
      return;
    }
    const itemId = item.id;
    const bid = branchId?.trim() || undefined;
    let cancelled = false;

    if (online) {
      void fetchItemById(itemId, { branchId: bid }).then((detail) => {
        if (cancelled) return;
        setStockItem(mergePosItemStockFromDetail(item, detail));
      });
      setShelfCaption(uiCopy.modalShelfLoading);
      void fetchPosShelfPrice(itemId, bid, { businessId, onStaleItem }).then(
        (rec) => {
          if (cancelled) return;
          if (!rec) {
            setShelfCaption(uiCopy.modalShelfUnavailable);
            return;
          }
          const label = formatShelfPriceLabel(rec.price, currency);
          setShelfCaption(label ?? uiCopy.modalShelfNone);
          const next = shelfPriceToInputString(rec.price);
          if (next) setUnitPrice(next);
        },
      );
    } else {
      setShelfCaption(uiCopy.modalOfflineShelfHint);
    }

    return () => {
      cancelled = true;
    };
  }, [open, item, branchId, businessId, onStaleItem, online, currency, uiCopy]);

  const rowForStock = stockItem ?? item;
  const thumb = useMemo(() => (item ? itemListThumbnailUrl(item) : null), [item]);
  const headerTitle = useMemo(() => (item ? cashierItemPrimaryLabel(item) : ""), [item]);
  const headerDetail = useMemo(
    () => (rowForStock ? posSearchItemDetailLine(rowForStock, allowNegativeStock) : ""),
    [rowForStock, allowNegativeStock],
  );
  const maxPackages = useMemo(
    () => (rowForStock ? posAvailablePackages(rowForStock, allowNegativeStock) : null),
    [rowForStock, allowNegativeStock],
  );
  const packageQtyHint = useMemo(
    () => (rowForStock ? posPackageQuantityHint(rowForStock) : null),
    [rowForStock],
  );
  const packageMaxHint = useMemo(
    () => (rowForStock ? posPackageMaxQuantityHint(rowForStock) : null),
    [rowForStock],
  );
  const subtotalNum = useMemo(() => {
    const u = Number(unitPrice);
    if (!Number.isFinite(u) || u < 0) return null;
    const total = quantity * u;
    return Math.round(total * 100) / 100;
  }, [quantity, unitPrice]);

  const canSubmit =
    item != null &&
    quantity > 0 &&
    (allowNegativeStock || maxPackages == null || quantity <= maxPackages);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        // Opaque scrim — Win7 Chrome 109 washes out translucent overlays.
        overlayClassName="bg-[rgba(0,0,0,0.55)] supports-[backdrop-filter]:bg-[rgba(0,0,0,0.45)]"
        className={cn(
          "gap-0 overflow-hidden border border-border bg-background p-0 shadow-2xl",
          "w-[calc(100vw-1.25rem)] max-w-[min(22rem,calc(100vw-1.25rem))] sm:max-w-md",
        )}
        style={brandTheme}
      >
        <div className="relative overflow-hidden border-b border-border bg-muted px-4 pb-4 pt-5">
          <DialogHeader className="relative flex flex-col items-center space-y-0 text-center">
            <div className="relative mx-auto aspect-square w-[min(11.5rem,calc(100vw-3.5rem))] max-w-full shrink-0">
              {thumb ? (
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-white shadow-lg dark:bg-muted">
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
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted shadow-lg">
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
            <DialogDescription
              className={cn(
                "mt-1 max-w-[20rem] px-1 text-balance leading-snug",
                rowForStock && isPosPackageSellRow(rowForStock)
                  ? headerDetail === "Sold out"
                    ? "text-[11px] font-medium text-destructive"
                    : headerDetail === "0 on hand"
                      ? "text-[11px] font-medium text-amber-600 dark:text-amber-400"
                      : "text-[13px] font-semibold tabular-nums tracking-tight text-[var(--pos-primary)]"
                  : "text-[11px] font-medium text-muted-foreground",
              )}
            >
              {rowForStock ? headerDetail : "—"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3.5 px-4 pb-4 pt-3.5">
          <div className="space-y-2">
            <p className={MODAL_SECTION_LABEL}>Quantity</p>
            {packageQtyHint ? (
              <p className="text-center text-[11px] font-medium leading-snug text-muted-foreground">
                {packageQtyHint}
              </p>
            ) : null}
            {packageMaxHint ? (
              <p className="text-center text-[11px] leading-snug text-muted-foreground/90">
                {packageMaxHint}
              </p>
            ) : null}
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl border-border bg-background"
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
                    const capped =
                      maxPackages != null ? Math.min(maxPackages, v) : v;
                    setQuantity(capped);
                  } else if (e.target.value === "") {
                    setQuantity(0);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl border-border bg-background"
                aria-label="Increase quantity"
                disabled={maxPackages != null && quantity >= maxPackages}
                onClick={() =>
                  setQuantity((q) =>
                    maxPackages != null ? Math.min(maxPackages, q + 1) : q + 1,
                  )
                }
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
              {QUICK_QTYS.map((q) => {
                const overMax = maxPackages != null && q > maxPackages;
                return (
                <button
                  key={q}
                  type="button"
                  disabled={overMax}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-tight transition-[transform,box-shadow,border-color]",
                    "active:scale-[0.97]",
                    overMax && "cursor-not-allowed opacity-40",
                    quantity === q
                      ? "border-[var(--pos-primary)] text-[var(--pos-primary-ink)] shadow-md"
                      : "border-border bg-background hover:border-[var(--pos-primary)] hover:bg-muted",
                  )}
                  style={
                    quantity === q
                      ? { backgroundColor: "var(--pos-primary)", borderColor: "var(--pos-primary)" }
                      : undefined
                  }
                  onClick={() => setQuantity(overMax ? quantity : q)}
                >
                  ×{formatNum(q)}
                </button>
              );
              })}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className={MODAL_SECTION_LABEL}>
              Unit price{currency ? ` (${currency})` : ""}
              {!allowPriceEdit ? (
                <span className="ml-1.5 font-medium normal-case tracking-normal text-muted-foreground">
                  · shelf
                </span>
              ) : null}
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus={allowPriceEdit}
              readOnly={!allowPriceEdit}
              placeholder={uiCopy.unitPricePlaceholder}
              className={modalFieldClass(
                cn(
                  "h-11 w-full px-3 text-right text-lg font-semibold tabular-nums text-foreground",
                  !allowPriceEdit && "cursor-default bg-muted text-muted-foreground",
                ),
              )}
              value={unitPrice}
              onChange={(e) => {
                if (!allowPriceEdit) return;
                setUnitPrice(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  if (item) {
                    onSubmit({ item, quantity, unitPrice });
                  }
                }
              }}
            />
            {!allowPriceEdit ? (
              <p className="text-[10px] leading-snug text-muted-foreground">
                Price edits are locked. An admin can enable them from Cashier
                permissions.
              </p>
            ) : null}
          </label>

          {subtotalNum != null && subtotalNum > 0 ? (
            <div className="rounded-xl border border-border bg-muted px-3 py-2.5 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Line subtotal</p>
              <p className="mt-0.5 inline-flex items-baseline justify-center gap-0.5 text-lg font-bold tabular-nums text-[var(--pos-primary)] sm:text-xl">
                <span>{subtotalNum.toFixed(2)}</span>
                <CashierCurrencySuffix code={currency} />
              </p>
            </div>
          ) : null}

          <DialogFooter className="gap-2 border-t border-border pt-3.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl border-border bg-background sm:flex-none"
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

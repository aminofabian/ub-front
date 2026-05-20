"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronRight, ShoppingBag, Sparkles, Truck, X } from "lucide-react";

import { ShopCartLinesScroll } from "@/components/storefront/shop-cart-lines-scroll";
import { Button } from "@/components/ui/button";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";
import type { PublicWebCart } from "@/lib/web-cart";

function CartEmptyState({ onShop }: { onShop: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <ShoppingBag className="size-7" strokeWidth={1.5} aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">Your cart is empty</h3>
      <p className="mt-1.5 max-w-[14rem] text-xs leading-relaxed text-muted-foreground">
        Tap <span className="font-medium text-foreground">+</span> on any product to add it here.
      </p>
      <Button asChild size="sm" className="mt-5 h-9 rounded-xl px-6" onClick={onShop}>
        <Link href={APP_ROUTES.shop}>Start shopping</Link>
      </Button>
    </div>
  );
}

function focusedSubtotal(cart: PublicWebCart, itemId: string): number | null {
  let sum = 0;
  let any = false;
  for (const line of cart.lines) {
    if (line.itemId !== itemId) continue;
    if (line.lineTotal == null) return null;
    sum += line.lineTotal;
    any = true;
  }
  return any ? sum : null;
}

type Props = {
  onClose: () => void;
  compactHeader?: boolean;
};

export function ShopCartPanelBody({ onClose, compactHeader }: Props) {
  const {
    cart,
    loading,
    error,
    changeQty,
    removeLine,
    itemCount,
    lineCount,
    focusItemId,
    cartViewMode,
    showAllCartItems,
  } = useShopCart();

  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const focusMode =
    compactHeader && cartViewMode === "focus" && focusItemId != null && focusItemId !== "";

  const displayCart = useMemo((): PublicWebCart | null => {
    if (!cart) return null;
    if (!focusMode) return cart;
    const lines = cart.lines.filter((l) => l.itemId === focusItemId);
    if (lines.length === 0) return cart;
    const sub = focusedSubtotal(cart, focusItemId);
    return { ...cart, lines, subtotal: sub };
  }, [cart, focusMode, focusItemId]);

  const otherLineCount = useMemo(() => {
    if (!cart || !focusMode) return 0;
    return cart.lines.filter((l) => l.itemId !== focusItemId).length;
  }, [cart, focusMode, focusItemId]);

  async function handleChangeQty(itemId: string, nextQty: number) {
    setBusyItemId(itemId);
    try {
      await changeQty(itemId, nextQty);
      if (focusMode && nextQty <= 0) {
        showAllCartItems();
      }
    } finally {
      setBusyItemId(null);
    }
  }

  const subtotalLabel =
    displayCart?.subtotal != null
      ? formatDisplayPrice(displayCart.currency, displayCart.subtotal)
      : null;
  const canCheckout = cart != null && cart.subtotal != null && cart.lines.length > 0;

  const focusedLine = focusMode && cart ? cart.lines.find((l) => l.itemId === focusItemId) : null;
  const focusedTitle = focusedLine
    ? focusedLine.variantName
      ? `${focusedLine.name} · ${focusedLine.variantName}`
      : focusedLine.name
    : null;

  return (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-border/60",
          compactHeader ? "px-3.5 py-3" : "px-5 pb-4 pt-5",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl",
              focusMode
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-primary/10 text-primary",
              compactHeader ? "size-8" : "size-10",
            )}
          >
            {focusMode ? (
              <Check className={compactHeader ? "size-4" : "size-5"} strokeWidth={2.5} aria-hidden />
            ) : (
              <ShoppingBag className={compactHeader ? "size-4" : "size-5"} aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className={cn("font-semibold text-foreground", compactHeader ? "text-sm" : "text-lg")}>
              {focusMode ? "Just added" : "Your cart"}
            </p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {loading
                ? "Updating…"
                : focusMode && focusedTitle
                  ? focusedTitle
                  : itemCount > 0
                    ? `${itemCount} ${itemCount === 1 ? "item" : "items"}`
                    : "Nothing added yet"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close cart"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && !cart ? (
          <div className="flex flex-1 flex-col gap-2.5 px-3.5 py-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-muted/60"
                aria-hidden
              />
            ))}
          </div>
        ) : !displayCart || displayCart.lines.length === 0 ? (
          <CartEmptyState onShop={onClose} />
        ) : (
          <>
            {error ? (
              <p className="mx-3.5 mt-3 rounded-lg border border-destructive/25 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            {focusMode && otherLineCount > 0 ? (
              <button
                type="button"
                onClick={showAllCartItems}
                className="mx-3.5 mt-3 flex w-[calc(100%-1.75rem)] items-center justify-between gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10"
              >
                <span className="text-xs font-medium text-foreground">
                  +{otherLineCount} more in your cart
                </span>
                <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                  View all
                  <ChevronRight className="size-3.5" aria-hidden />
                </span>
              </button>
            ) : null}

            {!focusMode && lineCount > 1 && compactHeader ? (
              <p className="mx-3.5 mt-2 text-center text-[10px] font-medium text-muted-foreground">
                Scroll the list below to review every item
              </p>
            ) : null}

            <div className={cn("flex min-h-0 flex-1 flex-col px-3.5", focusMode ? "pt-2 pb-1" : "py-3")}>
              <ShopCartLinesScroll
                cart={displayCart}
                compact={compactHeader}
                busyItemId={busyItemId}
                onChangeQty={handleChangeQty}
                onRemove={removeLine}
              />
            </div>

            <div
              className={cn(
                "shrink-0 border-t border-border/60 bg-muted/20",
                compactHeader ? "px-3.5 py-3" : "px-5 py-4",
              )}
            >
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1.5 text-[11px] font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Truck className="size-3 shrink-0" aria-hidden />
                <span className="truncate">
                  {displayCart.catalogBranchName} · ~30 min
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-xs text-muted-foreground">
                  {focusMode ? "This item" : "Subtotal"}
                </span>
                <span className="text-lg font-bold tabular-nums tracking-tight">
                  {subtotalLabel ?? "—"}
                </span>
              </div>
              <div className="mt-3 grid gap-1.5">
                {canCheckout ? (
                  <Button
                    asChild
                    size="sm"
                    className="h-10 w-full rounded-xl text-sm font-semibold"
                    onClick={onClose}
                  >
                    <Link href={APP_ROUTES.shopCheckout} className="gap-2">
                      Checkout
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </Button>
                ) : (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Waiting on branch pricing for one or more items.
                  </p>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 w-full rounded-xl text-xs"
                  onClick={onClose}
                >
                  <Link href={APP_ROUTES.shopCart}>
                    {focusMode ? "View full cart" : "View full cart"}
                  </Link>
                </Button>
              </div>
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="size-2.5" aria-hidden />
                Secure checkout
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, ChevronRight, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Truck, X } from "lucide-react";

import { ShopCartLinesScroll } from "@/components/storefront/shop-cart-lines-scroll";
import { WhatsAppCheckoutButton } from "@/components/storefront/whatsapp-checkout-button";
import { Button } from "@/components/ui/button";
import { useShopCart } from "@/hooks/use-shop-cart";
import { useShopTillListen } from "@/hooks/use-shop-till-listen";
import { joinProductNameParts } from "@/lib/catalog-display";
import { APP_ROUTES } from "@/lib/config";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";
import { cartIsCheckoutReady, type PublicWebCart } from "@/lib/web-cart";

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
  /** Desktop float: expand into the full slide-over drawer. */
  onExpand?: () => void;
};

export function ShopCartPanelBody({ onClose, compactHeader, onExpand }: Props) {
  const {
    slug,
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
    requestCheckout,
    whatsappCheckout,
    drawerOpen,
  } = useShopCart();

  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const cartAmount = cart?.subtotal != null ? Number(cart.subtotal) : 0;
  const tillListen = useShopTillListen({
    slug,
    active: drawerOpen && cartAmount > 0,
    amount: cartAmount,
  });

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
  const canCheckout = cart != null && cartIsCheckoutReady(cart);

  function startCheckout() {
    onClose();
    requestCheckout();
  }

  const focusedLine = focusMode && cart ? cart.lines.find((l) => l.itemId === focusItemId) : null;
  const focusedTitle = focusedLine
    ? focusedLine.variantName
      ? joinProductNameParts(focusedLine.name, focusedLine.variantName)
      : focusedLine.name
    : null;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        compactHeader ? "h-full max-h-full" : "h-full",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b",
          compactHeader
            ? "border-[var(--storefront-rule,#e4e6e4)] px-3.5 py-3"
            : "border-border/60 bg-linear-to-b from-[color-mix(in_srgb,var(--primary)_7%,transparent)] to-transparent px-5 pb-4 pt-5",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5",
            onExpand &&
              "rounded-[3px] outline-none transition-colors hover:bg-[var(--storefront-paper,#f4f5f4)]",
          )}
          {...(onExpand
            ? {
                role: "button",
                tabIndex: 0,
                onClick: onExpand,
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onExpand();
                  }
                },
                "aria-label": "Open full cart",
              }
            : {})}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center",
              focusMode
                ? "rounded-[3px] bg-primary/12 text-primary"
                : "rounded-xl bg-primary/10 text-primary",
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
            <p
              className={cn(
                "font-semibold tracking-tight text-[var(--storefront-ink,#141816)]",
                compactHeader ? "text-sm" : "text-lg",
              )}
            >
              {focusMode ? "Just added" : "Your cart"}
            </p>
            <p className="line-clamp-1 text-xs text-[var(--storefront-ink-muted,#5c6560)]">
              {loading
                ? "Updating…"
                : focusMode && focusedTitle
                  ? focusedTitle
                  : itemCount > 0
                    ? `${itemCount} ${itemCount === 1 ? "item" : "items"}`
                    : "Nothing added yet"}
            </p>
            {onExpand ? (
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                Open full cart
              </p>
            ) : null}
          </div>
          {onExpand ? (
            <ChevronRight
              className="ml-auto size-4 shrink-0 text-[var(--storefront-ink-quiet,#8a928c)]"
              aria-hidden
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[3px] text-[var(--storefront-ink-quiet,#8a928c)] transition-colors hover:bg-[var(--storefront-paper,#f4f5f4)] hover:text-[var(--storefront-ink,#141816)]"
          aria-label="Close cart"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {error ? (
                <p className="mx-3.5 mt-3 rounded-lg border border-destructive/25 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
                  {error}
                </p>
              ) : null}

              {focusMode && otherLineCount > 0 ? (
                <button
                  type="button"
                  onClick={onExpand ?? showAllCartItems}
                  className="mx-3.5 mt-3 flex w-[calc(100%-1.75rem)] items-center justify-between gap-2 rounded-[3px] border border-dashed border-primary/35 bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10"
                >
                  <span className="text-xs font-medium text-[var(--storefront-ink,#141816)]">
                    +{otherLineCount} more in your cart
                  </span>
                  <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                    View all
                    <ChevronRight className="size-3.5" aria-hidden />
                  </span>
                </button>
              ) : null}

              {!focusMode && lineCount > 1 && compactHeader ? (
                <p className="mx-3.5 mt-2 text-center text-[10px] font-medium text-[var(--storefront-ink-quiet,#8a928c)]">
                  Scroll the list below to review every item
                </p>
              ) : null}

              <div className={cn("px-3.5", focusMode ? "pt-2 pb-1" : "py-3")}>
                <ShopCartLinesScroll
                  cart={displayCart}
                  compact={compactHeader}
                  busyItemId={busyItemId}
                  onChangeQty={handleChangeQty}
                  onRemove={removeLine}
                />
              </div>
            </div>

            <div
              className={cn(
                "shrink-0 border-t",
                compactHeader
                  ? "border-[var(--storefront-rule,#e4e6e4)] bg-[var(--storefront-paper,#f4f5f4)]/70 px-3.5 py-3"
                  : "border-border/60 bg-linear-to-t from-muted/35 to-muted/10 px-5 py-4",
              )}
            >
              {tillListen.confirmed ? (
                <p className="mb-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-900">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    Till payment received
                    {tillListen.receipt ? ` · ${tillListen.receipt}` : ""}. Continue
                    to checkout to place your order.
                  </span>
                </p>
              ) : tillListen.listening ? (
                <p className="mb-2 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-[11px] font-medium text-sky-900">
                  <Smartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    Listening for M-Pesa Buy Goods… Pay the till for{" "}
                    {formatDisplayPrice(
                      displayCart.currency,
                      cartAmount,
                    )}{" "}
                    and we&apos;ll confirm automatically.
                  </span>
                </p>
              ) : null}
              <div className="flex items-center gap-2 rounded-[3px] border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-[var(--storefront-ink,#141816)]">
                <Truck className="size-3 shrink-0 text-primary" aria-hidden />
                <span className="truncate">
                  {displayCart.catalogBranchName} · ~30 min
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-xs text-[var(--storefront-ink-muted,#5c6560)]">
                  {focusMode ? "This item" : "Subtotal"}
                </span>
                <span className="text-lg font-bold tabular-nums tracking-tight text-[var(--storefront-ink,#141816)]">
                  {subtotalLabel ?? "—"}
                </span>
              </div>
              <div className="mt-3 grid gap-1.5">
                {canCheckout ? (
                  <Button
                    type="button"
                    size="sm"
                    className={cn(
                      "h-10 w-full gap-2 text-sm font-semibold",
                      compactHeader ? "rounded-[3px]" : "rounded-xl",
                    )}
                    onClick={startCheckout}
                  >
                    {whatsappCheckout?.usesChoiceSheet ? "Pick a till" : "Checkout"}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Button>
                ) : (
                  <p className="text-center text-[11px] text-[var(--storefront-ink-muted,#5c6560)]">
                    Waiting on branch pricing for one or more items.
                  </p>
                )}
                {canCheckout ? (
                  <WhatsAppCheckoutButton
                    className={cn(
                      compactHeader ? "h-9 rounded-[3px] text-xs" : "h-10",
                    )}
                    surface="cart-drawer"
                  />
                ) : null}
                {onExpand ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-full rounded-[3px] text-xs"
                    onClick={onExpand}
                  >
                    View full cart
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 w-full text-xs",
                      compactHeader ? "rounded-[3px]" : "rounded-xl",
                    )}
                    onClick={onClose}
                  >
                    <Link href={APP_ROUTES.shopCart}>View full cart</Link>
                  </Button>
                )}
              </div>
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-[var(--storefront-ink-quiet,#8a928c)]">
                <Sparkles className="size-2.5" aria-hidden />
                Secure checkout
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

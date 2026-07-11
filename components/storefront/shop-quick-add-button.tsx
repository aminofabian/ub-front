"use client";

import { Check, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import {
  cartLineQuantity,
  findCartLine,
  useShopCartOptional,
} from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  itemId: string;
  ariaLabel: string;
  accentHex?: string | null;
  size?: "sm" | "md";
  variant?: "stepper" | "icon";
  maxQty?: number | null;
  className?: string;
};

function capQty(qty: number, max: number | null | undefined): number {
  if (max == null || !Number.isFinite(max) || max <= 0) {
    return Math.max(1, qty);
  }
  return Math.min(Math.max(1, qty), Math.floor(max));
}

function accentStyle(hex: string | null | undefined): CSSProperties | undefined {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex.trim())) return undefined;
  const c = hex.trim();
  return {
    background: `linear-gradient(135deg, ${c} 0%, color-mix(in srgb, ${c} 72%, #000) 100%)`,
  };
}

/**
 * Listing add-to-cart — creative pill stepper or compact icon for sidebars.
 */
export function ShopQuickAddButton({
  slug,
  itemId,
  ariaLabel,
  accentHex,
  size = "md",
  variant = "stepper",
  maxQty,
  className,
}: Props) {
  const cartCtx = useShopCartOptional();
  const [pickQty, setPickQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [qtyBump, setQtyBump] = useState(0);

  const accent = accentHex?.trim() && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim())
    ? accentHex.trim()
    : null;

  const cartLine = findCartLine(cartCtx?.cart ?? null, itemId);
  const inCartQty = cartLine ? cartLineQuantity(cartLine.quantity) : 0;
  const inCart = inCartQty > 0;

  useEffect(() => {
    if (!inCart) {
      setPickQty((q) => capQty(q, maxQty));
    }
  }, [inCart, maxQty]);

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 700);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const bumpQty = useCallback(() => {
    setQtyBump((k) => k + 1);
  }, []);

  const setCartQty = useCallback(
    async (nextQty: number) => {
      if (!cartCtx) return;
      setBusy(true);
      setHint(null);
      try {
        await cartCtx.setLineQty(itemId, nextQty);
        bumpQty();
      } catch {
        setHint(cartCtx.error ?? "Could not update cart.");
      } finally {
        setBusy(false);
      }
    },
    [cartCtx, itemId, bumpQty],
  );

  async function addPickQty() {
    const id = itemId.trim();
    const qty = capQty(pickQty, maxQty);
    if (!id || busy) return;

    if (!cartCtx) {
      setHint("Cart unavailable.");
      return;
    }

    setBusy(true);
    setHint(null);
    try {
      await cartCtx.setLineQty(id, qty);
      cartCtx.notifyAdded(id);
      setPickQty(1);
      setJustAdded(true);
      bumpQty();
    } catch {
      setHint(cartCtx.error ?? "Could not add to cart.");
    } finally {
      setBusy(false);
    }
  }

  async function addOne() {
    if (inCart && cartCtx) {
      await setCartQty(inCartQty + 1);
      return;
    }
    setPickQty(1);
    await addPickQty();
  }

  const compact = size === "sm";

  function stopLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (variant === "icon") {
    return (
      <div className={cn("relative flex flex-col items-end gap-1", className)}>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={busy}
          onClick={(e) => {
            stopLink(e);
            void addOne();
          }}
          className={cn(
            "group relative inline-flex items-center justify-center overflow-hidden rounded-full text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-60",
            compact ? "size-8" : "size-9",
            !accent && "bg-primary",
            justAdded && "animate-shop-cart-added",
          )}
          style={accentStyle(accent)}
        >
          <span
            className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
          <Plus className="relative size-4" aria-hidden />
        </button>
        {hint ? (
          <span className="max-w-[10rem] text-right text-[10px] font-medium text-destructive">
            {hint}
          </span>
        ) : null}
      </div>
    );
  }

  const displayQty = inCart ? inCartQty : pickQty;
  const atMax =
    maxQty != null && Number.isFinite(maxQty) && displayQty >= Math.floor(maxQty);
  const atMin = !inCart && pickQty <= 1;

  async function onMinus() {
    if (inCart) {
      await setCartQty(inCartQty - 1);
      return;
    }
    setPickQty((q) => capQty(q - 1, maxQty));
    bumpQty();
  }

  async function onPlusPick() {
    if (inCart) {
      if (!atMax) await setCartQty(inCartQty + 1);
      return;
    }
    setPickQty((q) => capQty(q + 1, maxQty));
    bumpQty();
  }

  const stepBtn = cn(
    "inline-flex items-center justify-center transition-colors duration-150",
    "text-foreground/65 hover:bg-muted/80 hover:text-foreground",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35",
    compact ? "size-6 rounded-md" : "size-8 rounded-full hover:shadow-sm",
  );

  return (
    <div
      className={cn("relative w-full min-w-0", className)}
      role="group"
      aria-label={ariaLabel}
      onClick={stopLink}
    >
      {inCart ? (
        <div
          className={cn(
            "flex w-full items-center justify-between gap-1.5 border border-primary/20 bg-primary/[0.06] transition-all duration-300",
            compact ? "rounded-md p-1 pl-1.5" : "gap-2 rounded-2xl p-1.5 pl-2.5 shadow-sm",
            !compact &&
              "border-emerald-500/25 bg-linear-to-r from-emerald-500/12 via-emerald-400/8 to-transparent",
            justAdded &&
              (compact
                ? "animate-shop-cart-added ring-1 ring-primary/30"
                : "animate-shop-cart-added ring-2 ring-emerald-400/35"),
          )}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-1 font-semibold",
              compact
                ? "text-[10px] text-primary"
                : "gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-300",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center text-white",
                compact
                  ? "size-4 rounded-md bg-primary"
                  : "size-5 rounded-full bg-emerald-600 shadow-sm",
              )}
            >
              <Check className={compact ? "size-2.5 stroke-[3]" : "size-3 stroke-[3]"} aria-hidden />
            </span>
            <span className="truncate">{compact ? "In cart" : "In bag"}</span>
          </span>

          <div
            className={cn(
              "flex shrink-0 items-center gap-0.5 border border-border/50 bg-background p-0.5",
              compact ? "rounded-md" : "gap-0.5 rounded-full shadow-sm backdrop-blur-sm",
            )}
          >
            <button
              type="button"
              className={stepBtn}
              disabled={busy}
              aria-label="Decrease quantity"
              onClick={(e) => {
                stopLink(e);
                void onMinus();
              }}
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
            <span
              key={`cart-${qtyBump}`}
              className={cn(
                "px-1 text-center font-bold tabular-nums text-foreground animate-shop-qty-pop",
                compact ? "min-w-6 text-xs" : "min-w-7 text-sm",
              )}
              aria-live="polite"
            >
              {inCartQty}
            </span>
            <button
              type="button"
              className={stepBtn}
              disabled={busy || atMax}
              aria-label={atMax ? "Maximum quantity" : "Increase quantity"}
              onClick={(e) => {
                stopLink(e);
                void onPlusPick();
              }}
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex w-full items-stretch border border-border/55 bg-muted/20 transition-all duration-200",
            compact
              ? "gap-1 rounded-md p-0.5 hover:border-border/80 hover:bg-muted/30"
              : "gap-1 rounded-2xl p-1 shadow-sm backdrop-blur-sm hover:border-border hover:bg-muted/45 hover:shadow-md",
            justAdded && "animate-shop-cart-added border-primary/35",
          )}
        >
          <div
            className={cn(
              "flex flex-1 items-center justify-between gap-0.5 bg-background",
              compact
                ? "rounded-[5px] px-0.5 ring-1 ring-border/40"
                : "rounded-xl px-0.5 py-0.5 shadow-inner ring-1 ring-black/[0.03]",
            )}
          >
            <button
              type="button"
              className={stepBtn}
              disabled={busy || atMin}
              aria-label="Decrease quantity to add"
              onClick={(e) => {
                stopLink(e);
                void onMinus();
              }}
            >
              <Minus className="size-3.5" aria-hidden />
            </button>

            <div
              className={cn(
                "relative flex items-center justify-center px-0.5",
                compact ? "min-w-6" : "min-w-8 flex-col",
              )}
            >
              <span
                key={`pick-${qtyBump}`}
                className={cn(
                  "font-bold tabular-nums leading-none text-foreground animate-shop-qty-pop",
                  compact ? "text-xs" : "text-sm",
                )}
                aria-live="polite"
              >
                {pickQty}
              </span>
              {pickQty > 1 ? (
                <span
                  className={cn(
                    "mt-0.5 flex items-center gap-0.5 font-semibold text-primary/80",
                    compact ? "text-[8px]" : "text-[9px]",
                  )}
                >
                  {!compact ? <Sparkles className="size-2.5" aria-hidden /> : null}
                  pack
                </span>
              ) : (
                <span
                  className={cn(
                    "mt-0.5 font-medium text-muted-foreground/70",
                    compact ? "text-[8px]" : "text-[9px]",
                  )}
                >
                  qty
                </span>
              )}
            </div>

            <button
              type="button"
              className={stepBtn}
              disabled={busy || atMax}
              aria-label="Increase quantity to add"
              onClick={(e) => {
                stopLink(e);
                void onPlusPick();
              }}
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </div>

          <button
            type="button"
            disabled={busy}
            aria-label={`Add ${pickQty} to cart`}
            onClick={(e) => {
              stopLink(e);
              void addPickQty();
            }}
            className={cn(
              "group relative flex shrink-0 items-center justify-center overflow-hidden bg-primary font-semibold text-primary-foreground transition-all duration-200",
              "hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60",
              compact
                ? "min-h-7 gap-1 rounded-md border-l border-border/50 px-2.5 text-[10px] shadow-sm"
                : "min-h-9 gap-1.5 rounded-xl px-3 text-xs font-bold shadow-md hover:shadow-lg",
            )}
          >
            <span
              className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              aria-hidden
            />
            {busy ? (
              <span
                className={cn(
                  "animate-spin rounded-full border-2 border-white/40 border-t-white",
                  compact ? "size-3" : "size-3.5",
                )}
              />
            ) : (
              <ShoppingBag className={cn("relative", compact ? "size-3" : "size-3.5")} aria-hidden />
            )}
            <span className="relative">Add</span>
          </button>
        </div>
      )}

      {hint ? (
        <p className="mt-1.5 text-center text-[10px] font-medium leading-tight text-destructive">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

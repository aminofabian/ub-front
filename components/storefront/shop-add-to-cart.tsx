"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { useChemLabCopy } from "@/components/storefront/templates/store/chem-lab-mode";
import {
  cartLineQuantity,
  findCartLine,
  useShopCartOptional,
} from "@/hooks/use-shop-cart";
import { formatCartQty } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

type QtyMode = "whole" | "fraction";

type Props = {
  slug: string;
  itemId: string;
  /** @deprecated Weighed items are sellable online; ignored. */
  inStoreOnly?: boolean;
  /** Weighed SKUs — shoppers can choose whole units or a custom weight. */
  weighed?: boolean;
  unitType?: string | null;
  maxQty?: number | null;
  /** Compact mode for sticky bottom bar — hides the cart label and extra text */
  compact?: boolean;
  className?: string;
};

const FRACTION_STEP = 0.1;

function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function capQty(qty: number, max: number | null | undefined): number {
  if (max == null || !Number.isFinite(max) || max <= 0) {
    return Math.max(0.001, qty);
  }
  return Math.min(Math.max(0.001, qty), max);
}

export default function ShopAddToCart({
  slug,
  itemId,
  weighed = false,
  unitType,
  maxQty,
  compact,
  className,
}: Props) {
  const unit = (unitType ?? "").trim() || (weighed ? "kg" : "");
  const [mode, setMode] = useState<QtyMode>("whole");
  const [pickQty, setPickQty] = useState(1);
  const [fractionDraft, setFractionDraft] = useState("0.5");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cartCtx = useShopCartOptional();
  const cl = useChemLabCopy();
  const addLabel = cl?.dispense?.trim() || "Add to Cart";
  const addMoreLabel = cl
    ? `${(cl.dispense.trim() || "Dispense")} more`
    : "Add more";

  const cartLine = findCartLine(cartCtx?.cart ?? null, itemId);
  const inCartQty = cartLine ? cartLineQuantity(cartLine.quantity) : 0;
  const inCart = inCartQty > 0;
  const step = mode === "fraction" ? FRACTION_STEP : 1;
  const displayQty = inCart
    ? inCartQty
    : mode === "fraction"
      ? Number(fractionDraft) || 0
      : pickQty;

  useEffect(() => {
    if (!inCart) {
      setPickQty(1);
      setFractionDraft("0.5");
    }
  }, [inCart]);

  function resolveAddQty(): number | null {
    if (mode === "fraction") {
      const n = Number(fractionDraft);
      if (!Number.isFinite(n) || n <= 0) return null;
      return roundQty(capQty(n, maxQty ?? null));
    }
    return Math.max(1, Math.floor(pickQty));
  }

  async function add() {
    const id = itemId.trim();
    if (!id) return;
    if (!cartCtx) {
      setError("Cart unavailable.");
      return;
    }
    const addQty = resolveAddQty();
    if (addQty == null) {
      setError("Enter a valid quantity.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const q = inCart ? roundQty(inCartQty + addQty) : addQty;
      await cartCtx.setLineQty(id, q);
      cartCtx.notifyAdded(id);
      const label = unit ? `${formatCartQty(addQty)} ${unit}` : formatCartQty(addQty);
      setMessage(compact ? "Added to cart" : `Added ${label} to your cart.`);
      setPickQty(1);
      setFractionDraft("0.5");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update cart.");
    } finally {
      setBusy(false);
    }
  }

  async function adjustCart(delta: number) {
    if (!cartCtx || !inCart) return;
    setBusy(true);
    setError(null);
    try {
      const next = roundQty(Math.max(0, inCartQty + delta));
      await cartCtx.setLineQty(itemId, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update cart.");
    } finally {
      setBusy(false);
    }
  }

  const qtyControls = (
    <div className="flex flex-wrap items-center gap-2">
      {weighed ? (
        <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMode("whole")}
            className={cn(
              "rounded-md px-2.5 py-1 transition-colors",
              mode === "whole"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Whole
          </button>
          <button
            type="button"
            onClick={() => setMode("fraction")}
            className={cn(
              "rounded-md px-2.5 py-1 transition-colors",
              mode === "fraction"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Custom {unit || "weight"}
          </button>
        </div>
      ) : null}

      {mode === "fraction" && weighed ? (
        <div className="flex h-11 items-center gap-1.5 rounded-md border border-border bg-background px-2">
          <input
            type="number"
            inputMode="decimal"
            min={0.001}
            step={FRACTION_STEP}
            max={maxQty ?? undefined}
            value={inCart ? formatCartQty(inCartQty) : fractionDraft}
            onChange={(e) => {
              if (inCart) return;
              setFractionDraft(e.target.value);
            }}
            onBlur={() => {
              if (inCart) return;
              const n = Number(fractionDraft);
              if (!Number.isFinite(n) || n <= 0) {
                setFractionDraft("0.5");
                return;
              }
              setFractionDraft(formatCartQty(capQty(n, maxQty ?? null)));
            }}
            disabled={busy || inCart}
            className="w-16 bg-transparent text-center text-base font-medium tabular-nums outline-none"
            aria-label={`Quantity in ${unit || "units"}`}
          />
          {unit ? (
            <span className="pr-1 text-xs font-medium text-muted-foreground">
              {unit}
            </span>
          ) : null}
          {inCart ? (
            <>
              <button
                type="button"
                onClick={() => void adjustCart(-step)}
                className="flex size-7 items-center justify-center rounded-md text-sm hover:bg-muted"
                disabled={busy}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => void adjustCart(step)}
                className="flex size-7 items-center justify-center rounded-md text-sm hover:bg-muted"
                disabled={busy}
                aria-label="Increase quantity"
              >
                +
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex h-11 items-center rounded-md border border-border bg-background">
          <button
            type="button"
            onClick={() =>
              inCart
                ? void adjustCart(-step)
                : setPickQty((q) => Math.max(1, q - 1))
            }
            className="flex h-full w-10 items-center justify-center text-lg font-semibold leading-none hover:bg-muted disabled:opacity-60"
            disabled={busy || (!inCart && pickQty <= 1)}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-10 px-1 text-center text-base font-medium tabular-nums">
            {formatCartQty(displayQty)}
            {unit && weighed ? (
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                {unit}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() =>
              inCart ? void adjustCart(step) : setPickQty((q) => q + 1)
            }
            className="flex h-full w-10 items-center justify-center text-lg font-semibold leading-none hover:bg-muted disabled:opacity-60"
            disabled={busy}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className={cn("flex w-full flex-col gap-2", className)}>
        {weighed ? qtyControls : null}
        <div className="flex w-full items-center gap-3">
          {!weighed ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background px-2">
              <button
                type="button"
                onClick={() =>
                  inCart
                    ? void adjustCart(-1)
                    : setPickQty((q) => Math.max(1, q - 1))
                }
                className="flex size-7 items-center justify-center rounded-lg text-sm hover:bg-muted"
                disabled={busy || (!inCart && pickQty <= 1)}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">
                {formatCartQty(displayQty)}
              </span>
              <button
                type="button"
                onClick={() =>
                  inCart ? void adjustCart(1) : setPickQty((q) => q + 1)
                }
                className="flex size-7 items-center justify-center rounded-lg text-sm hover:bg-muted"
                disabled={busy}
              >
                +
              </button>
            </div>
          ) : null}
          <Button
            type="button"
            onClick={() => void add()}
            disabled={busy}
            className="h-11 flex-1 rounded-xl text-sm font-semibold"
          >
            {busy ? "Adding…" : inCart ? addMoreLabel : addLabel}
          </Button>
          {cartCtx ? (
            <button
              type="button"
              onClick={cartCtx.openDrawer}
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              View cart
            </button>
          ) : (
            <Link
              href={APP_ROUTES.shopCart}
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Cart
            </Link>
          )}
        </div>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : null}
        {message ? (
          <p className="text-xs text-emerald-600">{message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-6 space-y-3 rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-sm font-medium">Qty</p>
        {qtyControls}
      </div>
      {weighed ? (
        <p className="text-xs text-muted-foreground">
          Order whole packs, or switch to custom {unit || "weight"} for a
          fractional amount.
        </p>
      ) : null}
      <div
        className={cn(
          "grid gap-3",
          inCart ? "sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        <Button
          type="button"
          variant={inCart ? "outline" : "default"}
          onClick={() => void add()}
          disabled={busy}
          className={cn(
            "h-11 rounded-full text-sm font-semibold",
            !inCart && "shadow-md ring-2 ring-primary/25",
          )}
        >
          {busy ? "Adding…" : inCart ? addMoreLabel : addLabel}
        </Button>
        {inCart ? (
          <Link href={APP_ROUTES.shopCheckout} className="block">
            <Button className="h-11 w-full rounded-full text-sm font-semibold">
              Buy It Now
            </Button>
          </Link>
        ) : null}
      </div>
      {cartCtx?.whatsappCheckout ? (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              // One-line cart, then the same order-first WhatsApp flow (§13).
              const q = inCart ? roundQty(inCartQty) : 1;
              await cartCtx.setLineQty(itemId, q);
              cartCtx.openWhatsAppCheckout();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not update cart.");
            }
          }}
          disabled={busy}
          className="h-11 w-full rounded-full text-sm font-semibold"
        >
          <MessageCircle className="size-4 text-[#128C4A]" aria-hidden />
          Order this on WhatsApp
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </div>
  );
}

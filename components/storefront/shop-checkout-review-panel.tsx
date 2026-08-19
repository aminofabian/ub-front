"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Pencil, ShoppingBag } from "lucide-react";

import {
  CHECKOUT_CARD_PAD,
  CHECKOUT_SERIF_AMOUNT,
  CHECKOUT_VARIANT_PILL,
  formatDeliveryZone,
} from "@/components/storefront/shop-checkout-design";
import { formatDisplayPrice } from "@/lib/public-storefront";
import type { PublicWebCart } from "@/lib/web-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import type { ShippingSummaryData } from "@/components/storefront/shop-shipping-summary-card";

type Props = {
  cart: PublicWebCart;
  totalLabel: string;
  shippingSummary: ShippingSummaryData;
  onEditShipping: () => void;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
};

export function ShopCheckoutReviewPanel({
  cart,
  totalLabel,
  shippingSummary,
  onEditShipping,
  termsAccepted,
  onTermsChange,
}: Props) {
  const zone =
    formatDeliveryZone(
      shippingSummary.ward,
      shippingSummary.subCounty,
      shippingSummary.county,
    ) ?? shippingSummary.county;
  const itemCount = cart.lines.length;
  const qtyTotal = cart.lines.reduce((sum, line) => sum + (line.quantity || 0), 0);

  return (
    <section className={cn("min-w-0 max-w-full space-y-2.5", CHECKOUT_CARD_PAD)}>
      <div className="flex items-end justify-between gap-3 rounded-2xl border border-border/50 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_8%,var(--card)),var(--card))] px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/85">
            Total due
          </p>
          <p className={cn(CHECKOUT_SERIF_AMOUNT, "mt-0.5 text-2xl text-foreground")}>
            {totalLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"} · Free delivery
          </p>
          <Link
            href={APP_ROUTES.shopCart}
            className="mt-0.5 inline-block text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            Edit cart
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={onEditShipping}
        className="group flex w-full items-center gap-2.5 rounded-xl border border-border/55 bg-card/90 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/20"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MapPin className="size-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">
            {shippingSummary.customerName || "Delivery"}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {[shippingSummary.streetAddress, zone].filter(Boolean).join(" · ") ||
              shippingSummary.customerPhone}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-primary opacity-80 transition-opacity group-hover:opacity-100">
          <Pencil className="size-3" aria-hidden />
          Edit
        </span>
      </button>

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/80">
        <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
          <p className="text-[11px] font-semibold text-foreground">Your bag</p>
          <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
            {qtyTotal !== itemCount ? ` · ${qtyTotal} qty` : ""}
          </p>
        </div>
        <ul
          className={cn(
            "divide-y divide-border/40",
            itemCount > 6 && "max-h-[22rem] overflow-y-auto overscroll-contain",
          )}
        >
          {cart.lines.map((line) => (
            <li key={line.itemId} className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/35">
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt={line.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ShoppingBag className="size-3.5 text-muted-foreground/70" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-snug text-foreground">
                  {line.name}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                  <span>×{line.quantity}</span>
                  {line.unitPrice != null ? (
                    <span>
                      · {formatDisplayPrice(cart.currency, line.unitPrice)} each
                    </span>
                  ) : null}
                  {line.variantName ? (
                    <span className={CHECKOUT_VARIANT_PILL}>{line.variantName}</span>
                  ) : null}
                </p>
              </div>
              <p className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                {formatDisplayPrice(cart.currency, line.lineTotal ?? 0)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <label
        id="checkout-terms"
        className="flex scroll-mt-4 cursor-pointer items-start gap-2.5 rounded-xl px-1 py-1 text-[11px] leading-relaxed text-muted-foreground"
      >
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-border text-primary focus:ring-primary/10"
          checked={termsAccepted}
          onChange={(ev) => onTermsChange(ev.target.checked)}
        />
        <span>
          I agree to the store{" "}
          <span className="font-medium text-foreground underline underline-offset-2">
            terms
          </span>{" "}
          and{" "}
          <span className="font-medium text-foreground underline underline-offset-2">
            privacy policy
          </span>
          .
        </span>
      </label>
    </section>
  );
}

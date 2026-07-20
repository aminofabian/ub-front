"use client";

import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  MapPin,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { CheckoutProgressSteps } from "@/components/storefront/checkout-progress-steps";
import {
  SHOP_CHECKOUT_DOCK_ID,
  ShopCheckoutDockHeightSync,
} from "@/components/storefront/shop-checkout-dock-height";
import {
  DeliveryContactCardHeader,
  DeliveryContactDetails,
} from "@/components/storefront/shop-delivery-contact-details";
import {
  CHECKOUT_SECTION_DIVIDER,
  CHECKOUT_SECTION_HEAD,
  CHECKOUT_VARIANT_PILL,
  formatDeliveryZone,
} from "@/components/storefront/shop-checkout-design";
import { cn } from "@/lib/utils";

/* ── Layout tokens ── */
export const CONFIRMATION_VIEWPORT =
  "flex h-full min-h-0 flex-1 flex-col overflow-hidden";

export function ConfirmationTopProgress({
  complete = true,
  paymentPending = false,
}: {
  complete?: boolean;
  paymentPending?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 px-2.5 py-1.5 backdrop-blur-md",
        CHECKOUT_SECTION_HEAD,
      )}
    >
      <CheckoutProgressSteps
        complete={complete}
        paymentPending={paymentPending}
        compact
        dense
      />
    </div>
  );
}
/** Scroll area when a viewport-fixed dock reserves bottom space */
export const CONFIRMATION_SCROLL =
  "h-0 min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-0.5 pb-[calc(var(--shop-checkout-dock-height,9.5rem)+env(safe-area-inset-bottom,0px)+0.35rem)] [-webkit-overflow-scrolling:touch] lg:pb-[calc(var(--shop-checkout-dock-height,9rem)+0.35rem)]";

/** Scroll area when the dock is in-flow at the bottom of the checkout form */
export const CONFIRMATION_SCROLL_ANCHORED =
  "h-0 min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-0.5 pb-3 [-webkit-overflow-scrolling:touch]";

export function ConfirmationFloatingDock({
  children,
  ariaLabel,
  /** In-flow dock at the bottom of a flex column (avoids clipping inside overflow-hidden shells). */
  anchored = false,
  /** Full-width bar for checkout drawer / embedded panels */
  fullWidth = false,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  anchored?: boolean;
  fullWidth?: boolean;
}) {
  const panelClass = cn(
    "w-full",
    fullWidth ? "max-w-none" : "max-w-lg sm:max-w-[22rem]",
    fullWidth
      ? "rounded-none border-x-0 border-b-0 shadow-[0_-8px_24px_-8px_rgba(15,23,42,0.12)]"
      : cn(
          "rounded-t-2xl border border-border/35",
          "shadow-[0_-12px_36px_-10px_rgba(15,23,42,0.14)]",
          "sm:rounded-xl sm:border sm:shadow-lg",
        ),
    "bg-linear-to-t from-background/98 via-background/95 to-background/90",
    "ring-1 ring-black/[0.03] backdrop-blur-lg backdrop-saturate-150",
    "supports-[backdrop-filter]:bg-background/88",
  );

  const inner = (
    <>
      <div className="flex justify-center pt-1.5 pb-0 sm:hidden" aria-hidden>
        <span className="h-1 w-9 rounded-full bg-foreground/12" />
      </div>
      <div className="min-w-0 space-y-1 px-2.5 pt-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:space-y-1.5 sm:p-2.5">
        {children}
      </div>
    </>
  );

  if (anchored) {
    return (
      <div
        id={SHOP_CHECKOUT_DOCK_ID}
        className={cn("shrink-0 border-t", panelClass)}
        role="region"
        aria-label={ariaLabel}
      >
        {inner}
      </div>
    );
  }

  return (
    <>
      <ShopCheckoutDockHeightSync />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:justify-end lg:pr-8"
        role="presentation"
      >
        <div
          id={SHOP_CHECKOUT_DOCK_ID}
          className={cn("pointer-events-auto", panelClass)}
          role="region"
          aria-label={ariaLabel}
        >
          {inner}
        </div>
      </div>
    </>
  );
}

export function ConfirmationPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
        className={cn(
          "rounded-xl border border-[color-mix(in_srgb,var(--primary)_12%,var(--border))] bg-card/95 shadow-[0_1px_2px_color-mix(in_srgb,var(--primary)_8%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--primary)_6%,transparent)]",
          className,
        )}
    >
      {children}
    </section>
  );
}

export function ConfirmationPanelHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 px-3 py-2 sm:px-3.5",
        CHECKOUT_SECTION_HEAD,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

export function OrderPaymentStatusBadge({
  paymentConfirmed,
  paymentFailed,
  payOnDelivery = false,
  size = "default",
}: {
  paymentConfirmed: boolean;
  paymentFailed: boolean;
  /** COD: payment is expected later — not a generic “Pending” race state */
  payOnDelivery?: boolean;
  size?: "default" | "sm";
}) {
  const compact = size === "sm";
  if (paymentConfirmed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] font-bold text-primary",
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        )}
      >
        <Check className={compact ? "size-3" : "size-3.5"} strokeWidth={3} aria-hidden />
        Paid
      </span>
    );
  }
  if (paymentFailed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/8 font-bold text-destructive",
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        )}
      >
        <CircleAlert className={compact ? "size-3" : "size-3.5"} aria-hidden />
        Failed
      </span>
    );
  }
  if (payOnDelivery) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/10 font-bold text-amber-900 dark:text-amber-200",
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        )}
      >
        <Clock3 className={compact ? "size-3" : "size-3.5"} aria-hidden />
        Due on delivery
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/10 font-bold text-amber-900 dark:text-amber-200",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      )}
    >
      <Clock3 className={compact ? "size-3" : "size-3.5"} aria-hidden />
      Awaiting payment
    </span>
  );
}

type StatusBannerProps = {
  paymentConfirmed: boolean;
  paymentFailed: boolean;
  failureMessage: string | null;
  total: string;
  hasOnlinePay: boolean;
  hasManualPay: boolean;
  stkSent: boolean;
  payOnDelivery?: boolean;
};

export function OrderPaymentStatusBanner({
  paymentConfirmed,
  paymentFailed,
  failureMessage,
  total,
  hasOnlinePay,
  hasManualPay,
  stkSent,
  payOnDelivery = false,
}: StatusBannerProps) {
  if (paymentConfirmed) {
    return (
      <div
        className="relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-linear-to-r from-[color-mix(in_srgb,var(--primary)_10%,transparent)] via-[color-mix(in_srgb,var(--primary)_4%,transparent)] to-transparent px-3 py-2.5"
        role="status"
        aria-live="polite"
      >
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/90">
                Paid
              </p>
              <p className="font-serif text-lg font-semibold tracking-tight text-foreground [font-variant-numeric:proportional-nums]">
                {total}
              </p>
            </div>
          </div>
          <OrderPaymentStatusBadge
            paymentConfirmed
            paymentFailed={false}
            size="sm"
          />
        </div>
      </div>
    );
  }

  if (paymentFailed) {
    return (
      <div
        className="rounded-2xl border border-destructive/20 bg-linear-to-br from-destructive/5 to-background px-3.5 py-3.5 sm:px-4"
        role="alert"
      >
        <div className="flex gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <CircleAlert className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                Payment not completed
              </p>
              <OrderPaymentStatusBadge
                paymentConfirmed={false}
                paymentFailed
                size="sm"
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
              {failureMessage ??
                "Try M-Pesa again or pay manually using the till in the bar below."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (payOnDelivery) {
    return (
      <div
        className="relative overflow-hidden rounded-xl border border-amber-300/70 bg-linear-to-r from-amber-50/95 via-background to-transparent px-3 py-2.5 dark:border-amber-500/30 dark:from-amber-500/10"
        role="status"
        aria-live="polite"
      >
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
              <Clock3 className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900/90 dark:text-amber-200">
                Pay on delivery
              </p>
              <p className="font-serif text-lg font-semibold tracking-tight text-foreground [font-variant-numeric:proportional-nums]">
                {total}
              </p>
            </div>
          </div>
          <OrderPaymentStatusBadge
            paymentConfirmed={false}
            paymentFailed={false}
            payOnDelivery
            size="sm"
          />
        </div>
        <p className="relative mt-1.5 text-[10px] leading-snug text-muted-foreground">
          Order placed. Pay cash or M-Pesa to the rider when your delivery arrives.
        </p>
      </div>
    );
  }

  const payHint =
    hasOnlinePay && hasManualPay
      ? "Pay with M-Pesa or till, then confirm when done."
      : hasOnlinePay
        ? stkSent
          ? "Approve the prompt on your phone, then confirm below."
          : "Send the M-Pesa prompt below, then confirm when approved."
        : null;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-linear-to-r from-[color-mix(in_srgb,var(--primary)_10%,transparent)] via-[color-mix(in_srgb,var(--primary)_4%,transparent)] to-transparent px-3 py-2.5"
      role="status"
    >
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <Clock3 className="size-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/90">
              Total due
            </p>
            <p className="font-serif text-lg font-semibold tracking-tight text-foreground [font-variant-numeric:proportional-nums]">
              {total}
            </p>
          </div>
        </div>
        <OrderPaymentStatusBadge
          paymentConfirmed={false}
          paymentFailed={false}
          size="sm"
        />
      </div>
      {payHint ? (
        <p className="relative mt-1.5 text-[10px] leading-snug text-muted-foreground">
          {payHint}
        </p>
      ) : null}
    </div>
  );
}

export function OrderConfirmationHero({
  orderRef,
  branchName,
  paymentConfirmed,
  paymentFailed,
}: {
  orderRef: string;
  branchName: string;
  paymentConfirmed: boolean;
  paymentFailed: boolean;
}) {
  return (
    <ConfirmationPanel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-2.5 px-3.5 py-3 sm:flex-nowrap sm:items-center sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm sm:size-10",
              paymentConfirmed
                ? "bg-primary text-white"
                : paymentFailed
                  ? "bg-destructive/90 text-white"
                  : "bg-foreground text-background",
            )}
          >
            <Check className="size-4" strokeWidth={3} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Order confirmed
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-tight text-foreground">
              <span className="font-mono text-[13px] tracking-wide">#{orderRef}</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{branchName}</p>
          </div>
        </div>
        <OrderPaymentStatusBadge
          paymentConfirmed={paymentConfirmed}
          paymentFailed={paymentFailed}
        />
      </div>
      <div className="border-t border-border/50 px-2 py-2.5 sm:px-3">
        <CheckoutProgressSteps complete compact />
      </div>
    </ConfirmationPanel>
  );
}

export function OrderMetaStrip({
  items,
}: {
  items: { label: string; value: React.ReactNode; highlight?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex min-w-0 flex-col gap-0.5 rounded-lg border border-[color-mix(in_srgb,var(--primary)_12%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--muted))] px-2.5 py-1.5",
            item.highlight &&
              "border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </p>
          <div
            className={cn(
              "min-w-0 text-sm font-semibold leading-tight break-words",
              item.highlight
                ? "font-serif text-lg text-primary [font-variant-numeric:proportional-nums]"
                : "text-foreground",
            )}
            title={typeof item.value === "string" ? item.value : undefined}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export type OrderLineItem = {
  itemId: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  currency: string;
  formatPrice: (currency: string, amount: number | null) => string;
};

export function OrderLinesList({
  lines,
  emptyMessage = "Item details are unavailable.",
  constrainHeight = false,
}: {
  lines: OrderLineItem[];
  emptyMessage?: string;
  /** When true, lines scroll inside a short panel; default lets the page scroll. */
  constrainHeight?: boolean;
}) {
  if (lines.length === 0) {
    return (
      <p className="px-3.5 py-4 text-sm text-muted-foreground sm:px-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "divide-y divide-[color-mix(in_srgb,var(--primary)_10%,var(--border))]",
        constrainHeight &&
          "max-h-[min(26vh,11.5rem)] overflow-y-auto overscroll-contain sm:max-h-[min(30vh,13rem)]",
      )}
    >
      {lines.map((line) => (
        <li
          key={line.itemId}
          className="flex gap-2.5 px-3 py-2 transition-colors hover:bg-muted/20 sm:px-3.5"
        >
          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted/80 ring-1 ring-border/40">
            {line.imageUrl ? (
              <Image
                src={line.imageUrl}
                alt={line.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag
                  className="size-4 text-muted-foreground/70"
                  aria-hidden
                />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
              {line.name}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Qty {line.quantity}
              {line.variantName ? (
                <span className={cn("ml-1.5", CHECKOUT_VARIANT_PILL)}>
                  {line.variantName}
                </span>
              ) : null}
            </p>
          </div>
          <p className="shrink-0 text-right text-[13px] font-bold tabular-nums text-foreground">
            {line.formatPrice(line.currency, line.lineTotal ?? 0)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function OrderDeliveryCard({
  customerName,
  customerEmail,
  customerPhone,
  whatsAppNumber,
  streetAddress,
  ward,
  subCounty,
  county,
  deliveryAreaLine,
  deliveryNotes,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  whatsAppNumber: string;
  streetAddress: string;
  ward?: string;
  subCounty?: string;
  county?: string;
  /** @deprecated Prefer ward / subCounty / county for deduped zone label */
  deliveryAreaLine?: string | null;
  deliveryNotes: string;
}) {
  const zoneLabel =
    formatDeliveryZone(ward, subCounty, county) ?? deliveryAreaLine?.trim() ?? null;

  return (
    <ConfirmationPanel className="overflow-hidden">
      <DeliveryContactCardHeader />
      <DeliveryContactDetails
        customerName={customerName}
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        whatsAppNumber={whatsAppNumber}
        streetAddress={streetAddress}
        zoneLabel={zoneLabel}
        deliveryNotes={deliveryNotes}
        showEta={Boolean(zoneLabel)}
      />
    </ConfirmationPanel>
  );
}

export function OrderPaymentSummaryCard({
  subtotalLabel,
  totalLabel,
  paymentConfirmed,
  paymentFailed,
  payOnDelivery = false,
  /** Banner already shows status — hide duplicate pill here */
  showStatusBadge = false,
}: {
  subtotalLabel: string;
  totalLabel: string;
  paymentConfirmed: boolean;
  paymentFailed: boolean;
  payOnDelivery?: boolean;
  showStatusBadge?: boolean;
}) {
  return (
    <ConfirmationPanel>
      <ConfirmationPanelHeader
        title="Payment"
        trailing={
          showStatusBadge ? (
            <OrderPaymentStatusBadge
              paymentConfirmed={paymentConfirmed}
              paymentFailed={paymentFailed}
              payOnDelivery={payOnDelivery}
              size="sm"
            />
          ) : undefined
        }
      />
      <div className="space-y-1.5 px-3 py-2.5 text-[13px] sm:px-3.5">
        <div className="flex justify-between text-muted-foreground">
          <span className="text-xs">Subtotal</span>
          <span className="text-xs font-medium tabular-nums text-foreground">
            {subtotalLabel}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span className="text-xs">Delivery</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
            Free
          </span>
        </div>
        <div
          className={cn(
            "flex items-end justify-between border-t pt-2.5",
            CHECKOUT_SECTION_DIVIDER,
          )}
        >
          <span className="text-xs font-semibold text-foreground">
            {paymentConfirmed
              ? "Paid"
              : payOnDelivery
                ? "Due on delivery"
                : "Total due"}
          </span>
          <span
            className={cn(
              "font-serif text-xl font-semibold tracking-tight [font-variant-numeric:proportional-nums]",
              paymentConfirmed
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-foreground",
            )}
          >
            {totalLabel}
          </span>
        </div>
      </div>
    </ConfirmationPanel>
  );
}

export function ConfirmationDockActions({
  paymentConfirmed,
  checkingPayment,
  onConfirmPayment,
  onReturnToShop,
  paymentSlot,
  /** COD: return-to-shop is primary; optional early pay lives in paymentSlot */
  payOnDelivery = false,
  /** STK prompt already sent — unlock “I’ve completed payment” as next step */
  stkSent = false,
  anchored = false,
  fullWidth = false,
}: {
  paymentConfirmed: boolean;
  checkingPayment: boolean;
  onConfirmPayment: () => void;
  onReturnToShop: () => void;
  paymentSlot?: React.ReactNode;
  payOnDelivery?: boolean;
  stkSent?: boolean;
  anchored?: boolean;
  fullWidth?: boolean;
}) {
  const showCodReturnPrimary = !paymentConfirmed && payOnDelivery;

  return (
    <ConfirmationFloatingDock
      ariaLabel="Order actions"
      anchored={anchored}
      fullWidth={fullWidth}
    >
      <div className="space-y-1.5">
        {paymentSlot ? (
          <div className="min-w-0 max-w-full">{paymentSlot}</div>
        ) : null}
        {paymentConfirmed ? (
          <Button
            type="button"
            size="lg"
            onClick={onReturnToShop}
            className="h-10 w-full gap-1 rounded-lg text-[13px] font-semibold"
          >
            Return to shop
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : showCodReturnPrimary ? (
          <div className="space-y-1.5">
            {stkSent ? (
              <Button
                type="button"
                size="lg"
                disabled={checkingPayment}
                onClick={onConfirmPayment}
                className="h-10 w-full gap-1 rounded-lg text-[13px] font-semibold shadow-sm ring-1 ring-primary/20"
              >
                {checkingPayment ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Checking…
                  </>
                ) : (
                  <>
                    I&apos;ve completed payment
                    <RefreshCw className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={onReturnToShop}
                className="h-10 w-full gap-1 rounded-lg text-[13px] font-semibold"
              >
                Return to shop
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            )}
            <p className="px-0.5 text-center text-[10px] leading-snug text-muted-foreground">
              {stkSent
                ? "Approve the prompt on your phone, then confirm above."
                : `Your order is saved. Pay the rider when it arrives${
                    paymentSlot ? " — or pay early with M-Pesa above" : ""
                  }.`}
            </p>
            {stkSent ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onReturnToShop}
                className="h-9 w-full rounded-lg border-border/60 text-[11px] font-semibold"
              >
                Return to shop
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1.5">
            {paymentSlot && !stkSent ? (
              <p className="px-0.5 text-[10px] leading-snug text-muted-foreground">
                Send the M-Pesa prompt (or pay the till), approve if prompted, then
                confirm below.
              </p>
            ) : paymentSlot && stkSent ? (
              <p className="px-0.5 text-[10px] leading-snug text-muted-foreground">
                Approve the prompt on your phone, then tap below.
              </p>
            ) : null}
            <div className="flex items-stretch gap-2">
              <Button
                type="button"
                size="lg"
                disabled={checkingPayment}
                onClick={onConfirmPayment}
                className={cn(
                  "h-10 min-w-0 flex-1 gap-1 rounded-lg text-[13px] font-semibold shadow-sm ring-1 ring-primary/20",
                  paymentSlot && !stkSent && "opacity-90",
                )}
              >
                {checkingPayment ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Checking…
                  </>
                ) : (
                  <>
                    <span className="truncate text-xs font-semibold sm:text-sm">
                      I&apos;ve completed payment
                    </span>
                    <RefreshCw className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onReturnToShop}
                className="h-10 shrink-0 rounded-lg border-border/60 px-3 text-[11px] font-semibold sm:text-xs"
              >
                Return to shop
              </Button>
            </div>
          </div>
        )}
      </div>
    </ConfirmationFloatingDock>
  );
}

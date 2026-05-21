"use client";

import {
  AlertTriangle,
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
import { cn } from "@/lib/utils";

/* ── Layout tokens ── */
export const CONFIRMATION_VIEWPORT =
  "flex h-full min-h-0 flex-1 flex-col overflow-hidden";

export function ConfirmationTopProgress({
  complete = true,
}: {
  complete?: boolean;
}) {
  return (
    <div className="shrink-0 border-b border-border/50 bg-background px-3 py-2 max-lg:py-1.5">
      <CheckoutProgressSteps complete={complete} compact />
    </div>
  );
}
/** Single scroll surface; bottom pad tracks the fixed dock via --shop-checkout-dock-height */
export const CONFIRMATION_SCROLL =
  "h-0 min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-0.5 pb-[calc(var(--shop-checkout-dock-height,11rem)+env(safe-area-inset-bottom,0px)+0.5rem)] [-webkit-overflow-scrolling:touch] lg:pb-[calc(var(--shop-checkout-dock-height,10rem)+0.5rem)]";

export function ConfirmationFloatingDock({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <>
      <ShopCheckoutDockHeightSync />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:justify-end lg:pr-8"
        role="region"
        aria-label={ariaLabel}
      >
      <div
        id={SHOP_CHECKOUT_DOCK_ID}
        className={cn(
          "pointer-events-auto w-full max-w-lg",
          "rounded-t-[1.5rem] border border-b-0 border-border/45",
          "bg-linear-to-t from-background via-background/95 to-background/90",
          "shadow-[0_-24px_64px_-16px_rgba(15,23,42,0.22)]",
          "ring-1 ring-black/[0.05] backdrop-blur-2xl backdrop-saturate-150",
          "supports-[backdrop-filter]:bg-background/86",
          "sm:mb-5 sm:max-w-[23rem] sm:rounded-2xl sm:border sm:border-border/60 sm:shadow-2xl",
        )}
      >
        <div
          className="flex justify-center pt-2 pb-0.5 sm:hidden"
          aria-hidden
        >
          <span className="h-1 w-9 rounded-full bg-foreground/12" />
        </div>
        <div className="min-w-0 space-y-1.5 px-3 pt-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-y-2 sm:p-3">
          {children}
        </div>
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
        "rounded-2xl border border-border/55 bg-card/98 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]",
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
    <div className="flex items-start justify-between gap-3 border-b border-border/50 px-3.5 py-3 sm:px-4">
      <div className="min-w-0">
        <h2 className="font-serif text-base font-semibold tracking-tight text-foreground sm:text-[1.05rem]">
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
  size = "default",
}: {
  paymentConfirmed: boolean;
  paymentFailed: boolean;
  size?: "default" | "sm";
}) {
  const compact = size === "sm";
  if (paymentConfirmed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 font-bold text-emerald-800 dark:text-emerald-300",
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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/10 font-bold text-amber-900 dark:text-amber-200",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      )}
    >
      <Clock3 className={compact ? "size-3" : "size-3.5"} aria-hidden />
      Pending
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
};

export function OrderPaymentStatusBanner({
  paymentConfirmed,
  paymentFailed,
  failureMessage,
  total,
  hasOnlinePay,
  hasManualPay,
  stkSent,
}: StatusBannerProps) {
  if (paymentConfirmed) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-linear-to-br from-emerald-50 via-emerald-50/80 to-background px-3.5 py-3.5 dark:from-emerald-950/50 dark:via-emerald-950/30 sm:px-4 sm:py-4"
        role="status"
        aria-live="polite"
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-emerald-400/15 blur-2xl"
          aria-hidden
        />
        <div className="relative flex gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
            <Check className="size-5" strokeWidth={3} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800/80 dark:text-emerald-300/90">
                Payment received
              </p>
              <OrderPaymentStatusBadge
                paymentConfirmed
                paymentFailed={false}
                size="sm"
              />
            </div>
            <p className="mt-1 font-serif text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">
              {total}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-900/75 sm:text-[13px] dark:text-emerald-100/80">
              Your order is confirmed. The store will prepare it for pickup.
            </p>
          </div>
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
      className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-linear-to-br from-amber-50/90 via-amber-50/40 to-background px-3.5 py-3.5 dark:from-amber-950/35 dark:via-amber-950/15 sm:px-4"
      role="status"
    >
      <div
        className="pointer-events-none absolute -right-4 -top-4 size-20 rounded-full bg-amber-400/20 blur-2xl"
        aria-hidden
      />
      <div className="relative flex gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
          <Clock3 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-900/70 dark:text-amber-200/80">
              Awaiting payment
            </p>
            <OrderPaymentStatusBadge
              paymentConfirmed={false}
              paymentFailed={false}
              size="sm"
            />
          </div>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground">
            {total}
          </p>
          {payHint ? (
            <p className="mt-1.5 text-xs leading-relaxed text-amber-950/80 sm:text-[13px] dark:text-amber-100/75">
              {payHint}
            </p>
          ) : null}
        </div>
      </div>
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
                ? "bg-emerald-600 text-white"
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
    <div className="-mx-0.5 flex gap-2 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "min-w-[8.75rem] shrink-0 snap-start rounded-xl border border-border/50 bg-muted/25 px-3 py-2 sm:min-w-0",
            item.highlight &&
              "border-emerald-500/30 bg-linear-to-br from-emerald-500/[0.07] to-transparent",
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </p>
          <div
            className={cn(
              "mt-1 text-sm font-semibold tabular-nums leading-tight",
              item.highlight
                ? "font-serif text-lg text-emerald-700 dark:text-emerald-400"
                : "text-foreground",
            )}
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
        "divide-y divide-border/40",
        constrainHeight &&
          "max-h-[min(26vh,11.5rem)] overflow-y-auto overscroll-contain sm:max-h-[min(30vh,13rem)]",
      )}
    >
      {lines.map((line) => (
        <li
          key={line.itemId}
          className="flex gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/20 sm:px-4"
        >
          <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted/80 ring-1 ring-border/40 sm:size-12">
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
                <span className="ml-1.5 rounded-md bg-muted px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
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
  deliveryAreaLine,
  deliveryNotes,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  whatsAppNumber: string;
  streetAddress: string;
  deliveryAreaLine: string | null;
  deliveryNotes: string;
}) {
  return (
    <ConfirmationPanel>
      <ConfirmationPanelHeader
        title="Delivery & contact"
        subtitle="Fulfilment details"
        trailing={<MapPin className="size-4 text-primary/80" aria-hidden />}
      />
      <div className="space-y-3 px-3.5 py-3 text-sm sm:px-4">
        <div>
          <p className="font-semibold text-foreground">{customerName || "Customer"}</p>
          {customerEmail ? (
            <p className="mt-1 text-xs text-muted-foreground">{customerEmail}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">{customerPhone}</p>
          {whatsAppNumber ? (
            <p className="text-xs text-muted-foreground">WhatsApp: {whatsAppNumber}</p>
          ) : null}
        </div>
        {(streetAddress || deliveryAreaLine) && (
          <div className="rounded-xl border border-border/50 bg-muted/25 px-3 py-2.5">
            {streetAddress ? (
              <p className="text-[13px] font-medium text-foreground">{streetAddress}</p>
            ) : null}
            {deliveryAreaLine ? (
              <p className="mt-1 text-xs text-muted-foreground">{deliveryAreaLine}</p>
            ) : null}
          </div>
        )}
        {deliveryAreaLine ? (
          <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            <Clock3 className="size-3.5" aria-hidden />
            Est. 30 min delivery
          </p>
        ) : null}
        {deliveryNotes ? (
          <p className="border-t border-border/50 pt-2.5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Note: </span>
            {deliveryNotes}
          </p>
        ) : null}
      </div>
    </ConfirmationPanel>
  );
}

export function OrderPaymentSummaryCard({
  subtotalLabel,
  totalLabel,
  paymentConfirmed,
  paymentFailed,
  manualPayNote,
}: {
  subtotalLabel: string;
  totalLabel: string;
  paymentConfirmed: boolean;
  paymentFailed: boolean;
  manualPayNote?: boolean;
}) {
  return (
    <ConfirmationPanel>
      <ConfirmationPanelHeader
        title="Payment"
        trailing={
          <OrderPaymentStatusBadge
            paymentConfirmed={paymentConfirmed}
            paymentFailed={paymentFailed}
            size="sm"
          />
        }
      />
      <div className="space-y-2 px-3.5 py-3 text-sm sm:px-4">
        <div className="flex justify-between text-muted-foreground">
          <span className="text-xs">Subtotal</span>
          <span className="text-xs font-medium tabular-nums text-foreground">
            {subtotalLabel}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span className="text-xs">Delivery</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Free
          </span>
        </div>
        <div className="flex items-end justify-between border-t border-border/50 pt-2.5">
          <span className="text-xs font-semibold text-foreground">
            {paymentConfirmed ? "Paid" : "Total due"}
          </span>
          <span
            className={cn(
              "font-serif text-xl font-semibold tabular-nums tracking-tight",
              paymentConfirmed
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-foreground",
            )}
          >
            {totalLabel}
          </span>
        </div>
        {manualPayNote && !paymentConfirmed ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Till payments are verified by the store.
          </p>
        ) : null}
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
}: {
  paymentConfirmed: boolean;
  checkingPayment: boolean;
  onConfirmPayment: () => void;
  onReturnToShop: () => void;
  paymentSlot?: React.ReactNode;
}) {
  return (
    <ConfirmationFloatingDock ariaLabel="Order actions">
      <div className="space-y-1.5">
        {paymentSlot ? (
          <div className="min-w-0 max-w-full overflow-hidden">{paymentSlot}</div>
        ) : null}
        {paymentConfirmed ? (
          <Button
            type="button"
            size="lg"
            onClick={onReturnToShop}
            className="h-10 w-full gap-1.5 rounded-xl text-sm font-semibold"
          >
            Return to shop
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <div className="flex items-stretch gap-2">
            <Button
              type="button"
              size="lg"
              disabled={checkingPayment}
              onClick={onConfirmPayment}
              className="h-10 min-w-0 flex-1 gap-1 rounded-xl text-sm font-semibold shadow-md ring-2 ring-primary/25"
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
              className="h-10 shrink-0 rounded-xl px-3 text-xs font-semibold sm:px-4 sm:text-sm"
            >
              Return to shop
            </Button>
          </div>
        )}
      </div>
    </ConfirmationFloatingDock>
  );
}

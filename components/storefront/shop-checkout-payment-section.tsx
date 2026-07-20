"use client";

import { Banknote, Check, Copy, Smartphone, Sparkles, Truck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** STK send control surfaced in the confirmation dock action row (mobile). */
export type StkDockSendAction = {
  label: string;
  disabled: boolean;
  onSend: () => void;
};

import type {
  PublicOnlinePaymentMethod,
  PublicPaymentInstruction,
} from "@/lib/public-storefront";
import {
  CHECKOUT_INPUT,
  CHECKOUT_LABEL,
  CHECKOUT_MPESA_FEATURED,
  CHECKOUT_PAY_SECONDARY,
  CHECKOUT_PAYMENT_PANEL,
} from "@/components/storefront/shop-checkout-design";
import { buildStkPhoneNumber, isStkPhoneValid } from "@/lib/stk-phone";
import { cn } from "@/lib/utils";

export type CheckoutPaymentMethod = "mpesa" | "pay_on_delivery";

function PaymentSectionHeading({
  title,
  amountDue,
  compact,
}: {
  title: string;
  amountDue?: string | null;
  compact?: boolean;
}) {
  const showAmount = amountDue && !compact;

  return (
    <div className="flex items-start justify-between gap-3">
      <h3
        className={cn(
          "min-w-0 font-bold tracking-tight",
          compact
            ? "text-[10px] uppercase tracking-[0.14em] text-primary/90"
            : "text-sm text-foreground",
        )}
      >
        {title}
      </h3>
      {showAmount ? (
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Amount due
          </p>
          <p className="font-serif text-base font-semibold tracking-tight text-foreground [font-variant-numeric:proportional-nums]">
            {amountDue}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ManualInstructionCard({
  pi,
  compact,
}: {
  pi: PublicPaymentInstruction;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const till = pi.type === "till" ? pi.tillNumber?.trim() : "";

  const copyTill = async () => {
    if (!till) return;
    try {
      await navigator.clipboard.writeText(till);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  if (compact && till) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2",
          "border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,var(--muted))]",
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            Buy Goods Till
          </p>
          <p className="mt-0.5 font-mono text-base font-bold tabular-nums tracking-wide text-foreground">
            {till}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyTill()}
          className="h-8 shrink-0 gap-1 rounded-md border-primary/25 bg-background px-2.5 text-[11px] font-semibold"
          aria-label={copied ? "Till number copied" : "Copy till number"}
        >
          {copied ? (
            <Check className="size-3.5 text-primary" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-[color-mix(in_srgb,var(--primary)_15%,var(--border))] bg-background/90 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        compact ? "p-2" : "p-3",
      )}
    >
      <p className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>
        {pi.label}
      </p>
      {till ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "break-all font-mono font-bold tracking-wide text-foreground",
              compact ? "text-base" : "text-lg",
            )}
          >
            Till: {till}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copyTill()}
            className="h-7 gap-1 rounded-md px-2 text-[11px] font-semibold"
          >
            {copied ? (
              <Check className="size-3 text-primary" aria-hidden />
            ) : (
              <Copy className="size-3" aria-hidden />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}
      {pi.type === "paybill" && pi.businessNumber ? (
        <p className="mt-1 font-mono text-sm font-bold text-foreground">
          Paybill: {pi.businessNumber}
          {pi.accountNumber ? ` · Acct: ${pi.accountNumber}` : ""}
        </p>
      ) : null}
      {pi.type === "bank_account" ? (
        <div className="mt-1 space-y-0.5 text-sm">
          <p className="font-semibold text-foreground">{pi.bankName}</p>
          <p className="font-mono text-muted-foreground">Acct: {pi.accountNumber}</p>
          <p className="text-muted-foreground">{pi.accountName}</p>
        </div>
      ) : null}
      {pi.instructions && !compact ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{pi.instructions}</p>
      ) : null}
    </div>
  );
}

function PaymentMethodOption({
  selected,
  onSelect,
  title,
  description,
  icon,
  badge,
  featured,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  featured?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        featured ? CHECKOUT_MPESA_FEATURED : CHECKOUT_PAY_SECONDARY,
        selected && !featured && "border-primary/35 bg-primary/[0.04] ring-1 ring-primary/15",
        !selected && featured && "opacity-90",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-start gap-3 p-3.5 text-left sm:p-4",
          featured && "pb-0",
        )}
        aria-pressed={selected}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            featured
              ? "bg-[#00a651]/15 text-[#007a3d]"
              : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-semibold tracking-tight",
                featured ? "text-sm text-foreground" : "text-[13px] text-foreground",
              )}
            >
              {title}
            </span>
            {badge ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]",
                  featured
                    ? "bg-[#00a651]/15 text-[#007a3d]"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {featured ? <Sparkles className="size-2.5" aria-hidden /> : null}
                {badge}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {description}
          </span>
        </span>
        <span
          className={cn(
            "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary text-white"
              : "border-border bg-background",
          )}
          aria-hidden
        >
          {selected ? <Check className="size-3 stroke-[3]" /> : null}
        </span>
      </button>
      {selected && children ? (
        <div className={cn(featured ? "px-3.5 pb-3.5 pt-2 sm:px-4 sm:pb-4" : "px-3.5 pb-3.5")}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

type OnlineStkProps = {
  methods: PublicOnlinePaymentMethod[];
  defaultAreaCode: string;
  defaultPhone: string;
  busy: boolean;
  stkMessage: string | null;
  stkSent: boolean;
  onPay: (configId: string, phoneNumber: string) => void;
  compact?: boolean;
  featured?: boolean;
  promptDisabled?: boolean;
  promptDisabledHint?: string;
  actionsInDock?: boolean;
  onStkSendActionChange?: (action: StkDockSendAction | null) => void;
};

function OnlineStkFields({
  methods,
  defaultAreaCode,
  defaultPhone,
  busy,
  stkMessage,
  stkSent,
  onPay,
  compact,
  featured,
  promptDisabled,
  promptDisabledHint,
  actionsInDock,
  onStkSendActionChange,
}: OnlineStkProps) {
  const [areaCode, setAreaCode] = useState(defaultAreaCode);
  const [phone, setPhone] = useState(defaultPhone);

  useEffect(() => {
    setAreaCode(defaultAreaCode);
    setPhone(defaultPhone);
  }, [defaultAreaCode, defaultPhone]);

  useEffect(() => {
    if (methods.length === 0) {
      onStkSendActionChange?.(null);
      return;
    }
    if (!actionsInDock || !onStkSendActionChange || !methods[0]) {
      onStkSendActionChange?.(null);
      return;
    }
    const primaryMethod = methods[0];
    const phoneValid = isStkPhoneValid(areaCode, phone);
    const fullPhone = buildStkPhoneNumber(areaCode, phone);
    onStkSendActionChange({
      label: busy ? "Sending…" : stkSent ? "Sent" : "Send prompt",
      disabled: busy || stkSent || !phoneValid || Boolean(promptDisabled),
      onSend: () => onPay(primaryMethod.configId, fullPhone),
    });
  }, [
    methods,
    promptDisabled,
    actionsInDock,
    onStkSendActionChange,
    areaCode,
    phone,
    busy,
    stkSent,
    onPay,
  ]);

  if (methods.length === 0) return null;

  const phoneValid = isStkPhoneValid(areaCode, phone);
  const fullPhone = buildStkPhoneNumber(areaCode, phone);
  const primaryMethod = methods[0];

  return (
    <div className={cn("space-y-2", featured && "rounded-lg bg-background/60 p-2.5 ring-1 ring-[#00a651]/10")}>
      {promptDisabled ? (
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <Zap className="mt-0.5 size-3 shrink-0 text-[#00a651]" aria-hidden />
          {promptDisabledHint ??
            "Place your order first, then tap Send prompt to pay on your phone."}
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Enter the number that receives the M-Pesa prompt, then approve on your phone.
        </p>
      )}
      <div
        className={cn(
          "gap-2",
          compact
            ? "flex min-w-0 flex-wrap items-end"
            : "grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[112px_minmax(0,1fr)]",
        )}
      >
        <label
          className={cn(
            "flex min-w-0 flex-col gap-1",
            compact ? "w-[3.25rem] shrink-0" : "",
          )}
        >
          <span className={CHECKOUT_LABEL}>Code</span>
          <input
            type="text"
            inputMode="tel"
            autoComplete="tel-country-code"
            className={cn(CHECKOUT_INPUT, compact ? "h-9 px-2" : "", featured && "border-[#00a651]/25")}
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            placeholder="+254"
            disabled={busy || stkSent}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={CHECKOUT_LABEL}>M-Pesa phone</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn(CHECKOUT_INPUT, compact ? "h-9 px-2" : "", featured && "border-[#00a651]/25")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="712 345 678"
            disabled={busy || stkSent}
          />
        </label>
        {compact && !actionsInDock ? (
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 rounded-xl bg-[#00a651] px-3 text-xs font-bold text-white shadow-md hover:bg-[#008f47]"
            disabled={busy || stkSent || !phoneValid || promptDisabled}
            onClick={() => onPay(primaryMethod.configId, fullPhone)}
          >
            {busy ? "Sending…" : stkSent ? "Sent ✓" : "Send prompt"}
          </Button>
        ) : null}
      </div>
      {!phoneValid && phone.trim() ? (
        <p className="text-[11px] text-destructive">Invalid number</p>
      ) : null}
      {!compact && !actionsInDock ? (
        <Button
          type="button"
          size="sm"
          className="h-10 w-full rounded-xl bg-[#00a651] text-sm font-bold text-white shadow-md hover:bg-[#008f47] sm:w-auto sm:px-6"
          disabled={busy || stkSent || !phoneValid || promptDisabled}
          onClick={() => onPay(primaryMethod.configId, fullPhone)}
        >
          {busy ? "Sending…" : stkSent ? "Prompt sent ✓" : "Send M-Pesa prompt"}
        </Button>
      ) : null}
      {stkMessage ? (
        <p
          className={cn(
            "text-xs font-medium",
            stkSent ? "text-[#007a3d]" : "text-destructive",
          )}
        >
          {stkMessage}
        </p>
      ) : null}
    </div>
  );
}

export function ShopCheckoutPaymentSection({
  manual,
  online,
  defaultAreaCode = "+254",
  defaultPhone = "",
  stkBusy,
  stkMessage,
  stkSent,
  onStkPay,
  orderPlaced = false,
  variant = "default",
  amountDue,
  actionsInDock,
  onStkSendActionChange,
  selectedMethod = "mpesa",
  onSelectMethod,
  payOnDeliveryAvailable = true,
}: {
  manual: PublicPaymentInstruction[];
  online: PublicOnlinePaymentMethod[];
  defaultAreaCode?: string;
  defaultPhone?: string;
  stkBusy?: boolean;
  stkMessage?: string | null;
  stkSent?: boolean;
  onStkPay?: (configId: string, phoneNumber: string) => void;
  orderPlaced?: boolean;
  variant?: "default" | "floating";
  amountDue?: string | null;
  actionsInDock?: boolean;
  onStkSendActionChange?: (action: StkDockSendAction | null) => void;
  selectedMethod?: CheckoutPaymentMethod;
  onSelectMethod?: (method: CheckoutPaymentMethod) => void;
  payOnDeliveryAvailable?: boolean;
}) {
  const hasManual = manual.length > 0;
  const hasOnline = online.length > 0;
  const floating = variant === "floating";
  const showMethodPicker = Boolean(onSelectMethod) && payOnDeliveryAvailable;
  const mpesaSelected = selectedMethod === "mpesa";
  const codSelected = selectedMethod === "pay_on_delivery";

  if (!hasManual && !hasOnline && !payOnDeliveryAvailable) return null;

  const stkPromptDisabled = hasOnline && !orderPlaced;
  const dockActions = Boolean(actionsInDock && orderPlaced && floating);

  const manualBlock =
    hasManual && selectedMethod !== "pay_on_delivery" ? (
      <div
        className={cn(
          floating
            ? cn("space-y-1.5 px-0.5 py-0.5")
            : cn("space-y-2.5 p-4", CHECKOUT_PAYMENT_PANEL),
        )}
      >
        {floating ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Or pay via till
          </p>
        ) : (
          <PaymentSectionHeading title="Or pay manually" amountDue={amountDue} compact={false} />
        )}
        {manual.map((pi) => (
          <ManualInstructionCard key={pi.configId} pi={pi} compact={floating} />
        ))}
      </div>
    ) : null;

  const mpesaBlock =
    hasOnline && onStkPay && mpesaSelected ? (
      showMethodPicker ? (
        <PaymentMethodOption
          selected={mpesaSelected}
          onSelect={() => onSelectMethod?.("mpesa")}
          title="M-Pesa on your phone"
          description="Instant STK prompt — fastest way to pay and confirm your order."
          icon={<Smartphone className="size-5" aria-hidden />}
          badge="Recommended"
          featured
        >
          <OnlineStkFields
            methods={online}
            defaultAreaCode={defaultAreaCode}
            defaultPhone={defaultPhone}
            busy={stkBusy ?? false}
            stkMessage={stkMessage ?? null}
            stkSent={stkSent ?? false}
            onPay={onStkPay}
            compact={floating}
            featured
            promptDisabled={stkPromptDisabled}
            promptDisabledHint={
              stkPromptDisabled
                ? "Place your order first, then tap Send prompt to pay on your phone."
                : undefined
            }
            actionsInDock={dockActions}
            onStkSendActionChange={onStkSendActionChange}
          />
        </PaymentMethodOption>
      ) : (
        <div className={cn(CHECKOUT_MPESA_FEATURED, "space-y-3 p-4")}>
          {!floating ? (
            <>
              <PaymentSectionHeading
                title="Pay with M-Pesa"
                amountDue={amountDue}
                compact={false}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Enter the number that should receive the M-Pesa prompt, then tap send.
              </p>
            </>
          ) : (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#007a3d]">
              M-Pesa · Recommended
            </p>
          )}
          <OnlineStkFields
            methods={online}
            defaultAreaCode={defaultAreaCode}
            defaultPhone={defaultPhone}
            busy={stkBusy ?? false}
            stkMessage={stkMessage ?? null}
            stkSent={stkSent ?? false}
            onPay={onStkPay}
            compact={floating}
            featured
            promptDisabled={stkPromptDisabled}
            promptDisabledHint={
              stkPromptDisabled
                ? "Place your order first, then send the M-Pesa prompt to your phone."
                : undefined
            }
            actionsInDock={dockActions}
            onStkSendActionChange={onStkSendActionChange}
          />
        </div>
      )
    ) : null;

  const codBlock =
    showMethodPicker && payOnDeliveryAvailable ? (
      <PaymentMethodOption
        selected={codSelected}
        onSelect={() => onSelectMethod?.("pay_on_delivery")}
        title="Pay on delivery"
        description="Pay cash or M-Pesa to the rider when your order arrives."
        icon={<Truck className="size-4" aria-hidden />}
      >
        <p className="flex items-start gap-2 rounded-lg bg-muted/30 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
          <Banknote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Have the exact amount ready. Your order is confirmed once you place it — no
          upfront payment needed.
        </p>
      </PaymentMethodOption>
    ) : null;

  return (
    <div className={cn("min-w-0 max-w-full", floating ? "space-y-2" : "space-y-3")}>
      {/* Always lead with M-Pesa; till / COD sit below so pay-now is considered first */}
      {mpesaBlock}
      {showMethodPicker ? codBlock : null}
      {!showMethodPicker && codSelected && payOnDeliveryAvailable ? (
        <div className={cn(CHECKOUT_PAY_SECONDARY, "flex items-start gap-2.5 p-3.5")}>
          <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Or pay on delivery — cash or M-Pesa to the rider when your order arrives.
          </p>
        </div>
      ) : null}
      {manualBlock}
    </div>
  );
}

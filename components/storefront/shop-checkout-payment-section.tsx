"use client";

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
  CHECKOUT_PAYMENT_PANEL,
} from "@/components/storefront/shop-checkout-design";
import { buildStkPhoneNumber, isStkPhoneValid } from "@/lib/stk-phone";
import { cn } from "@/lib/utils";

function PaymentSectionHeading({
  title,
  amountDue,
  compact,
  tone = "primary",
}: {
  title: string;
  amountDue?: string | null;
  compact?: boolean;
  tone?: "primary";
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
          <p className="font-serif text-base font-semibold tabular-nums text-foreground">
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
  if (compact && pi.type === "till" && pi.tillNumber) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-foreground",
          "border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))]",
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/80">
          Till
        </span>
        {pi.tillNumber}
      </span>
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
      {pi.type === "till" && pi.tillNumber ? (
        <p
          className={cn(
            "mt-1 break-all font-mono font-bold tracking-wide text-foreground",
            compact ? "text-base" : "text-lg",
          )}
        >
          Till: {pi.tillNumber}
        </p>
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

type OnlineStkProps = {
  methods: PublicOnlinePaymentMethod[];
  defaultAreaCode: string;
  defaultPhone: string;
  busy: boolean;
  stkMessage: string | null;
  stkSent: boolean;
  onPay: (configId: string, phoneNumber: string) => void;
  compact?: boolean;
  promptDisabled?: boolean;
  promptDisabledHint?: string;
  /** Hide send button; parent renders it in the dock action row */
  actionsInDock?: boolean;
  onStkSendActionChange?: (action: StkDockSendAction | null) => void;
};

function OnlineStkSection({
  methods,
  defaultAreaCode,
  defaultPhone,
  busy,
  stkMessage,
  stkSent,
  onPay,
  compact,
  promptDisabled,
  promptDisabledHint,
  amountDue,
  actionsInDock,
  onStkSendActionChange,
}: OnlineStkProps & { amountDue?: string | null }) {
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
    compact,
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
    <div
      className={cn(
        "min-w-0 max-w-full rounded-xl border border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--card))] ring-1 ring-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
        compact ? "space-y-1.5 p-1.5" : "space-y-3 p-4",
      )}
    >
      {!compact ? (
        <>
          <PaymentSectionHeading
            title="Pay with M-Pesa on your phone"
            amountDue={amountDue}
            compact={false}
            tone="primary"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Enter the number that should receive the M-Pesa prompt, then tap send. Approve the
            request on that phone to complete payment.
          </p>
        </>
      ) : (
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/90">
          M-Pesa
        </p>
      )}
      {promptDisabled ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {promptDisabledHint ??
            "Place your order first, then send the M-Pesa prompt to your phone."}
        </p>
      ) : null}
      <div
        className={cn(
          "gap-1.5",
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
            className={cn(CHECKOUT_INPUT, compact ? "h-9 px-2" : "")}
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            placeholder="+254"
            disabled={busy || stkSent}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={CHECKOUT_LABEL}>Phone</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn(CHECKOUT_INPUT, compact ? "h-9 px-2" : "")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="712 345 678"
            disabled={busy || stkSent}
          />
        </label>
        {compact && !actionsInDock
          ? methods.map((m) => (
              <Button
                key={m.configId}
                type="button"
                size="sm"
                className="h-9 shrink-0 rounded-xl px-3 text-xs font-semibold shadow-sm"
                disabled={busy || stkSent || !phoneValid || promptDisabled}
                onClick={() => onPay(m.configId, fullPhone)}
              >
                {busy ? "Sending…" : stkSent ? "Sent" : "Send prompt"}
              </Button>
            ))
          : null}
      </div>
      {!phoneValid && phone.trim() ? (
        <p className="text-[11px] text-destructive">Invalid number</p>
      ) : null}
      {!compact && !actionsInDock
        ? methods.map((m) => (
            <Button
              key={m.configId}
              type="button"
              size="sm"
              className="h-9 w-full rounded-lg text-xs font-semibold sm:w-auto sm:self-end"
              disabled={busy || stkSent || !phoneValid || promptDisabled}
              onClick={() => onPay(m.configId, fullPhone)}
            >
              {busy ? "Sending…" : stkSent ? "Prompt sent" : "Send prompt"}
            </Button>
          ))
        : null}
      {stkMessage ? (
        <p
          className={
            stkSent
              ? "text-xs font-medium text-primary"
              : "text-xs text-destructive"
          }
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
}: {
  manual: PublicPaymentInstruction[];
  online: PublicOnlinePaymentMethod[];
  /** Prefill for M-Pesa prompt (usually checkout contact phone). */
  defaultAreaCode?: string;
  defaultPhone?: string;
  stkBusy?: boolean;
  stkMessage?: string | null;
  stkSent?: boolean;
  onStkPay?: (configId: string, phoneNumber: string) => void;
  /** When false, STK send stays disabled until the order exists */
  orderPlaced?: boolean;
  /** Compact layout for the floating checkout stack */
  variant?: "default" | "floating";
  /** Shown beside payment headings (e.g. "How to pay") */
  amountDue?: string | null;
  /** Move M-Pesa send button into the dock action row (confirmation mobile) */
  actionsInDock?: boolean;
  onStkSendActionChange?: (action: StkDockSendAction | null) => void;
}) {
  const hasManual = manual.length > 0;
  const hasOnline = online.length > 0;
  const floating = variant === "floating";
  if (!hasManual && !hasOnline) return null;

  const stkPromptDisabled = hasOnline && !orderPlaced;
  const showManualFirst = floating && orderPlaced && hasManual;
  const dockActions = Boolean(actionsInDock && orderPlaced && floating);

  const manualBlock = hasManual ? (
    <div
      className={cn(
        floating
          ? cn("px-2 py-1.5", CHECKOUT_PAYMENT_PANEL)
          : cn("space-y-2.5 p-4", CHECKOUT_PAYMENT_PANEL),
      )}
    >
      {!floating ? (
        <PaymentSectionHeading
          title={
            hasOnline && onStkPay ? "Or pay manually" : "How to pay"
          }
          amountDue={amountDue}
          compact={false}
        />
      ) : null}
      {manual.map((pi) => (
        <ManualInstructionCard key={pi.configId} pi={pi} compact={floating} />
      ))}
    </div>
  ) : null;

  const onlineBlock =
    hasOnline && onStkPay ? (
      <OnlineStkSection
        methods={online}
        defaultAreaCode={defaultAreaCode}
        defaultPhone={defaultPhone}
        busy={stkBusy ?? false}
        stkMessage={stkMessage ?? null}
        stkSent={stkSent ?? false}
        onPay={onStkPay}
        compact={floating}
        amountDue={amountDue}
        promptDisabled={stkPromptDisabled}
        promptDisabledHint={
          stkPromptDisabled
            ? "Place your order first, then send the M-Pesa prompt to your phone."
            : undefined
        }
        actionsInDock={dockActions}
        onStkSendActionChange={onStkSendActionChange}
      />
    ) : null;

  return (
    <div className={cn("min-w-0 max-w-full", floating ? "space-y-1.5" : "space-y-3")}>
      {showManualFirst ? (
        <>
          {manualBlock}
          {onlineBlock}
        </>
      ) : (
        <>
          {onlineBlock}
          {manualBlock}
        </>
      )}
    </div>
  );
}

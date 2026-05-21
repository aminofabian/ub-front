"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  PublicOnlinePaymentMethod,
  PublicPaymentInstruction,
} from "@/lib/public-storefront";
import { buildStkPhoneNumber, isStkPhoneValid } from "@/lib/stk-phone";
import { cn } from "@/lib/utils";

function PaymentSectionHeading({
  title,
  amountDue,
  compact,
  tone = "emerald",
}: {
  title: string;
  amountDue?: string | null;
  compact?: boolean;
  tone?: "emerald" | "primary";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h3
        className={cn(
          "min-w-0 font-bold tracking-tight",
          tone === "primary"
            ? compact
              ? "text-[10px] uppercase tracking-[0.14em] text-primary/90"
              : "text-sm text-foreground"
            : compact
              ? "text-[10px] uppercase tracking-[0.14em] text-emerald-950 dark:text-emerald-100"
              : "text-sm text-emerald-950 dark:text-emerald-100",
        )}
      >
        {title}
      </h3>
      {amountDue ? (
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-bold uppercase tracking-[0.12em] text-muted-foreground",
              compact ? "text-[9px]" : "text-[10px]",
            )}
          >
            Amount due
          </p>
          <p
            className={cn(
              "font-serif font-semibold tabular-nums text-foreground",
              compact ? "text-sm leading-tight" : "text-base",
            )}
          >
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
  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/15 bg-background/90 shadow-sm ring-1 ring-emerald-500/10 dark:bg-emerald-950/30",
        compact ? "p-2.5" : "p-3",
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
      {pi.instructions ? (
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
}: OnlineStkProps & { amountDue?: string | null }) {
  const [areaCode, setAreaCode] = useState(defaultAreaCode);
  const [phone, setPhone] = useState(defaultPhone);

  useEffect(() => {
    setAreaCode(defaultAreaCode);
    setPhone(defaultPhone);
  }, [defaultAreaCode, defaultPhone]);

  if (methods.length === 0) return null;

  const phoneValid = isStkPhoneValid(areaCode, phone);
  const fullPhone = buildStkPhoneNumber(areaCode, phone);

  return (
    <div
      className={cn(
        "space-y-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] ring-1 ring-primary/10",
        compact ? "p-2.5" : "space-y-3 p-4",
      )}
    >
      <PaymentSectionHeading
        title={compact ? "M-Pesa prompt" : "Pay with M-Pesa on your phone"}
        amountDue={amountDue}
        compact={compact}
        variant="primary"
      />
      {!compact ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Enter the number that should receive the M-Pesa prompt, then tap send. Approve the
          request on that phone to complete payment.
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          We&apos;ll send a prompt to this number — approve it on your phone.
        </p>
      )}
      {promptDisabled && promptDisabledHint ? (
        <p className="rounded-lg border border-primary/20 bg-background/80 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
          {promptDisabledHint}
        </p>
      ) : null}
      <div
        className={cn(
          "grid gap-2",
          compact
            ? "grid-cols-[88px_minmax(0,1fr)]"
            : "grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[112px_minmax(0,1fr)]",
        )}
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
          Code
          <input
            type="text"
            inputMode="tel"
            autoComplete="tel-country-code"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            placeholder="+254"
            disabled={busy || stkSent}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
          M-Pesa phone number
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="712 345 678"
            disabled={busy || stkSent}
          />
        </label>
      </div>
      {!phoneValid && phone.trim() ? (
        <p className="text-xs text-destructive">Enter a valid Kenyan mobile number.</p>
      ) : null}
      {methods.map((m) => (
        <div
          key={m.configId}
          className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <Smartphone className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {m.label ?? m.displayName}
              </p>
              <p className="text-[11px] text-muted-foreground">{m.displayName}</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-10 shrink-0 rounded-xl px-4 text-sm font-semibold"
            disabled={busy || stkSent || !phoneValid || promptDisabled}
            onClick={() => onPay(m.configId, fullPhone)}
          >
            {busy ? "Sending…" : stkSent ? "Prompt sent" : "Send M-Pesa prompt"}
          </Button>
        </div>
      ))}
      {stkMessage ? (
        <p
          className={
            stkSent
              ? "text-xs font-medium text-emerald-700 dark:text-emerald-400"
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
}) {
  const hasManual = manual.length > 0;
  const hasOnline = online.length > 0;
  const floating = variant === "floating";
  if (!hasManual && !hasOnline) return null;

  const stkPromptDisabled = hasOnline && !orderPlaced;
  const showManualFirst = floating && orderPlaced && hasManual;

  const manualBlock = hasManual ? (
    <div
      className={cn(
        "space-y-2.5 rounded-xl border border-emerald-500/20 bg-linear-to-br from-emerald-50/90 to-emerald-50/30 dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-emerald-950/10",
        floating ? "p-2.5" : "space-y-3 p-4",
      )}
    >
      <PaymentSectionHeading
        title={
          floating && orderPlaced
            ? "Pay to till"
            : hasOnline && onStkPay
              ? "Or pay manually"
              : "How to pay"
        }
        amountDue={amountDue}
        compact={floating}
      />
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
            ? "Tap Complete purchase below — we'll send the M-Pesa prompt to this number right after your order is placed."
            : undefined
        }
      />
    ) : null;

  return (
    <div className={cn("space-y-3", floating && "space-y-2")}>
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

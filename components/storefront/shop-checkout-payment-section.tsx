"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  PublicOnlinePaymentMethod,
  PublicPaymentInstruction,
} from "@/lib/public-storefront";

function ManualInstructionCard({ pi }: { pi: PublicPaymentInstruction }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
      <p className="text-sm font-semibold text-foreground">{pi.label}</p>
      {pi.type === "till" && pi.tillNumber ? (
        <p className="mt-1 font-mono text-lg font-bold tracking-wide text-foreground">
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

/** Build E.164-style digits for STK (Kenya 254…). */
function buildStkPhoneNumber(areaCode: string, local: string): string {
  const digits = `${areaCode}${local}`.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return `254${digits}`;
}

function isStkPhoneValid(areaCode: string, local: string): boolean {
  const digits = buildStkPhoneNumber(areaCode, local);
  return digits.length >= 12 && digits.length <= 13;
}

type OnlineStkProps = {
  methods: PublicOnlinePaymentMethod[];
  defaultAreaCode: string;
  defaultPhone: string;
  busy: boolean;
  stkMessage: string | null;
  stkSent: boolean;
  onPay: (configId: string, phoneNumber: string) => void;
};

function OnlineStkSection({
  methods,
  defaultAreaCode,
  defaultPhone,
  busy,
  stkMessage,
  stkSent,
  onPay,
}: OnlineStkProps) {
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
    <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <h3 className="text-sm font-semibold text-foreground">Pay with M-Pesa on your phone</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Enter the number that should receive the M-Pesa prompt, then tap send. Approve the
        request on that phone to complete payment.
      </p>
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
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
            disabled={busy || stkSent || !phoneValid}
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
  showOnlineBeforeOrder = false,
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
  /** When true, explains online pay is available after placing the order */
  showOnlineBeforeOrder?: boolean;
}) {
  const hasManual = manual.length > 0;
  const hasOnline = online.length > 0;
  if (!hasManual && !hasOnline) return null;

  return (
    <div className="space-y-3">
      {hasOnline && showOnlineBeforeOrder ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">M-Pesa online:</span> after you place
          the order, use <span className="font-medium text-foreground">Send M-Pesa prompt</span> to
          pay on your phone ({online.map((m) => m.displayName).join(", ")}).
        </div>
      ) : null}

      {hasOnline && !showOnlineBeforeOrder && onStkPay ? (
        <OnlineStkSection
          methods={online}
          defaultAreaCode={defaultAreaCode}
          defaultPhone={defaultPhone}
          busy={stkBusy ?? false}
          stkMessage={stkMessage ?? null}
          stkSent={stkSent ?? false}
          onPay={onStkPay}
        />
      ) : null}

      {hasManual ? (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            {hasOnline ? "Or pay manually" : "How to pay"}
          </h3>
          {manual.map((pi) => (
            <ManualInstructionCard key={pi.configId} pi={pi} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

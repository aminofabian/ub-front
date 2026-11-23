"use client";

import { Loader2, Lock, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  BillingField,
  BillingQuoteCard,
  billingPhoneInputClass,
  formatBillingMoney,
} from "@/components/billing/billing-ui";
import { useOptionalDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  fetchSubscriptionRenewalOrderStatus,
  initiateSubscriptionRenewal,
  type SubscriptionRenewalQuoteRecord,
} from "@/lib/api";
import { clearLoginBillingGate } from "@/lib/auth";
import {
  formatKenyanPhoneDisplay,
  toKenyanMsisdn254,
} from "@/lib/kenyan-phone";
import { notifySubscriptionStatusChanged } from "@/lib/subscription-events";
import { cn } from "@/lib/utils";

type Props = {
  quote: SubscriptionRenewalQuoteRecord;
  canPay: boolean;
  onPaid?: () => void;
  compact?: boolean;
  /** `bar` drops the quote card so a sticky footer can show the amount. */
  presentation?: "card" | "bar";
  payLabel?: string;
  note?: string;
};

export function SubscriptionRenewalForm({
  quote,
  canPay,
  onPaid,
  compact = false,
  presentation = "card",
  payLabel,
  note,
}: Props) {
  const dashboard = useOptionalDashboard();
  const savedPhone = toKenyanMsisdn254(dashboard?.me?.phone ?? "") ?? "";
  const savedDisplay = formatKenyanPhoneDisplay(savedPhone);
  const [phone, setPhone] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<number | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const usingSaved = Boolean(savedPhone) && !editingPhone;

  useEffect(() => {
    return () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (editingPhone) phoneRef.current?.focus();
  }, [editingPhone]);

  const startPoll = (orderId: string) => {
    setPolling(true);
    pollRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const row = await fetchSubscriptionRenewalOrderStatus(orderId);
          if (row.status === "PAID") {
            if (pollRef.current != null) {
              window.clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setPolling(false);
            clearLoginBillingGate();
            toast.success("Subscription renewed — welcome back.");
            onPaid?.();
            window.location.assign("/business");
          } else if (row.status === "FAILED" || row.status === "EXPIRED") {
            if (pollRef.current != null) {
              window.clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setPolling(false);
            notifySubscriptionStatusChanged();
            toast.error("Payment did not complete. Try again.");
          }
        } catch {
          /* keep polling */
        }
      })();
    }, 3000);
  };

  const onPay = async () => {
    if (!canPay || submitting || polling) return;
    const trimmed = (usingSaved ? savedPhone : phone).trim();
    if (!trimmed) {
      toast.error("Enter your M-Pesa phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const row = await initiateSubscriptionRenewal({
        phone: trimmed,
        periodMonths: quote.periodMonths,
        tier: quote.tier,
      });
      if (row.status === "FAILED") {
        notifySubscriptionStatusChanged();
        toast.error(row.message || "Could not start M-Pesa payment.");
        return;
      }
      toast.message(row.message || "Check your phone to approve M-Pesa.");
      startPoll(row.orderId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const periodLabel =
    quote.periodMonths > 1
      ? `${quote.periodMonths} months · M-Pesa STK`
      : "1 month · M-Pesa STK";

  const savingsLabel =
    quote.savingsKes != null && quote.savingsKes > 0
      ? `Save ${formatBillingMoney(quote.savingsKes, quote.currency)} vs monthly`
      : null;

  const amountLabel = formatBillingMoney(quote.amountKes, quote.currency);
  const buttonLabel =
    payLabel ??
    (presentation === "bar"
      ? canPay
        ? `Pay ${amountLabel} with M-Pesa`
        : "Payment unavailable for your role"
      : "Pay with M-Pesa");

  return (
    <div className={cn(compact || presentation === "bar" ? "space-y-3" : "space-y-5")}>
      {presentation === "card" ? (
        <BillingQuoteCard
          compact={compact}
          planName={`${quote.tierDisplayName} plan`}
          amountLabel={formatBillingMoney(quote.amountKes, quote.currency)}
          periodLabel={periodLabel}
          savingsLabel={savingsLabel}
        />
      ) : null}

      {canPay ? (
        <div className="space-y-4">
          {usingSaved ? (
            <div className="flex items-center justify-between gap-3 border border-[var(--op-rule)] bg-[var(--op-bg)] px-3 py-2.5">
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-[var(--op-muted)]">
                  M-Pesa phone
                </span>
                <span className="mt-0.5 block truncate text-sm tabular-nums text-[var(--op-ink)]">
                  {savedDisplay}
                </span>
              </span>
              <button
                type="button"
                className="shrink-0 text-[13px] font-medium text-[var(--op-accent)] underline-offset-2 hover:underline disabled:opacity-50"
                disabled={submitting || polling}
                onClick={() => {
                  setPhone("");
                  setEditingPhone(true);
                }}
              >
                Use a different number
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <BillingField label="M-Pesa phone">
                <div className="relative">
                  <Smartphone
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
                    aria-hidden
                  />
                  <input
                    ref={phoneRef}
                    type="tel"
                    className={cn(billingPhoneInputClass(submitting || polling), "pl-9")}
                    placeholder="2547…"
                    value={phone}
                    disabled={submitting || polling}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </BillingField>
              {savedPhone ? (
                <button
                  type="button"
                  className="text-[13px] font-medium text-[var(--op-accent)] underline-offset-2 hover:underline disabled:opacity-50"
                  disabled={submitting || polling}
                  onClick={() => setEditingPhone(false)}
                >
                  Use {savedDisplay}
                </button>
              ) : null}
            </div>
          )}
          <Button
            type="button"
            className="h-11 w-full rounded-[2px] text-[15px] active:scale-[0.99]"
            disabled={submitting || polling}
            onClick={() => void onPay()}
          >
            {submitting || polling ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {polling ? "Waiting for M-Pesa…" : "Sending STK…"}
              </>
            ) : (
              buttonLabel
            )}
          </Button>
          <p
            className="text-center text-xs leading-relaxed text-[var(--op-muted)]"
          >
            {note ??
              (presentation === "bar"
                ? "The new period starts when payment lands. Days you have already paid for are added on."
                : "Approve the STK prompt on your phone. Access restores automatically after payment.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="flex items-start gap-2.5 border border-[var(--op-rule)] px-3 py-2.5 text-[13px] leading-snug text-[var(--op-ink)]">
            <Lock className="mt-0.5 size-4 shrink-0 text-[var(--op-highlight)]" aria-hidden />
            Ask a business owner to renew. This account cannot start a payment.
          </p>
          {presentation === "bar" ? (
            <button
              type="button"
              disabled
              className="h-11 w-full rounded-[2px] bg-[var(--muted)] text-[15px] font-medium text-[var(--muted-foreground)]"
            >
              {buttonLabel}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

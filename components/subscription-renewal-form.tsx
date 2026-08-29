"use client";

import { Loader2, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  BillingField,
  BillingQuoteCard,
  billingPhoneInputClass,
  formatBillingMoney,
} from "@/components/billing/billing-ui";
import { Button } from "@/components/ui/button";
import {
  fetchSubscriptionRenewalOrderStatus,
  initiateSubscriptionRenewal,
  type SubscriptionRenewalQuoteRecord,
} from "@/lib/api";
import { clearLoginBillingGate } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Props = {
  quote: SubscriptionRenewalQuoteRecord;
  canPay: boolean;
  onPaid?: () => void;
  compact?: boolean;
};

export function SubscriptionRenewalForm({
  quote,
  canPay,
  onPaid,
  compact = false,
}: Props) {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

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
    const trimmed = phone.trim();
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

  return (
    <div className={cn(compact ? "space-y-3" : "space-y-5")}>
      <BillingQuoteCard
        compact={compact}
        planName={`${quote.tierDisplayName} plan`}
        amountLabel={formatBillingMoney(quote.amountKes, quote.currency)}
        periodLabel={periodLabel}
        savingsLabel={savingsLabel}
      />

      {canPay ? (
        <div className="space-y-4">
          <BillingField label="M-Pesa phone">
            <div className="relative">
              <Smartphone
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
                aria-hidden
              />
              <input
                type="tel"
                className={cn(billingPhoneInputClass(submitting || polling), "pl-9")}
                placeholder="2547…"
                value={phone}
                disabled={submitting || polling}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </BillingField>
          <Button
            type="button"
            className="h-11 w-full active:scale-[0.99]"
            disabled={submitting || polling}
            onClick={() => void onPay()}
          >
            {submitting || polling ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {polling ? "Waiting for M-Pesa…" : "Sending STK…"}
              </>
            ) : (
              "Pay with M-Pesa"
            )}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Approve the STK prompt on your phone. Access restores automatically
            after payment.
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Ask a business owner to renew — your account cannot initiate payments.
        </p>
      )}
    </div>
  );
}

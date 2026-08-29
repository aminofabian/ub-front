"use client";

import { CreditCard, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { BillingSurface } from "@/components/billing/billing-ui";
import { SubscriptionRenewalForm } from "@/components/subscription-renewal-form";
import { Button } from "@/components/ui/button";
import {
  fetchMe,
  fetchSubscriptionBillingStatus,
  fetchSubscriptionRenewalQuote,
  logoutRemoteAndRedirectToLogin,
} from "@/lib/api";
import {
  clearLoginBillingGate,
  getLoginBillingGate,
  type AuthBillingGate,
} from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

/**
 * Full-screen renewal wall when the tenant is billing-suspended
 * (SUBSCRIPTION_BILLING_SCOPE.md §8).
 */
export function SubscriptionRenewalWall() {
  const [gate, setGate] = useState<AuthBillingGate | null>(null);
  const [loading, setLoading] = useState(true);
  const [canPay, setCanPay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) {
          setCanPay(hasPermission(me.permissions, Permission.BusinessManageSubscription));
        }
      } catch {
        if (!cancelled) setCanPay(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = getLoginBillingGate();
      if (stored?.subscriptionBillingStatus === "SUSPENDED") {
        if (!cancelled) {
          setGate(stored);
          setLoading(false);
        }
        return;
      }
      try {
        const status = await fetchSubscriptionBillingStatus();
        if (
          !cancelled &&
          status.billingEnabled &&
          status.status === "SUSPENDED"
        ) {
          const quote = await fetchSubscriptionRenewalQuote(1);
          setGate({
            subscriptionBillingStatus: "SUSPENDED",
            suspensionReason: "BILLING_UNPAID",
            renewalQuote: quote,
          });
        } else if (!cancelled) {
          setGate(null);
        }
      } catch {
        if (!cancelled) setGate(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !gate || gate.subscriptionBillingStatus !== "SUSPENDED") {
    return null;
  }

  const quote = gate.renewalQuote;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-renewal-title"
    >
      <BillingSurface className="w-full max-w-md shadow-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="mb-5 flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/15">
            <CreditCard className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2
              id="subscription-renewal-title"
              className="font-heading text-xl font-semibold tracking-tight"
            >
              Subscription suspended
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Grace has ended and Kiosk is paused for this business. Renew to
              restore access — your data is safe.
            </p>
          </div>
        </div>

        <SubscriptionRenewalForm
          quote={quote}
          canPay={canPay}
          compact
          onPaid={() => {
            clearLoginBillingGate();
            setGate(null);
          }}
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground active:scale-[0.98]"
            onClick={() => void logoutRemoteAndRedirectToLogin()}
          >
            <LogOut className="size-3.5" aria-hidden />
            Log out
          </Button>
          <p className="text-xs text-muted-foreground">Need help? Contact support.</p>
        </div>
      </BillingSurface>
    </div>
  );
}

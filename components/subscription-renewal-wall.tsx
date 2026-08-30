"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { SubscriptionRenewalForm } from "@/components/subscription-renewal-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchMe,
  fetchSubscriptionBillingStatus,
  fetchSubscriptionRenewalQuote,
  logoutRemoteAndRedirectToLogin,
  type SubscriptionBillingStatusRecord,
  type SubscriptionRenewalQuoteRecord,
} from "@/lib/api";
import {
  clearLoginBillingGate,
  getLoginBillingGate,
} from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { isBillingAccessLocked } from "@/lib/subscription-plan-fit";

/**
 * Blocking renewal modal when grace ends or the tenant is already
 * billing-suspended (SUBSCRIPTION_BILLING_SCOPE.md §8).
 */
export function SubscriptionRenewalWall() {
  const [status, setStatus] = useState<SubscriptionBillingStatusRecord | null>(
    null,
  );
  const [quote, setQuote] = useState<SubscriptionRenewalQuoteRecord | null>(
    null,
  );
  const [canPay, setCanPay] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [loginSuspended] = useState(() => {
    const stored = getLoginBillingGate();
    return stored?.subscriptionBillingStatus === "SUSPENDED";
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) {
          setCanPay(
            hasPermission(me.permissions, Permission.BusinessManageSubscription),
          );
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
          setQuote(stored.renewalQuote);
        }
      }
      try {
        const row = await fetchSubscriptionBillingStatus();
        if (!cancelled) setStatus(row);
      } catch {
        if (!cancelled) setStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locked =
    loginSuspended ||
    (status != null &&
      isBillingAccessLocked(
        {
          status: status.status,
          billingEnabled: status.billingEnabled,
          graceEndsAt: status.graceEndsAt,
          currentPeriodEnd: status.currentPeriodEnd,
        },
        now,
      ));

  useEffect(() => {
    if (locked) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [locked]);

  useEffect(() => {
    if (!locked || quote) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchSubscriptionRenewalQuote(1);
        if (!cancelled) setQuote(row);
      } catch {
        if (!cancelled) setQuote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locked, quote]);

  if (!locked) {
    return null;
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[200]"
        className="z-[201] gap-5 border-orange-200/80 bg-orange-50 p-5 sm:p-6 dark:border-orange-500/25 dark:bg-orange-950/90"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div>
          <DialogTitle className="font-sans text-lg font-semibold tracking-[-0.02em] text-orange-950 dark:text-orange-50">
            Your subscription has expired
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed text-orange-950/65 dark:text-orange-100/70">
            The 15-day grace period has ended and Kiosk is paused for this
            shop. Renew to restore access — your data is safe.
          </DialogDescription>
        </div>

        {quote ? (
          <SubscriptionRenewalForm
            quote={quote}
            canPay={canPay}
            compact
            onPaid={() => {
              clearLoginBillingGate();
              setStatus(null);
              setQuote(null);
            }}
          />
        ) : (
          <p className="text-sm text-orange-950/60 dark:text-orange-100/65">
            Loading the amount due…
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-950/10 pt-4 dark:border-orange-100/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-orange-950/60 hover:bg-orange-950/5 hover:text-orange-950 dark:text-orange-100/60"
            onClick={() => void logoutRemoteAndRedirectToLogin()}
          >
            <LogOut className="size-3.5" aria-hidden />
            Log out
          </Button>
          <p className="text-xs text-orange-950/50 dark:text-orange-100/50">
            Need help? Contact support.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

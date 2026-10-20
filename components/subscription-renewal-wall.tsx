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
import { useSubscriptionBillingStatus } from "@/hooks/use-subscription-billing-status";
import {
  fetchMe,
  fetchSubscriptionRenewalQuote,
  logoutRemoteAndRedirectToLogin,
  type SubscriptionRenewalQuoteRecord,
} from "@/lib/api";
import {
  clearLoginBillingGate,
  getLoginBillingGate,
} from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { IS_DESKTOP } from "@/lib/runtime";
import { shareInflight } from "@/lib/share-inflight";
import { SUBSCRIPTION_BLOCKED_EVENT } from "@/lib/subscription-events";

/**
 * Blocking renewal modal when grace ends or the tenant is already
 * billing-suspended (SUBSCRIPTION_BILLING_SCOPE.md §8).
 *
 * Hidden on desktop — SaaS billing walls do not apply to the offline till;
 * license/plan live under Settings → Desktop.
 */
export function SubscriptionRenewalWall() {
  const { status } = useSubscriptionBillingStatus();
  const [quote, setQuote] = useState<SubscriptionRenewalQuoteRecord | null>(
    null,
  );
  const [canPay, setCanPay] = useState(false);
  const [loginSuspended, setLoginSuspended] = useState(() => {
    const stored = getLoginBillingGate();
    return stored?.subscriptionBillingStatus === "SUSPENDED";
  });

  useEffect(() => {
    if (IS_DESKTOP) return;
    let cancelled = false;
    // Gate sits next to (not under) DashboardProvider — share /me with session bootstrap.
    void shareInflight("session/me", () => fetchMe({ toast: false }))
      .then((me) => {
        if (!cancelled) {
          setCanPay(
            hasPermission(
              me.permissions,
              Permission.BusinessManageSubscription,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setCanPay(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (IS_DESKTOP) return;
    const stored = getLoginBillingGate();
    if (stored?.subscriptionBillingStatus === "SUSPENDED") {
      setQuote(stored.renewalQuote);
    }
  }, []);

  useEffect(() => {
    if (IS_DESKTOP || !status) return;
    if (!status.accessBlocked) {
      // Super Admin may have switched automatic blocking off while the gate
      // was stored. Release the wall without a re-login.
      clearLoginBillingGate();
      setLoginSuspended(false);
      setQuote(null);
    }
  }, [status]);

  useEffect(() => {
    if (IS_DESKTOP) return;
    // The request layer fires this when an API call is rejected for billing.
    // Show the wall immediately even if the status fetch is slow.
    const onBlocked = () => setLoginSuspended(true);
    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, onBlocked);
    return () => {
      window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, onBlocked);
    };
  }, []);

  const locked =
    !IS_DESKTOP &&
    (status != null ? status.accessBlocked : loginSuspended);

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

  if (IS_DESKTOP || !locked) {
    return null;
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[200]"
        className="z-[201] gap-5 border-rose-200/80 bg-rose-50 p-5 sm:p-6 dark:border-rose-500/25 dark:bg-rose-950/90"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div>
          <DialogTitle className="font-sans text-lg font-semibold tracking-[-0.02em] text-rose-950 dark:text-rose-50">
            {status?.status === "SUSPENDED"
              ? "Subscription paused"
              : "Grace period ended"}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed text-rose-950/65 dark:text-rose-100/70">
            This shop is paused because its subscription expired. Renew below
            to restore access — your data is safe.
          </DialogDescription>
        </div>

        {quote ? (
          <SubscriptionRenewalForm
            quote={quote}
            canPay={canPay}
            compact
            onPaid={() => {
              clearLoginBillingGate();
              setLoginSuspended(false);
              setQuote(null);
            }}
          />
        ) : (
          <p className="text-sm text-rose-950/60 dark:text-rose-100/65">
            Loading the amount due…
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rose-950/10 pt-4 dark:border-rose-100/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-rose-950/60 hover:bg-rose-950/5 hover:text-rose-950 dark:text-rose-100/60"
            onClick={() => void logoutRemoteAndRedirectToLogin()}
          >
            <LogOut className="size-3.5" aria-hidden />
            Log out
          </Button>
          <p className="text-xs text-rose-950/50 dark:text-rose-100/50">
            Need help? Contact support.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

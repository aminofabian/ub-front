"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import {
  BillingAlertBanner,
  BillingStatPill,
} from "@/components/billing/billing-ui";
import { Button } from "@/components/ui/button";
import {
  fetchSubscriptionBillingStatus,
  type SubscriptionBillingStatusRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

/**
 * Sticky grace-period banner — visible on all dashboard routes while the
 * subscription is in GRACE (SUBSCRIPTION_BILLING_SCOPE.md §6).
 */
export function SubscriptionGraceBanner() {
  const [status, setStatus] = useState<SubscriptionBillingStatusRecord | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
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

  if (!status?.billingEnabled || status.status !== "GRACE") {
    return null;
  }

  if (status.planFit?.needsUpgrade) {
    return null;
  }

  const urgent = status.daysRemainingInGrace <= 3;
  const daysAgo = Math.max(1, status.daysSinceExpiry);
  const daysRemaining = Math.max(1, status.daysRemainingInGrace);
  const pillTone = urgent ? "critical" : "warning";

  return (
    <BillingAlertBanner
      variant={urgent ? "critical" : "warning"}
      icon={Clock}
      title="Subscription in grace period"
      description="Full access continues during grace. Renew before suspension to avoid staff lockout."
      meta={
        <>
          <BillingStatPill
            label="Expired"
            value={`${daysAgo}d ago`}
            tone={pillTone}
          />
          <BillingStatPill
            label="Remaining"
            value={`${daysRemaining}d left`}
            tone={pillTone}
          />
        </>
      }
      action={
        <Button
          type="button"
          className="h-8 w-full rounded-md bg-foreground px-3 text-background hover:bg-foreground/90 hover:text-background active:scale-[0.97] sm:w-auto"
          asChild
        >
          <Link href={APP_ROUTES.billingRenew}>Renew subscription</Link>
        </Button>
      }
    />
  );
}

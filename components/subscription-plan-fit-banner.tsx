"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { useEffect, useState } from "react";

import {
  BillingAlertBanner,
  BillingUsageMeter,
} from "@/components/billing/billing-ui";
import { Button } from "@/components/ui/button";
import {
  fetchSubscriptionBillingStatus,
  type SubscriptionBillingStatusRecord,
} from "@/lib/api";
import {
  planFitBody,
  planFitCta,
  planFitHeadline,
  planFitHref,
  planFitSevere,
} from "@/lib/subscription-plan-fit";

const DISMISS_KEY = "ub.planFit.dismissedTier";

/**
 * Shown on every dashboard route when live usage no longer fits the
 * subscribed plan. Picks the cheapest published plan that does.
 */
export function SubscriptionPlanFitBanner() {
  const [status, setStatus] = useState<SubscriptionBillingStatusRecord | null>(
    null,
  );
  const [dismissedTier, setDismissedTier] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = sessionStorage.getItem(DISMISS_KEY);
      if (!cancelled) setDismissedTier(stored);
    } catch {
      /* private mode */
    }
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

  const fit = status?.planFit;
  if (!fit?.needsUpgrade) {
    return null;
  }

  const recommendedKey = fit.recommendedTier ?? "negotiable";
  if (dismissedTier === recommendedKey && !planFitSevere(fit)) {
    return null;
  }

  const currentName = status?.tierDisplayName?.trim() || status?.tier || "this plan";
  const href = planFitHref(fit);
  const severe = planFitSevere(fit);

  return (
    <BillingAlertBanner
      variant={severe ? "critical" : "warning"}
      icon={Package}
      title={planFitHeadline(currentName, fit)}
      description={planFitBody(currentName, fit)}
      meta={
        <>
          <BillingUsageMeter
            label="Products"
            used={fit.productCount}
            limit={fit.productLimit}
            unit="products"
          />
          <BillingUsageMeter
            label="People"
            used={fit.userCount}
            limit={fit.userLimit}
            unit="people"
          />
        </>
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          {!severe ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                try {
                  sessionStorage.setItem(DISMISS_KEY, recommendedKey);
                } catch {
                  /* ignore */
                }
                setDismissedTier(recommendedKey);
              }}
            >
              Later
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={severe ? "destructive" : "secondary"}
            className="h-8 active:scale-[0.98]"
            asChild
          >
            <Link href={href}>{planFitCta(fit)}</Link>
          </Button>
        </div>
      }
    />
  );
}

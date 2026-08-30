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
      variant="orange"
      icon={Package}
      title={planFitHeadline(currentName, fit)}
      description={planFitBody(currentName, fit)}
      meta={
        <>
          <BillingUsageMeter
            compact
            label="Products"
            used={fit.productCount}
            limit={fit.productLimit}
            unit="products"
          />
          <BillingUsageMeter
            compact
            label="People"
            used={fit.userCount}
            limit={fit.userLimit}
            unit="people"
          />
        </>
      }
      action={
        <div className="flex w-full items-center gap-1 sm:w-auto">
          {!severe ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-orange-950/65 hover:bg-orange-950/5 hover:text-orange-950"
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
            className="h-7 w-full rounded-md bg-orange-700 px-2.5 text-xs font-semibold text-white shadow-none transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-orange-800 hover:text-white focus-visible:ring-orange-700/35 active:scale-[0.97] sm:w-auto"
            asChild
          >
            <Link href={href}>{planFitCta(fit)}</Link>
          </Button>
        </div>
      }
    />
  );
}

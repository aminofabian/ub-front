"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  fetchSubscriptionBillingStatus,
  type SubscriptionBillingStatusRecord,
} from "@/lib/api";
import {
  formatPlanCount,
  planFitBody,
  planFitCta,
  planFitHeadline,
  planFitHref,
  planFitSevere,
} from "@/lib/subscription-plan-fit";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "ub.planFit.dismissedTier";

function FitCount({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const over = limit != null && used > limit;
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "font-sans text-[1.35rem] font-semibold leading-none tracking-[-0.03em] tabular-nums",
          over ? "text-orange-700 dark:text-orange-300" : "text-orange-950 dark:text-orange-50",
        )}
      >
        {formatPlanCount(used)}
      </p>
      <p className="mt-1 text-[11px] leading-none text-orange-950/50 dark:text-orange-100/50">
        {label}
        {limit != null ? (
          <span className="text-orange-950/35 dark:text-orange-100/40">
            {" "}
            of {formatPlanCount(limit)}
          </span>
        ) : null}
      </p>
    </div>
  );
}

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
    <div className="shrink-0 px-3 pt-2">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "relative rounded-xl",
          "border border-orange-500/20 bg-[#FFF7ED]",
          "shadow-[0_1px_0_rgba(234,88,12,0.08),0_10px_28px_-18px_rgba(194,65,12,0.45)]",
          "dark:border-orange-500/25 dark:bg-orange-950/45",
          "motion-safe:transition-[opacity,transform] motion-safe:duration-200",
          "motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]",
          "motion-safe:starting:translate-y-1.5 motion-safe:starting:opacity-0",
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-500/0 via-orange-400/50 to-orange-500/0"
          aria-hidden
        />
        <div className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-5 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-orange-600 text-white sm:mt-0",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(154,52,18,0.28)]",
                "dark:bg-orange-500",
              )}
            >
              <Package className="size-4" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-sans text-[13px] font-semibold leading-snug tracking-[-0.02em] text-orange-950 dark:text-orange-50">
                {planFitHeadline(currentName, fit)}
              </p>
              <p className="mt-0.5 max-w-md text-xs leading-snug text-orange-950/60 dark:text-orange-100/65">
                {planFitBody(currentName, fit)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6 pl-12 sm:items-center sm:pl-0">
            <FitCount
              label="products"
              used={fit.productCount}
              limit={fit.productLimit}
            />
            <FitCount
              label="people"
              used={fit.userCount}
              limit={fit.userLimit}
            />
          </div>

          <div className="flex w-full items-center gap-1 pl-12 sm:w-auto sm:pl-0">
            {!severe ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-orange-950/55 hover:bg-orange-950/5 hover:text-orange-950"
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
              className={cn(
                "h-8 w-full gap-1 rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white shadow-none",
                "transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                "hover:bg-orange-700 hover:text-white",
                "focus-visible:ring-orange-600/35",
                "active:scale-[0.97] sm:w-auto",
                "dark:bg-orange-500 dark:hover:bg-orange-400",
              )}
              asChild
            >
              <Link href={href}>
                {planFitCta(fit)}
                <ArrowRight className="size-3.5 opacity-90" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

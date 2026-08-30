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
  formatLockInstant,
  planFitBody,
  planFitCta,
  planFitHeadline,
  planFitHref,
  planFitSevere,
  planLockDeadline,
  remainingUntil,
} from "@/lib/subscription-plan-fit";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "ub.planFit.dismissedTier";

function pad2(value: number): string {
  return value < 100 ? String(value).padStart(2, "0") : String(value);
}

function ClockUnit({
  value,
  short,
  label,
}: {
  value: number;
  short: string;
  label: string;
}) {
  return (
    <div className="flex items-baseline gap-px sm:min-w-[1.7rem] sm:flex-col sm:items-center sm:gap-0.5">
      <span className="font-sans text-[13px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-orange-800 sm:text-lg dark:text-orange-200">
        {pad2(value)}
      </span>
      <span className="text-[8px] font-semibold leading-none tracking-[0.16em] text-orange-950/45 uppercase sm:text-[9px] dark:text-orange-100/45">
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </div>
  );
}

function ClockColon() {
  return (
    <span
      aria-hidden
      className="hidden pb-[0.85rem] text-sm font-medium leading-none text-orange-950/25 sm:inline dark:text-orange-100/30"
    >
      :
    </span>
  );
}

function LockClock({
  deadline,
}: {
  deadline: { at: string; kind: "lock" | "grace" };
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = remainingUntil(deadline.at, now);
  const showSeconds = parts.days === 0;
  const lockLabel = formatLockInstant(deadline.at);
  const locking = deadline.kind === "lock";

  const caption = parts.locked
    ? locking
      ? "Locking now"
      : "Grace starting"
    : locking
      ? `Locks ${lockLabel}`
      : `Grace ${lockLabel}`;

  return (
    <div className="shrink-0">
      <div
        role="timer"
        aria-label={
          parts.locked
            ? caption
            : `${parts.days} days ${parts.hours} hours ${parts.minutes} minutes remaining. ${caption}`
        }
        className="flex items-baseline gap-1 sm:items-end sm:gap-1.5"
      >
        {parts.days > 0 ? (
          <>
            <ClockUnit value={parts.days} short="D" label="days" />
            <ClockColon />
          </>
        ) : null}
        <ClockUnit value={parts.hours} short="H" label="hrs" />
        <ClockColon />
        <ClockUnit value={parts.minutes} short="M" label="min" />
        {showSeconds ? (
          <>
            <ClockColon />
            <ClockUnit value={parts.seconds} short="S" label="sec" />
          </>
        ) : null}
      </div>
      <p className="mt-1 hidden text-[10px] font-semibold leading-none tracking-[0.14em] text-orange-950/50 uppercase sm:block dark:text-orange-100/50">
        {caption}
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
  const inGrace = status?.status === "GRACE";
  if (dismissedTier === recommendedKey && !planFitSevere(fit) && !inGrace) {
    return null;
  }

  const currentName = status?.tierDisplayName?.trim() || status?.tier || "this plan";
  const href = planFitHref(fit);
  const severe = planFitSevere(fit);
  const deadline = status
    ? planLockDeadline({
        status: status.status,
        graceEndsAt: status.graceEndsAt,
        currentPeriodEnd: status.currentPeriodEnd,
      })
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="shrink-0 border-b border-orange-200/90 bg-orange-50 text-orange-950 selection:bg-orange-200/80 dark:border-orange-500/25 dark:bg-orange-950/35 dark:text-orange-50"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 sm:gap-6 sm:px-5 sm:py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <Package
              className="hidden size-4 shrink-0 text-orange-700 sm:block dark:text-orange-300"
              strokeWidth={2}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate font-sans text-[12px] font-semibold leading-none tracking-[-0.015em] sm:text-[13px] sm:leading-snug">
                {planFitHeadline(currentName, fit)}
              </p>
              <p className="mt-0.5 hidden max-w-xl text-xs leading-snug text-orange-950/65 sm:block dark:text-orange-100/70">
                {planFitBody(currentName, fit)}
              </p>
            </div>
          </div>

          {deadline ? <LockClock deadline={deadline} /> : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:border-l sm:border-orange-950/10 sm:pl-5 dark:sm:border-orange-100/12">
          {!severe && !inGrace ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="hidden h-8 px-2 text-[10px] font-semibold tracking-[0.14em] text-orange-950/55 uppercase hover:bg-orange-950/5 hover:text-orange-950 sm:inline-flex dark:text-orange-100/55 dark:hover:bg-orange-100/10 dark:hover:text-orange-50"
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
              "h-7 gap-0.5 rounded-md bg-orange-700 px-2 text-[10px] font-semibold tracking-[0.12em] text-white uppercase shadow-none sm:h-8 sm:gap-1 sm:px-3 sm:text-[11px] sm:tracking-[0.14em]",
              "transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
              "hover:bg-orange-800 hover:text-white",
              "focus-visible:ring-orange-700/35",
              "active:scale-[0.97]",
              "dark:bg-orange-500 dark:hover:bg-orange-400",
            )}
            asChild
          >
            <Link href={href}>
              <span className="sm:hidden">
                {fit.recommendedDisplayName?.trim() ||
                  (fit.talkToUs || fit.negotiable ? "Talk" : "Upgrade")}
              </span>
              <span className="hidden sm:inline">{planFitCta(fit)}</span>
              <ArrowRight className="size-3 opacity-90 sm:size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

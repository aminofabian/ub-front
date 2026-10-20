"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Clock3,
  CreditCard,
  LockKeyhole,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSubscriptionBillingStatus } from "@/hooks/use-subscription-billing-status";
import {
  resolveSubscriptionBanner,
  type SubscriptionBannerIcon,
  type SubscriptionBannerTone,
} from "@/lib/subscription-banner";
import { IS_DESKTOP } from "@/lib/runtime";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "ub.subscriptionBanner.dismissed";

const ICONS: Record<SubscriptionBannerIcon, LucideIcon> = {
  calendar: CalendarClock,
  clock: Clock3,
  lock: LockKeyhole,
  card: CreditCard,
  alert: AlertTriangle,
};

const TONES: Record<
  SubscriptionBannerTone,
  {
    shell: string;
    bar: string;
    icon: string;
    eyebrow: string;
    chip: string;
    cta: string;
    dismiss: string;
  }
> = {
  notice: {
    shell:
      "border-emerald-200/80 bg-emerald-50/85 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-950/35 dark:text-emerald-50",
    bar: "bg-emerald-600/70",
    icon:
      "border-emerald-700/20 bg-white/70 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-900/30 dark:text-emerald-200",
    eyebrow: "text-emerald-800/75 dark:text-emerald-200/75",
    chip:
      "border-emerald-800/15 bg-white/55 text-emerald-900/75 dark:border-emerald-200/15 dark:bg-emerald-950/30 dark:text-emerald-100/75",
    cta:
      "border border-emerald-800/20 bg-white/75 text-emerald-950 hover:bg-white dark:border-emerald-200/20 dark:bg-emerald-950/30 dark:text-emerald-50 dark:hover:bg-emerald-950/50",
    dismiss:
      "text-emerald-900/45 hover:bg-emerald-900/5 hover:text-emerald-900 dark:text-emerald-100/50 dark:hover:bg-emerald-100/10",
  },
  warning: {
    shell:
      "border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-50",
    bar: "bg-amber-500",
    icon:
      "border-amber-700/20 bg-white/70 text-amber-700 dark:border-amber-300/20 dark:bg-amber-900/30 dark:text-amber-200",
    eyebrow: "text-amber-800/75 dark:text-amber-200/75",
    chip:
      "border-amber-800/15 bg-white/55 text-amber-900/75 dark:border-amber-200/15 dark:bg-amber-950/30 dark:text-amber-100/75",
    cta:
      "border border-amber-800/15 bg-amber-600 text-white hover:bg-amber-700 dark:border-amber-300/20 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400",
    dismiss:
      "text-amber-900/45 hover:bg-amber-900/5 hover:text-amber-900 dark:text-amber-100/50 dark:hover:bg-amber-100/10",
  },
  critical: {
    shell:
      "border-rose-300/80 bg-rose-50 text-rose-950 dark:border-rose-500/25 dark:bg-rose-950/40 dark:text-rose-50",
    bar: "bg-rose-600",
    icon:
      "border-rose-700/20 bg-white/70 text-rose-700 dark:border-rose-300/20 dark:bg-rose-900/30 dark:text-rose-200",
    eyebrow: "text-rose-800/75 dark:text-rose-200/75",
    chip:
      "border-rose-800/15 bg-white/55 text-rose-900/75 dark:border-rose-200/15 dark:bg-rose-950/30 dark:text-rose-100/75",
    cta:
      "border border-rose-800/15 bg-rose-700 text-white hover:bg-rose-800 dark:border-rose-300/20 dark:bg-rose-500 dark:text-rose-950 dark:hover:bg-rose-400",
    dismiss:
      "text-rose-900/45 hover:bg-rose-900/5 hover:text-rose-900 dark:text-rose-100/50 dark:hover:bg-rose-100/10",
  },
  payment: {
    shell:
      "border-orange-300/80 bg-orange-50 text-orange-950 dark:border-orange-500/25 dark:bg-orange-950/40 dark:text-orange-50",
    bar: "bg-orange-500",
    icon:
      "border-orange-700/20 bg-white/70 text-orange-700 dark:border-orange-300/20 dark:bg-orange-900/30 dark:text-orange-200",
    eyebrow: "text-orange-800/75 dark:text-orange-200/75",
    chip:
      "border-orange-800/15 bg-white/55 text-orange-900/75 dark:border-orange-200/15 dark:bg-orange-950/30 dark:text-orange-100/75",
    cta:
      "border border-orange-800/15 bg-orange-700 text-white hover:bg-orange-800 dark:border-orange-300/20 dark:bg-orange-500 dark:text-orange-950 dark:hover:bg-orange-400",
    dismiss:
      "text-orange-900/45 hover:bg-orange-900/5 hover:text-orange-900 dark:text-orange-100/50 dark:hover:bg-orange-100/10",
  },
};

/**
 * Single source of truth for subscription notices in the shell. Renders at most
 * one state, hides itself on the billing page, and only lets the low-urgency
 * "renewal coming up" notice be dismissed.
 */
export function SubscriptionStatusBanner() {
  const pathname = usePathname();
  const { status } = useSubscriptionBillingStatus();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedKey(sessionStorage.getItem(DISMISS_KEY));
    } catch {
      /* private mode */
    }
  }, []);

  const banner = useMemo(() => resolveSubscriptionBanner(status), [status]);

  if (IS_DESKTOP) return null;
  if (!banner) return null;
  if (pathname?.startsWith("/business/billing")) return null;
  if (banner.dismissible && dismissedKey === banner.key) return null;

  const tone = TONES[banner.tone];
  const Icon = ICONS[banner.icon];

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, banner.key);
    } catch {
      /* ignore */
    }
    setDismissedKey(banner.key);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative shrink-0 overflow-hidden border-b",
        tone.shell,
      )}
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-[3px]", tone.bar)}
        aria-hidden
      />
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-2.5">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center sm:gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border shadow-[0_1px_2px_rgba(18,26,22,0.06)] sm:mt-0",
              tone.icon,
            )}
          >
            <Icon className="size-[15px]" strokeWidth={2.1} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-[0.16em] sm:text-[9.5px]",
                  tone.eyebrow,
                )}
              >
                {banner.eyebrow}
              </span>
              {banner.meta.map((item) => (
                <span
                  key={item}
                  className={cn(
                    "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.03em]",
                    tone.chip,
                  )}
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug tracking-[-0.015em] sm:text-[13px]">
              {banner.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug opacity-70 sm:max-w-3xl sm:text-[11.5px]">
              {banner.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pl-[2.6rem] sm:pl-0">
          {banner.dismissible ? (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss renewal reminder"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full transition-colors",
                tone.dismiss,
              )}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-8 gap-1 rounded-lg px-3 text-[11px] font-semibold tracking-[-0.01em] shadow-none active:scale-[0.98]",
              tone.cta,
            )}
            asChild
          >
            <Link href={banner.href}>
              {banner.cta}
              <ArrowRight className="size-3.5 opacity-80" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
